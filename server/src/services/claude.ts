import Anthropic from "@anthropic-ai/sdk";
import { loadPrompt } from "../utils/loadPrompt";

const anthropic = new Anthropic();

export interface ExtractedConcept {
  title: string;
  explanation: string;
  type: string;
  source_context: string;
  cards: Array<{
    card_type: string;
    front: string;
    back: string;
  }>;
}

interface ExtractionResult {
  concepts: ExtractedConcept[];
}

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
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const result = JSON.parse(text) as ExtractionResult;
  return result.concepts;
}

export async function generateHaikuSummary(transcript: string): Promise<string> {
  const prompt = loadPrompt("haiku-summary", { transcript });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 128,
    messages: [{ role: "user", content: prompt }],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  const result = JSON.parse(text) as { summary: string };
  return result.summary;
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
