import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, tournamentTeamsQb, ttResult, matchesQb, matchesResult } = vi.hoisted(() => {
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

  const { qb: tournamentTeamsQb, result: ttResult } = makeQb();
  const { qb: matchesQb, result: matchesResult } = makeQb();

  return {
    mockSupabase: { from: vi.fn() },
    tournamentTeamsQb,
    ttResult,
    matchesQb,
    matchesResult,
  };
});

vi.mock("@/lib/middleware/admin-check", () => ({
  checkAdminPermission: mockCheckAdminPermission,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { POST, DELETE } from "../route";

const TOURNAMENT_ID = "tourn-1";
const tournamentParams = { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) };

// ── POST /api/admin/tournaments/[tournamentId]/teams ───────────────────────────

describe("POST /api/admin/tournaments/[tournamentId]/teams", () => {
  const makeRequest = (body: object) =>
    new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/teams`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(tournamentTeamsQb);
    mockCheckAdminPermission.mockResolvedValue(null);
    ttResult.data = null;
    ttResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await POST(makeRequest({ team_id: "team-1" }), tournamentParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 when team is already in the tournament", async () => {
    ttResult.data = { team_id: "team-1", tournament_id: TOURNAMENT_ID };

    const response = await POST(makeRequest({ team_id: "team-1" }), tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("already in this tournament");
  });

  it("inserts team and returns data on success", async () => {
    // First single() — existence check: not found
    tournamentTeamsQb.single.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: null })
    );
    // Insert result via default qb result
    const insertedRecord = { tournament_id: TOURNAMENT_ID, team_id: "team-2" };
    ttResult.data = insertedRecord;

    const response = await POST(makeRequest({ team_id: "team-2" }), tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(insertedRecord);
    expect(tournamentTeamsQb.insert).toHaveBeenCalledWith({
      tournament_id: TOURNAMENT_ID,
      team_id: "team-2",
    });
  });

  it("returns 500 on DB error during insert", async () => {
    // Existence check: not found
    tournamentTeamsQb.single.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: null })
    );
    ttResult.error = { message: "Insert failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest({ team_id: "team-2" }), tournamentParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to add team to tournament");
    consoleSpy.mockRestore();
  });
});

// ── DELETE /api/admin/tournaments/[tournamentId]/teams ─────────────────────────

describe("DELETE /api/admin/tournaments/[tournamentId]/teams", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) =>
      table === "matches" ? matchesQb : tournamentTeamsQb
    );
    mockCheckAdminPermission.mockResolvedValue(null);
    ttResult.data = null;
    ttResult.error = null;
    matchesResult.data = null;
    matchesResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/teams?teamId=team-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 when teamId query param is missing", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/teams`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Team ID is required");
  });

  it("returns 400 when team has matches in the tournament", async () => {
    matchesResult.data = [{ id: "m-1" }]; // team has at least one match

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/teams?teamId=team-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("has matches");
  });

  it("removes team and returns success when no matches exist", async () => {
    matchesResult.data = [];

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/teams?teamId=team-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(tournamentTeamsQb.delete).toHaveBeenCalled();
    expect(tournamentTeamsQb.eq).toHaveBeenCalledWith("tournament_id", TOURNAMENT_ID);
    expect(tournamentTeamsQb.eq).toHaveBeenCalledWith("team_id", "team-1");
  });

  it("returns 500 on DB error during removal", async () => {
    matchesResult.data = [];
    ttResult.error = { message: "Delete failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/teams?teamId=team-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to remove team from tournament");
    consoleSpy.mockRestore();
  });
});
