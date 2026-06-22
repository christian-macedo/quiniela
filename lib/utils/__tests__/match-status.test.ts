import { describe, it, expect } from "vitest";
import { getEffectiveMatchStatus } from "../match-status";

const HOUR = 60 * 60 * 1000;
const future = () => new Date(Date.now() + HOUR).toISOString();
const past = () => new Date(Date.now() - HOUR).toISOString();

describe("getEffectiveMatchStatus", () => {
  it("keeps a scheduled match scheduled when start time is in the future", () => {
    expect(getEffectiveMatchStatus({ status: "scheduled", match_date: future() })).toBe(
      "scheduled"
    );
  });

  it("derives in_progress for a scheduled match whose start time has passed", () => {
    expect(getEffectiveMatchStatus({ status: "scheduled", match_date: past() })).toBe(
      "in_progress"
    );
  });

  it("passes through completed regardless of time", () => {
    expect(getEffectiveMatchStatus({ status: "completed", match_date: past() })).toBe("completed");
    expect(getEffectiveMatchStatus({ status: "completed", match_date: future() })).toBe(
      "completed"
    );
  });

  it("passes through cancelled regardless of time", () => {
    expect(getEffectiveMatchStatus({ status: "cancelled", match_date: past() })).toBe("cancelled");
    expect(getEffectiveMatchStatus({ status: "cancelled", match_date: future() })).toBe(
      "cancelled"
    );
  });
});
