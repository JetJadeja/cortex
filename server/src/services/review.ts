import { supabase } from "../lib/supabase";
import { Rating, scheduleCard, computeCompletionGrade, daysBetween } from "../lib/fsrs";
import { computeDueAt, computeDueDate, applyEffortHalving } from "../lib/due-date";
import {
  getCardState,
  updateCardState,
  isMastered,
  reinsertFailed,
  reinsertFamiliar,
  type SessionCardState,
} from "./review-queue";
import { getLastReviewDate } from "./review-query";
import { evaluateQuizAnswer } from "./claude";

export interface RatingInput {
  card_id: string;
  concept_id: string;
  confidence: number;
  effort: boolean;
  user_answer?: string;
}

export interface RatingResult {
  mastered: boolean;
}

export async function processRating(
  userId: string,
  midnight: Date,
  timezone: string,
  input: RatingInput,
): Promise<RatingResult> {
  const state = getCardState(userId, midnight, input.card_id);
  const card = await fetchCardScheduling(input.card_id);
  if (!card) throw new Error(`Card not found: ${input.card_id}`);

  const now = new Date();

  if (input.confidence < 3) {
    return handleFailure(userId, midnight, timezone, input, state, card, now);
  }
  return handleSuccess(userId, midnight, timezone, input, state, card, now);
}

async function handleFailure(
  userId: string,
  midnight: Date,
  timezone: string,
  input: RatingInput,
  state: SessionCardState,
  card: CardScheduling,
  now: Date,
): Promise<RatingResult> {
  // Only Again (confidence 1) counts as a failure per spec — Hard does not
  if (input.confidence === 1) state.failures++;
  state.passes = 0;

  let scheduleApplied = false;

  // Lapse call: first Again on a previously-reviewed card with real elapsed time
  if (
    input.confidence === 1 &&
    card.stability > 0 &&
    !state.lapse_called
  ) {
    const lastReviewedAt = await getLastReviewDate(input.card_id);
    const elapsedDays = lastReviewedAt ? daysBetween(lastReviewedAt, now) : 0;

    if (elapsedDays > 0) {
      const result = scheduleCard(
        { stability: card.stability, difficulty: card.difficulty },
        Rating.Again,
        now,
        lastReviewedAt,
      );

      await supabase
        .from("cards")
        .update({
          stability: result.stability,
          difficulty: result.difficulty,
        })
        .eq("id", input.card_id);

      state.lapse_called = true;
      scheduleApplied = true;
    }
  }

  await insertReviewHistory(userId, input, scheduleApplied);
  updateCardState(userId, midnight, input.card_id, state);
  reinsertFailed(userId, midnight, input.card_id, input.confidence);

  return { mastered: false };
}

async function handleSuccess(
  userId: string,
  midnight: Date,
  timezone: string,
  input: RatingInput,
  state: SessionCardState,
  card: CardScheduling,
  now: Date,
): Promise<RatingResult> {
  state.passes++;

  if (!isMastered(state)) {
    // First correct after struggle — "Familiar", stays in queue
    await insertReviewHistory(userId, input, false);
    updateCardState(userId, midnight, input.card_id, state);
    reinsertFamiliar(userId, midnight, input.card_id);
    return { mastered: false };
  }

  // Mastered — fire completion FSRS call
  const grade = computeCompletionGrade(
    state.failures,
    state.lapse_called,
    input.confidence,
  );

  const lastReviewedAt = await getLastReviewDate(input.card_id);
  const result = scheduleCard(
    { stability: card.stability, difficulty: card.difficulty },
    grade,
    now,
    lastReviewedAt,
  );

  let intervalDays = result.interval_days;
  if (!input.effort) {
    intervalDays = applyEffortHalving(intervalDays);
  }
  intervalDays = Math.max(1, intervalDays);

  const dueAt = computeDueAt(now, intervalDays);
  const dueDate = computeDueDate(dueAt, timezone);

  await supabase
    .from("cards")
    .update({
      due_at: dueAt.toISOString(),
      due_date: dueDate,
      stability: result.stability,
      difficulty: result.difficulty,
    })
    .eq("id", input.card_id);

  await insertReviewHistory(userId, input, true);
  updateCardState(userId, midnight, input.card_id, state);

  return { mastered: true };
}

export interface QuizRatingInput {
  quiz_id: string;
  concept_id: string;
  question: string;
  expected_answer: string;
  quiz_type: string;
  user_answer: string;
  was_voice: boolean;
}

export async function processQuizRating(
  userId: string,
  input: QuizRatingInput,
): Promise<{ score: number; feedback: string }> {
  const evaluation = await evaluateQuizAnswer(
    input.question,
    input.expected_answer,
    input.user_answer,
    input.quiz_type,
  );

  const { error } = await supabase.from("review_history").insert({
    user_id: userId,
    card_id: null,
    concept_id: input.concept_id,
    review_type: "quiz",
    confidence_rating: evaluation.confidence_rating,
    effort: true,
    was_voice: input.was_voice,
    phase: 1,
    schedule_applied: false,
    ai_score: evaluation.score,
  });

  if (error)
    throw new Error(`Failed to insert quiz review_history: ${error.message}`);

  return { score: evaluation.score, feedback: evaluation.feedback };
}

interface CardScheduling {
  stability: number;
  difficulty: number;
}

async function fetchCardScheduling(
  cardId: string,
): Promise<CardScheduling | null> {
  const { data } = await supabase
    .from("cards")
    .select("stability, difficulty")
    .eq("id", cardId)
    .single();

  return data;
}

async function insertReviewHistory(
  userId: string,
  input: RatingInput,
  scheduleApplied: boolean,
): Promise<void> {
  const { error } = await supabase.from("review_history").insert({
    user_id: userId,
    card_id: input.card_id,
    concept_id: input.concept_id,
    review_type: "card",
    confidence_rating: input.confidence,
    effort: input.effort,
    was_voice: !!input.user_answer,
    phase: 1,
    schedule_applied: scheduleApplied,
  });

  if (error)
    throw new Error(`Failed to insert review_history: ${error.message}`);
}
