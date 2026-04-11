import { NextRequest } from "next/server";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const mockCheckAdminPermission = vi.hoisted(() => vi.fn());

const { mockSupabase, teamsQb, teamsResult } = vi.hoisted(() => {
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

  const { qb: teamsQb, result: teamsResult } = makeQb();

  return {
    mockSupabase: { from: vi.fn().mockReturnValue(teamsQb) },
    teamsQb,
    teamsResult,
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

// ── POST /api/admin/teams ──────────────────────────────────────────────────────

describe("POST /api/admin/teams", () => {
  const makeRequest = (body: object) =>
    new NextRequest("http://localhost/api/admin/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

  const validBody = {
    name: "Brazil",
    short_name: "BRA",
    country_code: "BR",
    logo_url: "/logos/brazil.png",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(teamsQb);
    mockCheckAdminPermission.mockResolvedValue(null);
    teamsResult.data = null;
    teamsResult.error = null;
  });

  // ── Validation tests ──────────────────────────────────────────────────────

  it("returns 400 when name is missing", async () => {
    const response = await POST(makeRequest({ short_name: "BRA", country_code: "BR" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("name");
  });

  it("returns 400 when name is empty string", async () => {
    const response = await POST(
      makeRequest({ name: "  ", short_name: "BRA", country_code: "BR" })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when name exceeds 100 characters", async () => {
    const response = await POST(
      makeRequest({ name: "A".repeat(101), short_name: "BRA", country_code: "BR" })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when short_name is missing", async () => {
    const response = await POST(makeRequest({ name: "Brazil", country_code: "BR" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("short_name");
  });

  it("returns 400 when short_name exceeds 10 characters", async () => {
    const response = await POST(
      makeRequest({ name: "Brazil", short_name: "TOOLONGNAME", country_code: "BR" })
    );
    expect(response.status).toBe(400);
  });

  it("returns 400 when country_code is missing", async () => {
    const response = await POST(makeRequest({ name: "Brazil", short_name: "BRA" }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain("country_code");
  });

  it("returns 400 when country_code is not 2 characters", async () => {
    const response = await POST(
      makeRequest({ name: "Brazil", short_name: "BRA", country_code: "BRA" })
    );
    expect(response.status).toBe(400);
  });

  // ── Auth & error tests ──────────────────────────────────────────────────────

  it("returns 403 when admin check fails", async () => {
    mockCheckAdminPermission.mockResolvedValue(
      new Response(JSON.stringify({ error: "Admin access required" }), { status: 403 })
    );

    const response = await POST(makeRequest(validBody));
    expect(response.status).toBe(403);
  });

  it("creates team and returns data on success", async () => {
    const createdTeam = { id: "team-new", ...validBody };
    teamsResult.data = createdTeam;

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual(createdTeam);
    expect(teamsQb.insert).toHaveBeenCalledWith({
      name: validBody.name,
      short_name: validBody.short_name,
      country_code: validBody.country_code,
      logo_url: validBody.logo_url,
    });
  });

  it("returns 500 on DB error during insert", async () => {
    teamsResult.error = { message: "Insert failed" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await POST(makeRequest(validBody));

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain("Failed to create team");
    consoleSpy.mockRestore();
  });
});
