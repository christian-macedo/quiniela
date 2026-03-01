import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, matchesQb, matchesResult, tournamentTeamsQb, ttResult, predictionsQb, predictionsResult } =
  vi.hoisted(() => {
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
    const { qb: tournamentTeamsQb, result: ttResult } = makeQb();
    const { qb: predictionsQb, result: predictionsResult } = makeQb();

    return {
      mockSupabase: { from: vi.fn() },
      matchesQb,
      matchesResult,
      tournamentTeamsQb,
      ttResult,
      predictionsQb,
      predictionsResult,
    };
  });

vi.mock("@/lib/middleware/admin-check", () => ({
  checkAdminPermission: mockCheckAdminPermission,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/utils/date", () => ({
  getCurrentUTC: vi.fn(() => "2026-02-21T00:00:00.000Z"),
}));

// Import after mocking
import { PUT, DELETE } from "../route";

const MATCH_ID = "match-123";
const matchParams = { params: Promise.resolve({ matchId: MATCH_ID }) };

// ── PUT /api/admin/matches/[matchId] ───────────────────────────────────────────

describe("PUT /api/admin/matches/[matchId]", () => {
  const makeRequest = (body: object) =>
    new NextRequest(`http://localhost/api/admin/matches/${MATCH_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const validBody = {
    tournament_id: "t-1",
    home_team_id: "team-1",
    away_team_id: "team-2",
    match_date: "2026-06-11T12:00:00Z",
    round: "Group Stage",
    status: "scheduled",
    multiplier: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) =>
      table === "tournament_teams" ? tournamentTeamsQb : matchesQb
    );
    mockCheckAdminPermission.mockResolvedValue(null);
    matchesResult.data = null;
    matchesResult.error = null;
    ttResult.data = null;
    ttResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await PUT(makeRequest(validBody), matchParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    const response = await PUT(makeRequest({ tournament_id: "t-1" }), matchParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 when home_team_id equals away_team_id", async () => {
    const response = await PUT(
      makeRequest({ ...validBody, home_team_id: "team-1", away_team_id: "team-1" }),
      matchParams
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("different");
  });

  it("returns 400 for invalid multiplier", async () => {
    const response = await PUT(makeRequest({ ...validBody, multiplier: 4 }), matchParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Multiplier");
  });

  it("returns 400 when teams are not in the tournament", async () => {
    ttResult.data = [{ team_id: "team-1" }]; // only 1 of 2

    const response = await PUT(makeRequest(validBody), matchParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("registered in the tournament");
  });

  it("updates match and returns data on success", async () => {
    ttResult.data = [{ team_id: "team-1" }, { team_id: "team-2" }];
    const updatedMatch = { id: MATCH_ID, ...validBody };
    matchesResult.data = updatedMatch;

    const response = await PUT(makeRequest(validBody), matchParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(updatedMatch);
    expect(matchesQb.update).toHaveBeenCalled();
    expect(matchesQb.eq).toHaveBeenCalledWith("id", MATCH_ID);
  });

  it("returns 500 on DB error during update", async () => {
    ttResult.data = [{ team_id: "team-1" }, { team_id: "team-2" }];
    matchesResult.error = { message: "Update failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PUT(makeRequest(validBody), matchParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to update match");
    consoleSpy.mockRestore();
  });
});

// ── DELETE /api/admin/matches/[matchId] ────────────────────────────────────────

describe("DELETE /api/admin/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) =>
      table === "predictions" ? predictionsQb : matchesQb
    );
    mockCheckAdminPermission.mockResolvedValue(null);
    matchesResult.data = null;
    matchesResult.error = null;
    predictionsResult.data = null;
    predictionsResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const request = new NextRequest(`http://localhost/api/admin/matches/${MATCH_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, matchParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 when predictions exist for the match", async () => {
    predictionsResult.data = [{ id: "pred-1" }];

    const request = new NextRequest(`http://localhost/api/admin/matches/${MATCH_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, matchParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("predictions");
  });

  it("deletes match and returns success when no predictions exist", async () => {
    predictionsResult.data = [];

    const request = new NextRequest(`http://localhost/api/admin/matches/${MATCH_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, matchParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(matchesQb.delete).toHaveBeenCalled();
    expect(matchesQb.eq).toHaveBeenCalledWith("id", MATCH_ID);
  });

  it("returns 500 on DB error during delete", async () => {
    predictionsResult.data = [];
    matchesResult.error = { message: "Delete failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(`http://localhost/api/admin/matches/${MATCH_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, matchParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to delete match");
    consoleSpy.mockRestore();
  });
});
