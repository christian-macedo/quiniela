import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, matchesQb, matchesResult, tournamentTeamsQb, ttResult } = vi.hoisted(() => {
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

  return {
    mockSupabase: { from: vi.fn() },
    matchesQb,
    matchesResult,
    tournamentTeamsQb,
    ttResult,
  };
});

vi.mock("@/lib/middleware/admin-check", () => ({
  checkAdminPermission: mockCheckAdminPermission,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { GET, POST } from "../route";

// ── GET /api/matches ───────────────────────────────────────────────────────────

describe("GET /api/matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(matchesQb);
    mockCheckAdminPermission.mockResolvedValue(null);
    matchesResult.data = null;
    matchesResult.error = null;
  });

  it("returns all matches when no query param", async () => {
    matchesResult.data = [{ id: "m-1" }, { id: "m-2" }];
    const request = new NextRequest("http://localhost/api/matches");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "m-1" }, { id: "m-2" }]);
    expect(matchesQb.eq).not.toHaveBeenCalled();
  });

  it("filters by tournament_id when provided", async () => {
    matchesResult.data = [{ id: "m-1", tournament_id: "t-1" }];
    const request = new Request("http://localhost/api/matches?tournament_id=t-1");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "m-1", tournament_id: "t-1" }]);
    expect(matchesQb.eq).toHaveBeenCalledWith("tournament_id", "t-1");
  });

  it("returns empty array when data is null", async () => {
    matchesResult.data = null;
    const request = new NextRequest("http://localhost/api/matches");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    matchesResult.error = { message: "Connection failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost/api/matches");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to fetch matches");
    consoleSpy.mockRestore();
  });
});

// ── POST /api/matches ──────────────────────────────────────────────────────────

describe("POST /api/matches", () => {
  const makeRequest = (body: object) =>
    new NextRequest("http://localhost/api/matches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const validBody = {
    tournament_id: "t-1",
    home_team_id: "team-1",
    away_team_id: "team-2",
    match_date: "2026-06-11T12:00:00Z",
    round: "Group Stage",
    multiplier: 1,
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

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(403);
  });

  it("returns 400 for missing required fields", async () => {
    const response = await POST(makeRequest({ tournament_id: "t-1" }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Missing required fields");
  });

  it("returns 400 when home_team_id equals away_team_id", async () => {
    const response = await POST(
      makeRequest({ ...validBody, home_team_id: "team-1", away_team_id: "team-1" })
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("different");
  });

  it("returns 400 for multiplier below range", async () => {
    const response = await POST(makeRequest({ ...validBody, multiplier: 0 }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Multiplier");
  });

  it("returns 400 for multiplier above range", async () => {
    const response = await POST(makeRequest({ ...validBody, multiplier: 5 }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Multiplier");
  });

  it("returns 400 when teams are not in the tournament", async () => {
    ttResult.data = [{ team_id: "team-1" }]; // only 1 of the 2 teams found

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("registered in the tournament");
  });

  it("returns 400 when no teams found in tournament", async () => {
    ttResult.data = null;

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("registered in the tournament");
  });

  it("creates match and returns data on success", async () => {
    ttResult.data = [{ team_id: "team-1" }, { team_id: "team-2" }];
    const createdMatch = { id: "m-new", ...validBody };
    matchesResult.data = createdMatch;

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(createdMatch);
    expect(matchesQb.insert).toHaveBeenCalled();
  });

  it("returns 500 on DB error during insert", async () => {
    ttResult.data = [{ team_id: "team-1" }, { team_id: "team-2" }];
    matchesResult.error = { message: "Insert failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to create match");
    consoleSpy.mockRestore();
  });
});
