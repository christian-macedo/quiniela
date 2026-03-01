import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const {
  mockSupabase,
  tournamentsQb,
  tournamentsResult,
  matchesQb,
  matchesResult,
  rankingsQb,
  rankingsResult,
  ttQb,
  ttResult,
} = vi.hoisted(() => {
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

  const { qb: tournamentsQb, result: tournamentsResult } = makeQb();
  const { qb: matchesQb, result: matchesResult } = makeQb();
  const { qb: rankingsQb, result: rankingsResult } = makeQb();
  const { qb: ttQb, result: ttResult } = makeQb();

  return {
    mockSupabase: { from: vi.fn() },
    tournamentsQb,
    tournamentsResult,
    matchesQb,
    matchesResult,
    rankingsQb,
    rankingsResult,
    ttQb,
    ttResult,
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

const TOURNAMENT_ID = "tourn-1";
const tournamentParams = { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) };

// ── PUT /api/admin/tournaments/[tournamentId] ──────────────────────────────────

describe("PUT /api/admin/tournaments/[tournamentId]", () => {
  const makeRequest = (body: object) =>
    new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const validBody = {
    name: "World Cup 2026",
    sport: "soccer",
    start_date: "2026-06-11",
    end_date: "2026-07-19",
    status: "active",
    scoring_rules: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(tournamentsQb);
    mockCheckAdminPermission.mockResolvedValue(null);
    tournamentsResult.data = null;
    tournamentsResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await PUT(makeRequest(validBody), tournamentParams);
    expect(response.status).toBe(403);
  });

  it("updates tournament and returns data on success", async () => {
    const updated = { id: TOURNAMENT_ID, ...validBody };
    tournamentsResult.data = updated;

    const response = await PUT(makeRequest(validBody), tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(updated);
    expect(tournamentsQb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: validBody.name,
        updated_at: "2026-02-21T00:00:00.000Z",
      })
    );
    expect(tournamentsQb.eq).toHaveBeenCalledWith("id", TOURNAMENT_ID);
  });

  it("returns 500 on DB error during update", async () => {
    tournamentsResult.error = { message: "Update failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PUT(makeRequest(validBody), tournamentParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to update tournament");
    consoleSpy.mockRestore();
  });
});

// ── DELETE /api/admin/tournaments/[tournamentId] ───────────────────────────────

describe("DELETE /api/admin/tournaments/[tournamentId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "matches") return matchesQb;
      if (table === "tournament_rankings") return rankingsQb;
      if (table === "tournament_teams") return ttQb;
      return tournamentsQb;
    });
    mockCheckAdminPermission.mockResolvedValue(null);
    tournamentsResult.data = null;
    tournamentsResult.error = null;
    matchesResult.data = null;
    matchesResult.error = null;
    rankingsResult.data = null;
    rankingsResult.error = null;
    ttResult.data = null;
    ttResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const request = new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, tournamentParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 when tournament has matches", async () => {
    matchesResult.data = [{ id: "m-1" }];

    const request = new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("has matches");
  });

  it("returns 400 when tournament has predictions (rankings)", async () => {
    matchesResult.data = [];
    rankingsResult.data = [{ user_id: "u-1" }];

    const request = new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("predictions");
  });

  it("deletes tournament and returns success when safe to delete", async () => {
    matchesResult.data = [];
    rankingsResult.data = [];

    const request = new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(ttQb.delete).toHaveBeenCalled();
    expect(ttQb.eq).toHaveBeenCalledWith("tournament_id", TOURNAMENT_ID);
    expect(tournamentsQb.delete).toHaveBeenCalled();
    expect(tournamentsQb.eq).toHaveBeenCalledWith("id", TOURNAMENT_ID);
  });

  it("returns 500 on DB error during matches check", async () => {
    matchesResult.error = { message: "Query failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to delete tournament");
    consoleSpy.mockRestore();
  });

  it("returns 500 on DB error during tournament delete", async () => {
    matchesResult.data = [];
    rankingsResult.data = [];
    tournamentsResult.error = { message: "Delete failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to delete tournament");
    consoleSpy.mockRestore();
  });
});
