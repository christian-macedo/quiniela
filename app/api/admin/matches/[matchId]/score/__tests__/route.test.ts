import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());
const mockCalculatePoints = vi.hoisted(() => vi.fn());

const { mockSupabase, matchesQb, matchesResult, predictionsQb, predictionsResult } = vi.hoisted(
  () => {
    function makeQb() {
      const result = { data: null as unknown, error: null as unknown };
      const qb: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        neq: vi.fn(),
        in: vi.fn(),
        single: vi.fn(),
        maybeSingle: vi.fn(),
        limit: vi.fn(),
        order: vi.fn(),
      };
      for (const key of Object.keys(qb)) {
        if (key === "single" || key === "maybeSingle")
          qb[key].mockImplementation(() => Promise.resolve(result));
        else qb[key].mockReturnValue(qb);
      }
      Object.defineProperty(qb, "then", {
        get: () => (resolve: (v: unknown) => void) => resolve(result),
        configurable: true,
      });
      return { qb, result };
    }

    const { qb: matchesQb, result: matchesResult } = makeQb();
    const { qb: predictionsQb, result: predictionsResult } = makeQb();

    return {
      mockSupabase: { from: vi.fn() },
      matchesQb,
      matchesResult,
      predictionsQb,
      predictionsResult,
    };
  }
);

vi.mock("@/lib/middleware/admin-check", () => ({
  checkAdminPermission: mockCheckAdminPermission,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/utils/scoring", () => ({
  calculatePoints: mockCalculatePoints,
}));

vi.mock("@/lib/utils/date", () => ({
  getCurrentUTC: vi.fn(() => "2026-02-21T00:00:00.000Z"),
}));

// Import after mocking
import { POST } from "../route";

const MATCH_ID = "match-123";
const matchParams = { params: Promise.resolve({ matchId: MATCH_ID }) };

// ── POST /api/admin/matches/[matchId]/score ────────────────────────────────────

describe("POST /api/admin/matches/[matchId]/score", () => {
  const makeRequest = (body: object) =>
    new NextRequest(`http://localhost/api/admin/matches/${MATCH_ID}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) =>
      table === "predictions" ? predictionsQb : matchesQb
    );
    mockCheckAdminPermission.mockResolvedValue(null);
    mockCalculatePoints.mockReturnValue(0);
    matchesResult.data = null;
    matchesResult.error = null;
    predictionsResult.data = null;
    predictionsResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await POST(makeRequest({ home_score: 2, away_score: 1 }), matchParams);
    expect(response.status).toBe(403);
  });

  it("scores a match and calculates prediction points when status is completed", async () => {
    matchesResult.data = { multiplier: 2, tournament_id: "t-1", status: "scheduled" };
    predictionsResult.data = [{ id: "pred-1", predicted_home_score: 2, predicted_away_score: 1 }];
    mockCalculatePoints.mockReturnValue(3);

    const response = await POST(
      makeRequest({ home_score: 2, away_score: 1, status: "completed" }),
      matchParams
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockCalculatePoints).toHaveBeenCalledWith(2, 1, 2, 1, 2);
    expect(predictionsQb.update).toHaveBeenCalledWith({ points_earned: 3 });
    expect(predictionsQb.eq).toHaveBeenCalledWith("id", "pred-1");
  });

  it("resets prediction scores when changing from completed to another status", async () => {
    matchesResult.data = { multiplier: 1, tournament_id: "t-1", status: "completed" };
    predictionsResult.data = [{ id: "pred-1", predicted_home_score: 1, predicted_away_score: 0 }];

    const response = await POST(
      makeRequest({ home_score: 2, away_score: 1, status: "in_progress" }),
      matchParams
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockCalculatePoints).not.toHaveBeenCalled();
    expect(predictionsQb.update).toHaveBeenCalledWith({ points_earned: 0 });
  });

  it("skips prediction updates when there are no predictions", async () => {
    matchesResult.data = { multiplier: 1, tournament_id: "t-1", status: "scheduled" };
    predictionsResult.data = [];

    const response = await POST(
      makeRequest({ home_score: 1, away_score: 0, status: "completed" }),
      matchParams
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(mockCalculatePoints).not.toHaveBeenCalled();
    expect(predictionsQb.update).not.toHaveBeenCalled();
  });

  it("defaults to 'completed' status when status is not provided", async () => {
    matchesResult.data = { multiplier: 1, tournament_id: "t-1", status: "scheduled" };
    predictionsResult.data = [];

    const response = await POST(
      makeRequest({ home_score: 1, away_score: 0 }), // no status field
      matchParams
    );

    expect(response.status).toBe(200);
    expect(matchesQb.update).toHaveBeenCalledWith(
      expect.objectContaining({ status: "completed" })
    );
  });

  it("returns 500 when match fetch fails", async () => {
    matchesResult.error = { message: "Match not found" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(
      makeRequest({ home_score: 2, away_score: 1, status: "completed" }),
      matchParams
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to update match score");
    consoleSpy.mockRestore();
  });

  it("returns 500 when match update fails", async () => {
    matchesResult.data = { multiplier: 1, tournament_id: "t-1", status: "scheduled" };
    // The second call to matches (update) should fail — override via update mock
    matchesQb.update.mockReturnValueOnce({
      ...matchesQb,
      eq: vi.fn().mockReturnValue(Promise.resolve({ error: { message: "Update failed" } })),
    });
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(
      makeRequest({ home_score: 2, away_score: 1, status: "completed" }),
      matchParams
    );

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to update match score");
    consoleSpy.mockRestore();
  });
});
