# Copilot Instructions for Quiniela

## Project Overview

Quiniela is a **multi-tournament prediction application** for FIFA World Cup 2026 and other competitions. Users submit match score predictions, earn points based on accuracy, and compete on tournament-specific leaderboards.

### Key Architectural Concepts

- **Tournament-centric design**: Teams are reusable across tournaments; each tournament has its own matches, predictions, and rankings
- **Server-first rendering**: Next.js App Router with server components by default; client components only where interactivity is needed
- **Row-Level Security (RLS)**: Supabase handles authorization at the database level; all tables have RLS enabled

## Build, Test, and Lint

```bash
npm run dev      # Development server (http://localhost:3000)
npm run build    # Production build
npm start        # Start production server
npm run lint     # Lint code
npm install      # Install dependencies
```

**Note**: Development requires `.env.local` with Supabase credentials.

## High-Level Architecture

### Frontend Structure

```
/app
  /(auth)              # Authentication routes (login, signup)
    /login
    /signup
  /(app)               # Protected routes (require auth)
    /tournaments       # Tournament selection
    /[tournamentId]    # Tournament-scoped pages
      /matches         # Match listings
      /predictions     # Prediction submission
      /rankings        # Leaderboard
    /profile           # User profile editor
  /api                 # API routes
    /predictions       # POST/PATCH predictions
    /matches/[id]/score # POST update match scores (admin)

/components
  /ui                  # shadcn/ui base components
  /teams               # TeamBadge, TeamSelector
  /tournaments         # TournamentCard, TournamentList
  /matches             # MatchCard, MatchList
  /predictions         # PredictionForm
  /rankings            # RankingsTable
  /profile             # ProfileEditor

/lib
  /supabase            # Supabase client utilities
  /utils
    /scoring.ts        # Points calculation logic
    /image.ts          # Image upload utilities
    /date.ts           # Date/time handling
    /admin.ts          # Admin verification
```

### Database Architecture

**Core entities** (Supabase PostgreSQL):
- `teams` - Reusable team definitions (name, short_name, country_code, logo_url)
- `tournaments` - Competition containers (name, sport, dates, status, scoring_rules)
- `tournament_teams` - Many-to-many junction table linking teams to tournaments
- `matches` - Individual games within a tournament (home/away teams, scores, status)
- `users` - User profiles extending Supabase auth.users (screen_name, avatar_url)
- `predictions` - User predictions for matches (predicted scores, points_earned)
- `tournament_rankings` - **Database VIEW** that dynamically calculates rankings (total_points, rank)

**Key relationships**:
- Teams can participate in multiple tournaments (reusable across World Cup, Euro, Copa America, etc.)
- Matches belong to one tournament and reference two teams (home/away)
- Predictions link users to matches (one prediction per user per match)
- Rankings are scoped per user per tournament

**Key rule**: Rankings are calculated automatically; no manual updates needed.

### Tech Stack

