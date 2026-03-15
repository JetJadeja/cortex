import Anthropic from "@anthropic-ai/sdk";
import { loadPrompt } from "../utils/loadPrompt";

const anthropic = new Anthropic();

interface ProcessedTranscript {
  summary: string;
  keyPoints: string[];
  reviewItems: Array<{
    question: string;
    answer: string;
  }>;
}

interface ReviewEvaluation {
  score: number;
  feedback: string;
  correct: boolean;
}

export async function processTranscript(transcript: string): Promise<ProcessedTranscript> {
  const systemPrompt = loadPrompt("process-transcript", { transcript });

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: systemPrompt,
      },
    ],
  });

  const text = message.content[0].type === "text" ? message.content[0].text : "";
  return JSON.parse(text) as ProcessedTranscript;
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
