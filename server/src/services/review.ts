import { supabase } from "../lib/supabase";
import {
  scheduleCard,
  gradeFromConfidence,
  degradeGrade,
  applyEffortModifier,
} from "../lib/fsrs";
import {
  getPassedCardIdsToday,
  getReviewedCardIdsToday,
  getAttemptCountToday,
} from "./review-state";

export interface RatingInput {
  card_id: string;
  concept_id: string;
  confidence: number;
  effort: boolean;
  user_answer?: string;
}

export interface ReviewItem {
  type: "card";
  card_id: string;
  concept_id: string;
  front: string;
  back: string;
}

export async function processRating(userId: string, midnight: Date, input: RatingInput): Promise<void> {
  const isPassed = input.confidence >= 3;

  const { error } = await supabase.from("review_history").insert({
    user_id: userId,
    card_id: input.card_id,
    concept_id: input.concept_id,
    review_type: "card",
    confidence_rating: input.confidence,
    effort: input.effort,
    was_voice: !!input.user_answer,
    phase: 1,
    schedule_applied: isPassed,
  });

  if (error) throw new Error(`Failed to insert review_history: ${error.message}`);

  if (!isPassed) return;

  const { data: card } = await supabase
    .from("cards")
    .select("due_at, stability, difficulty")
    .eq("id", input.card_id)
    .single();

  if (!card) return;

  const attemptCount = await getAttemptCountToday(userId, input.card_id, midnight);
  const baseGrade = gradeFromConfidence(input.confidence);
  const grade = degradeGrade(baseGrade, attemptCount);

  const lastReviewedAt = await getLastReviewDate(input.card_id);
  const now = new Date();

  let next = scheduleCard(
    { due_at: new Date(card.due_at), stability: card.stability, difficulty: card.difficulty },
    grade,
    now,
    lastReviewedAt,
  );

  next = applyEffortModifier(next, input.effort, now);

  await supabase
    .from("cards")
    .update({
      due_at: next.due_at.toISOString(),
      stability: next.stability,
      difficulty: next.difficulty,
    })
    .eq("id", input.card_id);
}

export async function getNextPhase1Item(userId: string, midnight: Date): Promise<ReviewItem | null> {
  const [passedIds, reviewedIds] = await Promise.all([
    getPassedCardIdsToday(userId, midnight),
    getReviewedCardIdsToday(userId, midnight),
  ]);

  const now = new Date().toISOString();

  const { data: dueCards } = await supabase
    .from("cards")
    .select("id, concept_id, front, back, due_at, stability, concepts(priority)")
    .eq("user_id", userId)
    .lte("due_at", now)
    .order("due_at", { ascending: true });

  if (!dueCards) return null;

  const remaining = dueCards.filter((c) => !passedIds.has(c.id));
  if (remaining.length === 0) return null;

  const fresh: typeof remaining = [];
  const recycled: typeof remaining = [];

  for (const card of remaining) {
    if (reviewedIds.has(card.id)) {
      recycled.push(card);
    } else {
      fresh.push(card);
    }
  }

  fresh.sort((a, b) => {
    const pa = priorityTier(a);
    const pb = priorityTier(b);
    if (pa !== pb) return pa - pb;
    return new Date(a.due_at).getTime() - new Date(b.due_at).getTime();
  });

  // Recycled cards go after all fresh cards — sorted by due_at as a stable tiebreaker
  recycled.sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());

  const card = fresh[0] ?? recycled[0];
  if (!card) return null;

  return {
    type: "card",
    card_id: card.id,
    concept_id: card.concept_id,
    front: card.front,
    back: card.back,
  };
}

export async function getNextPhase2Item(userId: string): Promise<ReviewItem | null> {
  const { count } = await supabase
    .from("cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);

  const total = count ?? 0;
  if (total === 0) return null;

  const offset = Math.floor(Math.random() * total);

  const { data: cards } = await supabase
    .from("cards")
    .select("id, concept_id, front, back")
    .eq("user_id", userId)
    .range(offset, offset);

  const card = cards?.[0];
  if (!card) return null;

  return {
    type: "card",
    card_id: card.id,
    concept_id: card.concept_id,
    front: card.front,
    back: card.back,
  };
}

interface DueCard {
  stability: number;
  concepts: { priority: string }[] | { priority: string } | null;
}

/**
 * Priority tiers for Phase 1 ordering:
 * 0 = previously failed (reviewed at least once, stability < 2 days)
 * 1 = core-tagged concepts
 * 2 = everything else
 */
function priorityTier(card: DueCard): number {
  const isFailedCard = card.stability > 0 && card.stability < 2;
  if (isFailedCard) return 0;

  const concept = Array.isArray(card.concepts) ? card.concepts[0] : card.concepts;
  if (concept?.priority === "core") return 1;

  return 2;
}

async function getLastReviewDate(cardId: string): Promise<Date | null> {
  const { data } = await supabase
    .from("review_history")
    .select("created_at")
    .eq("card_id", cardId)
    .order("created_at", { ascending: false })
    .limit(2);

  // The first row is the review we just inserted, so we want the second
  if (data && data.length > 1) {
    return new Date(data[1].created_at);
  }
  return null;
}