- **Frontend**: Next.js 15+ (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui components
- **Backend**: Next.js API routes (serverless functions)
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Authentication**: Supabase Auth (signup, login, session management via middleware)
- **Storage**: Supabase Storage (team logos, user avatars)

## Key Conventions

### Supabase Client Usage

**Server components** (fetch data, static rendering):
```typescript
import { createClient } from "@/lib/supabase/server";
const supabase = await createClient();
const { data } = await supabase.from("tournaments").select("*");
```

**Client components** (interactivity, form handling):
```typescript
"use client";
import { createClient } from "@/lib/supabase/client";
const supabase = createClient();
// State management, event handlers, etc.
```

**Pattern**: Use server components by default; add `"use client"` only for interactivity. Middleware handles auth token refresh automatically via `lib/supabase/middleware.ts`.

### Date Handling (Critical)

All dates stored as **UTC ISO strings** in database (PostgreSQL `TIMESTAMPTZ`). Use `@/lib/utils/date.ts`:

```typescript
import { formatLocalDate, formatLocalDateTime, formatLocalTime, isPastDate, isFutureDate, getCurrentUTC } from "@/lib/utils/date";

// Display (always use these - converts UTC to user's timezone)
formatLocalDate("2026-06-11T16:00:00Z")     // "Jun 11, 2026" 
formatLocalDateTime("2026-06-11T16:00:00Z") // "Jun 11, 2026 at 12:00"
formatLocalTime("2026-06-11T16:00:00Z")     // "12:00"

// Comparisons (handles timezone conversion)
isPastDate("2026-06-11T16:00:00Z")          // true/false
isFutureDate("2026-06-11T16:00:00Z")        // true/false

// Storage (always UTC)
getCurrentUTC()                              // "2026-01-31T05:49:38.308Z"
new Date().toISOString()                    // "2026-01-31T05:49:38.308Z"
```

**Rules**:
- **Store**: Always use UTC ISO strings
- **Display**: Always use the format utilities
- **Compare**: Use `isPastDate` or `isFutureDate`, never manual `new Date()` comparisons
- **Never** manually construct Date objects for display

### Scoring Logic

Points calculated in `@/lib/utils/scoring.ts`:
- Exact score: 3 points
- Correct winner + goal difference: 2 points
- Correct winner only: 1 point
- No match: 0 points

Final score = points × match.multiplier (default: 1)

### Type Safety

Import from `@/types/database.ts`:
```typescript
import type { Tournament, Match, Prediction } from "@/types/database";
```

Always use concrete types; avoid `any`.

### Admin Operations & RLS

Verify admin access with `@/lib/utils/admin.ts`:
```typescript
import { verifyAdmin } from "@/lib/utils/admin";
const isAdmin = await verifyAdmin(user.id);
```

All tables have RLS enabled:
- **Public read**: teams, tournaments, matches, tournament_teams, users, predictions, rankings
- **Authenticated write**: Users can only update their own profile and predictions
- **Admin operations**: Match scoring requires admin verification

When match is scored (via `/api/matches/[matchId]/score`):
1. Match status updates (e.g., "completed")
2. If "completed": All predictions for that match are scored
3. If status changes FROM "completed" TO another status: scores reset to 0
4. Tournament rankings auto-update via database view

### Database Bootstrap

**CRITICAL**: After **any** schema changes, update `supabase/bootstrap.sql` - it's the single source of truth for bootstrapping fresh databases.

**Schema locations**:
- `supabase/bootstrap.sql` - Complete database setup script (tables, indexes, views, functions, triggers, RLS policies, grants)
- `supabase/migrations/` - SQL migration files
- `supabase/seed.sql` - Seed data
- `types/database.ts` - TypeScript types (auto-generated from Supabase)

**When to update bootstrap.sql**:
- Adding, modifying, or removing tables
- Adding, modifying, or removing columns
- Adding, modifying, or removing indexes
- Adding, modifying, or removing RLS policies
- Adding, modifying, or removing functions or triggers
- Adding, modifying, or removing views
- Changing grants or permissions

**Bootstrap includes**:
- All table definitions with constraints
- All indexes for performance
- The `tournament_rankings` view
- All functions (admin checks, WebAuthn support, triggers)
- All triggers (user creation, last login, updated_at)
- All RLS policies (public read, user writes, admin access)
- All grants for anon and authenticated roles

### Theming & Colors

CSS variables in `app/globals.css` define the entire theme:
- `:root` section for light mode
- `.dark` section for dark mode

**Blue Lagoon palette** (do not hardcode colors):
- `#00A6FB` - Vivid Cerulean (accents, highlights)
- `#0582CA` - Honolulu Blue (primary brand color)
- `#006494` - Sea Blue (muted elements)
- `#003554` - Prussian Blue (dark mode cards)
- `#051923` - Rich Black (text, dark backgrounds)

**Using theme colors** (apply via Tailwind):
```jsx
<Button className="bg-primary text-primary-foreground">Primary</Button>
<Card className="bg-card border-border">Card</Card>
<Badge className="bg-accent">Accent</Badge>
```

To update entire app: Edit CSS variables in `app/globals.css` and the app auto-updates. See `THEMING.md` for detailed color management.

### Internationalization (i18n)

English and Spanish supported. Use `next-intl`:
```typescript
import { useTranslations } from "next-intl";
const t = useTranslations();
return <h1>{t("matches.title")}</h1>;
```

### Image Uploads

Use `@/lib/utils/image.ts`:
```typescript
import { uploadImage, generateImageFilename } from "@/lib/utils/image";
const filename = generateImageFilename(userId, file);
const url = await uploadImage(file, "user-avatars", filename);
```

Buckets: `team-logos`, `user-avatars` (both public)

### Auth & Middleware

- Token refresh handled by `middleware.ts`
- Protected routes check `auth.getUser()` in server components
- Supabase Auth handles signup, login, logout, sessions

## Best Practices

1. **Use server components by default** - Add `"use client"` only for interactivity
2. **Type safety** - Import types from `@/types/database.ts`
3. **Component composition** - Use shadcn/ui base components, extend with domain components
4. **Error handling** - API routes should return appropriate HTTP status codes and error messages
5. **Image optimization** - Use Next.js `<Image>` component for team logos and avatars
6. **Date handling** - Use `lib/utils/date.ts` utilities for all date operations
7. **Responsive design** - All components should work on mobile and desktop (Tailwind mobile-first)
8. **Database bootstrapping** - Always update `supabase/bootstrap.sql` to include latest schema

## Code Quality Rules

1. **No unused variables** - Delete declared but unused variables
2. **Concrete types** - Avoid `any`; use types from `@/types/database.ts`
3. **Consistent naming** - Same-type variables use the same name
4. **All user strings localized** - English and Spanish
5. **Server components by default** - Add `"use client"` only when needed
6. **HTTP status codes** - Return appropriate codes in API routes

## Configuration

- **TypeScript**: Strict mode enabled, ES2017 target, `@/*` path alias
- **ESLint**: `next/core-web-vitals` + TypeScript rules
- **Next.js**: App Router, remote image optimization for Supabase URLs
- **Environment**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

## Extending the Application

**Adding a tournament**:
1. Create tournament record in `tournaments` table
2. Link teams via `tournament_teams` table
3. Create matches
4. Rankings auto-calculate

**New scoring rule**:
1. Update `scoring_rules` in `tournaments` table
2. Modify `@/lib/utils/scoring.ts`
3. Rescore predictions if needed
4. Update `CLAUDE.md` and `supabase/bootstrap.sql`

**New language**:
1. Add keys to `/messages/[locale].json`
2. Add locale to `locales` in `i18n.ts`
3. Test locale detection/switching

## References

- **Architecture**: `CLAUDE.md`
- **Colors**: `THEMING.md`
- **Deployment**: `DEPLOYMENT.md`
- **Migrations**: `MIGRATION_INSTRUCTIONS.md`
- **Database**: `supabase/bootstrap.sql`, `types/database.ts`
