import { describe, it, expect } from "vitest";
import { calculatePoints, getPointsDescription, getBasePoints } from "../scoring";

describe("calculatePoints", () => {
  describe("exact score match (3 points)", () => {
    it("awards 3 points for exact score prediction", () => {
      expect(calculatePoints(2, 1, 2, 1)).toBe(3);
    });

    it("awards 3 points for exact draw prediction", () => {
      expect(calculatePoints(0, 0, 0, 0)).toBe(3);
    });

    it("awards 3 points for exact high-scoring match", () => {
      expect(calculatePoints(4, 3, 4, 3)).toBe(3);
    });

    it("applies multiplier to exact score", () => {
      expect(calculatePoints(2, 1, 2, 1, 2)).toBe(6);
    });

    it("applies multiplier of 3 to exact score", () => {
      expect(calculatePoints(1, 0, 1, 0, 3)).toBe(9);
    });
  });

  describe("correct winner + correct goal difference (2 points)", () => {
    it("awards 2 points for correct winner and goal difference", () => {
      // Predicted 2-0 (diff +2), actual 3-1 (diff +2)
      expect(calculatePoints(2, 0, 3, 1)).toBe(2);
    });

    it("awards 2 points when away team wins with correct difference", () => {
      // Predicted 0-2 (diff -2), actual 1-3 (diff -2)
      expect(calculatePoints(0, 2, 1, 3)).toBe(2);
    });

    it("applies multiplier to winner + difference", () => {
      expect(calculatePoints(2, 0, 3, 1, 2)).toBe(4);
    });
  });

  describe("correct winner only (1 point)", () => {
    it("awards 1 point for correct winner but wrong goal difference", () => {
      // Predicted 1-0 (diff +1), actual 3-0 (diff +3)
      expect(calculatePoints(1, 0, 3, 0)).toBe(1);
    });

    it("awards 1 point for correct away winner but wrong difference", () => {
      // Predicted 0-1 (diff -1), actual 0-3 (diff -3)
      expect(calculatePoints(0, 1, 0, 3)).toBe(1);
    });

    it("awards 1 point for correct draw but wrong scores", () => {
      // Predicted 1-1 (draw), actual 2-2 (draw) — same sign (0), diff differs in value
      // Actually diff is 0 vs 0, so abs(diff) matches → 2 points
      expect(calculatePoints(1, 1, 2, 2)).toBe(2);
    });

    it("applies multiplier to correct winner", () => {
      expect(calculatePoints(1, 0, 3, 0, 2)).toBe(2);
    });
  });

  describe("incorrect prediction (0 points)", () => {
    it("awards 0 points for wrong winner", () => {
      // Predicted home win, actual away win
      expect(calculatePoints(2, 1, 0, 1)).toBe(0);
    });

    it("awards 0 points when predicted draw but team won", () => {
      expect(calculatePoints(1, 1, 2, 1)).toBe(0);
    });

    it("awards 0 points when predicted win but was draw", () => {
      expect(calculatePoints(2, 0, 1, 1)).toBe(0);
    });

    it("returns 0 even with multiplier", () => {
      expect(calculatePoints(2, 1, 0, 1, 3)).toBe(0);
    });
  });

  describe("default multiplier", () => {
    it("uses multiplier of 1 when not specified", () => {
      expect(calculatePoints(2, 1, 2, 1)).toBe(3);
    });
  });
});

describe("getPointsDescription", () => {
  it('returns "Exact score!" for 3 base points', () => {
    expect(getPointsDescription(3)).toBe("Exact score!");
  });

  it('returns "Correct winner + goal difference" for 2 base points', () => {
    expect(getPointsDescription(2)).toBe("Correct winner + goal difference");
  });

  it('returns "Correct winner" for 1 base point', () => {
    expect(getPointsDescription(1)).toBe("Correct winner");
  });

  it('returns "No points" for 0 base points', () => {
    expect(getPointsDescription(0)).toBe("No points");
  });

  it("includes multiplier text when multiplier > 1", () => {
    expect(getPointsDescription(3, 2)).toBe("Exact score! (×2)");
    expect(getPointsDescription(1, 3)).toBe("Correct winner (×3)");
  });

  it("does not include multiplier text when multiplier is 1", () => {
    expect(getPointsDescription(3, 1)).toBe("Exact score!");
  });
});

describe("getBasePoints", () => {
  it("returns 3 for exact score match", () => {
    expect(getBasePoints(2, 1, 2, 1)).toBe(3);
  });

  it("returns 2 for correct winner and goal difference", () => {
    expect(getBasePoints(2, 0, 3, 1)).toBe(2);
  });

  it("returns 1 for correct winner only", () => {
    expect(getBasePoints(1, 0, 3, 0)).toBe(1);
  });

  it("returns 0 for incorrect prediction", () => {
    expect(getBasePoints(2, 1, 0, 1)).toBe(0);
  });
});
