import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockSupabase, tournamentTeamsQb, ttResult } = vi.hoisted(() => {
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

  const { qb: tournamentTeamsQb, result: ttResult } = makeQb();

  return {
    mockSupabase: { from: vi.fn() },
    tournamentTeamsQb,
    ttResult,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { GET } from "../route";

const TOURNAMENT_ID = "tourn-1";
const tournamentParams = { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) };

// ── GET /api/tournaments/[tournamentId]/teams ──────────────────────────────────

describe("GET /api/tournaments/[tournamentId]/teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(tournamentTeamsQb);
    ttResult.data = null;
    ttResult.error = null;
  });

  it("returns teams array for the tournament", async () => {
    const teamA = { id: "team-1", name: "Team A" };
    const teamB = { id: "team-2", name: "Team B" };
    ttResult.data = [
      { team_id: "team-1", teams: teamA },
      { team_id: "team-2", teams: teamB },
    ];

    const request = new NextRequest(`http://localhost/api/tournaments/${TOURNAMENT_ID}/teams`);
    const response = await GET(request, tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([teamA, teamB]);
    expect(mockSupabase.from).toHaveBeenCalledWith("tournament_teams");
    expect(tournamentTeamsQb.eq).toHaveBeenCalledWith("tournament_id", TOURNAMENT_ID);
  });

  it("returns empty array when no teams found", async () => {
    ttResult.data = null;

    const request = new NextRequest(`http://localhost/api/tournaments/${TOURNAMENT_ID}/teams`);
    const response = await GET(request, tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    ttResult.error = { message: "Query failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(`http://localhost/api/tournaments/${TOURNAMENT_ID}/teams`);
    const response = await GET(request, tournamentParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to fetch tournament teams");
    consoleSpy.mockRestore();
  });
});

