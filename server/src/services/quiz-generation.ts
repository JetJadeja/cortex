import { generateQuizPool, curateQuizzes } from "./claude";
import {
  fetchDueCardsWithContent,
  fetchSimilarContextCards,
  type DueCardWithContent,
  type ContextCard,
} from "./review-query";
import { interleaveQuizzes, setQuizzesInFlight, type QuizData } from "./review-queue";

function targetQuizCount(dueCards: number): number {
  if (dueCards < 3) return 0;
  if (dueCards < 5) return 1;
  return Math.min(Math.floor(Math.sqrt(dueCards) * 1.5), 12);
}

function formatDueCards(cards: DueCardWithContent[]): string {
  const byConceptId = new Map<string, DueCardWithContent[]>();
  for (const card of cards) {
    const existing = byConceptId.get(card.concept_id) ?? [];
    existing.push(card);
    byConceptId.set(card.concept_id, existing);
  }

  const sections: string[] = [];
  for (const [, conceptCards] of byConceptId) {
    const title = conceptCards[0].concept_title;
    const cardLines = conceptCards
      .map((c) => `  - Q: ${c.front}\n    A: ${c.back}`)
      .join("\n");
    sections.push(`[Concept: ${title}]\n${cardLines}`);
  }

  return sections.join("\n\n");
}

function formatContextCards(cards: ContextCard[]): string {
  if (cards.length === 0) return "None available.";

  return cards
    .map(
      (c) =>
        `- [${c.concept_title}] Q: ${c.front} / A: ${c.back} (similarity: ${c.similarity.toFixed(2)})`,
    )
    .join("\n");
}

function formatCandidatePool(
  candidates: Array<{ question: string; expected_answer: string; quiz_type: string }>,
): string {
  return candidates
    .map(
      (c, i) =>
        `${i + 1}. [${c.quiz_type}] ${c.question}\n   Expected: ${c.expected_answer}`,
    )
    .join("\n\n");
}

export async function generateAndInterleaveQuizzes(
  userId: string,
  midnight: Date,
  timezone: string,
): Promise<void> {
  try {
    const dueCards = await fetchDueCardsWithContent(userId, timezone);

    const target = targetQuizCount(dueCards.length);
    if (target === 0) return;

    const contextCards = await fetchSimilarContextCards(userId, dueCards);

    const dueCardsText = formatDueCards(dueCards);
    const contextCardsText = formatContextCards(contextCards);

    const candidatePool = await generateQuizPool(dueCardsText, contextCardsText);

    if (candidatePool.length === 0) return;

    const candidatePoolText = formatCandidatePool(candidatePool);
    const curatedQuizzes = await curateQuizzes(candidatePoolText, target);

    if (curatedQuizzes.length === 0) return;

    const quizData: QuizData[] = curatedQuizzes.map((q) => ({
      quiz_id: crypto.randomUUID(),
      concept_id: pickConceptId(dueCards, q.question),
      question: q.question,
      expected_answer: q.expected_answer,
      quiz_type: q.quiz_type,
    }));

    interleaveQuizzes(userId, midnight, quizData);
  } finally {
    setQuizzesInFlight(userId, midnight, false);
  }
}

/**
 * Best-effort concept assignment for a quiz question.
 * Checks if any concept title appears in the question text.
 * Falls back to the first due card's concept.
 */
function pickConceptId(
  dueCards: DueCardWithContent[],
  question: string,
): string {
  const lowerQ = question.toLowerCase();
  for (const card of dueCards) {
    if (lowerQ.includes(card.concept_title.toLowerCase())) {
      return card.concept_id;
    }
  }
  return dueCards[0]?.concept_id ?? "";
}
