export interface SessionCardState {
  failures: number;
  passes: number;
  lapse_called: boolean;
}

export interface QuizData {
  quiz_id: string;
  concept_id: string;
  question: string;
  expected_answer: string;
  quiz_type: string;
}

interface QueueEntry {
  midnight: string;
  itemIds: string[];
  cardState: Map<string, SessionCardState>;
  quizzes: Map<string, QuizData>;
  quizzesInFlight: boolean;
}

const QUIZ_PREFIX = "quiz:";

const queues = new Map<string, QueueEntry>();

function getEntry(userId: string, midnight: Date): QueueEntry | undefined {
  const entry = queues.get(userId);
  if (!entry) return undefined;
  if (entry.midnight !== midnight.toISOString()) {
    queues.delete(userId);
    return undefined;
  }
  return entry;
}

export function isQuizId(id: string): boolean {
  return id.startsWith(QUIZ_PREFIX);
}

export function getQueue(userId: string, midnight: Date): string[] | undefined {
  return getEntry(userId, midnight)?.itemIds;
}

export function setQueue(
  userId: string,
  midnight: Date,
  cardIds: string[],
): void {
  queues.set(userId, {
    midnight: midnight.toISOString(),
    itemIds: cardIds,
    cardState: new Map(),
    quizzes: new Map(),
    quizzesInFlight: false,
  });
}

export function popNext(
  userId: string,
  midnight: Date,
): string | undefined {
  const queue = getQueue(userId, midnight);
  if (!queue || queue.length === 0) return undefined;
  return queue.shift();
}

export function getCardState(
  userId: string,
  midnight: Date,
  cardId: string,
): SessionCardState {
  const entry = getEntry(userId, midnight);
  return entry?.cardState.get(cardId) ?? { failures: 0, passes: 0, lapse_called: false };
}

export function updateCardState(
  userId: string,
  midnight: Date,
  cardId: string,
  state: SessionCardState,
): void {
  const entry = getEntry(userId, midnight);
  if (entry) entry.cardState.set(cardId, state);
}

/**
 * A card is mastered when:
 * - Clean pass (0 failures): 1 correct recall
 * - Struggled (1+ failures): 2 consecutive correct recalls
 */
export function isMastered(state: SessionCardState): boolean {
  if (state.failures === 0) return state.passes >= 1;
  return state.passes >= 2;
}

/**
 * Reinsert a failed card (confidence 1 or 2) back into the queue.
 * Again (conf 1): 6+ positions later. Hard (conf 2): 4+ positions later.
 */
export function reinsertFailed(
  userId: string,
  midnight: Date,
  cardId: string,
  confidence: number,
): void {
  const queue = getQueue(userId, midnight);
  if (!queue) return;
  const minGap = confidence === 1 ? 6 : 4;
  insertAtRandomPosition(queue, cardId, minGap, 6);
}

/**
 * Reinsert a "familiar" card (first correct after struggle, not yet mastered).
 * Pushed further back than failed cards: 8+ positions with window of 6.
 */
export function reinsertFamiliar(
  userId: string,
  midnight: Date,
  cardId: string,
): void {
  const queue = getQueue(userId, midnight);
  if (!queue) return;
  insertAtRandomPosition(queue, cardId, 8, 6);
}

export function queueLength(userId: string, midnight: Date): number {
  return getQueue(userId, midnight)?.length ?? 0;
}

export function invalidate(userId: string): void {
  queues.delete(userId);
}

export function getQuizData(
  userId: string,
  midnight: Date,
  quizId: string,
): QuizData | undefined {
  const entry = getEntry(userId, midnight);
  return entry?.quizzes.get(quizId);
}

export function isQuizzesInFlight(userId: string, midnight: Date): boolean {
  return getEntry(userId, midnight)?.quizzesInFlight ?? false;
}

export function setQuizzesInFlight(userId: string, midnight: Date, value: boolean): void {
  const entry = getEntry(userId, midnight);
  if (entry) entry.quizzesInFlight = value;
}

/**
 * Insert generated quizzes into the queue at roughly every 4th position.
 * Each quiz gets a prefixed ID stored in itemIds and its data in the quizzes map.
 */
export function interleaveQuizzes(
  userId: string,
  midnight: Date,
  quizzes: QuizData[],
): void {
  const entry = getEntry(userId, midnight);
  if (!entry || quizzes.length === 0) return;

  for (const quiz of quizzes) {
    entry.quizzes.set(quiz.quiz_id, quiz);
  }

  const quizIds = quizzes.map((q) => `${QUIZ_PREFIX}${q.quiz_id}`);
  const spacing = 4;

  for (let i = 0; i < quizIds.length; i++) {
    const targetPos = (i + 1) * spacing - 1;
    const insertPos = Math.min(targetPos, entry.itemIds.length);
    entry.itemIds.splice(insertPos, 0, quizIds[i]);
  }

  entry.quizzesInFlight = false;
}

function insertAtRandomPosition(
  queue: string[],
  cardId: string,
  minGap: number,
  window: number,
): void {
  const start = Math.min(minGap, queue.length);
  const end = Math.min(start + window, queue.length);
  const pos = start + Math.floor(Math.random() * Math.max(end - start + 1, 1));
  queue.splice(pos, 0, cardId);
}
