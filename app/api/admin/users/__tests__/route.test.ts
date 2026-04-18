import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, usersQb, usersResult, predictionsQb, predictionsResult, rankingsQb, rankingsResult } =
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

    const { qb: usersQb, result: usersResult } = makeQb();
    const { qb: predictionsQb, result: predictionsResult } = makeQb();
    const { qb: rankingsQb, result: rankingsResult } = makeQb();

    return {
      mockSupabase: { from: vi.fn() },
      usersQb,
      usersResult,
      predictionsQb,
      predictionsResult,
      rankingsQb,
      rankingsResult,
    };
  });

vi.mock("@/lib/middleware/admin-check", () => ({
  checkAdminPermission: mockCheckAdminPermission,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { GET } from "../route";

// ── GET /api/admin/users ───────────────────────────────────────────────────────

describe("GET /api/admin/users", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === "users") return usersQb;
      if (table === "predictions") return predictionsQb;
      return rankingsQb;
    });
    mockCheckAdminPermission.mockResolvedValue(null);
    usersResult.data = null;
    usersResult.error = null;
    predictionsResult.data = null;
    predictionsResult.error = null;
    rankingsResult.data = null;
    rankingsResult.error = null;
  });

  it("returns 401/403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await GET();
    expect(response.status).toBe(403);
  });

  it("returns users with stats and does NOT expose webauthn_user_id", async () => {
    const mockUser = {
      id: "user-1",
      email: "test@example.com",
      screen_name: "Player1",
      avatar_url: null,
      is_admin: false,
      status: "active",
      last_login: null,
      created_at: "2026-01-01T00:00:00Z",
    };
    usersResult.data = [mockUser];
    rankingsResult.data = [{ tournament_id: "t-1", total_points: 15 }];

    const response = await GET();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(Array.isArray(body)).toBe(true);
    expect(body).toHaveLength(1);

    const user = body[0];
    // Sensitive field must not be present
    expect(user).not.toHaveProperty("webauthn_user_id");
    // Explicit columns should be present
    expect(user).toHaveProperty("id", "user-1");
    expect(user).toHaveProperty("screen_name", "Player1");
    // Email should be masked
    expect(user.email).not.toBe("test@example.com");
    expect(user.email).toContain("*");
    // Stats should be included
    expect(user.stats).toEqual({
      prediction_count: 0,
      tournament_count: 1,
      total_points: 15,
    });
  });

  it("returns 500 on DB error fetching users", async () => {
    usersResult.error = { message: "Connection error" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to fetch users");
    consoleSpy.mockRestore();
  });
});
