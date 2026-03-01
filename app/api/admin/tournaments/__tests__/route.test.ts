import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, tournamentsQb, tournamentsResult } = vi.hoisted(() => {
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

  const { qb: tournamentsQb, result: tournamentsResult } = makeQb();

  return {
    mockSupabase: { from: vi.fn().mockReturnValue(tournamentsQb) },
    tournamentsQb,
    tournamentsResult,
  };
});

vi.mock("@/lib/middleware/admin-check", () => ({
  checkAdminPermission: mockCheckAdminPermission,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { POST } from "../route";

// ── POST /api/admin/tournaments ────────────────────────────────────────────────

describe("POST /api/admin/tournaments", () => {
  const makeRequest = (body: object) =>
    new NextRequest("http://localhost/api/admin/tournaments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const validBody = {
    name: "World Cup 2026",
    sport: "soccer",
    start_date: "2026-06-11",
    end_date: "2026-07-19",
    status: "upcoming",
    scoring_rules: {},
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(tournamentsQb);
    mockCheckAdminPermission.mockResolvedValue(null);
    tournamentsResult.data = null;
    tournamentsResult.error = null;
  });

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(403);
  });

  it("creates tournament and returns data on success", async () => {
    const created = { id: "t-new", ...validBody };
    tournamentsResult.data = created;

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(created);
    expect(tournamentsQb.insert).toHaveBeenCalled();
  });

  it("defaults status to 'upcoming' when not provided", async () => {
    const { status: _omit, ...bodyWithoutStatus } = validBody;
    const created = { id: "t-new", ...bodyWithoutStatus, status: "upcoming" };
    tournamentsResult.data = created;

    const response = await POST(makeRequest(bodyWithoutStatus));

    expect(response.status).toBe(200);
    expect(tournamentsQb.insert).toHaveBeenCalledWith(
      expect.objectContaining({ status: "upcoming" })
    );
  });

  it("returns 500 on DB error during insert", async () => {
    tournamentsResult.error = { message: "Insert failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to create tournament");
    consoleSpy.mockRestore();
  });
});
