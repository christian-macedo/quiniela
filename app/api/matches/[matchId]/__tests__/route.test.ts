import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockSupabase, matchesQb, matchesResult } = vi.hoisted(() => {
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

  return {
    mockSupabase: { from: vi.fn() },
    matchesQb,
    matchesResult,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { GET } from "../route";

const MATCH_ID = "match-123";
const matchParams = { params: Promise.resolve({ matchId: MATCH_ID }) };

// ── GET /api/matches/[matchId] ─────────────────────────────────────────────────

describe("GET /api/matches/[matchId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(matchesQb);
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

