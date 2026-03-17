import Anthropic from "@anthropic-ai/sdk";
import { loadPrompt } from "../utils/loadPrompt";

const anthropic = new Anthropic();

export interface ExtractedCard {
  front: string;
  back: string;
}

export interface ExtractedConcept {
  title: string;
  explanation: string;
  cards: ExtractedCard[];
}

const extractionSchema = {
  type: "object" as const,
  properties: {
    concepts: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          title: {
            type: "string" as const,
            description: "Specific, searchable concept name",
          },
          explanation: {
            type: "string" as const,
            description:
              "Corrected and sharpened version of what the user said, 2-4 sentences",
          },
          cards: {
            type: "array" as const,
            items: {
              type: "object" as const,
              properties: {
                front: {
                  type: "string" as const,
                  description:
                    "A single question, one sentence, under 140 characters",
                },
                back: {
                  type: "string" as const,
                  description:
                    "Direct answer, 1-3 sentences, under 300 characters",
                },
              },
              required: ["front", "back"] as const,
              additionalProperties: false,
            },
          },
        },
        required: ["title", "explanation", "cards"] as const,
        additionalProperties: false,
      },
    },
  },
  required: ["concepts"] as const,
  additionalProperties: false,
};

interface ChatResponse {
  answer: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ReviewEvaluation {
  score: number;
  feedback: string;
  correct: boolean;
}

export async function extractConcepts(transcript: string): Promise<ExtractedConcept[]> {
  const prompt = loadPrompt("process-transcript", { transcript });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6-20250514",
    max_tokens: 16384,
    messages: [{ role: "user", content: prompt }],
    output_config: {
      format: {
        type: "json_schema",
        schema: extractionSchema,
      },
    },
  });

  const block = message.content[0];
  if (block.type !== "text") {
    throw new Error("Unexpected response type from Claude");
  }

  const result = JSON.parse(block.text) as { concepts: ExtractedConcept[] };
  return result.concepts;
}

export async function generateRecordingSummary(transcript: string): Promise<string> {
  const prompt = loadPrompt("recording-summary", { transcript });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 100,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return text.trim();
}

export async function evaluateReview(
  question: string,
  expectedAnswer: string,
  userResponse: string
): Promise<ReviewEvaluation> {
  const systemPrompt = loadPrompt("evaluate-review", {
    question,
    expectedAnswer,
    userResponse,
  });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: systemPrompt,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as ReviewEvaluation;
}

export interface ChatContext {
  conceptTitle: string;
  conceptExplanation: string;
  cards: string;
  linkedConcepts: string;
}

export async function chatAboutConcept(
  context: ChatContext,
  question: string,
  history: ChatMessage[],
): Promise<string> {
  const formattedHistory = [
    ...history.map((m) => `${m.role === "user" ? "Student" : "Tutor"}: ${m.content}`),
    `Student: ${question}`,
  ].join("\n\n");

  const systemPrompt = loadPrompt("chat", {
    conceptTitle: context.conceptTitle,
    conceptExplanation: context.conceptExplanation,
    cards: context.cards,
    linkedConcepts: context.linkedConcepts,
    history: formattedHistory,
  });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    messages: [{ role: "user", content: systemPrompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const parsed = JSON.parse(text) as ChatResponse;
  return parsed.answer;
}
