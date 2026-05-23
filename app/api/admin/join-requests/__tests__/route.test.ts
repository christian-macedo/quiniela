import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, mockAuth, requestsQb, requestsResult, participantsQb, participantsResult } =
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

    const { qb: requestsQb, result: requestsResult } = makeQb();
    const { qb: participantsQb, result: participantsResult } = makeQb();
    const mockAuth = { getUser: vi.fn() };

    return {
      mockSupabase: { auth: mockAuth, from: vi.fn() },
      mockAuth,
      requestsQb,
      requestsResult,
      participantsQb,
      participantsResult,
    };
  });

vi.mock("@/lib/middleware/admin-check", () => ({
  checkAdminPermission: mockCheckAdminPermission,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

import { GET } from "../route";
import { PATCH } from "../[requestId]/route";

// ── GET /api/admin/join-requests ───────────────────────────────────────────────

describe("GET /api/admin/join-requests", () => {
  const makeRequest = (params?: Record<string, string>) => {
    const url = new URL("http://localhost/api/admin/join-requests");
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    }
    return new NextRequest(url.toString(), { method: "GET" });
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAdminPermission.mockResolvedValue(null);
    mockSupabase.from.mockReturnValue(requestsQb);
    requestsResult.data = null;
    requestsResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await GET(makeRequest());
    expect(response.status).toBe(403);
  });

  it("returns requests and counts on success", async () => {
    requestsResult.data = [
      { id: "req-1", status: "pending", tournament_id: "t-1", user_id: "u-1" },
      { id: "req-2", status: "approved", tournament_id: "t-1", user_id: "u-2" },
    ];

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.requests).toHaveLength(2);
    expect(body.counts.pending).toBe(1);
    expect(body.counts.approved).toBe(1);
    expect(body.counts.rejected).toBe(0);
  });

  it("returns empty list when no requests exist", async () => {
    requestsResult.data = [];

    const response = await GET(makeRequest());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.requests).toHaveLength(0);
    expect(body.counts.pending).toBe(0);
  });

  it("returns 500 on database error", async () => {
    requestsResult.error = { message: "DB error" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(makeRequest());
    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});

// ── PATCH /api/admin/join-requests/[requestId] ────────────────────────────────

describe("PATCH /api/admin/join-requests/[requestId]", () => {
  const requestId = "req-1";
  const makeRequest = (body: object) =>
    new NextRequest(`http://localhost/api/admin/join-requests/${requestId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  const makeParams = () => Promise.resolve({ requestId });

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckAdminPermission.mockResolvedValue(null);
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "admin-1", email: "admin@test.com" } },
      error: null,
    });
    mockSupabase.from.mockImplementation((table: string) =>
      table === "tournament_join_requests" ? requestsQb : participantsQb
    );
    requestsResult.data = null;
    requestsResult.error = null;
    participantsResult.data = null;
    participantsResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid action", async () => {
    const response = await PATCH(makeRequest({ action: "invalid" }), { params: makeParams() });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("Invalid action");
  });

  it("returns 404 when join request not found", async () => {
    requestsResult.data = null;
    requestsResult.error = { message: "Not found" };

    const response = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
    expect(response.status).toBe(404);
  });

  it("returns 409 when request is not pending", async () => {
    requestsQb.single.mockImplementationOnce(() =>
      Promise.resolve({
        data: { id: requestId, tournament_id: "t-1", user_id: "u-1", status: "approved" },
        error: null,
      })
    );

    const response = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
    expect(response.status).toBe(409);
  });

  it("approves request and adds participant on approve action", async () => {
    const pendingRequest = {
      id: requestId,
      tournament_id: "t-1",
      user_id: "u-1",
      status: "pending",
    };
    const updatedRequest = { ...pendingRequest, status: "approved", reviewed_by: "admin-1" };

    requestsQb.single
      .mockImplementationOnce(() => Promise.resolve({ data: pendingRequest, error: null }))
      .mockImplementationOnce(() => Promise.resolve({ data: updatedRequest, error: null }));

    const response = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("approved");
    expect(participantsQb.insert).toHaveBeenCalled();
  });

  it("rejects request without adding participant on reject action", async () => {
    const pendingRequest = {
      id: requestId,
      tournament_id: "t-1",
      user_id: "u-1",
      status: "pending",
    };
    const updatedRequest = { ...pendingRequest, status: "rejected", reviewed_by: "admin-1" };

    requestsQb.single
      .mockImplementationOnce(() => Promise.resolve({ data: pendingRequest, error: null }))
      .mockImplementationOnce(() => Promise.resolve({ data: updatedRequest, error: null }));

    const response = await PATCH(makeRequest({ action: "reject" }), { params: makeParams() });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("rejected");
    expect(participantsQb.insert).not.toHaveBeenCalled();
  });

  it("returns 500 on database error", async () => {
    const pendingRequest = {
      id: requestId,
      tournament_id: "t-1",
      user_id: "u-1",
      status: "pending",
    };
    requestsQb.single
      .mockImplementationOnce(() => Promise.resolve({ data: pendingRequest, error: null }))
      .mockImplementationOnce(() =>
        Promise.resolve({ data: null, error: { message: "DB error" } })
      );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await PATCH(makeRequest({ action: "approve" }), { params: makeParams() });
    expect(response.status).toBe(500);
    consoleSpy.mockRestore();
  });
});
