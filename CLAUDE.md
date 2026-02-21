# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Quiniela is a multi-tournament prediction application initially designed for the FIFA World Cup 2026. Users can submit match score predictions, earn points based on accuracy, and compete on tournament-specific leaderboards.

**Target audience**: Soccer fans who want to compete with friends and family in prediction contests across multiple tournaments.

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

// Authorization & security
import { checkAdminPermission } from "@/lib/middleware/admin-check";
import { checkUserActive } from "@/lib/middleware/user-status-check";
import { getPublicUserDisplay, maskEmail, sanitizeUserForPublic } from "@/lib/utils/privacy";
import { isAdmin, requireAdmin } from "@/lib/utils/admin";
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

## Local Development

The project supports a fully local Supabase stack via Docker. See `.claude/rules/local-supabase.md` for setup, test accounts, and local service URLs.

## Date and Time Handling

All dates are stored in **UTC** in the database (`TIMESTAMPTZ`) and converted to the user's local timezone for display. Use utilities from `lib/utils/date.ts` (see Quick Reference for imports).

1. **Storage**: Always store as UTC ISO strings (`toISOString()`)
2. **Display**: Always use `formatLocalDate`, `formatLocalDateTime`, `formatLocalTime`
3. **Comparisons**: Use `isPastDate` or `isFutureDate` — never manual `new Date()` comparisons
4. **Never** manually construct `Date` objects for display

## Supabase Configuration

Required env vars in `.env.local` (see `.env.example`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and optionally `SUPABASE_SERVICE_ROLE_KEY` for admin operations.

**Critical**: Server components use `await createClient()` (async), client components use `createClient()` (sync) — mixing these up causes errors. Auth refresh middleware configured in `middleware.ts` at root.

All tables have RLS enabled. See [AUTHORIZATION.md](./docs/AUTHORIZATION.md#row-level-security-policies) for per-table policies.

## Database

Tournament-centric architecture: teams -> tournament_teams -> tournaments -> matches -> predictions. Rankings calculated dynamically via `tournament_rankings` VIEW (filters out deactivated users). Types in `types/database.ts`.

**IMPORTANT**: After any schema change, create a new migration in `supabase/migrations/`. See `.claude/rules/database.md` for the full data model, migration workflow, and setup instructions.

## Authorization & Security

Handled at multiple layers. See [AUTHORIZATION.md](./docs/AUTHORIZATION.md) for the complete reference. See Quick Reference for imports.

- **4 protection layers**: app layout, API middleware, RLS policies, application code
- **Deactivated users**: blocked at layout + API + RLS levels; excluded from rankings
- **Privacy**: never expose email in public UI; use `maskEmail()` in admin views
- **Admin client**: `createAdminClient()` bypasses RLS (server-only, never in client components)
- **First user**: automatically becomes admin via `handle_new_user()` trigger

## Image Uploads

Team logos and user avatars stored in Supabase Storage public buckets (`team-logos`, `user-avatars`). Use `uploadImage` and `generateImageFilename` from `lib/utils/image.ts` (see Quick Reference). Both buckets must be configured as public in Supabase Dashboard.

## Theming

CSS variable-based theming using the Blue Lagoon palette. All colors defined in `app/globals.css` (`:root` for light, `.dark` for dark mode). See [THEMING.md](./docs/THEMING.md) for palette details and customization.

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

See [AUTHORIZATION.md](./docs/AUTHORIZATION.md#api-route-protection-patterns) for route protection patterns and decision matrix.

## Component Patterns

Use **Server Components by default** (data fetching, static rendering). Add `"use client"` only when needed for interactivity (forms, state, toast, browser APIs). Don't edit shadcn/ui components in `/components/ui` directly — create wrapper components instead.

## Toast Notifications

Use `useFeatureToast(namespace)` for all user feedback. Feature-specific keys need no prefix (`toast.success('success.created')`). Common messages use `common:` prefix (`toast.error('common:error.generic')`). See [TOASTS.md](./docs/TOASTS.md) for the full API reference and examples.

## Best Practices & Conventions

See `.claude/skills/typescript-conventions.md` for the complete TypeScript conventions reference.

- **All user-facing strings must be localized** to English and Spanish, organized by feature area with namespaced keys
- **Error handling** — API routes should return appropriate HTTP status codes and clear error messages
- **Null checks** — always handle potential null/undefined from database queries
- **Loading states** — show loading indicators for async operations (use toast.promise pattern)
- **Confirmation dialogs** — require confirmation for destructive actions (delete, reset scores)
- **Database operations** — use transactions for multi-step operations; always create a migration in `supabase/migrations/` after schema changes

## Git Hooks

Pre-commit runs Prettier + ESLint on staged files. Pre-push runs type checking + production build. See `.claude/rules/git-workflow.md` for manual commands, Prettier config, and troubleshooting.

## Testing

The project uses Vitest with React Testing Library. Tests are co-located in `__tests__/` folders. See `.claude/rules/testing.md` for commands, mock patterns, and the critical `vi.hoisted()` Supabase mocking pattern.

## Common Gotchas

1. **Supabase clients**: Server components need `await createClient()`, client components use `createClient()` without await — mixing these up causes errors
2. **Image paths**: Team logos use relative paths stored in database, not absolute URLs — the bucket path is constructed in the Image component
3. **shadcn/ui components**: Files in `/components/ui` are generated by shadcn CLI — don't edit them directly; create wrapper components instead
4. **Client/Server imports**: Importing server-only code in client components causes build errors — keep imports separated by component type

## Troubleshooting

See `docs/TROUBLESHOOTING.md` for common issues (Supabase init, toast keys, UTC dates, rankings, uploads, module errors, auth).
