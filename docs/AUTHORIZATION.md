# Authorization & Security

Comprehensive guide to authentication, authorization, privacy, and security patterns in the Quiniela application.

## Quick Reference

### Essential Imports

```typescript
// API route protection (middleware)
import { checkAdminPermission } from "@/lib/middleware/admin-check";
import { checkUserActive } from "@/lib/middleware/user-status-check";

// Admin utilities (server components, API routes)
import { isAdmin, requireAdmin, getCurrentUser } from "@/lib/utils/admin";
import { updateUserAdminStatus, updateUserStatus } from "@/lib/utils/admin";

// Privacy utilities (any component displaying user data)
import {
  getPublicUserDisplay,
  getPublicUserInitials,
  maskEmail,
  sanitizeUserForPublic,
} from "@/lib/utils/privacy";

// Admin Supabase client (bypasses RLS - server-only)
import { createAdminClient } from "@/lib/supabase/admin";
```

### Key Files

| File                                  | Purpose                                             |
| ------------------------------------- | --------------------------------------------------- |
| `lib/middleware/admin-check.ts`       | `checkAdminPermission()` for API routes             |
| `lib/middleware/user-status-check.ts` | `checkUserActive()` for API routes                  |
| `lib/utils/admin.ts`                  | `isAdmin()`, `requireAdmin()`, `updateUserStatus()` |
| `lib/utils/privacy.ts`                | `maskEmail()`, `sanitizeUserForPublic()`, etc.      |
| `lib/supabase/admin.ts`               | `createAdminClient()` (service role, bypasses RLS)  |
| `app/(app)/layout.tsx`                | Deactivated user check at app boundary              |
| `supabase/bootstrap.sql`              | RLS policies, `is_admin()` function, triggers       |

## Multi-Layer Protection Model

The application enforces security at 4 layers. Every user-facing feature should be protected at **multiple** layers:

| Layer                       | Where                    | What It Does                                 | Example                                         |
| --------------------------- | ------------------------ | -------------------------------------------- | ----------------------------------------------- |
| **1. App Layout**           | `app/(app)/layout.tsx`   | Blocks deactivated users from the entire app | Redirects to `/login?error=account_deactivated` |
| **2. API Route Middleware** | `lib/middleware/`        | Guards individual API endpoints              | `checkAdminPermission()`, `checkUserActive()`   |
| **3. RLS Policies**         | `supabase/bootstrap.sql` | Database-level row access control            | `is_admin(auth.uid())` checks in policies       |
| **4. Application Code**     | Components, utilities    | Privacy filtering, field selection           | `sanitizeUserForPublic()`, explicit `.select()` |

## Authentication Flow

- Supabase Auth handles sign-up, login, session management
- Middleware refreshes auth tokens automatically on route changes (`lib/supabase/middleware.ts`, configured in root `middleware.ts`)
- User profiles are created in `users` table via the `handle_new_user()` trigger (extends `auth.users`)
- The first registered user is automatically granted admin status
- Protected routes check `auth.getUser()` in Server Components
- Redirect to login if unauthenticated

### Middleware Auth Token Refresh

The auth middleware at `middleware.ts` (project root) uses `lib/supabase/middleware.ts` to refresh tokens on every route change:

- Ensure `middleware.ts` is at project root (not in `/app`)
- Check matcher config includes protected routes
- Verify Supabase middleware helper is imported correctly

## API Route Protection Patterns

### Pattern 1: Admin-Only Routes

Use `checkAdminPermission()` for routes that only admins should access (match scoring, user management, team CRUD):

```typescript
import { checkAdminPermission } from "@/lib/middleware/admin-check";

export async function POST(request: Request) {
  const adminError = await checkAdminPermission();
  if (adminError) return adminError; // Returns 401 or 403

  // ... admin-only logic
}
```

**What it checks**: Authentication (401 if missing) + admin flag in users table (403 if not admin).

### Pattern 2: Active User Routes

Use `checkUserActive()` for routes that require an active (non-deactivated) user:

```typescript
import { checkUserActive } from "@/lib/middleware/user-status-check";

export async function POST(request: Request) {
  const statusError = await checkUserActive();
  if (statusError) return statusError; // Returns 403 if deactivated

  // ... active-user logic
}
```

**What it checks**: If user is deactivated, signs them out and returns 403.

### Pattern 3: Basic Authentication

For routes that just need a logged-in user (no admin or status check):

```typescript
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ... authenticated logic
}
```

### Pattern 4: Combined Checks

For routes requiring multiple checks (e.g., admin + active user):

```typescript
import { checkAdminPermission } from "@/lib/middleware/admin-check";
import { checkUserActive } from "@/lib/middleware/user-status-check";

export async function POST(request: Request) {
  const adminError = await checkAdminPermission();
  if (adminError) return adminError;

  const statusError = await checkUserActive();
  if (statusError) return statusError;

  // ... logic requiring both admin + active status
}
```

### Decision Matrix

