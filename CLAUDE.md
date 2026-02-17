# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quiniela is a multi-tournament prediction application initially designed for the FIFA World Cup 2026. Users can submit match score predictions, earn points based on accuracy, and compete on tournament-specific leaderboards.

**Target audience**: Soccer fans who want to compete with friends and family in prediction contests across multiple tournaments.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Tech Stack](#tech-stack)
- [Requirements & Compatibility](#requirements--compatibility)
- [Development Commands](#development-commands)
- [Local Development with Supabase](#local-development-with-supabase)
- [Component Patterns](#component-patterns)
- [Toast Notifications](#toast-notifications) → See [TOASTS.md](./TOASTS.md)
- [Date and Time Handling](#date-and-time-handling)
- [Supabase Configuration](#supabase-configuration)
- [Database Architecture](#database-architecture)
- [Project Structure](#project-structure)
- [Authentication Flow](#authentication-flow)
- [Image Uploads](#image-uploads)
- [Theming & Color Scheme](#theming--color-scheme) → See [THEMING.md](./THEMING.md)
- [Scoring Logic](#scoring-logic)
- [API Routes](#api-routes)
- [Best Practices & Conventions](#best-practices--conventions)
- [Git Hooks & Code Quality Automation](#git-hooks--code-quality-automation)
- [Testing](#testing)
- [Common Gotchas](#common-gotchas)
- [Troubleshooting](#troubleshooting)
- [Adding New Tournaments](#adding-new-tournaments)
- [Database Bootstrap Script](#database-bootstrap-script)

## Quick Reference

### Essential Imports

```typescript
// Toast notifications
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

// Supabase clients
import { createClient } from "@/lib/supabase/server"; // Server Components
import { createClient } from "@/lib/supabase/client"; // Client Components

// Date utilities
import {
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
  isPastDate,
} from "@/lib/utils/date";

// Image uploads
import { uploadImage, generateImageFilename } from "@/lib/utils/image";

// Scoring
import { calculatePoints } from "@/lib/utils/scoring";
```

### Common Patterns

```typescript
// Toast feedback
const toast = useFeatureToast('teams');
toast.success('success.created');

// Promise toast (with loading state)
await toast.promise(asyncOperation(), {
  loading: 'status:creating',
  success: 'success.created',
  error: 'error.failedToCreate'
});

// Server data fetch
const supabase = await createClient();
const { data } = await supabase.from('teams').select('*');

// Client data fetch
const supabase = createClient();
const { data } = await supabase.from('matches').select('*');

// Date display
formatLocalDateTime(match.date_time)  // "Jun 11, 2026 at 12:00"

// Image upload
const filename = generateImageFilename(teamId, file);
const url = await uploadImage(file, "team-logos", filename);

// Code formatting
npm run format                    // Format all files
npm run format:check              // Check formatting
```

## Tech Stack

**Core:**

- Next.js 15+ (App Router) + React 19 + TypeScript
- Tailwind CSS + shadcn/ui components

**Backend:**

- Supabase (PostgreSQL + Auth + Storage + RLS)
- Next.js API routes (serverless functions)

**Key Libraries & Patterns:**

- Date handling: Native JS (UTC storage, local timezone display)
- Toast notifications: Custom hook with i18n support
- Image optimization: Next.js Image component
- Styling: Tailwind utility classes + CSS variables for theming

## Requirements & Compatibility

**Development Requirements:**

- Node.js 20.x or higher
- npm 10.x or higher
- Docker Desktop (for local Supabase) OR a cloud Supabase project (free tier works fine)

**Environment Setup:**

- `.env.local` with Supabase credentials (see `.env.example`)
- Supabase storage buckets configured (team-logos, user-avatars)

**Browser Support:**

- Modern browsers (Chrome, Firefox, Safari, Edge latest versions)
- Mobile browsers (iOS Safari 14+, Chrome Android)

## Development Commands

```bash
# Install dependencies
npm install

# Run development server (requires .env with Supabase credentials)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint code
npm run lint

# Local Supabase (requires Docker)
npm run supabase:start    # Start local Supabase containers
npm run supabase:stop     # Stop containers (preserves data)
npm run supabase:reset    # Drop DB, reapply migrations + seed
npm run supabase:status   # Show local credentials
```

## Local Development with Supabase

The project supports a fully local Supabase stack via Docker, eliminating the need for a cloud project during development.

### Prerequisites

- **Docker Desktop** must be installed and running
- Node.js 20.x+ and npm 10.x+

### Quick Start

```bash
# 1. Install dependencies (includes Supabase CLI)
npm install

# 2. Start local Supabase (first run pulls Docker images, ~2-3 min)
npm run supabase:start

# 3. Get the local JWT keys (needed for .env.local)
npm run supabase:status -- -o env
# Copy the ANON_KEY and SERVICE_ROLE_KEY values from the output

# 4. Create .env.local with local credentials
# (see .env.example for the full template)
cat <<'EOF' > .env.local
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<ANON_KEY from step 3>
SUPABASE_SERVICE_ROLE_KEY=<SERVICE_ROLE_KEY from step 3>
NEXT_PUBLIC_RP_NAME="Quiniela Dev"
NEXT_PUBLIC_RP_ID=localhost
NEXT_PUBLIC_RP_ORIGIN=http://localhost:3000
EOF

# 5. Apply all migrations + seed data (with test accounts)
npm run supabase:reset

# 6. Start the Next.js dev server
npm run dev
```

> **Note:** `supabase:start` applies migrations automatically, but `supabase:reset` is needed to also run the seed file that creates test accounts and sample data.

### Test Accounts

After running `supabase:reset`, these accounts are ready to use (no email confirmation needed):

| Email                    | Password      | Role  |
| ------------------------ | ------------- | ----- |
| `admin@quiniela.test`    | `password123` | Admin |
| `player1@quiniela.test`  | `password123` | User  |
| `player2@quiniela.test`  | `password123` | User  |

### Command Reference

| Command                  | Description                                      |
| ------------------------ | ------------------------------------------------ |
| `npm run supabase:start` | Start all Docker containers                      |
| `npm run supabase:stop`  | Stop containers (preserves data)                 |
| `npm run supabase:reset` | Drop DB, reapply all migrations + seed.sql       |
| `npm run supabase:status`| Show status and local credentials                |

### Local Service URLs

| Service   | URL                          | Description                |
| --------- | ---------------------------- | -------------------------- |
| API       | `http://127.0.0.1:54321`     | Supabase API endpoint      |
| Studio    | `http://127.0.0.1:54323`     | Database admin dashboard   |
| Mailpit   | `http://127.0.0.1:54324`     | Email testing inbox        |
| Database  | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Direct DB connection |

### Switching Between Local and Cloud

Update the Supabase variables in `.env.local` to point to either environment:

- **Local**: `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321` + keys from `npm run supabase:status -- -o env`
- **Cloud**: `NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co` + keys from Supabase Dashboard

The `NEXT_PUBLIC_RP_*` WebAuthn variables stay the same for both (use `localhost` for local dev).

Restart the dev server after changing environment variables.

## Component Patterns

### When to Use Server vs Client Components

**Server Component (default):**

- Data fetching from database
- Static content rendering
- No user interaction needed
- SEO-critical pages

**Client Component ("use client"):**

- Forms with state management
- onClick handlers, useState, useEffect hooks
- Toast notifications
- Real-time interactions
- Browser APIs (window, localStorage, etc.)

### Server Components

Use for data fetching and static rendering:

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function TournamentsPage() {
  const supabase = await createClient();
  const { data: tournaments } = await supabase
    .from("tournaments")
    .select("*")
    .order("start_date", { ascending: false });

  return <TournamentList tournaments={tournaments || []} />;
}
```

### Client Components

Use "use client" directive for interactivity:

```typescript
"use client";
import { useState } from "react";
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

// Component with form handling, state management, toast notifications
```

## Toast Notifications

Use `useFeatureToast(namespace)` for all user feedback with automatic localization.

### Quick Start

```typescript
import { useFeatureToast } from "@/lib/hooks/use-feature-toast";

const toast = useFeatureToast("teams");
toast.success("success.created"); // Feature-specific
toast.error("common:error.generic"); // Common message
toast.promise(asyncOp, { loading, success, error }); // Loading states
```

### Key Features

- Feature-scoped localization (teams.messages._, matches.messages._, etc.)
- Automatic fallback to common messages
- Promise pattern for loading states (status:creating → success/error)
- Rich colors (green/red/yellow/blue backgrounds)

### Message Organization

**Feature-Specific** (use without prefix):

- `teams.messages.*` - Team operations
- `matches.messages.*` - Match operations and scoring
- `tournaments.messages.*` - Tournament operations
- `predictions.messages.*` - Prediction submissions
- `admin.messages.*` - Admin permissions
- `profile.messages.*` - Profile updates

**Common** (use with `common:` prefix):

- `common.messages.success.*` - Generic success (saved, created, updated, deleted)
- `common.messages.error.*` - Generic errors (generic, networkError, unauthorized)
- `common.status.*` - Loading states (saving, creating, updating, deleting)

### Full Documentation

📖 See **[TOASTS.md](./TOASTS.md)** for:

- Complete API reference
- Promise pattern examples
- Best practices and guidelines
- Troubleshooting
- Examples by feature

## Date and Time Handling

All dates are stored in **UTC** in the database (PostgreSQL `TIMESTAMPTZ` type) and converted to the **user's local timezone** for display.

### Date Utilities

```typescript
import {
  formatLocalDate,
  formatLocalDateTime,
  formatLocalTime,
  isPastDate,
  isFutureDate,
  getCurrentUTC,
} from "@/lib/utils/date";

// Display dates (automatic timezone conversion)
formatLocalDate("2026-06-11T16:00:00Z"); // "Jun 11, 2026"
formatLocalDateTime("2026-06-11T16:00:00Z"); // "Jun 11, 2026 at 12:00"
formatLocalTime("2026-06-11T16:00:00Z"); // "12:00"

// Check date status
isPastDate("2026-06-11T16:00:00Z"); // true/false
isFutureDate("2026-06-11T16:00:00Z"); // true/false

// Store dates (always use UTC)
getCurrentUTC(); // "2026-01-17T20:30:45.123Z"
new Date().toISOString(); // "2026-01-17T20:30:45.123Z"
```

### Rules

1. **Database Storage**: Always store dates as UTC ISO strings (`toISOString()`)
2. **Display**: Always use format utilities (`formatLocalDate`, etc.)
3. **Comparisons**: Use `isPastDate` or `isFutureDate` instead of manual `new Date()` comparisons
4. **Never** manually construct `Date` objects for display - use the utilities

## Supabase Configuration

### Environment Variables

Required in `.env.local` (see `.env.example`):

| Variable                        | Required | Description                        |
| ------------------------------- | -------- | ---------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes      | Your Supabase project URL          |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes      | Supabase anonymous key (public)    |
| `SUPABASE_SERVICE_ROLE_KEY`     | Optional | For admin operations (keep secret) |

### Client Usage Patterns

**Server Components**:

```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient(); // Note: await is required
```

**Client Components**:

```typescript
import { createClient } from "@/lib/supabase/client";
const supabase = createClient(); // No await needed
```

**Middleware** (for auth refresh):

- Uses `lib/supabase/middleware.ts`
- Configured in `middleware.ts` at root

### Row Level Security (RLS)

All tables have RLS enabled:

- **Public read**: teams, tournaments, matches, tournament_teams, users, predictions, rankings
- **Authenticated write**: users can only update their own profile and predictions
- **Admin operations**: Match scoring requires elevated permissions (implement admin checks)

## Database Architecture

### Core Data Model

The application is built around a **tournament-centric architecture** with these key entities:

1. **teams**: Reusable team entities (name, short_name, country_code, logo_url)
2. **tournaments**: Competition containers (name, sport, dates, status, scoring_rules)
3. **tournament_teams**: Many-to-many junction table linking teams to tournaments
4. **matches**: Individual games within a tournament (references home/away teams, scores, status)
5. **users**: User profiles extending Supabase auth.users (screen_name, avatar_url, is_admin, **status**)
   - **Status field**: Soft delete mechanism - values: 'active' (default) or 'deactivated'
   - Deactivated users are excluded from rankings and cannot submit predictions
6. **predictions**: User predictions for matches (predicted scores, points_earned)
7. **tournament_rankings**: Database VIEW that dynamically calculates rankings from predictions (total_points, rank)
   - Filters out deactivated users: `WHERE u.status = 'active'`

### Key Relationships

- Teams can participate in multiple tournaments (reusable across World Cup, Euro, Copa America, etc.)
- Matches belong to one tournament and reference two teams (home/away)
- Predictions link users to matches (one prediction per user per match)
- Rankings are scoped per user per tournament

### Database Schema Location

- **Bootstrap script**: `supabase/bootstrap.sql` - Complete database setup script
- Schema migrations: `supabase/migrations/`
- Seed data: `supabase/seed.sql`
- TypeScript types: `types/database.ts`

**IMPORTANT**: After any schema change (new tables, columns, RLS policies, functions, etc.), the `supabase/bootstrap.sql` script MUST be updated to reflect the latest database structure. This script is the single source of truth for bootstrapping a fresh database.

## Project Structure

```
/app
  /(auth)                    # Authentication routes
  /(app)                     # Main application (requires auth)
    /tournaments             # Tournament selection
    /[tournamentId]          # Tournament-scoped routes
      /matches               # Match listings
      /predictions           # Prediction submission
      /rankings              # Leaderboard
    /profile                 # User profile editor
  /api                       # API routes (serverless functions)
    /matches/[matchId]       # Match operations (scoring, updates)
    /predictions             # Prediction submission
/components
  /ui                        # shadcn/ui base components (don't edit directly)
  /teams                     # TeamBadge, TeamSelector
  /tournaments               # TournamentCard, TournamentList
  /matches                   # MatchCard, MatchList
  /predictions               # PredictionForm
  /rankings                  # RankingsTable
  /profile                   # ProfileEditor
/lib
  /supabase                  # Supabase client utilities
    /server.ts               # Server component client
    /client.ts               # Client component client
    /middleware.ts           # Auth refresh middleware
  /utils                     # Utility functions
    /scoring.ts              # Points calculation
    /date.ts                 # Date formatting and utilities
    /image.ts                # Image upload helpers
  /hooks                     # Custom React hooks
    /use-feature-toast.tsx   # Toast notification hook
/types
  /database.ts               # TypeScript types for database models
/supabase
  /bootstrap.sql             # Complete database setup (source of truth)
  /migrations                # SQL migration files
  /seed.sql                  # Sample data for development
/public
  /team-logos                # Static team logo assets
  /avatars                   # Default avatar images
```

## Authentication Flow

- Supabase Auth handles sign-up, login, session management
- Middleware refreshes auth tokens automatically on route changes
- User profiles are created in `users` table (extends auth.users)
- Protected routes check `auth.getUser()` in Server Components
- Redirect to login if unauthenticated

## Image Uploads

Team logos and user avatars are stored in Supabase Storage buckets:

- **team-logos**: Public bucket for team images
- **user-avatars**: Public bucket for profile pictures

Use `lib/utils/image.ts` utilities:

```typescript
import { uploadImage, generateImageFilename } from "@/lib/utils/image";

const filename = generateImageFilename(userId, file);
const url = await uploadImage(file, "user-avatars", filename);
```

**Important**: Both buckets must be configured as public in Supabase Dashboard.

## User Status and Deactivation

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

- Cannot log in (blocked at app layout level)
- Cannot submit or update predictions (RLS policy blocks)
- Excluded from tournament rankings (VIEW filter: `WHERE u.status = 'active'`)
- Profile hidden or returns 404
- All historical data preserved

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

### Public User Data

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

**When to mask emails**:

- ✅ Admin viewing other users' emails → use `maskEmail()`
- ✅ Tournament participants list (admin view) → use `maskEmail()`
- ✅ Any context where viewing another user's email → use `maskEmail()`
- ❌ User viewing their own email in menu/profile → show full email
- ❌ Public contexts (rankings, leaderboards) → don't include email at all

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

## Theming & Color Scheme

The application uses a flexible CSS variable-based theming system powered by the **Blue Lagoon** color palette.

### Current Palette

**Blue Lagoon** from [Coolors.co](https://coolors.co/palette/00a6fb-0582ca-006494-003554-051923):

- `#00A6FB` - Vivid Cerulean (accents, highlights)
- `#0582CA` - Honolulu Blue (primary brand color)
- `#006494` - Sea Blue (muted elements)
- `#003554` - Prussian Blue (dark mode cards)
- `#051923` - Rich Black (text, dark backgrounds)

### How to Change Colors

All theme colors are defined in **one place**: `app/globals.css`

To update the entire color scheme:

1. Edit the CSS variables in the `:root` section (light mode)
2. Edit the CSS variables in the `.dark` section (dark mode)
3. Save - the entire app updates automatically!

📖 See **[THEMING.md](./THEMING.md)** for detailed instructions and color palette resources.

### Using Theme Colors

Colors automatically apply through Tailwind utility classes:

```jsx
<Button className="bg-primary text-primary-foreground">Primary</Button>
<Card className="bg-card border-border">Card</Card>
<Badge className="bg-accent">Accent</Badge>
```

## Scoring Logic

Points are calculated in `lib/utils/scoring.ts` based on prediction accuracy:

- **Exact score**: 3 points
- **Correct winner + goal difference**: 2 points (1 + 1)
- **Correct winner only**: 1 point
- **Incorrect**: 0 points

The final score is multiplied by the match's `multiplier` value (default: 1).

### Match Scoring Process

When a match is scored (via `/api/matches/[matchId]/score`):

1. Match status updates to the provided status (e.g., "completed")
2. If status is "completed": All predictions for that match are scored
3. If status changes FROM "completed" TO another status: All prediction scores are reset to 0
4. Tournament rankings are automatically updated via the database view (no manual update needed)

## API Routes

### User Management

- `POST /api/account/deactivate` - User self-deactivation (signs out user immediately)
- `PATCH /api/admin/users/[userId]/status` - Admin activate/deactivate user
- `GET /api/admin/users` - Get all users with stats (includes status)
- `PATCH /api/admin/users/[userId]/permissions` - Toggle admin permissions

### Match Operations

- `POST /api/matches/[matchId]/score` - Score match and calculate prediction points

### Predictions

- `POST /api/predictions` - Submit or update prediction (checks user is active)

## Best Practices & Conventions

### Component Development

- **Use Server Components by default** - only add "use client" when needed for interactivity
- **Component composition** - use shadcn/ui base components in `/components/ui` (don't edit directly), extend with domain-specific components
- **Type safety** - import types from `types/database.ts`
- **Responsive design** - all components should work on mobile and desktop (Tailwind mobile-first approach)

### Code Quality

- **No unused variables** - only declare variables that are needed and used; delete unused variables immediately
- **Use concrete types** - avoid using `any` for variables; always favor well-defined types
- **Consistent naming** - variables referring to same types, values and behaviors should have the same names for consistency
- **Meaningful names** - prefer descriptive names over abbreviations (e.g., `tournament` over `tourn`)

### Data Handling

- **Date operations** - use `lib/utils/date.ts` utilities for all date handling (see [Date and Time Handling](#date-and-time-handling))
- **Image optimization** - use Next.js `<Image>` component for team logos and avatars
- **Error handling** - API routes should return appropriate HTTP status codes and clear error messages
- **Null checks** - always handle potential null/undefined from database queries

### User Experience

- **Toast notifications** - use `useFeatureToast(namespace)` for all user feedback messages (see [TOASTS.md](./TOASTS.md))
- **Loading states** - show loading indicators for async operations (use toast.promise pattern)
- **Error messages** - provide clear, actionable error messages to users
- **Confirmation dialogs** - require confirmation for destructive actions (delete, reset scores)

### Localization

- **All user-facing strings must be localized** to English and Spanish
- **Organize by feature area** - messages should be grouped by feature (teams, matches, tournaments) rather than by use case (toast, errors)
- **Use namespaced keys** - e.g., `teams.messages.success.created` not just `created`
- **Keep translations consistent** - use the same terminology across features

### Database Operations

- **Bootstrap script maintenance** - always update `supabase/bootstrap.sql` after ANY schema change (tables, columns, indexes, RLS policies, functions, triggers, views, grants)
- **RLS awareness** - remember all tables have Row Level Security enabled; test permissions thoroughly
- **Transactions** - use database transactions for multi-step operations
- **Query optimization** - use indexes for frequently queried columns

## Git Hooks & Code Quality Automation

This project uses Husky with lint-staged and Prettier to enforce code quality automatically.

### Pre-commit Checks (runs on every commit)

**Automated via lint-staged:**

- Prettier formatting (auto-formats all staged files)
- ESLint validation (auto-fixes when possible)

**What gets formatted:**

- TypeScript/JavaScript files (`.ts`, `.tsx`, `.js`, `.jsx`)
- JSON, CSS, Markdown files

**Performance:** ~2-4 seconds per commit (only checks staged files)

### Pre-push Checks (runs before pushing to remote)

- TypeScript type checking (`tsc --noEmit`)
- Full production build (`npm run build`)

**Performance:** ~20-30 seconds per push

### Manual Commands

```bash
# Format entire project
npm run format

# Check if files are formatted (no changes)
npm run format:check

# Fix all ESLint errors
npm run lint:fix

# Type check without building
npm run type-check
```

### Prettier Configuration

Located in `.prettierrc`:

- 2-space indentation
- Semicolons required
- Double quotes for consistency with JSX
- 100-character line width
- Auto line endings (handles Windows/Unix)

### Bypassing Hooks (Emergency Only)

**When to use:** Critical hotfixes, WIP commits that need to be saved urgently

```bash
# Skip pre-commit hooks
git commit --no-verify -m "emergency: bypass hooks"

# Skip pre-push hooks
git push --no-verify
```

**Important:** Use sparingly! Bypassed commits can break CI/CD or introduce linting errors.

### Troubleshooting

**Hooks not running:**

```bash
# Verify git hooks path
git config core.hooksPath  # Should output: .husky/_

# Reinstall hooks
npx husky install
```

**Formatting conflicts:**

```bash
# Format your local files
npm run format

# Check what's different
git diff
```

**Slow commits (rare):**

- Check how many files are staged: `git diff --cached --name-only`
- If formatting many files at once, consider committing in smaller batches
- Typical commit times: 2-4 seconds

**Pre-push taking too long:**

- Type checking and builds are comprehensive (20-30s is normal)
- Consider if you can break commits into smaller logical units
- Use `--no-verify` only for urgent hotfixes

## Testing

The project uses **Vitest** with **React Testing Library** for unit and component testing.

### Commands

```bash
npm test              # Single run (CI-friendly)
npm run test:watch    # Watch mode (re-runs on file changes)
npm run test:coverage # Run with coverage report
```

### File Location Convention

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

### Test Categories

| Category | What to mock | Example |
|----------|-------------|----------|
| **Pure utilities** | Nothing | `scoring.test.ts` |
| **Server middleware / API routes** | `@/lib/supabase/server` | `admin-check.test.ts`, `route.test.ts` |
| **Client components** | `@/lib/supabase/client`, `next/navigation`, `next-intl` | `page.test.tsx` |

### Mock Helpers

Shared helpers live in `__tests__/helpers/supabase-mock.ts`:

```typescript
import { createMockAuthUser, createMockUserProfile } from "@/__tests__/helpers/supabase-mock";

// Create a mock auth.getUser() response
const authUser = createMockAuthUser({ id: "user-1", email: "test@test.com" });

// Create a mock user profile (from the users table)
const profile = createMockUserProfile({ is_admin: true, status: "active" });
```

### Mocking Supabase: The `vi.hoisted()` Pattern

Because `vi.mock()` is hoisted above all imports, mock objects must be created inside `vi.hoisted()` so they exist when the mock factory runs. This is the **critical pattern** for all Supabase mocking.

#### Server-side tests (middleware, API routes)

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createMockAuthUser } from "@/__tests__/helpers/supabase-mock";

// 1. Create mocks inside vi.hoisted() — runs before imports
const { mockSupabase, mockAuth, mockQueryBuilder, mockQueryResult } = vi.hoisted(() => {
  const result = { data: null as unknown, error: null as unknown };
  const qb: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(), insert: vi.fn(), update: vi.fn(), delete: vi.fn(),
    eq: vi.fn(), single: vi.fn(), limit: vi.fn(), order: vi.fn(),
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
    getUser: vi.fn(), signUp: vi.fn(), signInWithPassword: vi.fn(),
    signOut: vi.fn(), exchangeCodeForSession: vi.fn(),
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
  createClient: vi.fn().mockResolvedValue(mockSupabase),  // Note: server client is async
}));

// 3. Import the module under test AFTER vi.mock()
import { checkAdminPermission } from "../admin-check";

// 4. Reset mocks in beforeEach
beforeEach(() => {
  vi.clearAllMocks();
  mockSupabase.from.mockReturnValue(mockQueryBuilder);  // Re-wire after clear
  mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  mockQueryResult.data = null;
  mockQueryResult.error = null;
});
```

#### Client-side tests (React components)

Same pattern, but the Supabase client mock is **synchronous** (no `await`):

```typescript
vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => mockSupabase),  // Note: no .mockResolvedValue — sync!
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
  useTranslations: vi.fn(() => (key: string) => key),  // Returns keys as-is
}));
```

### Key Rules

1. **Never import helpers inside `vi.hoisted()`** — only `vi` is available there. Use `vi.fn()` directly.
2. **Import source modules AFTER `vi.mock()` calls** — otherwise the real module loads before the mock is applied.
3. **Re-wire `mockSupabase.from()` in `beforeEach`** — `vi.clearAllMocks()` resets all return values, so `.from()` must be reconnected to the query builder.
4. **Set query results via the shared `result` object** — mutate `mockQueryResult.data` and `mockQueryResult.error` before calling the function under test.
5. **Mock only what's needed** — stub external components (e.g., `LanguageSwitcher`, `PasskeyLoginButton`) as simple divs to isolate the component under test.
6. **Use `createMockAuthUser()` and `createMockUserProfile()`** for consistent test data — pass overrides for the fields relevant to your test.

## Common Gotchas

Things that will definitely bite you if you're not careful:

1. **Date handling**: Never use `new Date()` for display or `.toLocaleString()` - always use the format utilities from `lib/utils/date.ts`

2. **Supabase clients**: Server components need `await createClient()`, client components use `createClient()` without await - mixing these up will cause errors

3. **Toast messages**: Use namespace without prefix for feature-specific messages (`toast.success('success.created')`), but use `common:` prefix for shared messages (`toast.error('common:error.generic')`)

4. **Image paths**: Team logos use relative paths stored in database, not absolute URLs - the bucket path is constructed in the Image component

5. **RLS policies**: Admin operations (like scoring matches) need explicit permission checks - just being authenticated isn't enough

6. **shadcn/ui components**: Files in `/components/ui` are generated by shadcn CLI - don't edit them directly; create wrapper components instead

7. **Client/Server imports**: Importing server-only code in client components will cause build errors - keep imports separated by component type

8. **User status checks**: Deactivated users are blocked at multiple levels (app layout, RLS policies, API routes) - ensure all checks are in place when adding new user-facing features

## Troubleshooting

### "Supabase client not initialized"

→ Check `.env.local` has `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`  
→ Verify environment variables are loaded (restart dev server after changes)

### Toast messages showing translation keys instead of text

→ Check namespace matches feature area (e.g., `useFeatureToast('teams')` for team operations)  
→ Verify translation keys exist in `/messages/[locale]/[feature].json`  
→ For common messages, ensure you're using the `common:` prefix

### Dates showing in UTC instead of local time

→ Use `formatLocalDateTime()`, `formatLocalDate()`, or `formatLocalTime()` - NOT `.toLocaleString()`  
→ Verify date is stored as ISO string in database

### Rankings not updating after scoring a match

→ Rankings should update automatically via database view - check that `tournament_rankings` view exists  
→ Run query manually to verify: `SELECT * FROM tournament_rankings WHERE tournament_id = '...'`  
→ Check RLS policies allow reading from the view

### Images not uploading to Supabase Storage

→ Verify storage buckets exist and are public (team-logos, user-avatars)  
→ Check bucket policies allow INSERT for authenticated users  
→ Verify file size is under bucket limits (default 50MB)

### "Module not found" errors in production build

→ Check imports use aliases correctly (`@/lib/...` not `../../../lib/...`)  
→ Verify `tsconfig.json` has correct path mappings  
→ Clear `.next` folder and rebuild

### Middleware not refreshing auth tokens

→ Ensure `middleware.ts` is at project root (not in `/app`)  
→ Check matcher config includes protected routes  
→ Verify Supabase middleware helper is imported correctly

### Client component errors about "use server"

→ You're likely importing a server action in a client component  
→ Move server actions to separate files and import them properly  
→ Check that API routes are being called via fetch, not direct imports

## Database Bootstrap Script

The file `supabase/bootstrap.sql` contains the complete database schema and must be kept up to date.

### When to Update

Update `supabase/bootstrap.sql` after ANY of these changes:

- Adding, modifying, or removing tables
- Adding, modifying, or removing columns
- Adding, modifying, or removing indexes
- Adding, modifying, or removing RLS policies
- Adding, modifying, or removing functions or triggers
- Adding, modifying, or removing views (e.g., tournament_rankings filter)
- Changing grants or permissions
- Adding status/state columns to existing tables

### How to Use

To bootstrap a fresh Supabase project:

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Go to SQL Editor in Supabase Dashboard
3. Paste and run the contents of `supabase/bootstrap.sql`
4. Configure storage buckets via Dashboard:
   - Create `team-logos` bucket (public)
   - Create `user-avatars` bucket (public)
5. Copy project URL and anon key to `.env.local`
6. Run `npm run dev` to start development

### Bootstrap vs Migrations Strategy

Use `supabase/bootstrap.sql` for fresh database installations (fastest, single-file setup). Use `supabase/migrations/` for upgrading existing databases (incremental migrations). When adding schema changes, create a migration file and update bootstrap.sql to reflect the final state.
