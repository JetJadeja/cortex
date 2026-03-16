import { fsrs, Rating, type Grade } from "ts-fsrs";

export { Rating, type Grade };

const scheduler = fsrs({
  enable_fuzz: true,
  enable_short_term: false,
});

export interface CardState {
  due_at: Date;
  stability: number;
  difficulty: number;
}

export function scheduleCard(
  current: CardState,
  grade: Grade,
  now: Date,
  lastReviewedAt: Date | null,
): CardState {
  const isNew = current.stability === 0 && current.difficulty === 0;
  const memoryState = isNew ? null : { stability: current.stability, difficulty: current.difficulty };
  const elapsedDays = lastReviewedAt ? daysBetween(lastReviewedAt, now) : 0;

  const next = scheduler.next_state(memoryState, elapsedDays, grade);
  const intervalDays = scheduler.next_interval(next.stability, elapsedDays);
  const dueAt = addDays(now, intervalDays);

  return {
    due_at: dueAt,
    stability: next.stability,
    difficulty: next.difficulty,
  };
}

/**
 * Maps the user's dual rating (effort 1-4, confidence 1-4) to an FSRS grade.
 *
 * Effort is the primary signal (1=no recall → Again, 4=instant → Easy).
 * Low confidence dampens the grade — you can't rate Easy if you're guessing.
 */
const GRADE_MATRIX: Grade[][] = [
  /*              C=1          C=2          C=3          C=4       */
  /* E=1 */ [Rating.Again, Rating.Again, Rating.Again, Rating.Again],
  /* E=2 */ [Rating.Again, Rating.Again, Rating.Hard,  Rating.Hard],
  /* E=3 */ [Rating.Again, Rating.Hard,  Rating.Good,  Rating.Good],
  /* E=4 */ [Rating.Hard,  Rating.Good,  Rating.Good,  Rating.Easy],
];

export function gradeFromRating(effort: number, confidence: number): Grade {
  const e = clamp(effort, 1, 4) - 1;
  const c = clamp(confidence, 1, 4) - 1;
  return GRADE_MATRIX[e][c];
}

function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
