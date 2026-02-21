import { vi } from "vitest";
import type { User } from "@/types/database";

/**
 * Creates mock objects for Supabase testing. Call this OUTSIDE vi.hoisted(), at module scope.
 *
 * This helper cannot be used inside vi.hoisted() — it imports from 'vitest' at module level,
 * which isn't resolved when vi.hoisted() runs.
 *
 * Usage:
 *   const { mockSupabase, mockAuth, mockQuery } = createHoistedMocks();
 *
 *   vi.mock("@/lib/supabase/server", () => ({
 *     createClient: vi.fn().mockResolvedValue(mockSupabase),
 *   }));
 *
 * For multi-table dispatch, use the inline makeQb() factory inside vi.hoisted() instead.
 * See .claude/rules/testing.md — "Multi-table dispatch" section.
 */
export function createHoistedMocks() {
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
    neq: vi.fn(),
    in: vi.fn(),
    single: vi.fn(),
    maybeSingle: vi.fn(),
    limit: vi.fn(),
    order: vi.fn(),
  };

  for (const key of Object.keys(qb)) {
    if (key === "single" || key === "maybeSingle") {
      qb[key].mockImplementation(() => Promise.resolve(mockQuery.result));
    } else {
      qb[key].mockReturnValue(qb);
    }
  }

  // Make builder thenable for queries that don't end with .single()
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
      /** Set the resolved data/error for the next query chain */
      resolves(response: { data: unknown; error: unknown }) {
        mockQuery.result.data = response.data;
        mockQuery.result.error = response.error;
      },
    },
  };
}

/**
 * Helper to create a mock authenticated user for auth.getUser() responses.
 */
export function createMockAuthUser(
  overrides: Partial<{
    id: string;
    email: string;
    user_metadata: Record<string, unknown>;
  }> = {}
) {
  return {
    id: overrides.id ?? "user-123",
    email: overrides.email ?? "test@example.com",
    user_metadata: overrides.user_metadata ?? { screen_name: "TestUser" },
    aud: "authenticated",
    role: "authenticated",
    created_at: "2026-01-01T00:00:00Z",
  };
}

/**
 * Helper to create a mock user profile (from the `users` table).
 */
export function createMockUserProfile(overrides: Partial<User> = {}): User {
  return {
    id: "user-123",
    email: "test@example.com",
    screen_name: "TestUser",
    avatar_url: null,
    is_admin: false,
    status: "active",
    last_login: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/**
 * Standard beforeEach reset for hoisted mocks.
 * Call this in beforeEach() to restore default mock behavior after clearAllMocks.
 */
export function resetHoistedMocks(
  mockSupabase: ReturnType<typeof createHoistedMocks>["mockSupabase"],
  mockAuth: ReturnType<typeof createHoistedMocks>["mockAuth"],
  mockQuery: ReturnType<typeof createHoistedMocks>["mockQuery"]
) {
  mockSupabase.from.mockReturnValue(mockQuery.queryBuilder);
  mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mockAuth.signUp.mockResolvedValue({ data: { user: null, session: null }, error: null });
  mockAuth.signInWithPassword.mockResolvedValue({
    data: { user: null, session: null },
    error: null,
  });
  mockAuth.signOut.mockResolvedValue({ error: null });
  mockAuth.exchangeCodeForSession.mockResolvedValue({ data: { session: null }, error: null });
  mockQuery.resolves({ data: null, error: null });
}
