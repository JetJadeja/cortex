import { Router, Request, Response } from "express";
import { requireAuth } from "../middleware/auth";
import { supabase } from "../lib/supabase";
import { chatAboutConcept, type ChatMessage } from "../services/claude";

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.post("/", async (req: Request, res: Response) => {
  try {
    const { concept_id, question, history } = req.body as {
      concept_id: string;
      question: string;
      history?: ChatMessage[];
    };

    if (!concept_id || !question) {
      res.status(400).json({ error: "Missing concept_id or question" });
      return;
    }

    const context = await buildChatContext(concept_id);

    const answer = await chatAboutConcept(
      context,
      question,
      history ?? [],
    );

    res.json({ answer });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Error in chat:", message);
    res.status(500).json({ error: message });
  }
});

async function buildChatContext(conceptId: string) {
  const [concept, cards, links] = await Promise.all([
    fetchConcept(conceptId),
    fetchCards(conceptId),
    fetchLinkedConcepts(conceptId),
  ]);

  const cardsText = cards.length > 0
    ? cards.map((c) => `- **${c.front}** → ${c.back}`).join("\n")
    : "No cards yet.";

  const linkedText = links.length > 0
    ? links.map((l) => `- **${l.title}**: ${l.relationship}`).join("\n")
    : "No linked concepts.";

  return {
    conceptTitle: concept.title,
    conceptExplanation: concept.explanation,
    cards: cardsText,
    linkedConcepts: linkedText,
  };
}

async function fetchConcept(conceptId: string) {
  const { data, error } = await supabase
    .from("concepts")
    .select("title, explanation")
    .eq("id", conceptId)
    .single();

  if (error) throw new Error(`Concept not found: ${conceptId}`);
  return data;
}

async function fetchCards(conceptId: string) {
  const { data } = await supabase
    .from("cards")
    .select("front, back")
    .eq("concept_id", conceptId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

async function fetchLinkedConcepts(conceptId: string) {
  const { data: links } = await supabase
    .from("concept_links")
    .select("concept_id_1, concept_id_2, relationship_description")
    .or(`concept_id_1.eq.${conceptId},concept_id_2.eq.${conceptId}`);

  if (!links || links.length === 0) return [];

  const linkedIds = links.map((l) =>
    l.concept_id_1 === conceptId ? l.concept_id_2 : l.concept_id_1,
  );

  const { data: concepts } = await supabase
    .from("concepts")
    .select("id, title")
    .in("id", linkedIds);

  const titleMap = new Map((concepts ?? []).map((c) => [c.id, c.title]));

  return links.map((l) => {
    const linkedId = l.concept_id_1 === conceptId ? l.concept_id_2 : l.concept_id_1;
    return {
      title: titleMap.get(linkedId) ?? "Unknown",
      relationship: l.relationship_description,
    };
  });
}
