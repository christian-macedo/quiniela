import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckUserActive = vi.hoisted(() => vi.fn());

const { mockSupabase, mockAuth, participantsQb, participantsResult, requestsQb, requestsResult } =
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

    const { qb: participantsQb, result: participantsResult } = makeQb();
    const { qb: requestsQb, result: requestsResult } = makeQb();
    const mockAuth = { getUser: vi.fn() };

    return {
      mockSupabase: { auth: mockAuth, from: vi.fn() },
      mockAuth,
      participantsQb,
      participantsResult,
      requestsQb,
      requestsResult,
    };
  });

vi.mock("@/lib/middleware/user-status-check", () => ({
  checkUserActive: mockCheckUserActive,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

import { POST } from "../route";

// ── POST /api/tournaments/[tournamentId]/join-requests ─────────────────────────

describe("POST /api/tournaments/[tournamentId]/join-requests", () => {
  const tournamentId = "tournament-1";
  const makeRequest = () =>
    new NextRequest(`http://localhost/api/tournaments/${tournamentId}/join-requests`, {
      method: "POST",
    });
  const makeParams = () => Promise.resolve({ tournamentId });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckUserActive.mockResolvedValue(null);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-1", email: "user@test.com" } },
      error: null,
    });
    mockSupabase.from.mockImplementation((table: string) =>
      table === "tournament_participants" ? participantsQb : requestsQb
    );
    participantsResult.data = null;
    participantsResult.error = null;
    requestsResult.data = null;
    requestsResult.error = null;
  });

  it("returns 403 when user status check fails", async () => {
    mockCheckUserActive.mockResolvedValue(
      new Response(JSON.stringify({ error: "Account deactivated" }), { status: 403 })
    );

    const response = await POST(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(403);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await POST(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(401);
  });

  it("returns 409 when user is already a participant", async () => {
    participantsResult.data = { user_id: "user-1" };

    const response = await POST(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("already a participant");
  });

  it("returns 409 when user already has a pending request", async () => {
    participantsResult.data = null;
    requestsResult.data = { id: "req-1", status: "pending" };

    const response = await POST(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("pending join request");
  });

  it("creates join request and returns 201 on success", async () => {
    participantsResult.data = null;
    requestsResult.data = null;
    // After first .single() returns null (pending check), insert returns the new request
    const createdRequest = {
      id: "req-new",
      tournament_id: tournamentId,
      user_id: "user-1",
      status: "pending",
      created_at: "2026-04-18T00:00:00Z",
    };
    requestsQb.single
      .mockImplementationOnce(() => Promise.resolve({ data: null, error: null }))
      .mockImplementationOnce(() => Promise.resolve({ data: createdRequest, error: null }));

    const response = await POST(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.id).toBe("req-new");
  });

  it("returns 500 on database error during insert", async () => {
    participantsResult.data = null;
    requestsResult.data = null;
    requestsQb.single
      .mockImplementationOnce(() => Promise.resolve({ data: null, error: null }))
      .mockImplementationOnce(() =>
        Promise.resolve({ data: null, error: { message: "DB error" } })
      );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
