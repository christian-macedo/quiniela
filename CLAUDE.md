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

5. **RLS policies**: Admin operations (like scoring matches) need explicit permission checks - just being authenticated isn't enough

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