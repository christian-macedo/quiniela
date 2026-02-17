import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createMockAuthUser,
  createMockUserProfile,
} from "@/__tests__/helpers/supabase-mock";

// Use vi.hoisted so mock objects are available during vi.mock hoisting
const { mockSupabase, mockAuth, mockQuery } = vi.hoisted(() => {
  const mockQuery = {
    result: { data: null as unknown, error: null as unknown },
    queryBuilder: {} as Record<string, ReturnType<typeof vi.fn>>,
  };

  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    eq: vi.fn(),
    single: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
  };

  for (const key of Object.keys(qb)) {
    if (key === "single") {
      qb[key].mockImplementation(() => Promise.resolve(mockQuery.result));
    } else {
      qb[key].mockReturnValue(qb);
    }
  }

  Object.defineProperty(qb, "then", {
    get: () => (resolve: (v: unknown) => void) => resolve(mockQuery.result),
    configurable: true,
  });

  mockQuery.queryBuilder = qb;

  const mockAuth = {
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  };

  const mockSupabase = {
    auth: mockAuth,
    from: vi.fn().mockReturnValue(qb),
  };

  return {
    mockSupabase,
    mockAuth,
    mockQuery: {
      ...mockQuery,
      resolves(response: { data: unknown; error: unknown }) {
        mockQuery.result.data = response.data;
        mockQuery.result.error = response.error;
      },
    },
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase),
}));

// Import after mocking
import { checkAdminPermission } from "../admin-check";

describe("checkAdminPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnValue(mockQuery.queryBuilder);
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockQuery.resolves({ data: null, error: null });
  });

  it("returns 401 when no user is authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Not authenticated" },
    });

    const result = await checkAdminPermission();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);

    const body = await result!.json();
    expect(body.error).toContain("Authentication required");
  });

  it("returns 401 when auth returns an error", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: { message: "Token expired" },
    });

    const result = await checkAdminPermission();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
  });

  it("returns 403 when user is not an admin", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQuery.resolves({
      data: createMockUserProfile({ is_admin: false }),
      error: null,
    });

    const result = await checkAdminPermission();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);

    const body = await result!.json();
    expect(body.error).toContain("Admin access required");
  });

  it("returns null when user is an admin", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQuery.resolves({
      data: createMockUserProfile({ is_admin: true }),
      error: null,
    });

    const result = await checkAdminPermission();
    expect(result).toBeNull();
  });

  it("returns 403 when user profile is not found", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQuery.resolves({
      data: null,
      error: null,
    });

    const result = await checkAdminPermission();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);
  });

  it("queries the correct table for admin status", async () => {
    const authUser = createMockAuthUser({ id: "admin-user-id" });
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQuery.resolves({
      data: createMockUserProfile({ is_admin: true }),
      error: null,
    });

    await checkAdminPermission();

    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(mockQuery.queryBuilder.select).toHaveBeenCalledWith("is_admin");
    expect(mockQuery.queryBuilder.eq).toHaveBeenCalledWith("id", "admin-user-id");
  });
});
