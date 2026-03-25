import { describe, it, expect, beforeEach } from "bun:test";
import {
  isMastered,
  getCardState,
  updateCardState,
  setQueue,
  reinsertFailed,
  reinsertFamiliar,
  getQueue,
  type SessionCardState,
} from "../review-queue";

const userId = "test-user";
const midnight = new Date("2025-03-25T00:00:00Z");

describe("isMastered", () => {
  it("clean pass: 1 correct with 0 failures = mastered", () => {
    expect(isMastered({ failures: 0, passes: 1, lapse_called: false })).toBe(true);
  });

  it("clean pass: 0 correct with 0 failures = not mastered", () => {
    expect(isMastered({ failures: 0, passes: 0, lapse_called: false })).toBe(false);
  });

  it("struggled: first correct after failure = not mastered", () => {
    expect(isMastered({ failures: 1, passes: 1, lapse_called: true })).toBe(false);
  });

  it("struggled: second correct after failure = mastered", () => {
    expect(isMastered({ failures: 1, passes: 2, lapse_called: true })).toBe(true);
  });

  it("heavy struggle: 3 failures, 2 passes = mastered", () => {
    expect(isMastered({ failures: 3, passes: 2, lapse_called: true })).toBe(true);
  });

  it("heavy struggle: 3 failures, 1 pass = not mastered", () => {
    expect(isMastered({ failures: 3, passes: 1, lapse_called: true })).toBe(false);
  });
});

describe("getCardState", () => {
  beforeEach(() => {
    setQueue(userId, midnight, ["card-1", "card-2"]);
  });

  it("returns default state for unknown card", () => {
    const state = getCardState(userId, midnight, "unknown-card");
    expect(state).toEqual({ failures: 0, passes: 0, lapse_called: false });
  });

  it("returns stored state after update", () => {
    const updated: SessionCardState = { failures: 2, passes: 1, lapse_called: true };
    updateCardState(userId, midnight, "card-1", updated);
    expect(getCardState(userId, midnight, "card-1")).toEqual(updated);
  });
});

describe("reinsertFailed", () => {
  beforeEach(() => {
    const cards = Array.from({ length: 20 }, (_, i) => `card-${i}`);
    setQueue(userId, midnight, cards);
  });

  it("inserts Again card at position 6+", () => {
    reinsertFailed(userId, midnight, "failed-card", 1);
    const queue = getQueue(userId, midnight);
    const pos = queue!.indexOf("failed-card");
    expect(pos).toBeGreaterThanOrEqual(6);
  });

  it("inserts Hard card at position 4+", () => {
    reinsertFailed(userId, midnight, "hard-card", 2);
    const queue = getQueue(userId, midnight);
    const pos = queue!.indexOf("hard-card");
    expect(pos).toBeGreaterThanOrEqual(4);
  });
});

describe("reinsertFamiliar", () => {
  beforeEach(() => {
    const cards = Array.from({ length: 20 }, (_, i) => `card-${i}`);
    setQueue(userId, midnight, cards);
  });

  it("inserts familiar card at position 8+", () => {
    reinsertFamiliar(userId, midnight, "familiar-card");
    const queue = getQueue(userId, midnight);
    const pos = queue!.indexOf("familiar-card");
    expect(pos).toBeGreaterThanOrEqual(8);
  });
});
