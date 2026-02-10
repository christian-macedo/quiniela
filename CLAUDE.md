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
import { createClient } from "@/lib/supabase/server";  // Server Components
import { createClient } from "@/lib/supabase/client";  // Client Components

// Date utilities
import { formatLocalDate, formatLocalDateTime, formatLocalTime, isPastDate } from "@/lib/utils/date";

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
- Supabase project (free tier works fine)

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
```

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

const toast = useFeatureToast('teams');
toast.success('success.created');           // Feature-specific
toast.error('common:error.generic');        // Common message
toast.promise(asyncOp, { loading, success, error }); // Loading states
```

### Key Features

- Feature-scoped localization (teams.messages.*, matches.messages.*, etc.)
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
import { formatLocalDate, formatLocalDateTime, formatLocalTime, isPastDate, isFutureDate, getCurrentUTC } from "@/lib/utils/date";

// Display dates (automatic timezone conversion)
formatLocalDate("2026-06-11T16:00:00Z")        // "Jun 11, 2026"
formatLocalDateTime("2026-06-11T16:00:00Z")    // "Jun 11, 2026 at 12:00"
formatLocalTime("2026-06-11T16:00:00Z")        // "12:00"

// Check date status
isPastDate("2026-06-11T16:00:00Z")             // true/false
isFutureDate("2026-06-11T16:00:00Z")           // true/false

// Store dates (always use UTC)
getCurrentUTC()                                 // "2026-01-17T20:30:45.123Z"
new Date().toISOString()                       // "2026-01-17T20:30:45.123Z"
```

### Rules

1. **Database Storage**: Always store dates as UTC ISO strings (`toISOString()`)
2. **Display**: Always use format utilities (`formatLocalDate`, etc.)
3. **Comparisons**: Use `isPastDate` or `isFutureDate` instead of manual `new Date()` comparisons
4. **Never** manually construct `Date` objects for display - use the utilities

## Supabase Configuration

### Environment Variables

Required in `.env.local` (see `.env.example`):

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anonymous key (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional | For admin operations (keep secret) |

### Client Usage Patterns

**Server Components**:
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();  // Note: await is required
```

**Client Components**:
```typescript
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();  // No await needed
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
5. **users**: User profiles extending Supabase auth.users (screen_name, avatar_url)
6. **predictions**: User predictions for matches (predicted scores, points_earned)
7. **tournament_rankings**: Database VIEW that dynamically calculates rankings from predictions (total_points, rank)

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

## Common Gotchas

Things that will definitely bite you if you're not careful:

1. **Date handling**: Never use `new Date()` for display or `.toLocaleString()` - always use the format utilities from `lib/utils/date.ts`

2. **Supabase clients**: Server components need `await createClient()`, client components use `createClient()` without await - mixing these up will cause errors

3. **Toast messages**: Use namespace without prefix for feature-specific messages (`toast.success('success.created')`), but use `common:` prefix for shared messages (`toast.error('common:error.generic')`)

4. **Image paths**: Team logos use relative paths stored in database, not absolute URLs - the bucket path is constructed in the Image component

5. **RLS policies**: Admin operations (like scoring matches) need explicit permission checks - just being authenticated isn't enough

6. **shadcn/ui components**: Files in `/components/ui` are generated by shadcn CLI - don't edit them directly; create wrapper components instead

7. **Client/Server imports**: Importing server-only code in client components will cause build errors - keep imports separated by component type

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
- Adding, modifying, or removing views
- Changing grants or permissions

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

This project uses a **dual-track approach** for database schema management:

#### Fresh Installations
Use `supabase/bootstrap.sql` **ONLY**:
- Contains the complete, consolidated final schema state
- Skip the `migrations/` directory entirely
- Fastest path to a working database (single SQL file)
- Includes all changes from 16 migrations (2024-01-01 through 2026-02-01)

#### Existing Databases
Use `supabase/migrations/` **ONLY**:
- Apply new migrations sequentially to upgrade existing installations
- **Never** run bootstrap.sql on an existing database (will cause conflicts)
- Old migrations (2024-01-*) are archived in `migrations/archive/` for reference
- Active migrations (2026-01-19 onwards) should be applied to production

#### Why Keep Both?

- **Bootstrap.sql**: Optimized single-file setup for new team members and test environments
- **Migrations**: Historical record + incremental upgrade path for production databases
- **Safety**: Prevents breaking existing production databases with a full schema recreate
- **Clarity**: Clear separation between "fresh start" and "incremental update" workflows

#### Maintenance Workflow

When adding new schema changes:

1. Create migration file first (`supabase migration new feature_name`)
2. Test migration on development database
3. Apply to production via normal migration process
4. **Update bootstrap.sql** to reflect the new final state
5. Update the "Last updated" date in bootstrap.sql header

This ensures both fresh and existing installations stay synchronized.

#### What's Included in Bootstrap.sql?

**Current version (2026-02-09)** includes all changes from:
- ✓ Initial schema (teams, tournaments, matches, predictions, users)
- ✓ WebAuthn passkey support (tables, functions, authentication flow)
- ✓ Admin permission system (is_admin flag, first-user promotion, RLS policies)
- ✓ Tournament participant enrollment
- ✓ Storage RLS policies (user avatars, team logos)
- ✓ Automatic triggers (user creation, last login, updated_at timestamps)
- ✓ All 16 migrations from 20240101000000 through 20260201000000

**Not yet included** (will be added in future updates):
- Soft delete user functionality (from iakor-hidemails branch)
- Any migrations created after 2026-02-01

### Script Contents

The bootstrap script includes (in order):
- All table definitions with constraints and relationships
- All indexes for query performance optimization
- The `tournament_rankings` view for dynamic leaderboard calculation
- All functions (admin checks, WebAuthn support, utility functions)
- All triggers (user creation, last login tracking, updated_at timestamps)
- All RLS policies (public read access, user write access, admin permissions)
- All grants for `anon` and `authenticated` roles

### Keeping It Updated

**This is critical**: The bootstrap script is the single source of truth for database structure. When making schema changes:

1. Make the change in your development database
2. Test thoroughly
3. Create migration file in `supabase/migrations/`
4. **Update `supabase/bootstrap.sql`** to reflect the new state
5. Commit both the migration and updated bootstrap script

This ensures new team members or fresh deployments start with the correct schema.