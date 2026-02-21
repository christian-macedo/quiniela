---
description: "TypeScript conventions, patterns, and best practices for the Quiniela codebase. Covers imports, types, naming, components, API routes, Supabase patterns, date handling, toasts, error handling, privacy, and localization."
---

# TypeScript Conventions & Best Practices

Concrete, pattern-driven conventions derived from the actual codebase. Every rule here is backed by existing code.

## File & Directory Conventions

- **All files use kebab-case**: `use-feature-toast.ts`, `admin-check.ts`, `prediction-form.tsx`
- **Feature-based directories**: `/components/predictions/`, `/components/rankings/`, `/lib/middleware/`
- **Tests co-located** in `__tests__/` folders next to source: `lib/utils/__tests__/scoring.test.ts`
- **Types centralized** in `types/database.ts`

## Import Conventions

Observed ordering pattern (see `app/(app)/[tournamentId]/predictions/page.tsx`):

```typescript
// 1. React / framework
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

// 2. Lib utilities & clients
import { createClient } from "@/lib/supabase/client";

// 3. Domain components
import { PredictionForm } from "@/components/predictions/prediction-form";
import { PredictionResultCard } from "@/components/predictions/prediction-result-card";

// 4. Types
import { MatchWithTeams, Prediction } from "@/types/database";

// 5. UI components
import { Button } from "@/components/ui/button";

// 6. Next.js built-ins
import Link from "next/link";
```

- Always use `@/` aliases, never relative paths (`../../../lib/...`)
- Never import server-only code (`@/lib/supabase/server`) in client components
- Never import client-only code (`@/lib/supabase/client`) in server components

## Type System

**Central types in `types/database.ts`:**

```typescript
// Union types for status fields
export type MatchStatus = "scheduled" | "in_progress" | "completed" | "cancelled";
export type TournamentStatus = "upcoming" | "active" | "completed";
export type UserStatus = "active" | "deactivated";

// Interface for entities
export interface Match {
  id: string;
  tournament_id: string;
  // ...
}

// Extended interfaces for relations
export interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
}

// Pick utility types for partial views
export type PublicUserProfile = Pick<
  User,
  "id" | "screen_name" | "avatar_url" | "created_at" | "updated_at"
>;

// Intersection types for composed views
export type RankingWithPublicUser = TournamentRanking & {
  user: PublicUserProfile;
};
```

- Props interfaces defined at top of component file, above the component
- **No `any`** — use concrete types, union types, or `unknown` with type guards
- Use `Pick<>` to create narrowed types for privacy/public APIs (see `privacy.ts`)

## Naming Conventions

**Variables**: camelCase, descriptive — never abbreviate:

```typescript
// Good: descriptive names from real code
const tournamentId = params.tournamentId as string;
const scheduledMatches = scheduledMatchesData || [];
const isUnscoring = currentStatus === "completed" && newStatus !== "completed";

// Bad: abbreviated
const tid = params.tournamentId;
const sMatches = data;
```

**Query result destructuring**: meaningful aliases suffixed by context:

```typescript
// From admin-check.ts
const { data: userProfile } = await supabase
  .from("users")
  .select("is_admin")
  .eq("id", user.id)
  .single();

// From score/route.ts
const { data: matchData, error: matchFetchError } = await supabase
  .from("matches")
  .select("...")
  .single();
const { data: predictions, error: predictionsError } = await supabase
  .from("predictions")
  .select("*");

// From predictions/route.ts
const { data: match, error: matchError } = await supabase
  .from("matches")
  .select("tournament_id")
  .single();
const { data: participant } = await supabase
  .from("tournament_participants")
  .select("user_id")
  .single();
```

**Boolean flags**: `is`/`has` prefix:

```typescript
const isUnscoring = currentStatus === "completed" && newStatus !== "completed";
const isParticipant = !!participant;
// Database fields: is_admin, status (checked as userProfile?.status === "deactivated")
```

**Error variables**: descriptive suffix:

```typescript
const adminError = await checkAdminPermission();
const statusError = await checkUserActive();
const { error: matchError } = await supabase.from("matches").update({...});
const { error: authError } = await supabase.auth.getUser();
```

