import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const { mockSupabase, matchesQb, matchesResult } = vi.hoisted(() => {
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

  return {
    mockSupabase: { from: vi.fn() },
    matchesQb,
    matchesResult,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { GET } from "../route";

// ── GET /api/matches ───────────────────────────────────────────────────────────

describe("GET /api/matches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(matchesQb);
    matchesResult.data = null;
    matchesResult.error = null;
  });

  it("returns all matches when no query param", async () => {
    matchesResult.data = [{ id: "m-1" }, { id: "m-2" }];
    const request = new NextRequest("http://localhost/api/matches");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "m-1" }, { id: "m-2" }]);
    expect(matchesQb.eq).not.toHaveBeenCalled();
  });

  it("filters by tournament_id when provided", async () => {
    matchesResult.data = [{ id: "m-1", tournament_id: "t-1" }];
    const request = new Request("http://localhost/api/matches?tournament_id=t-1");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([{ id: "m-1", tournament_id: "t-1" }]);
    expect(matchesQb.eq).toHaveBeenCalledWith("tournament_id", "t-1");
  });

  it("returns empty array when data is null", async () => {
    matchesResult.data = null;
    const request = new NextRequest("http://localhost/api/matches");
    const response = await GET(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on DB error", async () => {
    matchesResult.error = { message: "Connection failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost/api/matches");
    const response = await GET(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to fetch matches");
    consoleSpy.mockRestore();
  });
});

