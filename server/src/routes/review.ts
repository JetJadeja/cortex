import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { getMidnightForUser, countDueRemaining, countReviewsToday } from "../services/review-state";
import { processRating, getNextPhase1Item, getNextPhase2Item } from "../services/review";

export const reviewRouter = Router();
reviewRouter.use(requireAuth);

reviewRouter.get("/status", async (req: Request, res: Response) => {
  try {
    const userId = req.userId;
    const midnight = await getMidnightForUser(userId);
    const dueCount = await countDueRemaining(userId, midnight);

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
    const midnight = await getMidnightForUser(userId);

    if (action === "rate") {
      const conf = Number(confidence);
      const eff = typeof effort === "boolean" ? effort : effort === true;
      if (!card_id || !concept_id || !Number.isInteger(conf) || conf < 1 || conf > 4) {
        res.status(400).json({ error: "Missing or invalid rating fields" });
        return;
      }
      await processRating(userId, midnight, {
        card_id,
        concept_id,
        confidence: conf,
        effort: eff,
        user_answer,
      });
    }

    if (action === "browse") {
      const item = await getNextPhase2Item(userId);
      res.json({
        state: item ? "browse" : "empty",
        remaining: 0,
        attempt_id: item ? crypto.randomUUID() : null,
        item,
      });
      return;
    }

    const remaining = await countDueRemaining(userId, midnight);

    if (remaining > 0) {
      const item = await getNextPhase1Item(userId, midnight);
      res.json({
        state: "active",
        remaining,
        attempt_id: item ? crypto.randomUUID() : null,
        item,
      });
      return;
    }

    // No cards remaining — determine if "done" or "empty"
    if (action === "rate") {
      res.json({
        state: "done",
        remaining: 0,
        attempt_id: null,
        item: null,
        message: "You're done!",
      });
      return;
    }

    // Initial "next" with nothing due
    const reviewedCount = await countReviewsToday(userId, midnight);
    if (reviewedCount > 0) {
      res.json({ state: "done", remaining: 0, attempt_id: null, item: null });
      return;
    }

    // Check if user has any cards at all
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
