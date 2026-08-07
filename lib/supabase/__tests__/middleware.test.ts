import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextResponse, type NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockAuth, mockQueryBuilder, mockQueryResult, mockSupabase } = vi.hoisted(() => {
  const result = { data: null as unknown, error: null as unknown };

  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    maybeSingle: vi.fn(),
  };
  qb.select.mockReturnValue(qb);
  qb.eq.mockReturnValue(qb);
  qb.maybeSingle.mockImplementation(() => Promise.resolve(result));

  const mockAuth = {
    getUser: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  };

  return {
    mockAuth,
    mockQueryBuilder: qb,
    mockQueryResult: result,
    mockSupabase: {
      auth: mockAuth,
      from: vi.fn().mockReturnValue(qb),
    },
  };
});

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => mockSupabase),
}));

import { updateSession } from "../middleware";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(pathname: string): NextRequest {
  const url = new URL(`http://localhost${pathname}`);
  return {
    nextUrl: url,
    url: url.toString(),
    cookies: { getAll: () => [], set: vi.fn() },
  } as unknown as NextRequest;
}

const activeUser = { id: "user-1", email: "test@example.com" };

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("updateSession middleware — deactivated-user check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.maybeSingle.mockImplementation(() => Promise.resolve(mockQueryResult));
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signOut.mockResolvedValue({ error: null });
    mockQueryResult.data = null;
    mockQueryResult.error = null;
  });

  it("passes through when no user is authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const res = await updateSession(makeRequest("/"));

    expect(res.status).not.toBe(302);
    expect(mockSupabase.from).not.toHaveBeenCalled();
  });

  it("passes through for active user on a protected route", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: activeUser }, error: null });
    mockQueryResult.data = { status: "active" };

    const res = await updateSession(makeRequest("/tournaments/abc"));

    expect(res.status).not.toBe(302);
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });

  it("redirects deactivated user on a protected route to /login?error=account_deactivated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: activeUser }, error: null });
    mockQueryResult.data = { status: "deactivated" };

    const res = await updateSession(makeRequest("/tournaments/abc/predictions"));

    expect(res.status).toBeGreaterThanOrEqual(300);
    expect(res.status).toBeLessThan(400);
    const location = res.headers.get("location");
    expect(location).toContain("/login");
    expect(location).toContain("error=account_deactivated");
    expect(mockAuth.signOut).toHaveBeenCalledOnce();
  });

  it.each([
    "/login",
    "/signup",
    "/forgot-password",
    "/auth/callback",
    "/api/auth/passkey/authenticate-options",
    "/api/predictions",
    "/_next/static/chunk.js",
    "/unauthorized",
  ])("skips deactivation check for public/api route: %s", async (path) => {
    mockAuth.getUser.mockResolvedValue({ data: { user: activeUser }, error: null });

    await updateSession(makeRequest(path));

    expect(mockSupabase.from).not.toHaveBeenCalled();
    expect(mockAuth.signOut).not.toHaveBeenCalled();
  });

  it("passes through and warns when profile fetch errors", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: activeUser }, error: null });
    mockQueryResult.data = null;
    mockQueryResult.error = { message: "DB error" };
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});

    const res = await updateSession(makeRequest("/tournaments/abc"));

    expect(res.status).not.toBe(302);
    expect(warnSpy).toHaveBeenCalledWith(
      "[middleware] status check failed",
      expect.objectContaining({ userId: activeUser.id })
    );
    warnSpy.mockRestore();
  });
});
