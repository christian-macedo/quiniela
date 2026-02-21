---
description: "TypeScript conventions, patterns, and best practices for the Quiniela codebase. Covers imports, types, naming, components, API routes, Supabase patterns, date handling, toasts, error handling, privacy, and localization."
---

# TypeScript Conventions & Best Practices

Concrete, pattern-driven conventions derived from the actual codebase.

## File & Directory Conventions

- **kebab-case files**: `use-feature-toast.ts`, `admin-check.ts`, `prediction-form.tsx`
- **Feature-based directories**: `/components/predictions/`, `/lib/middleware/`
- **Tests co-located** in `__tests__/` folders: `lib/utils/__tests__/scoring.test.ts`
- **Types centralized** in `types/database.ts`

## Import Conventions

Ordering: React/framework → lib utilities → domain components → types → UI components → Next.js built-ins.

```typescript
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { PredictionForm } from "@/components/predictions/prediction-form";
import { MatchWithTeams } from "@/types/database";
import { Button } from "@/components/ui/button";
```

- Always use `@/` aliases, never relative paths
- Never import `@/lib/supabase/server` in client components or vice versa

## Type System

Central types in `types/database.ts`:

```typescript
export type MatchStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type UserStatus = "active" | "deactivated";

export interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
}

// Use Pick<> for narrowed types
export type PublicUserProfile = Pick<
  User,
  "id" | "screen_name" | "avatar_url" | "created_at" | "updated_at"
>;
```

- Props interfaces at top of component file, above the component
- **No `any`** — use concrete types, union types, or `unknown` with type guards

## Naming Conventions

**Variables**: camelCase, descriptive, no abbreviations:

```typescript
const tournamentId = params.tournamentId as string; // not tid
const scheduledMatches = scheduledMatchesData || []; // not sMatches
const isUnscoring = currentStatus === "completed" && newStatus !== "completed";
```

**Query destructuring**: meaningful aliases:

```typescript
const { data: userProfile } = await supabase
  .from("users")
  .select("is_admin")
  .eq("id", user.id)
  .single();
const { data: matchData, error: matchFetchError } = await supabase
  .from("matches")
  .select("...")
  .single();
```

**Booleans**: `is`/`has` prefix. **Errors**: descriptive suffix (`adminError`, `statusError`, `matchFetchError`).

## Function Patterns

- **Named exports only** (no default exports except page components)
- **JSDoc with `@param`/`@returns`** on public utility functions
- **Guard clauses / early returns** over deep nesting
- **Async middleware** returns `NextResponse | null` (null = success):

```typescript
export async function checkAdminPermission(): Promise<NextResponse | null> {
  // ... checks ...
  if (!userProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }
  return null;
}
```

## Component Patterns

**Server Components by default**; `"use client"` only for state, effects, event handlers, browser APIs.

- Never edit `/components/ui` directly — create wrapper components
- Feature-scoped directories: `/components/predictions/`, `/components/rankings/`

## API Route Patterns

try-catch wrapping entire handler, middleware checks at top:

```typescript
export async function POST(request: NextRequest) {
  try {
    const statusError = await checkUserActive();
    if (statusError) return statusError;

    const supabase = await createClient();
    // ... handler logic ...
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating match score:", error);
    return NextResponse.json({ error: "Failed to update match score" }, { status: 500 });
  }
}
```

Error responses: `{ error: "message" }` with 401 (unauthenticated), 403 (forbidden/deactivated), 404 (not found), 500 (internal, always preceded by `console.error`).

## Data Access Patterns

Three Supabase clients:

```typescript
// Server (async — always await)
const supabase = await createClient(); // from @/lib/supabase/server

// Client (sync — never await)
const supabase = createClient(); // from @/lib/supabase/client

// Admin (bypasses RLS — server-only, NEVER in client components)
const adminClient = createAdminClient(); // from @/lib/supabase/admin
```

Always destructure `{ data, error }` and handle both. Null-check results before use.

## Date Handling

- **Storage**: UTC ISO strings (`getCurrentUTC()` or `new Date().toISOString()`)
- **Display**: `formatLocalDate`, `formatLocalDateTime`, `formatLocalTime` — never raw `.toLocaleString()`
- **Comparison**: `isPastDate()` / `isFutureDate()` — never manual `new Date()` comparisons

## Toast & User Feedback

`useFeatureToast(namespace)` for all user feedback. No `alert()`. No `console.error` as user feedback.

```typescript
const toast = useFeatureToast("teams");
toast.success("success.created"); // Feature-specific
toast.error("common:error.generic"); // Common namespace with prefix

await toast.promise(asyncOp(), {
  loading: "status:creating",
  success: "success.created",
  error: "error.failedToCreate",
});
```

## Error Handling

- **API routes**: try-catch + `console.error` prefix + status code response
- **Middleware**: returns `NextResponse | null` (null = no error)
- **Supabase**: always check `{ error }` — `if (matchFetchError) throw matchFetchError;`

## Privacy & Security

- **Never expose email** in public UI/APIs — use `getPublicUserDisplay()`, `sanitizeUserForPublic()`, `maskEmail()`
- **Explicit `.select()` field lists** on public queries
- **Middleware guards at top** of API handlers (`checkAdminPermission()`, `checkUserActive()`)

## Code Hygiene

- No unused variables/imports — delete immediately
- No dead code or commented-out blocks
- No backwards-compatibility shims
- No over-engineering: three similar lines > premature abstraction
- No `any` — use types from `types/database.ts`
- Prettier handles formatting (2-space indent, semicolons, double quotes, 100-char width)
- Comments explain "why" not "what"

## Localization

- All user-facing strings localized to English and Spanish
- Organized by feature: `teams.messages.*`, `matches.messages.*`
- Namespaced keys: `teams.messages.success.created` not just `created`
- Server: `getTranslations("rankings")` (async). Client: `useTranslations("predictions")`
