# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quiniela is a multi-tournament prediction application initially designed for the FIFA World Cup 2026. Users can submit match score predictions, earn points based on accuracy, and compete on tournament-specific leaderboards.

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

## Dependency Management

### Installing External Packages

When adding a new external package:

```bash
# Install the package
npm install package-name

# Or for dev dependencies
npm install -D package-name
```

**Important:** Always commit both `package.json` AND `package-lock.json` together.

### Verifying Dependencies

Before committing code that imports new packages:

```bash
# Build check (catches missing imports)
npm run build

# Lint check (catches code style issues)
npm run lint

# Clean install (verifies lock file)
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Common Dependency Scenarios

| Scenario | Action | Files to Commit |
|----------|--------|-----------------|
| Adding shadcn/ui component | `npx shadcn-ui@latest add name` | Component file + package.json + package-lock.json |
| Adding npm package | `npm install package-name` | package.json + package-lock.json |
| Removing package | `npm uninstall package-name` | package.json + package-lock.json |
| Updating all packages | `npm update` | package-lock.json |

### Troubleshooting Build Failures

If you see "Module not found" errors:

1. **Check if package is installed:**
   ```bash
   grep "package-name" package.json
   ```

2. **Install missing package:**
   ```bash
   npm install package-name
   ```

3. **For shadcn/ui components:**
   ```bash
   npx shadcn-ui@latest add component-name
   ```

4. **Verify build succeeds:**
   ```bash
   npm run build
   ```

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
    /login
    /signup
  /(app)                     # Main application (requires auth)
    /tournaments             # Tournament selection page
    /[tournamentId]          # Tournament-scoped routes
      /matches               # Match listings
      /predictions           # Prediction submission
      /rankings              # Leaderboard
    /profile                 # User profile editor
  /api                       # API routes
    /predictions             # POST: submit/update predictions
    /matches/[matchId]/score # POST: update match scores (admin)
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
    /client.ts               # Browser client
    /server.ts               # Server component client
    /middleware.ts           # Auth middleware
  /utils
    /scoring.ts              # Points calculation logic
    /image.ts                # Image upload utilities
/types
  /database.ts               # TypeScript types for database models
/supabase
  /migrations                # SQL migration files
/public
  /team-logos                # Static team logo assets
  /avatars                   # Default avatar images
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

## Supabase Configuration

### Environment Variables

Required in `.env.local` (see `.env.example`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Client Usage Patterns

**Server Components** (app directory):
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

## Component Patterns

### Server Components (Default)

Use for data fetching and static rendering:
```typescript
// app/(app)/tournaments/page.tsx
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
// components/predictions/prediction-form.tsx
"use client";
import { useState } from "react";
// Component with form handling, state management
```

## Adding New UI Components

This project uses shadcn/ui for base UI components. Follow this workflow when adding new components.

### For shadcn/ui Components

**Before creating a component that uses shadcn/ui primitives:**

1. **Check if component exists:**
   ```bash
   ls components/ui/component-name.tsx
   ```

2. **If component doesn't exist, install it:**
   ```bash
   npx shadcn-ui@latest add component-name
   ```

   This command:
   - Creates the component file in `components/ui/`
   - Installs required dependencies (typically @radix-ui packages)
   - Updates package.json automatically

3. **Verify installation:**
   ```bash
   # Check component file created
   cat components/ui/component-name.tsx

   # Check dependencies added
   grep "@radix-ui" package.json
   ```

4. **Test and commit:**
   ```bash
   npm run build    # Verify no build errors
   npm run lint     # Check code quality
   ```

**Available shadcn/ui components:**
Visit https://ui.shadcn.com/docs/components/ for the full list.

**Common components already installed:**
- `button`, `card`, `input`, `label`, `badge`, `avatar`
- `alert-dialog`, `dropdown-menu`, `select`
- `dialog`, `sonner` (toast notifications)

### For Custom Domain Components

Create feature-specific components in domain directories:

```
components/
  ├── ui/              # shadcn/ui base components (via npx shadcn-ui add)
  ├── profile/         # Profile-related components
  ├── tournaments/     # Tournament components
  ├── matches/         # Match components
  ├── predictions/     # Prediction components
  └── rankings/        # Ranking components
```

**Pattern:**
```typescript
"use client";  // If component needs interactivity

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
// Use shadcn/ui components as building blocks

