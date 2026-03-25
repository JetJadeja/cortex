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

const CONFIDENCE_TO_GRADE: Grade[] = [
  Rating.Again, // 1 = no recall
  Rating.Hard,  // 2 = vague
  Rating.Good,  // 3 = got it
  Rating.Easy,  // 4 = knew it cold
];

export function gradeFromConfidence(confidence: number): Grade {
  const idx = clamp(confidence, 1, 4) - 1;
  return CONFIDENCE_TO_GRADE[idx];
}

/**
 * Degrades the FSRS grade based on how many attempts it took to pass the card
 * in the current session. Multiple attempts mean the user didn't really "know" it.
 *
 * 1 attempt: trust the confidence, pass through.
 * 2-3 attempts: cap at Hard — you got there but it took work.
 * 4+: Always Again — too many tries, needs real reps.
 */
export function degradeGrade(baseGrade: Grade, attempts: number): Grade {
  if (attempts >= 4) return Rating.Again;
  if (attempts >= 2 && baseGrade > Rating.Hard) return Rating.Hard;
  return baseGrade;
}

/**
 * When effort=false (user was distracted), halve the FSRS-computed interval.
 * Only modifies due_at — stability and difficulty stay clean so the FSRS
 * model isn't corrupted by effort signals.
 */
export function applyEffortModifier(state: CardState, hadEffort: boolean, now: Date): CardState {
  if (hadEffort) return state;

  const fullIntervalMs = state.due_at.getTime() - now.getTime();
  const halvedDueAt = new Date(now.getTime() + Math.round(fullIntervalMs / 2));

  return { ...state, due_at: halvedDueAt };
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
