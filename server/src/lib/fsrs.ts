import { fsrs, Rating, type Grade } from "ts-fsrs";

export { Rating, type Grade };

const scheduler = fsrs({
  enable_fuzz: true,
  enable_short_term: false,
});

export interface ScheduleResult {
  interval_days: number;
  stability: number;
  difficulty: number;
}

export function scheduleCard(
  current: { stability: number; difficulty: number },
  grade: Grade,
  now: Date,
  lastReviewedAt: Date | null,
): ScheduleResult {
  const isNew = current.stability === 0 && current.difficulty === 0;
  const memoryState = isNew
    ? null
    : { stability: current.stability, difficulty: current.difficulty };
  const elapsedDays = lastReviewedAt ? daysBetween(lastReviewedAt, now) : 0;

  const next = scheduler.next_state(memoryState, elapsedDays, grade);
  const intervalDays = scheduler.next_interval(next.stability, elapsedDays);

  return {
    interval_days: intervalDays,
    stability: next.stability,
    difficulty: next.difficulty,
  };
}

/**
 * Computes the FSRS grade for the completion call based on session history.
 *
 * | Failures | Lapse Called? | Grade                     |
 * |----------|--------------|---------------------------|
 * | 0        | N/A          | Trust user confidence      |
 * | 1-2      | *            | Hard                       |
 * | 3+       | No (new)     | Again                      |
 * | 3+       | Yes          | Hard (cap — lapse caught it)|
 */
export function computeCompletionGrade(
  failures: number,
  lapseCalled: boolean,
  userConfidence: number,
): Grade {
  if (failures === 0) return gradeFromConfidence(userConfidence);
  if (failures <= 2) return Rating.Hard;
  if (!lapseCalled) return Rating.Again;
  return Rating.Hard;
}

const CONFIDENCE_TO_GRADE: Grade[] = [
  Rating.Again, // 1 = no recall
  Rating.Hard, // 2 = vague
  Rating.Good, // 3 = got it
  Rating.Easy, // 4 = knew it cold
];

export function gradeFromConfidence(confidence: number): Grade {
  const idx = clamp(confidence, 1, 4) - 1;
  return CONFIDENCE_TO_GRADE[idx];
}

export function daysBetween(a: Date, b: Date): number {
  const ms = b.getTime() - a.getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
