import { describe, it, expect } from "bun:test";
import { Rating } from "ts-fsrs";
import { computeCompletionGrade, scheduleCard, daysBetween } from "../fsrs";

describe("computeCompletionGrade", () => {
  it("trusts user confidence when 0 failures", () => {
    expect(computeCompletionGrade(0, false, 3)).toBe(Rating.Good);
    expect(computeCompletionGrade(0, false, 4)).toBe(Rating.Easy);
  });

  it("returns Hard for 1-2 failures regardless of lapse", () => {
    expect(computeCompletionGrade(1, false, 4)).toBe(Rating.Hard);
    expect(computeCompletionGrade(2, true, 4)).toBe(Rating.Hard);
    expect(computeCompletionGrade(1, true, 3)).toBe(Rating.Hard);
  });

  it("returns Again for 3+ failures on new card (no lapse called)", () => {
    expect(computeCompletionGrade(3, false, 3)).toBe(Rating.Again);
    expect(computeCompletionGrade(5, false, 4)).toBe(Rating.Again);
  });

  it("caps at Hard for 3+ failures when lapse was called", () => {
    expect(computeCompletionGrade(3, true, 4)).toBe(Rating.Hard);
    expect(computeCompletionGrade(10, true, 3)).toBe(Rating.Hard);
  });
});

describe("scheduleCard", () => {
  it("returns interval_days as an integer", () => {
    const result = scheduleCard(
      { stability: 0, difficulty: 0 },
      Rating.Good,
      new Date(),
      null,
    );
    expect(typeof result.interval_days).toBe("number");
    expect(Number.isInteger(result.interval_days)).toBe(true);
    expect(result.interval_days).toBeGreaterThanOrEqual(0);
  });

  it("returns stability and difficulty as numbers", () => {
    const result = scheduleCard(
      { stability: 0, difficulty: 0 },
      Rating.Good,
      new Date(),
      null,
    );
    expect(typeof result.stability).toBe("number");
    expect(typeof result.difficulty).toBe("number");
    expect(result.stability).toBeGreaterThan(0);
  });

  it("handles existing cards with elapsed days", () => {
    const now = new Date();
    const lastReview = new Date(now.getTime() - 5 * 86_400_000); // 5 days ago
    const result = scheduleCard(
      { stability: 10, difficulty: 5 },
      Rating.Good,
      now,
      lastReview,
    );
    expect(result.interval_days).toBeGreaterThan(0);
  });
});

describe("daysBetween", () => {
  it("uses floor, not round", () => {
    const a = new Date("2025-01-01T00:00:00Z");
    const b = new Date("2025-01-01T18:00:00Z"); // 18 hours later
    expect(daysBetween(a, b)).toBe(0); // floor(0.75) = 0, not round(0.75) = 1
  });

  it("returns 1 for exactly 24 hours", () => {
    const a = new Date("2025-01-01T00:00:00Z");
    const b = new Date("2025-01-02T00:00:00Z");
    expect(daysBetween(a, b)).toBe(1);
  });

  it("returns 0 for negative (b before a)", () => {
    const a = new Date("2025-01-02T00:00:00Z");
    const b = new Date("2025-01-01T00:00:00Z");
    expect(daysBetween(a, b)).toBe(0);
  });
});