export function DomainComponent() {
  // Component logic
}
```

### Component Creation Checklist

- [ ] Check if shadcn/ui component needed is already installed
- [ ] If not installed, run `npx shadcn-ui@latest add component-name`
- [ ] Import from `@/components/ui/component-name`
- [ ] Add "use client" directive if component uses state/effects
- [ ] Run `npm run build` to verify imports resolve
- [ ] Commit both component file and package.json updates

## Creating Custom Hooks

Custom React hooks are located in `lib/hooks/` and follow specific patterns.

### Hook File Structure

```
lib/
  └── hooks/
      ├── use-feature-toast.ts   # Feature-scoped toast notifications
      └── use-*.ts               # Other custom hooks
```

### Hook Pattern

```typescript
"use client";

import { useTranslations } from "next-intl";
import { externalLibrary } from "external-package";

/**
 * Feature-scoped hook description
 *
 * Explain what the hook does, when to use it, and any important details.
 *
 * @param feature - Description of parameter
 * @returns Description of return value
 *
 * @example
 * ```tsx
 * const result = useCustomHook("namespace");
 * result.method();
 * ```
 */
export function useCustomHook(feature: string) {
  const t = useTranslations(feature);

  return {
    method: (param: string) => {
      // Implementation
    },
  };
}
```

### Hook Guidelines

1. **Naming:** Always prefix with `use` (React convention)
2. **File location:** `lib/hooks/use-hook-name.ts`
3. **Client directive:** Add `"use client"` at top if hook uses browser APIs
4. **Documentation:** Include JSDoc with description, parameters, and examples
5. **Export:** Use named exports (not default)
6. **Dependencies:** Install required packages before importing them

### Example: Creating a New Hook

```bash
# 1. Create the hook file
touch lib/hooks/use-local-storage.ts

# 2. Implement the hook (with JSDoc)
# 3. Add any required dependencies
npm install any-required-packages

# 4. Verify it builds
npm run build

# 5. Import and use in components
import { useLocalStorage } from "@/lib/hooks/use-local-storage";
```

### Existing Custom Hooks

- **`use-feature-toast`**: Feature-scoped toast notifications with i18n support
  - Wraps `sonner` library with automatic translation lookup
  - Usage: `const toast = useFeatureToast("feature.namespace")`

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

See **[THEMING.md](./THEMING.md)** for detailed instructions and color palette resources.

### Using Theme Colors

Colors automatically apply through Tailwind utility classes:
```jsx
<Button className="bg-primary text-primary-foreground">Primary</Button>
<Card className="bg-card border-border">Card</Card>
<Badge className="bg-accent">Accent</Badge>
```

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

## Extending to New Tournaments

To add a new tournament:

1. Insert tournament record in `tournaments` table
2. Link existing teams via `tournament_teams` table
3. Create matches for the tournament
4. Users can then submit predictions and view rankings scoped to that tournament

Teams are reusable - no need to recreate "Brazil" for each tournament.

## Authentication Flow

- Supabase Auth handles sign-up, login, session management
- Middleware refreshes auth tokens automatically
- User profiles are created in `users` table (extends auth.users)
- Protected routes should check `auth.getUser()` in Server Components

## Date and Time Handling

All dates are stored in **UTC** in the database (PostgreSQL `TIMESTAMPTZ` type) and converted to the **user's local timezone** for display.

### Date Utilities (`lib/utils/date.ts`)

```typescript
import { formatLocalDate, formatLocalDateTime, formatLocalTime, isPastDate, getCurrentUTC } from "@/lib/utils/date";

// Display dates
formatLocalDate("2026-06-11T16:00:00Z")        // "Jun 11, 2026" (local time)
formatLocalDateTime("2026-06-11T16:00:00Z")    // "Jun 11, 2026 at 12:00" (local time)
formatLocalTime("2026-06-11T16:00:00Z")        // "12:00" (local time)

// Check date status
isPastDate("2026-06-11T16:00:00Z")             // true/false (local time)
isFutureDate("2026-06-11T16:00:00Z")           // true/false (local time)

