# Authorization & Security

## Key Files

| File                                  | Purpose                                                            |
| ------------------------------------- | ------------------------------------------------------------------ |
| `lib/middleware/admin-check.ts`       | `checkAdminPermission()` for API routes                            |
| `lib/middleware/user-status-check.ts` | `checkUserActive()` for API routes                                 |
| `lib/utils/admin.ts`                  | `isAdmin()`, `requireAdmin()`, `updateUserStatus()`                |
| `lib/utils/privacy.ts`                | `maskEmail()`, `sanitizeUserForPublic()`, `getPublicUserDisplay()` |
| `lib/supabase/admin.ts`               | `createAdminClient()` (service role, bypasses RLS)                 |
| `app/(app)/layout.tsx`                | Deactivated user check at app boundary                             |
| `supabase/bootstrap.sql`              | RLS policies, `is_admin()` function, triggers                      |

## Multi-Layer Protection Model

| Layer                   | Where                    | What It Does                                                            |
| ----------------------- | ------------------------ | ----------------------------------------------------------------------- |
| **1. App Layout**       | `app/(app)/layout.tsx`   | Blocks deactivated users, redirects to login                            |
| **2. API Middleware**   | `lib/middleware/`        | Guards individual endpoints (`checkAdminPermission`, `checkUserActive`) |
| **3. RLS Policies**     | `supabase/bootstrap.sql` | Database-level row access control via `is_admin(auth.uid())`            |
| **4. Application Code** | Components, utilities    | Privacy filtering, explicit `.select()` field lists                     |

## Authentication Flow

- Supabase Auth handles sign-up, login, session management
- Token refresh middleware in `middleware.ts` (project root) uses `lib/supabase/middleware.ts`
- User profiles created via `handle_new_user()` trigger (first user becomes admin)
- Protected routes check `auth.getUser()` in Server Components

## API Route Protection

### Patterns

```typescript
// Admin-only: returns 401 (unauthenticated) or 403 (not admin)
const adminError = await checkAdminPermission();
if (adminError) return adminError;

// Active user: returns 403 if deactivated (also signs out)
const statusError = await checkUserActive();
if (statusError) return statusError;

// Basic auth: manual check
const {
  data: { user },
} = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Combined: stack checks at handler top
const adminError = await checkAdminPermission();
if (adminError) return adminError;
const statusError = await checkUserActive();
if (statusError) return statusError;
```

### Decision Matrix

| Route Type       | Middleware                   | Example                             |
| ---------------- | ---------------------------- | ----------------------------------- |
| Public read-only | None (RLS handles it)        | GET matches, rankings               |
| User actions     | `checkUserActive()`          | POST predictions                    |
| Admin actions    | `checkAdminPermission()`     | POST match score, PATCH user status |
| Admin + active   | Both checks                  | Admin operations on active users    |
| Self-service     | `auth.getUser()` + ownership | POST account/deactivate             |

## Admin Utilities

`lib/utils/admin.ts`:

- `isAdmin()` — returns boolean
- `requireAdmin()` — throws if not admin (for server components)
- `getCurrentUser()` — full profile
- `updateUserAdminStatus(userId, bool)` — grant/revoke admin (uses service role)
- `updateUserStatus(userId, status)` — activate/deactivate (uses service role)

**Admin client** (`lib/supabase/admin.ts`): `createAdminClient()` bypasses RLS. NEVER expose to browser or use in client components. Requires `SUPABASE_SERVICE_ROLE_KEY`.

## User Status & Deactivation

States: `active` | `deactivated`. Users can self-deactivate (immediate logout, data preserved, admin must reactivate).

**Effects of deactivation:**

- **App layout**: signs out, redirects to `/login?error=account_deactivated`
- **API routes**: `checkUserActive()` returns 403
- **RLS**: INSERT/UPDATE on predictions blocked (`WHERE status = 'active'`)
- **Rankings**: excluded from `tournament_rankings` VIEW
- **Data**: all historical predictions preserved

## Privacy & Data Protection

**Public fields**: id, screen_name, avatar_url, created_at, updated_at
**Protected fields** (never in public UI/APIs): email, is_admin, webauthn credentials, last_login, status

```typescript
getPublicUserDisplay(user); // screen_name or "Player #XXXXX"
getPublicUserInitials(user); // first letter or "P"
maskEmail(user.email); // "j***@example.com" (admin views only)
sanitizeUserForPublic(user); // strips all protected fields
```

**Email rules**: Admin viewing others → `maskEmail()`. User viewing own → full email. Public contexts → no email at all.

**API responses**: use explicit `.select('id, screen_name, avatar_url')` on public queries. Admin endpoints: mask with `maskEmail()`.

## Row Level Security Policies

All tables have RLS. `is_admin(auth.uid())` used throughout.

| Table                     | SELECT   | INSERT       | UPDATE                | DELETE |
| ------------------------- | -------- | ------------ | --------------------- | ------ |
| `teams`                   | Everyone | Admin        | Admin                 | Admin  |
| `tournaments`             | Everyone | Admin        | Admin                 | Admin  |
| `tournament_teams`        | Everyone | Admin        | -                     | Admin  |
| `tournament_participants` | Everyone | Admin        | -                     | Admin  |
| `matches`                 | Everyone | Admin        | Admin                 | Admin  |
| `users`                   | Everyone | Own only     | Own OR admin          | -      |
| `predictions`             | Everyone | Own + active | Own + active OR admin | -      |
| `webauthn_credentials`    | Own      | Own          | Own                   | Own    |
| `webauthn_challenges`     | Own      | Own          | -                     | Own    |

**Key**: Predictions INSERT/UPDATE includes active status check at DB level. Users SELECT allows all rows — app code MUST filter with `sanitizeUserForPublic()` or explicit `.select()`.

### Storage Buckets

| Bucket         | SELECT | INSERT/UPDATE/DELETE           |
| -------------- | ------ | ------------------------------ |
| `team-logos`   | Public | Authenticated                  |
| `user-avatars` | Public | Own folder only (`auth.uid()`) |

### Key SQL Functions

See `supabase/bootstrap.sql` for full source:

- **`is_admin(user_id)`** — checks admin flag, used in RLS policies (`SECURITY DEFINER`)
- **`handle_new_user()`** — trigger on `auth.users` INSERT, creates profile, first user becomes admin
- **`tournament_rankings` VIEW** — joins predictions + users, `WHERE u.status = 'active'`

## Common Scenarios

**New API route**: Check [decision matrix](#decision-matrix) → add middleware at handler top → test with all user types (unauth, regular, deactivated, admin).

**New page/component**: Server Components use `auth.getUser()`. Always `sanitizeUserForPublic()` or explicit field selection. Admin UI: check `isAdmin()`.

**New database table**: Enable RLS → create policies (use existing tables as templates) → update `supabase/bootstrap.sql` → add grants for `anon`/`authenticated`.

## Troubleshooting

- **401 "Authentication required"**: Session expired or missing. Check `middleware.ts` token refresh.
- **403 "Admin access required"**: User not admin. Check `is_admin` in users table. First user is auto-admin.
- **403 "Account deactivated"**: Admin must reactivate via `updateUserStatus(userId, 'active')`.
- **RLS blocking**: Enable Supabase query logging. Verify `auth.uid()` and `is_admin` flag. Consider `createAdminClient()` for server-side.
- **Token refresh failing**: Ensure `middleware.ts` at project root (not `/app`). Check matcher config.
