import Anthropic from "@anthropic-ai/sdk";
import { supabase } from "../lib/supabase";
import { loadPrompt } from "../utils/loadPrompt";

const anthropic = new Anthropic();

const SIMILARITY_THRESHOLD = 0.4;

export interface DedupDecision {
  action: "add" | "discard" | "merge";
  mergeTargetId: string | null;
  mergedBack: string | null;
  reason: string;
  bestSimilarity: number | null;
}

interface SimilarCard {
  id: string;
  front: string;
  back: string;
  concept_title: string;
  similarity: number;
}

const dedupSchema = {
  type: "object" as const,
  properties: {
    action: {
      type: "string" as const,
      enum: ["add", "discard", "merge"],
      description:
        "Whether to add the new card, discard it, or merge it with an existing card",
    },
    merge_target: {
      type: ["integer", "null"] as const,
      description:
        "The card number (1, 2, 3...) to merge into, if action is merge. Null otherwise.",
    },
    merged_back: {
      type: ["string", "null"] as const,
      description:
        "Updated back text combining existing and new information, if action is merge. Null otherwise.",
    },
    reason: {
      type: "string" as const,
      description: "One-sentence explanation of the decision",
    },
  },
  required: ["action", "merge_target", "merged_back", "reason"] as const,
  additionalProperties: false,
};

async function findSimilarCards(
  userId: string,
  embedding: number[],
): Promise<SimilarCard[]> {
  const { data, error } = await supabase.rpc("match_cards", {
    query_embedding: embedding,
    match_user_id: userId,
    match_count: 5,
  });

  if (error) throw error;
  return (data ?? []) as SimilarCard[];
}

async function judgeCard(
  front: string,
  back: string,
  conceptTitle: string,
  similarCards: SimilarCard[],
): Promise<DedupDecision> {
  const formattedCards = similarCards
    .map(
      (c, i) =>
        `Card ${i + 1} (similarity: ${c.similarity.toFixed(3)}):\n` +
        `  Concept: ${c.concept_title}\n` +
        `  Front: ${c.front}\n` +
        `  Back: ${c.back}`,
    )
    .join("\n\n");

  const prompt = loadPrompt("deduplicate-card", {
    conceptTitle,
    front,
    back,
    similarCards: formattedCards,
  });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: prompt }],
    output_config: {
      format: {
        type: "json_schema",
        schema: dedupSchema,
      },
    },
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude dedup");
  }

  const result = JSON.parse(block.text) as {
    action: "add" | "discard" | "merge";
    merge_target: number | null;
    merged_back: string | null;
    reason: string;
  };

  if (result.action === "merge") {
    const index = result.merge_target;
    if (
      index === null ||
      index < 1 ||
      index > similarCards.length
    ) {
      return {
        action: "add",
        mergeTargetId: null,
        mergedBack: null,
        reason: "Invalid merge target index, falling back to add",
        bestSimilarity: similarCards[0]?.similarity ?? null,
      };
    }

    return {
      action: "merge",
      mergeTargetId: similarCards[index - 1].id,
      mergedBack: result.merged_back,
      reason: result.reason,
      bestSimilarity: similarCards[0]?.similarity ?? null,
    };
  }

  return {
    action: result.action,
    mergeTargetId: null,
    mergedBack: null,
    reason: result.reason,
    bestSimilarity: similarCards[0]?.similarity ?? null,
  };
}

export async function deduplicateCard(
  userId: string,
  front: string,
  back: string,
  conceptTitle: string,
  embedding: number[],
): Promise<DedupDecision> {
  const similarCards = await findSimilarCards(userId, embedding);

  const aboveThreshold = similarCards.filter(
    (c) => c.similarity >= SIMILARITY_THRESHOLD,
  );

  if (aboveThreshold.length === 0) {
    return {
      action: "add",
      mergeTargetId: null,
      mergedBack: null,
      reason: "No similar cards found above threshold",
      bestSimilarity: similarCards[0]?.similarity ?? null,
    };
  }

  return judgeCard(front, back, conceptTitle, aboveThreshold);
}
