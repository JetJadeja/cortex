import { describe, it, expect } from "bun:test";
import { applyEffortHalving, computeDueAt, computeDueDate } from "../due-date";

describe("applyEffortHalving", () => {
  it("halves the interval", () => {
    expect(applyEffortHalving(10)).toBe(5);
    expect(applyEffortHalving(7)).toBe(4); // round(3.5) = 4
  });

  it("enforces minimum of 1 day", () => {
    expect(applyEffortHalving(1)).toBe(1);
    expect(applyEffortHalving(0)).toBe(1);
  });

  it("handles large intervals", () => {
    expect(applyEffortHalving(100)).toBe(50);
  });
});

describe("computeDueAt", () => {
  it("adds days to the given date", () => {
    const now = new Date("2025-03-01T12:00:00Z");
    const result = computeDueAt(now, 5);
    expect(result.getDate()).toBe(6);
  });

  it("handles month boundaries", () => {
    const now = new Date("2025-01-30T12:00:00Z");
    const result = computeDueAt(now, 3);
    expect(result.getMonth()).toBe(1); // February
    expect(result.getDate()).toBe(2);
  });
});

describe("computeDueDate", () => {
  it("formats a UTC date in the given timezone", () => {
    // Midnight UTC on March 2 is still March 1 in Pacific time (UTC-8)
    const dueAt = new Date("2025-03-02T02:00:00Z");
    const result = computeDueDate(dueAt, "America/Los_Angeles");
    expect(result).toBe("2025-03-01");
  });

  it("formats correctly in UTC", () => {
    const dueAt = new Date("2025-06-15T12:00:00Z");
    const result = computeDueDate(dueAt, "UTC");
    expect(result).toBe("2025-06-15");
  });

  it("falls back to UTC for invalid timezone", () => {
    const dueAt = new Date("2025-06-15T12:00:00Z");
    const result = computeDueDate(dueAt, "Invalid/Zone");
    expect(result).toBe("2025-06-15");
  });
});