## Function Patterns

**Named exports only** (no default exports except page components):

```typescript
// lib/utils/scoring.ts
export function calculatePoints(...): number { }
export function getPointsDescription(...): string { }
export function getBasePoints(...): number { }

// lib/utils/privacy.ts
export function getPublicUserDisplay(user: Pick<User, "id" | "screen_name">): string { }
export function maskEmail(email: string): string { }
export function sanitizeUserForPublic(user: User): PublicUser { }
```

**JSDoc with `@param`/`@returns` on public utility functions** (see `date.ts`, `privacy.ts`, `scoring.ts`):

```typescript
/**
 * Format a UTC date string to local time
 * @param dateString - ISO 8601 date string (stored as UTC in database)
 * @param formatString - date-fns format string
 * @returns Formatted date string in user's local timezone
 */
export function formatLocalDate(dateString: string, formatString: string = "MMM d, yyyy"): string {
```

**Guard clauses / early returns** over deep nesting (see `privacy.ts`):

```typescript
export function getPublicUserDisplay(user: Pick<User, "id" | "screen_name">): string {
  if (user.screen_name) {
    return user.screen_name;
  }
  return generateAnonymousName(user.id);
}
```

**Async middleware returns `NextResponse | null`** pattern (null = success):

```typescript
// From admin-check.ts
export async function checkAdminPermission(): Promise<NextResponse | null> {
  // ... checks ...
  if (!userProfile?.is_admin) {
    return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
  }
  return null; // Admin check passed
}
```

## Component Patterns

**Server Components by default**; `"use client"` only when needed:

```typescript
// Server Component (rankings/page.tsx) — data fetching, no state
import { createClient } from "@/lib/supabase/server";

export default async function RankingsPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const supabase = await createClient();
  const { data: rankings } = await supabase.from("tournament_rankings").select("...").order("rank");
  return <RankingsTable rankings={rankings || []} />;
}

// Client Component (predictions/page.tsx) — state, effects, user interaction
"use client";
import { useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

export default function PredictionsPage() {
  const [loading, setLoading] = useState(true);
  // ...
}
```

- Composition with shadcn/ui: never edit `/components/ui` directly — create wrapper components
- Feature-scoped directories: `/components/predictions/`, `/components/rankings/`, `/components/teams/`

## API Route Patterns

**try-catch wrapping entire handler body** (see `score/route.ts`, `predictions/route.ts`):

```typescript
export async function POST(request: NextRequest) {
  try {
    // Middleware checks at top
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

**Consistent error responses**: `{ error: "message" }` with status codes:

```typescript
// 401 — not authenticated
return NextResponse.json({ error: "Unauthorized: Authentication required" }, { status: 401 });

// 403 — forbidden (wrong role or deactivated)
return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });

// 404 — resource not found
return NextResponse.json({ error: "Match not found" }, { status: 404 });

// 500 — internal error (always preceded by console.error)
console.error("Error creating/updating prediction:", error);
return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
```

## Data Access Patterns

Three Supabase client types, each with distinct usage:

```typescript
// Server Components / API routes (async — always await)
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();

// Client Components (synchronous — never await)
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();

// Admin operations (bypasses RLS — server-only, never in client)
import { createAdminClient } from "@/lib/supabase/admin";
const adminClient = createAdminClient();
```

**Always destructure `{ data, error }`** and handle both:

```typescript
const { data: matchData, error: matchFetchError } = await supabase
  .from("matches")
  .select("multiplier, tournament_id, status")
  .eq("id", matchId)
  .single();

if (matchFetchError) throw matchFetchError;
```

**Null-check query results** before use:

```typescript
const multiplier = matchData?.multiplier || 1.0;
setScheduledMatches(scheduledMatchesData || []);
for (const prediction of predictions || []) {
}
```

## Date Handling

- **Storage**: always UTC ISO strings (`getCurrentUTC()` or `new Date().toISOString()`)
- **Display**: always use format utilities, never raw `.toLocaleString()`
- **Comparison**: `isPastDate()` / `isFutureDate()`, never manual `new Date()` comparisons

```typescript
// From date.ts — all functions use JSDoc and accept ISO 8601 strings
import { formatLocalDate, formatLocalDateTime, formatLocalTime, isPastDate } from "@/lib/utils/date";

