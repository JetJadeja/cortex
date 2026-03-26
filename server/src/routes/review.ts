import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { getMidnightForUser, countDueRemaining, countReviewsToday } from "../services/review-state";
import { processRating, processQuizRating } from "../services/review";
import {
  buildInitialQueue,
  fetchCardById,
  getNextPhase2Item,
  type ReviewItem,
} from "../services/review-query";
import {
  popNext,
  setQueue,
  queueLength,
  getQueue,
  isQuizId,
  getQuizData,
  isQuizzesInFlight,
  setQuizzesInFlight,
} from "../services/review-queue";
import { generateAndInterleaveQuizzes } from "../services/quiz-generation";
import { transcribeAudio } from "../services/deepgram";

export const reviewRouter = Router();
reviewRouter.use(requireAuth);

reviewRouter.get("/status", async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { timezone } = await getMidnightForUser(userId);
    const dueCount = await countDueRemaining(userId, timezone);

    res.json({ due_count: dueCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error getting review status:", message);
    res.status(500).json({ error: message });
  }
});

reviewRouter.post("/advance", async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { action, card_id, concept_id, confidence, effort, user_answer, quiz_id } = req.body;
    const { midnight, timezone } = await getMidnightForUser(userId);

    let quizResult: { score: number; feedback: string } | undefined;

    if (action === "rate") {
      const conf = Number(confidence);
      const eff = typeof effort === "boolean" ? effort : effort === true;
      if (!card_id || !concept_id || !Number.isInteger(conf) || conf < 1 || conf > 4) {
        res.status(400).json({ error: "Missing or invalid rating fields" });
        return;
      }
      await processRating(userId, midnight, timezone, {
        card_id,
        concept_id,
        confidence: conf,
        effort: eff,
        user_answer,
      });
    }

    if (action === "quiz_rate") {
      const { audio, mimetype } = req.body;
      const missing = [
        !quiz_id && "quiz_id",
        !audio && "audio",
        !mimetype && "mimetype",
      ].filter(Boolean);
      if (missing.length > 0) {
        console.error("quiz_rate missing fields:", missing, "| body keys:", Object.keys(req.body));
        res.status(400).json({ error: `Missing: ${missing.join(", ")}` });
        return;
      }
      const quizData = getQuizData(userId, midnight, quiz_id);
      if (!quizData) {
        res.status(404).json({ error: "Quiz not found" });
        return;
      }

      const audioBuffer = Buffer.from(audio, "base64");
      const transcription = await transcribeAudio(audioBuffer, mimetype);

      quizResult = await processQuizRating(userId, {
        quiz_id: quizData.quiz_id,
        concept_id: quizData.concept_id,
        question: quizData.question,
        expected_answer: quizData.expected_answer,
        quiz_type: quizData.quiz_type,
        user_answer: transcription.transcript,
        was_voice: true,
      });
    }

    if (action === "browse") {
      const [item, dueCount] = await Promise.all([
        getNextPhase2Item(userId),
        countDueRemaining(userId, timezone),
      ]);
      res.json({
        state: item ? "browse" : "empty",
        remaining: 0,
        due_count: dueCount,
        attempt_id: item ? crypto.randomUUID() : null,
        item,
        ...(quizResult && { quiz_result: quizResult }),
      });
      return;
    }

    // Serve next item from queue
    const item = await serveNextItem(userId, midnight, timezone);

    if (item) {
      const remaining = queueLength(userId, midnight) + 1;
      res.json({
        state: "active",
        remaining,
        attempt_id: crypto.randomUUID(),
        item,
        ...(quizResult && { quiz_result: quizResult }),
      });
      return;
    }

    // Queue empty — determine done vs empty
    if (action === "rate" || action === "quiz_rate") {
      res.json({
        state: "done",
        remaining: 0,
        attempt_id: null,
        item: null,
        message: "You're done!",
        ...(quizResult && { quiz_result: quizResult }),
      });
      return;
    }

    const reviewedCount = await countReviewsToday(userId, midnight);
    if (reviewedCount > 0) {
      res.json({ state: "done", remaining: 0, attempt_id: null, item: null });
      return;
    }

    const { count } = await supabase
      .from("cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count ?? 0) > 0) {
      res.json({ state: "done", remaining: 0, attempt_id: null, item: null });
    } else {
      res.json({ state: "empty", remaining: 0, attempt_id: null, item: null });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error advancing review:", message);
    res.status(500).json({ error: message });
  }
});

async function serveNextItem(
  userId: string,
  midnight: Date,
  timezone: string,
): Promise<ReviewItem | null> {
  if (!getQueue(userId, midnight)) {
    const cardIds = await buildInitialQueue(userId, midnight, timezone);
    if (cardIds.length === 0) return null;
    setQueue(userId, midnight, cardIds);

    // Kick off background quiz generation (fire and forget)
    // The orchestrator clears quizzesInFlight in its finally block
    if (!isQuizzesInFlight(userId, midnight)) {
      setQuizzesInFlight(userId, midnight, true);
      generateAndInterleaveQuizzes(userId, midnight, timezone).catch((err) => {
        console.error("Quiz generation failed:", err instanceof Error ? err.message : err);
      });
    }
  }

  for (let attempts = 0; attempts < 50; attempts++) {
    const itemId = popNext(userId, midnight);
    if (!itemId) break;

    if (isQuizId(itemId)) {
      const quizId = itemId.slice(5); // Remove "quiz:" prefix
      const quizData = getQuizData(userId, midnight, quizId);
      if (quizData) {
        return {
          type: "quiz",
          quiz_id: quizData.quiz_id,
          concept_id: quizData.concept_id,
          question: quizData.question,
          quiz_type: quizData.quiz_type,
        };
      }
      continue; // Quiz data missing, skip
    }

    const item = await fetchCardById(itemId);
    if (item) return item;
  }

  // Rebuild card queue only (quizzes are injected separately)
  const cardIds = await buildInitialQueue(userId, midnight, timezone);
  if (cardIds.length === 0) return null;
  setQueue(userId, midnight, cardIds);

  for (let retry = 0; retry < 50; retry++) {
    const itemId = popNext(userId, midnight);
    if (!itemId) return null;

    if (isQuizId(itemId)) {
      const quizId = itemId.slice(5);
      const quizData = getQuizData(userId, midnight, quizId);
      if (quizData) {
        return {
          type: "quiz",
          quiz_id: quizData.quiz_id,
          concept_id: quizData.concept_id,
          question: quizData.question,
          quiz_type: quizData.quiz_type,
        };
      }
      continue;
    }

    const item = await fetchCardById(itemId);
    if (item) return item;
  }

  return null;
}
