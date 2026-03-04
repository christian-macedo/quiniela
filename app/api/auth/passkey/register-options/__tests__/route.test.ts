import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuthUser } from "@/__tests__/helpers/supabase-mock";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  mockGenerateRegistrationOptions,
  mockSupabase,
  mockAuth,
  mockQueryBuilder,
  mockQueryResult,
} = vi.hoisted(() => {
  const mockGenerateRegistrationOptions = vi.fn();
  const result = { data: null as unknown, error: null as unknown };

  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
  };
  qb.select.mockReturnValue(qb);
  qb.eq.mockReturnValue(qb);
  qb.single.mockImplementation(() => Promise.resolve(result));

  const mockAuth = { getUser: vi.fn() };

  return {
    mockGenerateRegistrationOptions,
    mockSupabase: { auth: mockAuth, from: vi.fn().mockReturnValue(qb) },
    mockAuth,
    mockQueryBuilder: qb,
    mockQueryResult: result,
  };
});

vi.mock("@/lib/webauthn/server", () => ({
  generateUserRegistrationOptions: mockGenerateRegistrationOptions,
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { POST } from "@/app/api/auth/passkey/register-options/route";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/auth/passkey/register-options", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockQueryBuilder);
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockQueryResult.data = null;
    mockQueryResult.error = null;
    mockQueryBuilder.select.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.eq.mockReturnValue(mockQueryBuilder);
    mockQueryBuilder.single.mockImplementation(() => Promise.resolve(mockQueryResult));
  });

  it("returns 401 when unauthenticated", async () => {
    const res = await POST();

    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain("logged in");
  });

  it("returns 404 when user profile is not found in users table", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockQueryResult.data = null;
    mockQueryResult.error = { message: "not found" };

    const res = await POST();

    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("User not found");
  });

  it("returns registration options on success", async () => {
    const authUser = createMockAuthUser({ id: "user-123" });
    mockAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockQueryResult.data = { email: "user@example.com" };
    mockQueryResult.error = null;

    const fakeOptions = { challenge: "abc123", rp: { name: "Quiniela" } };
    mockGenerateRegistrationOptions.mockResolvedValue(fakeOptions);

    const res = await POST();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(fakeOptions);
    expect(mockGenerateRegistrationOptions).toHaveBeenCalledWith("user-123", "user@example.com");
  });

  it("returns generic 500 without leaking internal error details", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({ data: { user: authUser }, error: null });
    mockQueryResult.data = { email: "user@example.com" };
    mockQueryResult.error = null;
    mockGenerateRegistrationOptions.mockRejectedValue(
      new Error("Failed to store credential: pg xyz")
    );

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST();

    consoleSpy.mockRestore();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Failed to generate registration options");
    expect(body.error).not.toContain("pg xyz");
  });
});
