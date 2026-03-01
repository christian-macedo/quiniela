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
import { POST } from "../route";

// ── POST /api/admin/matches ────────────────────────────────────────────────────

describe("POST /api/admin/matches", () => {
  const makeRequest = (body: object) =>
    new NextRequest("http://localhost/api/admin/matches", {
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

  it("returns 403 when admin check fails", async () => {
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

  it("returns 400 for multiplier below valid range", async () => {
    const response = await POST(makeRequest({ ...validBody, multiplier: 0 }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Multiplier");
  });

  it("returns 400 for multiplier above valid range", async () => {
    const response = await POST(makeRequest({ ...validBody, multiplier: 5 }));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Multiplier");
  });

  it("returns 400 when teams are not both in the tournament", async () => {
    ttResult.data = [{ team_id: "team-1" }]; // only 1 of 2 found

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("registered in the tournament");
  });

  it("returns 400 when no tournament teams found", async () => {
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
