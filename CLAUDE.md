# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quiniela is a multi-tournament prediction application initially designed for the FIFA World Cup 2026. Users can submit match score predictions, earn points based on accuracy, and compete on tournament-specific leaderboards.

## Table of Contents

- [Quick Reference](#quick-reference)
- [Tech Stack](#tech-stack)
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
- [Extending to New Tournaments](#extending-to-new-tournaments)
- [Best Practices](#best-practices)
- [Code Quality](#code-quality)
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

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API routes (serverless functions)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth
- **Storage**: Supabase Storage (for team logos and user avatars)

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

### Server Components (Default)

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
// Component with form handling, state management
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
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Client Usage Patterns

**Server Components**:
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
```

**Client Components**:
```typescript
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
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
  /api                       # API routes
/components
  /ui                        # shadcn/ui base components
  /teams                     # TeamBadge, TeamSelector
  /tournaments               # TournamentCard, TournamentList
  /matches                   # MatchCard, MatchList
  /predictions               # PredictionForm
  /rankings                  # RankingsTable
  /profile                   # ProfileEditor
/lib
  /supabase                  # Supabase client utilities
  /utils                     # Utility functions (scoring, date, image)
/types
  /database.ts               # TypeScript types for database models
/supabase
  /migrations                # SQL migration files
/public
  /team-logos                # Static team logo assets
  /avatars                   # Default avatar images
```

## Authentication Flow

- Supabase Auth handles sign-up, login, session management
- Middleware refreshes auth tokens automatically
- User profiles are created in `users` table (extends auth.users)
- Protected routes should check `auth.getUser()` in Server Components

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

## Extending to New Tournaments

To add a new tournament:

1. Insert tournament record in `tournaments` table
2. Link existing teams via `tournament_teams` table
3. Create matches for the tournament
4. Users can then submit predictions and view rankings scoped to that tournament

Teams are reusable - no need to recreate "Brazil" for each tournament.

## Best Practices

1. **Use Server Components by default** - only add "use client" when needed for interactivity
2. **Type safety** - import types from `types/database.ts`
3. **Component composition** - use shadcn/ui base components, extend with domain components
4. **Error handling** - API routes should return appropriate status codes and error messages
5. **Image optimization** - use Next.js `<Image>` component for team logos and avatars
6. **Date handling** - use `lib/utils/date.ts` utilities for all date operations (see [Date and Time Handling](#date-and-time-handling))
7. **Toast notifications** - use `useFeatureToast(namespace)` for all user feedback messages (see [TOASTS.md](./TOASTS.md))
8. **Responsive design** - all components should work on mobile and desktop (Tailwind mobile-first)
9. **Database bootstrapping** - always generate a database bootstrapping script that includes the latest based on the schema, relationships and access rules defined

## Code Quality

1. **Do not leave unused variables** - only declare variables that are needed and used, if an unused variable is found it should be deleted.
2. **Use concrete types** - avoid using **any** for variables and always favor concrete (well-defined) types.
3. **Name variables consistently** - variables that refer to same types, values and behaviors should have the same names for consistency.
4. **Always localize UX strings** - any string that is displayed to a user should be localized to the following languages:
   - English
   - Spanish
5. **Organize localization by feature area** - messages should be grouped by feature (teams, matches, tournaments) rather than by use case (toast, errors). This keeps related strings together and improves maintainability.

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
1. Create a new Supabase project
2. Go to SQL Editor in Supabase Dashboard
3. Paste and run the contents of `supabase/bootstrap.sql`
4. Configure storage buckets via Dashboard (team-logos, user-avatars)
5. Set environment variables in `.env.local`

### Script Contents

The bootstrap script includes:
- All table definitions with constraints
- All indexes for performance
- The `tournament_rankings` view
- All functions (admin checks, WebAuthn support, triggers)
- All triggers (user creation, last login, updated_at)
- All RLS policies (public read, user writes, admin access)
- All grants for anon and authenticated roles
