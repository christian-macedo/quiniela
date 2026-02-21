# Database Architecture

## Core Data Model

The application is built around a **tournament-centric architecture** with these key entities:

1. **teams**: Reusable team entities (name, short_name, country_code, logo_url)
2. **tournaments**: Competition containers (name, sport, dates, status, scoring_rules)
3. **tournament_teams**: Many-to-many junction table linking teams to tournaments
4. **matches**: Individual games within a tournament (references home/away teams, scores, status)
5. **users**: User profiles extending Supabase auth.users (screen_name, avatar_url, is_admin, status) — see `docs/AUTHORIZATION.md` (User Status & Deactivation section) for status details
6. **predictions**: User predictions for matches (predicted scores, points_earned)
7. **tournament_rankings**: Database VIEW that dynamically calculates rankings from predictions (total_points, rank) — filters out deactivated users

## Key Relationships

- Teams can participate in multiple tournaments (reusable across World Cup, Euro, Copa America, etc.)
- Matches belong to one tournament and reference two teams (home/away)
- Predictions link users to matches (one prediction per user per match)
- Rankings are scoped per user per tournament

## Database Schema Location

- **Bootstrap script**: `supabase/bootstrap.sql` - Complete database setup script
- Schema migrations: `supabase/migrations/`
- Seed data: `supabase/seed.sql`
- TypeScript types: `types/database.ts`

## Database Bootstrap Script

The file `supabase/bootstrap.sql` contains the complete database schema and must be kept up to date.

**IMPORTANT**: After any schema change (new tables, columns, RLS policies, functions, etc.), the `supabase/bootstrap.sql` script MUST be updated to reflect the latest database structure. This script is the single source of truth for bootstrapping a fresh database.

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
