import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuthUser } from "@/__tests__/helpers/supabase-mock";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockSupabase, mockAuth, mockQueryBuilder, mockQueryResult } = vi.hoisted(() => {
  const result = { data: null as unknown, error: null as unknown };
  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), single: vi.fn(), limit: vi.fn(), order: vi.fn(),
  };
  for (const key of Object.keys(qb)) {
    if (key === "single") qb[key].mockImplementation(() => Promise.resolve(result));
    else qb[key].mockReturnValue(qb);
  }
  Object.defineProperty(qb, "then", {
    get: () => (resolve: (v: unknown) => void) => resolve(result),
    configurable: true,
  });
  const mockAuth = {
    getUser: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(),
    signOut: vi.fn(), exchangeCodeForSession: vi.fn(),
  };
  return {
    mockSupabase: { auth: mockAuth, from: vi.fn().mockReturnValue(qb) },
    mockAuth,
    mockQueryBuilder: qb,
    mockQueryResult: result,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

vi.mock("@/lib/utils/date", () => ({
  getCurrentUTC: vi.fn(() => "2026-02-16T12:00:00.000Z"),
}));

// Import after mocking
import { POST } from "@/app/api/account/deactivate/route";

describe("POST /api/account/deactivate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockQueryBuilder);
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signOut.mockResolvedValue({ error: null });
    mockQueryResult.data = null;
    mockQueryResult.error = null;
  });

  it("returns 401 when user is not authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const response = await POST();

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe("Unauthorized");
  });

  it("deactivates user account and signs them out", async () => {
    const authUser = createMockAuthUser({ id: "user-to-deactivate" });
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQueryResult.data = null;
    mockQueryResult.error = null;

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("deactivated");

    // Verify the correct update was called
    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(mockQueryBuilder.update).toHaveBeenCalledWith({
      status: "deactivated",
      updated_at: "2026-02-16T12:00:00.000Z",
    });
    expect(mockQueryBuilder.eq).toHaveBeenCalledWith("id", "user-to-deactivate");

    // Verify sign out
    expect(mockAuth.signOut).toHaveBeenCalledOnce();
  });

  it("returns 500 when database update fails", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQueryResult.data = null;
    mockQueryResult.error = { message: "Database error" };

    // Suppress expected console.error from the error handler
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to deactivate");

    consoleSpy.mockRestore();
  });
});
