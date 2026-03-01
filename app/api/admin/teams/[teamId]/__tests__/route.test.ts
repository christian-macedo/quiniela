import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, teamsQb, teamsResult, matchesQb, matchesResult, ttQb, ttResult } =
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

    const { qb: teamsQb, result: teamsResult } = makeQb();
    const { qb: matchesQb, result: matchesResult } = makeQb();
    const { qb: ttQb, result: ttResult } = makeQb();

    return {
      mockSupabase: { from: vi.fn() },
      teamsQb,
      teamsResult,
      matchesQb,
      matchesResult,
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

const TEAM_ID = "team-123";
const teamParams = { params: Promise.resolve({ teamId: TEAM_ID }) };

// ── PUT /api/admin/teams/[teamId] ──────────────────────────────────────────────

describe("PUT /api/admin/teams/[teamId]", () => {
  const makeRequest = (body: object) =>
    new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const validBody = {
    name: "Brazil",
    short_name: "BRA",
    country_code: "BR",
    logo_url: "/logos/brazil.png",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(teamsQb);
    mockCheckAdminPermission.mockResolvedValue(null);
    teamsResult.data = null;
    teamsResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await PUT(makeRequest(validBody), teamParams);
    expect(response.status).toBe(403);
  });

  it("updates team and returns data on success", async () => {
    const updatedTeam = { id: TEAM_ID, ...validBody };
    teamsResult.data = updatedTeam;

    const response = await PUT(makeRequest(validBody), teamParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(updatedTeam);
    expect(teamsQb.update).toHaveBeenCalledWith(
      expect.objectContaining({
        name: validBody.name,
        short_name: validBody.short_name,
        country_code: validBody.country_code,
        logo_url: validBody.logo_url,
        updated_at: "2026-02-21T00:00:00.000Z",
      })
    );
    expect(teamsQb.eq).toHaveBeenCalledWith("id", TEAM_ID);
  });

  it("returns 500 on DB error during update", async () => {
    teamsResult.error = { message: "Update failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PUT(makeRequest(validBody), teamParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to update team");
    consoleSpy.mockRestore();
  });
});

// ── DELETE /api/admin/teams/[teamId] ──────────────────────────────────────────

describe("DELETE /api/admin/teams/[teamId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "matches") return matchesQb;
      if (table === "tournament_teams") return ttQb;
      return teamsQb;
    });
    mockCheckAdminPermission.mockResolvedValue(null);
    teamsResult.data = null;
    teamsResult.error = null;
    matchesResult.data = null;
    matchesResult.error = null;
    ttResult.data = null;
    ttResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const request = new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, teamParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 when team has home matches", async () => {
    matchesResult.data = [{ id: "m-1" }]; // home_team_id check returns a match

    const request = new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, teamParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("participated in matches");
  });

  it("returns 400 when team is in a tournament", async () => {
    matchesResult.data = []; // no home matches
    // away matches also none — use a second call to matchesQb, so data = []
    // but tournament_teams check returns a record
    ttResult.data = [{ tournament_id: "t-1" }];

    const request = new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, teamParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("registered in tournaments");
  });

  it("deletes team and returns success when no matches or tournaments", async () => {
    matchesResult.data = []; // no home or away matches
    ttResult.data = []; // not in any tournament

    const request = new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, teamParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(teamsQb.delete).toHaveBeenCalled();
    expect(teamsQb.eq).toHaveBeenCalledWith("id", TEAM_ID);
  });

  it("returns 500 on DB error during home matches check", async () => {
    matchesResult.error = { message: "Query failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, teamParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to delete team");
    consoleSpy.mockRestore();
  });

  it("returns 500 on DB error during delete", async () => {
    matchesResult.data = [];
    ttResult.data = [];
    teamsResult.error = { message: "Delete failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(`http://localhost/api/admin/teams/${TEAM_ID}`, {
      method: "DELETE",
    });
    const response = await DELETE(request, teamParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to delete team");
    consoleSpy.mockRestore();
  });
});
