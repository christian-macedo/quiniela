# Testing

The project uses **Vitest** with **React Testing Library** for unit and component testing.

## Commands

```bash
npm test              # Single run (CI-friendly)
npm run test:watch    # Watch mode (re-runs on file changes)
npm run test:coverage # Run with coverage report
```

## File Location Convention

Tests are **co-located** with their source files in `__tests__/` folders:

```
lib/utils/scoring.ts
lib/utils/__tests__/scoring.test.ts

app/(auth)/login/page.tsx
app/(auth)/login/__tests__/page.test.tsx

app/api/account/deactivate/route.ts
app/api/account/deactivate/__tests__/route.test.ts
```

Naming convention: `<source-filename>.test.ts` (or `.test.tsx` for components).

## Test Categories

| Category                           | What to mock                                            | Example                                |
| ---------------------------------- | ------------------------------------------------------- | -------------------------------------- |
| **Pure utilities**                 | Nothing                                                 | `scoring.test.ts`                      |
| **Server middleware / API routes** | `@/lib/supabase/server`                                 | `admin-check.test.ts`, `route.test.ts` |
| **Client components**              | `@/lib/supabase/client`, `next/navigation`, `next-intl` | `page.test.tsx`                        |

## Mock Helpers

Shared helpers live in `__tests__/helpers/supabase-mock.ts`:

```typescript
import { createMockAuthUser, createMockUserProfile } from "@/__tests__/helpers/supabase-mock";

// Create a mock auth.getUser() response
const authUser = createMockAuthUser({ id: "user-1", email: "test@test.com" });

// Create a mock user profile (from the users table)
const profile = createMockUserProfile({ is_admin: true, status: "active" });
```

## Mocking Supabase: The `vi.hoisted()` Pattern

Because `vi.mock()` is hoisted above all imports, mock objects must be created inside `vi.hoisted()` so they exist when the mock factory runs. This is the **critical pattern** for all Supabase mocking.

### Server-side tests (middleware, API routes)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuthUser } from "@/__tests__/helpers/supabase-mock";

// 1. Create mocks inside vi.hoisted() — runs before imports
const { mockSupabase, mockAuth, mockQueryBuilder, mockQueryResult } = vi.hoisted(() => {
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
    getUser: vi.fn(),
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
    exchangeCodeForSession: vi.fn(),
  };
  return {
    mockSupabase: { auth: mockAuth, from: vi.fn().mockReturnValue(qb) },
    mockAuth,
    mockQueryBuilder: qb,
    mockQueryResult: result,
  };
});

// 2. Mock the module — factory can reference hoisted variables
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue(mockSupabase), // Note: server client is async
}));

// 3. Import the module under test AFTER vi.mock()
import { checkAdminPermission } from "../admin-check";

// 4. Reset mocks in beforeEach
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockReturnValue(mockQueryBuilder); // Re-wire after clear
  mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mockQueryResult.data = null;
  mockQueryResult.error = null;
});
```

### Client-side tests (React components)

Same pattern, but the Supabase client mock is **synchronous** (no `await`):

```typescript
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase), // Note: no .mockResolvedValue — sync!
}));
```

Additionally mock Next.js and i18n:

```typescript
const mockPush = vi.hoisted(() => vi.fn());
const mockRefresh = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({ push: mockPush, refresh: mockRefresh })),
}));

vi.mock("next-intl", () => ({
  useTranslations: vi.fn(() => (key: string) => key), // Returns keys as-is
}));
```

## Key Rules

1. **Never import helpers inside `vi.hoisted()`** — only `vi` is available there. Use `vi.fn()` directly.
2. **Import source modules AFTER `vi.mock()` calls** — otherwise the real module loads before the mock is applied.
3. **Re-wire `mockSupabase.from()` in `beforeEach`** — `vi.clearAllMocks()` resets all return values, so `.from()` must be reconnected to the query builder.
4. **Set query results via the shared `result` object** — mutate `mockQueryResult.data` and `mockQueryResult.error` before calling the function under test.
5. **Mock only what's needed** — stub external components (e.g., `LanguageSwitcher`, `PasskeyLoginButton`) as simple divs to isolate the component under test.
6. **Use `createMockAuthUser()` and `createMockUserProfile()`** for consistent test data — pass overrides for the fields relevant to your test.
