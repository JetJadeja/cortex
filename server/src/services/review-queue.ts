export interface SessionCardState {
  failures: number;
  passes: number;
  lapse_called: boolean;
}

interface QueueEntry {
  midnight: string;
  cardIds: string[];
  cardState: Map<string, SessionCardState>;
}

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

export function getQueue(userId: string, midnight: Date): string[] | undefined {
  return getEntry(userId, midnight)?.cardIds;
}

export function setQueue(
  userId: string,
  midnight: Date,
  cardIds: string[],
): void {
  queues.set(userId, {
    midnight: midnight.toISOString(),
    cardIds,
    cardState: new Map(),
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
