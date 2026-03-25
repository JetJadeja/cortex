import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { getMidnightForUser, countDueRemaining, countReviewsToday } from "../services/review-state";
import { processRating } from "../services/review";
import { buildInitialQueue, fetchCardById, getNextPhase2Item } from "../services/review-query";
import { popNext, setQueue, queueLength, getQueue } from "../services/review-queue";

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
    const { action, card_id, concept_id, confidence, effort, user_answer } = req.body;
    const { midnight, timezone } = await getMidnightForUser(userId);

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
      // Reinsertion is handled inside processRating — no action needed here
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
      });
      return;
    }

    // Serve next card from queue
    const item = await serveNextCard(userId, midnight, timezone);

    if (item) {
      const remaining = queueLength(userId, midnight) + 1;
      res.json({
        state: "active",
        remaining,
        attempt_id: crypto.randomUUID(),
        item,
      });
      return;
    }

    // Queue empty — determine done vs empty
    if (action === "rate") {
      res.json({ state: "done", remaining: 0, attempt_id: null, item: null, message: "You're done!" });
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

async function serveNextCard(
  userId: string,
  midnight: Date,
  timezone: string,
): Promise<Awaited<ReturnType<typeof fetchCardById>>> {
  if (!getQueue(userId, midnight)) {
    const cardIds = await buildInitialQueue(userId, midnight, timezone);
    if (cardIds.length === 0) return null;
    setQueue(userId, midnight, cardIds);
  }

  for (let attempts = 0; attempts < 50; attempts++) {
    const cardId = popNext(userId, midnight);
    if (!cardId) break;
    const item = await fetchCardById(cardId);
    if (item) return item;
  }

  const cardIds = await buildInitialQueue(userId, midnight, timezone);
  if (cardIds.length === 0) return null;
  setQueue(userId, midnight, cardIds);

  for (let retry = 0; retry < 50; retry++) {
    const cardId = popNext(userId, midnight);
    if (!cardId) return null;
    const item = await fetchCardById(cardId);
    if (item) return item;
  }

  return null;
}
