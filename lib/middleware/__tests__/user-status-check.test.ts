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
import { checkUserActive } from "../user-status-check";

describe("checkUserActive", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire from() after clearAllMocks
    mockSupabase.from.mockReturnValue(mockQuery.queryBuilder);
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    mockAuth.signOut.mockResolvedValue({ error: null });
    mockQuery.resolves({ data: null, error: null });
  });

  it("returns null when no user is authenticated", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    const result = await checkUserActive();
    expect(result).toBeNull();
  });

  it("returns null when authenticated user is active", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQuery.resolves({
      data: createMockUserProfile({ status: "active" }),
      error: null,
    });

    const result = await checkUserActive();
    expect(result).toBeNull();
  });

  it("returns 403 response and signs out when user is deactivated", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQuery.resolves({
      data: createMockUserProfile({ status: "deactivated" }),
      error: null,
    });

    const result = await checkUserActive();

    expect(result).not.toBeNull();
    expect(result!.status).toBe(403);

    const body = await result!.json();
    expect(body.error).toContain("deactivated");

    // Verify signOut was called
    expect(mockAuth.signOut).toHaveBeenCalledOnce();
  });

  it("returns null when user profile has no status field", async () => {
    const authUser = createMockAuthUser();
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQuery.resolves({
      data: { status: null },
      error: null,
    });

    const result = await checkUserActive();
    expect(result).toBeNull();
  });

  it("queries the correct table and user ID", async () => {
    const authUser = createMockAuthUser({ id: "specific-user-id" });
    mockAuth.getUser.mockResolvedValue({
      data: { user: authUser },
      error: null,
    });
    mockQuery.resolves({
      data: createMockUserProfile({ status: "active" }),
      error: null,
    });

    await checkUserActive();

    expect(mockSupabase.from).toHaveBeenCalledWith("users");
    expect(mockQuery.queryBuilder.select).toHaveBeenCalledWith("status");
    expect(mockQuery.queryBuilder.eq).toHaveBeenCalledWith("id", "specific-user-id");
  });
});
