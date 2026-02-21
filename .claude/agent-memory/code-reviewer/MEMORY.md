# Code Reviewer Memory

## Key Architecture Patterns

- `checkAdminPermission()` in `lib/middleware/admin-check.ts` — creates its own Supabase client internally. Routes that call it then call `createClient()` again in the handler body. This double-client pattern is established and intentional (see AUTHORIZATION.md and existing admin routes like `app/api/admin/users/route.ts`).
- `checkAdminPermission()` does NOT check `status` (active/deactivated). For "Admin + active" routes, both `checkAdminPermission()` and `checkUserActive()` must be stacked. Current admin routes only use `checkAdminPermission()` — the convention is that admins are trusted to be active (deactivated admins would be locked at the app layout layer).
- Admin API guards go BEFORE the `try` block and before any `createClient()` call in the handler body.
- GET handlers on match/tournament routes are intentionally public per the decision matrix in AUTHORIZATION.md.

## Security Patterns

- `.or()` filter strings with user-controlled input are an injection risk in PostgREST — always prefer chained `.eq()` calls or parameterized filters.
- `checkAdminPermission()` returns `NextResponse | null` — callers must check `if (adminError) return adminError` immediately.
- `createAdminClient()` (service role) is only used in `lib/utils/admin.ts` — never in API route handlers directly.

## Testing Conventions

- Tests co-located in `__tests__/` subdirectories next to source files.
- `vi.hoisted()` pattern required for all Supabase mocks.
- No tests exist yet for the API routes in `app/api/matches/` or `app/api/tournaments/` — this is a known gap, not a blocker for simple routes but should be noted.

## Links to Detail Files

- (none yet)