// Store dates (always use UTC)
getCurrentUTC()                                 // "2026-01-17T20:30:45.123Z"
new Date().toISOString()                       // "2026-01-17T20:30:45.123Z"
```

### Rules

1. **Database Storage**: Always store dates as UTC ISO strings (`toISOString()`)
2. **Display**: Always use `formatLocalDate`, `formatLocalDateTime`, or `formatLocalTime` for displaying to users
3. **Comparisons**: Use `isPastDate` or `isFutureDate` instead of manual `new Date()` comparisons
4. **Never** manually construct `Date` objects for display - use the utilities

## Best Practices

1. **Use Server Components by default** - only add "use client" when needed for interactivity
2. **Type safety** - import types from `types/database.ts`
3. **Component composition** - use shadcn/ui base components, extend with domain components
4. **Error handling** - API routes should return appropriate status codes and error messages
5. **Image optimization** - use Next.js `<Image>` component for team logos and avatars
6. **Date handling** - use `lib/utils/date.ts` utilities for all date operations (see Date and Time Handling section)
7. **Responsive design** - all components should work on mobile and desktop (Tailwind mobile-first)
8. **Database bootstrapping** - always generate a database bootstrapping script that includes the latest based on the schema, relationships and access rules defined.
9. **Pre-commit verification** - ALWAYS run these commands before committing:
   ```bash
   npm run lint     # Check for linting errors and code style issues
   npm run build    # Verify build succeeds (catches missing imports/dependencies)
   ```

   **Why this matters:** Build failures in CI/CD delay deployments. Local verification catches:
   - Missing imports or undefined modules
   - Uninstalled dependencies
   - Type errors and unused variables
   - Configuration issues

   **Make it automatic:** Consider setting up husky pre-commit hooks (see Development Workflow section)

## Code Quality

1. **Do not leave unused variables** - only declare variables that are needed and used, if an unused variable is found it should be deleted.
2. **Use concrete types** - avoid using **any** for variables and always favor concrete (well-defined) types.
3. **Name variables consistently** - variables that refer to same types, values and behaviors should have the same names for consistency.
4. **Always localize UX strings** - any string that is displayed to a user should be localized to the following languages:
  - English
  - Spanish
5. **Verify builds before committing** - ALWAYS run `npm run build` before committing code. This catches:
  - Missing dependencies
  - Undefined imports
  - Type errors
  - Configuration issues

  Make this a habit: `npm run lint && npm run build` before every commit.

6. **Install dependencies immediately** - When creating components that need new packages:
  - For shadcn/ui: `npx shadcn-ui@latest add component-name` (installs component + dependencies)
  - For npm packages: `npm install package-name`
  - Commit package.json and package-lock.json along with your code changes

## Development Workflow

### Standard Development Cycle

Follow this workflow when making changes to the codebase:

#### 1. Making Changes

```bash
# Start development server
npm run dev

# Make your code changes
# - Create components, hooks, API routes
# - Add imports as needed
# - Test in browser at http://localhost:3000
```

#### 2. Adding Dependencies

**For shadcn/ui components:**
```bash
npx shadcn-ui@latest add component-name
```

**For other npm packages:**
```bash
npm install package-name
```

**Always verify:**
```bash
npm run build    # Must succeed before committing
```

#### 3. Pre-commit Verification

**Required before every commit:**

```bash
# Check linting
npm run lint

# Check build
npm run build
```

**Fix any errors before committing.** Common fixes:
- Missing dependencies: `npm install package-name`
- Unused variables: Remove or use them
- Type errors: Fix type definitions
- Missing imports: Install required packages

#### 4. Committing Changes

```bash
# Stage your changes
git add .

# Review what you're committing
git status
git diff --staged

# Commit (follow commit message guidelines)
git commit -m "feat: add new feature"

# Push to remote
git push
```

### New Feature Development Checklist

When developing a new feature, follow this checklist:

- [ ] **Plan the feature** - Understand requirements and data flow
- [ ] **Create necessary files** - Components, API routes, utilities
- [ ] **Install dependencies** - Run `npx shadcn-ui add` or `npm install` as needed
- [ ] **Implement functionality** - Write code, add proper types
- [ ] **Add translations** - Update `messages/en.json` and `messages/es.json`
- [ ] **Test locally** - Run `npm run dev` and test in browser
- [ ] **Verify build** - Run `npm run build` (must succeed)
- [ ] **Check linting** - Run `npm run lint` and fix issues
- [ ] **Commit changes** - Include all files (code + package.json + translations)

### Setting Up Pre-commit Hooks (Optional but Recommended)

Automate verification with husky:

```bash
# Install husky
npm install -D husky

# Initialize husky
npx husky init

# Add pre-commit hook
echo "npm run lint && npm run build" > .husky/pre-commit
chmod +x .husky/pre-commit
```

This automatically runs lint and build checks before every commit.

### Common Development Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| "Module not found" | Missing dependency | `npm install package-name` |
| "Cannot find component" | shadcn/ui component not installed | `npx shadcn-ui@latest add name` |
| Build fails but dev works | Import/type issue not caught locally | Always run `npm run build` |
| "Unused variable" | ESLint warning | Remove unused variables or use them |
| Toast not working | Toaster not in layout | Already added to `app/layout.tsx` |

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
