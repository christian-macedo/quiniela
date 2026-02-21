import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, matchesQb, matchesResult, predictionsQb, predictionsResult } = vi.hoisted(
  () => {
    function makeQb() {
      const result = { data: null as unknown, error: null as unknown };
      const qb: Record<string, ReturnType<typeof vi.fn>> = {
        select: vi.fn(),
        insert: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        eq: vi.fn(),
        single: vi.fn(),
        limit: vi.fn(),
        order: vi.fn(),
        in: vi.fn(),
        neq: vi.fn(),
      };
      for (const key of Object.keys(qb)) {
        if (key === "single") qb[key].mockImplementation(() => Promise.resolve(result));
        else qb[key].mockReturnValue(qb);
      }
      Object.defineProperty(qb, "then", {
        get: () => (resolve: (v: unknown) => void) => resolve(result),
        configurable: true,
      });
      return { qb, result };
    }

    const { qb: matchesQb, result: matchesResult } = makeQb();
    const { qb: predictionsQb, result: predictionsResult } = makeQb();

    return {
      mockSupabase: { from: vi.fn() },
      matchesQb,
      matchesResult,
      predictionsQb,
      predictionsResult,
    };
  }
);

vi.mock("@/lib/middleware/admin-check", () => ({
  checkAdminPermission: mockCheckAdminPermission,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { POST } from "../route";

// ── POST /api/admin/reset-incomplete-predictions ───────────────────────────────

describe("POST /api/admin/reset-incomplete-predictions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockImplementation((table: string) =>
      table === "matches" ? matchesQb : predictionsQb
    );
    mockCheckAdminPermission.mockResolvedValue(null);
    matchesResult.data = null;
    matchesResult.error = null;
    predictionsResult.data = null;
    predictionsResult.error = null;
  });

  it("returns admin error when not authorized", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await POST();
    expect(response.status).toBe(403);
  });

  it("returns success with updatedCount 0 when no non-completed matches exist", async () => {
    matchesResult.data = []; // no non-completed matches

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.updatedCount).toBe(0);

    // Predictions should not be touched
    expect(predictionsQb.update).not.toHaveBeenCalled();
  });

  it("returns success with updatedCount 0 when matches data is null", async () => {
    matchesResult.data = null; // null treated same as empty

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.updatedCount).toBe(0);
  });

  it("resets predictions and returns matchesAffected count", async () => {
    const nonCompletedMatches = [{ id: "m-1" }, { id: "m-2" }, { id: "m-3" }];
    matchesResult.data = nonCompletedMatches;
    predictionsResult.data = null;
    predictionsResult.error = null;

    const response = await POST();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.matchesAffected).toBe(3);

    // Verify predictions were reset
    expect(predictionsQb.update).toHaveBeenCalledWith({ points_earned: 0 });
    expect(predictionsQb.in).toHaveBeenCalledWith("match_id", ["m-1", "m-2", "m-3"]);
  });

  it("returns 500 when match fetch fails", async () => {
    matchesResult.error = { message: "Query failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to reset predictions");
    consoleSpy.mockRestore();
  });

  it("returns 500 when prediction update fails", async () => {
    matchesResult.data = [{ id: "m-1" }];
    predictionsResult.error = { message: "Update failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST();

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to reset predictions");
    consoleSpy.mockRestore();
  });
});
