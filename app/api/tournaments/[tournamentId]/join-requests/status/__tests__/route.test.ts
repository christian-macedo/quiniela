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

import { GET } from "../route";

// ── GET /api/tournaments/[tournamentId]/join-requests/status ──────────────────

describe("GET /api/tournaments/[tournamentId]/join-requests/status", () => {
  const tournamentId = "tournament-1";
  const userId = "user-1";

  const makeRequest = () =>
    new NextRequest(`http://localhost/api/tournaments/${tournamentId}/join-requests/status`, {
      method: "GET",
    });
  const makeParams = () => Promise.resolve({ tournamentId });

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

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(403);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(401);
  });

  it("returns hasRequest=false when no request exists", async () => {
    requestsResult.data = null;
    requestsResult.error = null;

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.hasRequest).toBe(false);
    expect(body.status).toBeUndefined();
  });

  it("returns hasRequest=true with full status when request exists", async () => {
    requestsQb.single.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          id: "req-1",
          status: "pending",
          created_at: "2026-04-18T00:00:00Z",
        },
        error: null,
      })
    );

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.hasRequest).toBe(true);
    expect(body.status).toBe("pending");
    expect(body.requestId).toBe("req-1");
    expect(body.createdAt).toBe("2026-04-18T00:00:00Z");
  });

  it("returns the most recent request status (approved after re-request)", async () => {
    requestsQb.single.mockImplementationOnce(() =>
      Promise.resolve({
        data: {
          id: "req-2",
          status: "approved",
          created_at: "2026-04-19T00:00:00Z",
        },
        error: null,
      })
    );

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("approved");
    expect(body.requestId).toBe("req-2");
  });

  it("returns 500 on database error", async () => {
    // Make single() reject to trigger the catch block in the route
    requestsQb.single.mockImplementationOnce(() =>
      Promise.reject(new Error("DB connection failed"))
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(makeRequest(), { params: makeParams() });
    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
