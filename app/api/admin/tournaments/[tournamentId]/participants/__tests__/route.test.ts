import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const {
  mockSupabase,
  participantsQb,
  participantsResult,
  usersQb,
  usersResult,
  matchesQb,
  matchesResult,
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

  const { qb: participantsQb, result: participantsResult } = makeQb();
  const { qb: usersQb, result: usersResult } = makeQb();
  const { qb: matchesQb, result: matchesResult } = makeQb();
  const { qb: predictionsQb, result: predictionsResult } = makeQb();

  return {
    mockSupabase: { from: vi.fn() },
    participantsQb,
    participantsResult,
    usersQb,
    usersResult,
    matchesQb,
    matchesResult,
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

// Import after mocking
import { POST, DELETE } from "../route";

const TOURNAMENT_ID = "tourn-1";
const tournamentParams = { params: Promise.resolve({ tournamentId: TOURNAMENT_ID }) };

// ── POST /api/admin/tournaments/[tournamentId]/participants ────────────────────

describe("POST /api/admin/tournaments/[tournamentId]/participants", () => {
  const makeRequest = (body: object) =>
    new NextRequest(`http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/participants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") return usersQb;
      if (table === "tournament_participants") return participantsQb;
      return usersQb;
    });
    mockCheckAdminPermission.mockResolvedValue(null);
    participantsResult.data = null;
    participantsResult.error = null;
    usersResult.data = null;
    usersResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await POST(makeRequest({ user_id: "u-1" }), tournamentParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 when user_id is missing", async () => {
    const response = await POST(makeRequest({}), tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("User ID is required");
  });

  it("returns 404 when user does not exist", async () => {
    usersResult.data = null; // single() returns null data = user not found

    const response = await POST(makeRequest({ user_id: "u-nonexistent" }), tournamentParams);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toContain("User not found");
  });

  it("returns 400 when user is already a participant", async () => {
    usersResult.data = { id: "u-1" }; // user exists
    // First single() finds user, second single() finds existing participant
    usersQb.single.mockImplementationOnce(() =>
      Promise.resolve({ data: { id: "u-1" }, error: null })
    );
    participantsResult.data = { user_id: "u-1", tournament_id: TOURNAMENT_ID };

    const response = await POST(makeRequest({ user_id: "u-1" }), tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("already a participant");
  });

  it("adds participant and returns data on success", async () => {
    // User exists
    usersQb.single.mockImplementationOnce(() =>
      Promise.resolve({ data: { id: "u-1" }, error: null })
    );
    // Not already a participant
    participantsQb.single.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: null })
    );
    // Insert result
    const insertedRecord = { tournament_id: TOURNAMENT_ID, user_id: "u-1" };
    participantsResult.data = insertedRecord;

    const response = await POST(makeRequest({ user_id: "u-1" }), tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(insertedRecord);
    expect(participantsQb.insert).toHaveBeenCalledWith({
      tournament_id: TOURNAMENT_ID,
      user_id: "u-1",
    });
  });

  it("returns 500 on DB error during insert", async () => {
    usersQb.single.mockImplementationOnce(() =>
      Promise.resolve({ data: { id: "u-1" }, error: null })
    );
    participantsQb.single.mockImplementationOnce(() =>
      Promise.resolve({ data: null, error: null })
    );
    participantsResult.error = { message: "Insert failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest({ user_id: "u-1" }), tournamentParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to add participant to tournament");
    consoleSpy.mockRestore();
  });
});

// ── DELETE /api/admin/tournaments/[tournamentId]/participants ─────────────────

describe("DELETE /api/admin/tournaments/[tournamentId]/participants", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "matches") return matchesQb;
      if (table === "predictions") return predictionsQb;
      if (table === "tournament_participants") return participantsQb;
      return participantsQb;
    });
    mockCheckAdminPermission.mockResolvedValue(null);
    participantsResult.data = null;
    participantsResult.error = null;
    matchesResult.data = null;
    matchesResult.error = null;
    predictionsResult.data = null;
    predictionsResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/participants?userId=u-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);
    expect(response.status).toBe(403);
  });

  it("returns 400 when userId query param is missing", async () => {
    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/participants`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("User ID is required");
  });

  it("removes participant and returns success when user has no predictions", async () => {
    matchesResult.data = []; // no matches in tournament

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/participants?userId=u-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(participantsQb.delete).toHaveBeenCalled();
    expect(participantsQb.eq).toHaveBeenCalledWith("tournament_id", TOURNAMENT_ID);
    expect(participantsQb.eq).toHaveBeenCalledWith("user_id", "u-1");
  });

  it("removes participant when tournament has matches but user has no predictions", async () => {
    matchesResult.data = [{ id: "m-1" }, { id: "m-2" }]; // matches exist
    predictionsResult.data = []; // but user has no predictions

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/participants?userId=u-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("returns 400 when user has predictions in the tournament", async () => {
    matchesResult.data = [{ id: "m-1" }];
    predictionsResult.data = [{ id: "pred-1" }];

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/participants?userId=u-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("predictions");
  });

  it("returns 500 on DB error during participant removal", async () => {
    matchesResult.data = [];
    participantsResult.error = { message: "Delete failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest(
      `http://localhost/api/admin/tournaments/${TOURNAMENT_ID}/participants?userId=u-1`,
      { method: "DELETE" }
    );
    const response = await DELETE(request, tournamentParams);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to remove participant from tournament");
    consoleSpy.mockRestore();
  });
});
