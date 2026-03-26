import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { generateEmbedding } from "../services/embedding";

const MIN_QUERY_LENGTH = 2;
const MATCH_COUNT = 30;
const MIN_SIMILARITY = 0.3;

export const searchRouter = Router();
searchRouter.use(requireAuth);

interface MatchRow {
  id: string;
  front: string;
  back: string;
  concept_title: string;
  similarity: number;
}

searchRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { query } = req.body as { query: string };

    if (!query || query.trim().length < MIN_QUERY_LENGTH) {
      res.status(400).json({ error: "Query must be at least 2 characters" });
      return;
    }

    const embedding = await generateEmbedding(query.trim());

    const { data, error } = await supabase.rpc("match_cards", {
      query_embedding: embedding,
      match_user_id: req.userId,
      match_count: MATCH_COUNT,
    });

    if (error) throw error;

    const rows = (data ?? []) as MatchRow[];
    const results = rows
      .filter((r) => r.similarity >= MIN_SIMILARITY)
      .map((r) => ({ card_id: r.id, similarity: r.similarity }));

    res.json({ results });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in search:", message);
    res.status(500).json({ error: message });
  }
});
