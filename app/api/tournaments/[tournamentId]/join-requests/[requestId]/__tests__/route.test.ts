import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckUserActive = vi.hoisted(() => vi.fn());

const { mockSupabase, mockAuth, requestsQb, requestsResult } = vi.hoisted(() => {
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

  const { qb: requestsQb, result: requestsResult } = makeQb();
  const mockAuth = { getUser: vi.fn() };

  return {
    mockSupabase: { auth: mockAuth, from: vi.fn().mockReturnValue(requestsQb) },
    mockAuth,
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

import { DELETE } from "../route";

// ── DELETE /api/tournaments/[tournamentId]/join-requests/[requestId] ───────────

describe("DELETE /api/tournaments/[tournamentId]/join-requests/[requestId]", () => {
  const tournamentId = "tournament-1";
  const requestId = "req-1";
  const userId = "user-1";

  const makeRequest = () =>
    new NextRequest(`http://localhost/api/tournaments/${tournamentId}/join-requests/${requestId}`, {
      method: "DELETE",
    });
  const makeParams = () => Promise.resolve({ tournamentId, requestId });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckUserActive.mockResolvedValue(null);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: userId, email: "user@test.com" } },
      error: null,
    });
    mockSupabase.from.mockReturnValue(requestsQb);
    requestsResult.data = null;
    requestsResult.error = null;
  });

  it("returns 403 when user status check fails", async () => {
    mockCheckUserActive.mockResolvedValue(
      new Response(JSON.stringify({ error: "Account deactivated" }), { status: 403 })
    );

    const response = await DELETE(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(403);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await DELETE(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(401);
  });

  it("returns 404 when join request is not found", async () => {
    requestsResult.data = null;
    requestsResult.error = { message: "Not found" };

    const response = await DELETE(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(404);
  });

  it("returns 403 when user tries to delete another user's request", async () => {
    requestsQb.single.mockImplementationOnce(() =>
      Promise.resolve({
        data: { id: requestId, user_id: "other-user", status: "pending" },
        error: null,
      })
    );

    const response = await DELETE(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe("Forbidden");
  });

  it("returns 409 when trying to cancel a non-pending request", async () => {
    requestsQb.single.mockImplementationOnce(() =>
      Promise.resolve({
        data: { id: requestId, user_id: userId, status: "approved" },
        error: null,
      })
    );

    const response = await DELETE(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.error).toContain("pending");
  });

  it("deletes a pending request and returns success", async () => {
    requestsQb.single.mockImplementationOnce(() =>
      Promise.resolve({
        data: { id: requestId, user_id: userId, status: "pending" },
        error: null,
      })
    );
    // delete().eq() resolves via then-able with no error
    requestsResult.error = null;

    const response = await DELETE(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it("returns 500 on database error during delete", async () => {
    requestsQb.single.mockImplementationOnce(() =>
      Promise.resolve({
        data: { id: requestId, user_id: userId, status: "pending" },
        error: null,
      })
    );
    requestsResult.error = { message: "DB error" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await DELETE(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
