import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import {
  getMidnightForUser,
  countDueNotReviewedToday,
  countReviewsToday,
  countPhase1ReviewsToday,
  isQuizSlot,
} from "../services/review-state";
import {
  processRating,
  getNextPhase1Item,
  getNextPhase2Item,
} from "../services/review";

export const reviewRouter = Router();
reviewRouter.use(requireAuth);

reviewRouter.get("/status", async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const midnight = await getMidnightForUser(userId);

    const [dueCount, reviewedCount] = await Promise.all([
      countDueNotReviewedToday(userId, midnight),
      countReviewsToday(userId, midnight),
    ]);

    const phase = dueCount > 0 ? 1 : reviewedCount > 0 ? 2 : 1;
    res.json({ phase, due_count: dueCount });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error getting review status:", message);
    res.status(500).json({ error: message });
  }
});

reviewRouter.post("/advance", async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const { card_id, concept_id, review_type, effort, confidence, phase: reqPhase, user_answer } = req.body;
    const midnight = await getMidnightForUser(userId);

    // Step 1: Process rating if present
    const hasRating = card_id && effort && confidence;
    if (hasRating) {
      await processRating(userId, {
        card_id,
        concept_id,
        review_type: review_type ?? "card",
        effort,
        confidence,
        phase: reqPhase ?? 1,
        user_answer,
      });
    }

    // Step 2: Determine state after processing
    const remaining = await countDueNotReviewedToday(userId, midnight);
    const reviewedCount = await countReviewsToday(userId, midnight);

    // Step 3: Serve next item
    if (remaining > 0) {
      const phase1Count = await countPhase1ReviewsToday(userId, midnight);

      // TODO: When quiz generation is implemented (Phase 9), serve a quiz here
      if (isQuizSlot(phase1Count)) {
        // Fall through to card for now — quiz generation not yet implemented
      }

      const item = await getNextPhase1Item(userId, midnight);
      res.json({ phase: 1, remaining, attempt_id: crypto.randomUUID(), item });
      return;
    }

    // Phase 1 just finished — send transition message
    if (hasRating && reqPhase === 1) {
      res.json({
        phase: 2,
        remaining: 0,
        attempt_id: null,
        item: null,
        message: "You're done for today!",
      });
      return;
    }

    // Phase 2 — serve browsing item
    if (reviewedCount > 0) {
      const item = await getNextPhase2Item(userId, midnight);
      res.json({
        phase: 2,
        remaining: 0,
        attempt_id: item ? crypto.randomUUID() : null,
        item,
        ...(item ? {} : { message: "No more cards to browse." }),
      });
      return;
    }

    // Nothing due, nothing reviewed — empty state
    res.json({ phase: 1, remaining: 0, attempt_id: null, item: null });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error advancing review:", message);
    res.status(500).json({ error: message });
  }
});