| Route Type              | Middleware                         | Example Routes                      |
| ----------------------- | ---------------------------------- | ----------------------------------- |
| Public data (read-only) | None (RLS handles it)              | GET matches, GET rankings           |
| User actions            | `checkUserActive()`                | POST predictions                    |
| Admin actions           | `checkAdminPermission()`           | POST match score, PATCH user status |
| Admin + active          | Both checks                        | Admin operations on active users    |
| Self-service            | `auth.getUser()` + ownership check | POST account/deactivate             |

## Admin Utilities

**Location**: `lib/utils/admin.ts`

### Available Functions

```typescript
// Check if current user is admin (returns boolean)
const admin = await isAdmin();

// Require admin or throw error (for server components)
await requireAdmin(); // throws "Unauthorized: Admin access required"

// Get current user with full profile
const user = await getCurrentUser();

// Admin: update another user's admin status (uses service role)
await updateUserAdminStatus(userId, true); // grant admin
await updateUserAdminStatus(userId, false); // revoke admin

// Admin: update user account status (uses service role)
await updateUserStatus(userId, "deactivated");
await updateUserStatus(userId, "active");
```

### Admin Client

**Location**: `lib/supabase/admin.ts`

The admin client uses the `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS. Use it **only** for operations that require elevated permissions:

```typescript
import { createAdminClient } from "@/lib/supabase/admin";

const adminClient = createAdminClient(); // Synchronous, no await
```

**Rules**:

- NEVER expose to browser or use in client components
- NEVER import in files with `"use client"`
- Only use when RLS policies prevent a legitimate server-side operation
- Requires `SUPABASE_SERVICE_ROLE_KEY` in environment

## User Status & Deactivation

Users can be in one of two states: `active` or `deactivated`.

### User Self-Deactivation

Users can deactivate their own accounts from profile settings:

- Immediate status change to 'deactivated'
- Automatic logout
- All predictions and data preserved
- Must contact admin to reactivate

### Admin User Management

Admins can activate/deactivate any user:

```typescript
import { updateUserStatus } from "@/lib/utils/admin";
await updateUserStatus(userId, "deactivated");
```

### Effects of Deactivation

When a user is deactivated:

- **App layout** (`app/(app)/layout.tsx`): Signs out and redirects to `/login?error=account_deactivated`
- **API routes**: `checkUserActive()` returns 403 and signs them out
- **RLS policies**: INSERT/UPDATE on predictions blocked (`WHERE status = 'active'` check)
- **Rankings**: Excluded from `tournament_rankings` VIEW (`WHERE u.status = 'active'`)
- **Data**: All historical predictions and data preserved

### Checking User Status

In API routes:

```typescript
import { checkUserActive } from "@/lib/middleware/user-status-check";

const statusError = await checkUserActive();
if (statusError) return statusError;
```

In components (user is already loaded):

```typescript
if (user.status === "deactivated") {
  // Handle deactivated user
}
```

## Privacy & Data Protection

The application implements strict privacy controls to protect user PII.

### Public vs Protected Fields

**Publicly visible fields**:

- User ID (UUID)
- Screen name (required at signup, or "Player #XXXXX" for legacy users)
- Avatar URL
- Account creation/update timestamps

**Protected fields** (never exposed in public UI/APIs):

- Email address (users see their own full email; masked in admin views: `j***@example.com`)
- Admin status flag
- WebAuthn credentials
- Last login timestamp
- Account status

### Privacy Utilities

**Location**: `lib/utils/privacy.ts`

**ALWAYS** use privacy utilities when displaying user information:

```typescript
import {
  getPublicUserDisplay,
  getPublicUserInitials,
  maskEmail,
  sanitizeUserForPublic,
} from "@/lib/utils/privacy";

// Display name (shows screen_name or "Player #XXXXX" for legacy users)
const displayName = getPublicUserDisplay(user);

// Avatar initials (uses screen_name first letter or "P")
const initials = getPublicUserInitials(user);

// Masked email (for admin views when viewing OTHER users' emails)
const maskedEmail = maskEmail(user.email); // "j***@example.com"