formatLocalDate("2026-06-11T16:00:00Z");     // "Jun 11, 2026"
formatLocalDateTime("2026-06-11T16:00:00Z");  // "Jun 11, 2026 at 12:00"

// Storing dates (score/route.ts)
updated_at: getCurrentUTC(),
```

## Toast & User Feedback

`useFeatureToast(namespace)` for all user feedback (see `use-feature-toast.ts`):

```typescript
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

const toast = useFeatureToast("teams");
toast.success("success.created"); // Feature-specific: teams.messages.success.created
toast.error("common:error.generic"); // Common namespace: common.messages.error.generic

// Promise pattern for async operations
await toast.promise(asyncOperation(), {
  loading: "status:creating", // common.status.creating
  success: "success.created", // teams.messages.success.created
  error: "error.failedToCreate", // teams.messages.error.failedToCreate
});
```

- No `alert()` for user-facing messages
- No `console.error` as user feedback (it's for server-side logging only)

## Error Handling

**API routes**: try-catch with console.error prefix before returning 500:

```typescript
} catch (error) {
  console.error("Error creating/updating prediction:", error);
  return NextResponse.json({ error: "Failed to save prediction" }, { status: 500 });
}
```

**Middleware**: returns `NextResponse | null` (null = no error):

```typescript
const adminError = await checkAdminPermission();
if (adminError) return adminError;
```

**Supabase errors**: always check `{ error }` — never ignore it:

```typescript
if (matchFetchError) throw matchFetchError;
if (matchError || !match) {
  return NextResponse.json({ error: "Match not found" }, { status: 404 });
}
```

## Privacy & Security

**Never expose email** in public UI or APIs (see `privacy.ts`):

```typescript
import { getPublicUserDisplay, sanitizeUserForPublic, maskEmail } from "@/lib/utils/privacy";

// Public display: screen_name or "Player #XXXXX"
const displayName = getPublicUserDisplay(user);

// Strip sensitive fields for API responses
const publicUser = sanitizeUserForPublic(fullUser);
// Returns only: id, screen_name, avatar_url, created_at, updated_at

// Admin views: masked email only
const masked = maskEmail("john@example.com"); // "jo***@example.com"
```

**Explicit `.select()` field lists** on public-facing queries:

```typescript
// From rankings/page.tsx — only selects public-safe fields
.select(`*, user:users(id, screen_name, avatar_url, created_at, updated_at)`)
```

**Middleware guards at top of API handlers**:

```typescript
// Admin-only routes
const adminError = await checkAdminPermission();
if (adminError) return adminError;

// Active user routes
const statusError = await checkUserActive();
if (statusError) return statusError;
```

## Code Hygiene

- **No unused variables or imports** — delete immediately, don't comment out
- **No dead code or commented-out blocks** — remove completely
- **No backwards-compatibility shims** for removed features (no `_unused` vars, no re-exports)
- **No over-engineering**: no helpers/abstractions for one-time operations; three similar lines > premature abstraction
- **No `any`** — use concrete types from `types/database.ts`
- **Prettier handles formatting** — don't fight it (2-space indent, semicolons, double quotes, 100-char width)
- **Inline comments explain "why" not "what"**:

```typescript
// Good (from score/route.ts):
// Check if we're changing from completed to non-completed status
const isUnscoring = currentStatus === "completed" && newStatus !== "completed";

// No need to update tournament rankings - they are calculated dynamically via view

// Bad:
// Set isUnscoring to true if status changed
const isUnscoring = currentStatus === "completed" && newStatus !== "completed";
```

## Localization

- **All user-facing strings must be localized** to English and Spanish
- **Organize by feature area**: `teams.messages.*`, `matches.messages.*`, `predictions.messages.*`
- **Use namespaced keys**: `teams.messages.success.created` not just `created`
- **Server components** use `getTranslations()` (async); **client components** use `useTranslations()`

```typescript
// Server component
const t = await getTranslations("rankings");

// Client component
const t = useTranslations("predictions");
const tCommon = useTranslations("common");
```
