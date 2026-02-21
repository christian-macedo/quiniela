import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const {
  mockSupabase,
  matchesQb,
  matchesResult,
  tournamentTeamsQb,
  ttResult,
  predictionsQb,
  predictionsResult,
} = vi.hoisted(() => {
  function makeQb() {
    const result = { data: null as unknown, error: null as unknown };
    const qb: Record<string, ReturnType<typeof vi.fn>> = {
      select: vi.fn(),
      insert: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      eq: vi.fn(),
      single: vi.fn(),
      limit: vi.fn(),
      order: vi.fn(),
      in: vi.fn(),
      neq: vi.fn(),
    };
    for (const key of Object.keys(qb)) {
      if (key === "single") qb[key].mockImplementation(() => Promise.resolve(result));
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
import { GET, PUT, DELETE } from "../route";

const MATCH_ID = "match-123";
const matchParams = { params: Promise.resolve({ matchId: MATCH_ID }) };

// ── GET /api/matches/[matchId] ─────────────────────────────────────────────────

describe("GET /api/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(matchesQb);
    mockCheckAdminPermission.mockResolvedValue(null);
    matchesResult.data = null;
    matchesResult.error = null;
  });

  it("returns match with related data", async () => {
    const matchData = {
      id: MATCH_ID,
      home_team: { id: "team-1", name: "Team A" },
      away_team: { id: "team-2", name: "Team B" },
      tournament: { id: "t-1", name: "World Cup 2026" },
    };
    matchesResult.data = matchData;

    const request = new NextRequest(`http://localhost/api/matches/${MATCH_ID}`);
    const response = await GET(request, matchParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(matchData);
    expect(mockSupabase.from).toHaveBeenCalledWith("matches");
    expect(matchesQb.eq).toHaveBeenCalledWith("id", MATCH_ID);
  });

  it("returns 500 on DB error", async () => {
    matchesResult.error = { message: "Connection failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(`http://localhost/api/matches/${MATCH_ID}`);
    const response = await GET(request, matchParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to fetch match");
    consoleSpy.mockRestore();
  });
});

// ── PUT /api/matches/[matchId] ─────────────────────────────────────────────────

describe("PUT /api/matches/[matchId]", () => {
  const makeRequest = (body: object) =>
    new NextRequest(`http://localhost/api/matches/${MATCH_ID}`, {
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

  it("returns admin error when not authorized", async () => {
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

  it("returns 400 when teams are the same", async () => {
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

  it("returns 400 when teams not in tournament", async () => {
    ttResult.data = [{ team_id: "team-1" }]; // only 1 of the 2 teams found

    const response = await PUT(makeRequest(validBody), matchParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("registered in the tournament");
  });

  it("updates and returns match on success", async () => {
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

// ── DELETE /api/matches/[matchId] ─────────────────────────────────────────────

describe("DELETE /api/matches/[matchId]", () => {
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

  it("returns admin error when not authorized", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const request = new NextRequest(`http://localhost/api/matches/${MATCH_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, matchParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 when predictions exist for the match", async () => {
    predictionsResult.data = [{ id: "pred-1" }];

    const request = new NextRequest(`http://localhost/api/matches/${MATCH_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, matchParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("predictions");
  });

  it("deletes match and returns success", async () => {
    predictionsResult.data = []; // no predictions

    const request = new NextRequest(`http://localhost/api/matches/${MATCH_ID}`, {
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
    predictionsResult.data = []; // no predictions
    matchesResult.error = { message: "Delete failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(`http://localhost/api/matches/${MATCH_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, matchParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to delete match");
    consoleSpy.mockRestore();
  });
});