// Strip sensitive fields for public APIs
const publicUser = sanitizeUserForPublic(user);
```

### When to Mask Emails

- Admin viewing other users' emails -> use `maskEmail()`
- Tournament participants list (admin view) -> use `maskEmail()`
- Any context where viewing another user's email -> use `maskEmail()`
- User viewing their own email in menu/profile -> show full email
- Public contexts (rankings, leaderboards) -> don't include email at all

### API Response Filtering

**Public endpoints** - explicit field selection:

```typescript
.select('id, screen_name, avatar_url, created_at, updated_at')
```

**Admin endpoints** - mask sensitive data:

```typescript
const users = await fetchUsers();
const masked = users.map((u) => ({ ...u, email: maskEmail(u.email) }));
```

### Screen Name Requirement

- **New users**: Must set screen_name during signup (3-30 characters)
- **Legacy users**: Grandfathered in with anonymous display ("Player #XXXXX")
- **Encouraged**: Banner prompts legacy users to set screen_name

## Row Level Security Policies

All tables have RLS enabled. The `is_admin()` SQL function is used throughout policies to check admin status.

### Per-Table Policy Summary

| Table                     | SELECT   | INSERT              | UPDATE                | DELETE     |
| ------------------------- | -------- | ------------------- | --------------------- | ---------- |
| `teams`                   | Everyone | Admin only          | Admin only            | Admin only |
| `tournaments`             | Everyone | Admin only          | Admin only            | Admin only |
| `tournament_teams`        | Everyone | Admin only          | -                     | Admin only |
| `tournament_participants` | Everyone | Admin only          | -                     | Admin only |
| `matches`                 | Everyone | Admin only          | Admin only            | Admin only |
| `users`                   | Everyone | Own profile only    | Own profile OR admin  | -          |
| `predictions`             | Everyone | Own + active status | Own + active OR admin | -          |
| `webauthn_credentials`    | Own only | Own only            | Own only              | Own only   |
| `webauthn_challenges`     | Own only | Own only            | -                     | Own only   |

**Key details**:

- **Predictions INSERT/UPDATE**: Includes an active status check (`WHERE status = 'active'`), preventing deactivated users from submitting predictions at the database level
- **Users SELECT**: RLS allows everyone to read all user rows. Application code MUST filter sensitive fields using `sanitizeUserForPublic()` or explicit `.select()` queries
- **Admin UPDATE on predictions**: Admins can update any prediction (needed for match scoring operations)

### Storage Bucket Policies

| Bucket         | SELECT | INSERT          | UPDATE          | DELETE          |
| -------------- | ------ | --------------- | --------------- | --------------- |
| `team-logos`   | Public | Authenticated   | Authenticated   | Authenticated   |
| `user-avatars` | Public | Own folder only | Own folder only | Own folder only |

Avatar uploads are scoped by user ID folder: `auth.uid()::text = (storage.foldername(name))[1]`.

### Key SQL Functions

**`is_admin(user_id UUID)`** - Used in RLS policies to check admin status:

```sql
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
AS $$ BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users WHERE id = user_id AND is_admin = TRUE
    );
END; $$;
```

**`handle_new_user()`** - Trigger on `auth.users` INSERT, creates user profile. First user becomes admin:

```sql
INSERT INTO public.users (id, email, screen_name, is_admin)
VALUES (
    NEW.id, NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'screen_name', split_part(NEW.email, '@', 1)),
    user_count = 0  -- First user becomes admin
);
```

**`tournament_rankings` VIEW** - Excludes deactivated users:

```sql
CREATE OR REPLACE VIEW public.tournament_rankings
WITH (security_invoker = true) AS
SELECT ...
FROM public.predictions p
JOIN public.users u ON p.user_id = u.id
JOIN public.tournament_participants tp ON ...
WHERE u.status = 'active'  -- Exclude deactivated users
GROUP BY ...;
```

## Common Scenarios

### Adding a New API Route

1. **Determine access level** using the [decision matrix](#decision-matrix)
2. **Add middleware checks** at the top of your handler:
   ```typescript
   // For admin routes:
   const adminError = await checkAdminPermission();
   if (adminError) return adminError;
   // For user routes:
   const statusError = await checkUserActive();
   if (statusError) return statusError;
   ```
3. **Test with all user types**: unauthenticated, regular user, deactivated user, admin

### Adding a New Page/Component

1. **Server Components**: Use `auth.getUser()` to check authentication
2. **Returning user data**: Always use `sanitizeUserForPublic()` or explicit field selection
3. **Admin-only UI**: Check `isAdmin()` and conditionally render

### Adding a New Database Table

1. Enable RLS: `ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;`
2. Create appropriate policies (use existing tables as templates)
3. If admin-managed: Use `public.is_admin(auth.uid())` in INSERT/UPDATE/DELETE policies
4. If user-owned: Use `auth.uid() = user_id` pattern
5. Update `supabase/bootstrap.sql` with the new table and policies
6. Add grants for `anon` and `authenticated` roles

## Troubleshooting

### "Unauthorized: Authentication required" (401)

- User is not logged in or session expired
- Check that `middleware.ts` is refreshing tokens
- Verify Supabase auth configuration

### "Forbidden: Admin access required" (403)

- User is authenticated but not an admin
- Check `is_admin` flag in the users table
- First user is auto-admin via `handle_new_user()` trigger

### "Account deactivated" (403)

- User's status is 'deactivated' in the users table
- Admin must reactivate via `updateUserStatus(userId, 'active')`
- Check `checkUserActive()` is in the API route

### RLS policy blocking a legitimate operation

- Check which policy is blocking: enable Supabase query logging
- Verify `auth.uid()` matches the expected user
- For admin operations: ensure `is_admin` flag is set
- For predictions: verify user status is 'active'
- Consider if `createAdminClient()` is needed (server-side only)

### Middleware not refreshing auth tokens

- Ensure `middleware.ts` is at project root (not in `/app`)
- Check matcher config includes protected routes
- Verify Supabase middleware helper is imported correctly
