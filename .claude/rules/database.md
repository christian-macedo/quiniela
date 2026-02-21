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

## Schema Locations

- **Migrations**: `supabase/migrations/` — the source of truth for database schema
- **Seed data**: `supabase/seed.sql` — test accounts and sample data
- **TypeScript types**: `types/database.ts`

## Database Setup

### Local Development

```bash
npm run supabase:start   # Start Docker containers + apply migrations
npm run supabase:reset   # Drop DB, reapply all migrations + seed data
```

### Remote (Cloud Supabase)

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Link your project: `npx supabase link --project-ref <your-project-ref>`
3. Apply migrations: `npx supabase db push`
4. Run `supabase/seed.sql` via the SQL Editor in Supabase Dashboard (optional)
5. Configure storage buckets via Dashboard:
   - Create `team-logos` bucket (public)
   - Create `user-avatars` bucket (public)
6. Copy project URL and anon key to `.env.local`

## Schema Changes: Migration Workflow

### When to Create a Migration

Create a new migration after ANY of these changes:

- Adding, modifying, or removing tables
- Adding, modifying, or removing columns
- Adding, modifying, or removing indexes
- Adding, modifying, or removing RLS policies
- Adding, modifying, or removing functions or triggers
- Adding, modifying, or removing views (e.g., tournament_rankings filter)
- Changing grants or permissions
- Adding status/state columns to existing tables

### How to Create a Migration

```bash
# 1. Generate a new migration file
npx supabase migration new <descriptive_name>

# 2. Write your SQL in the generated file at supabase/migrations/<timestamp>_<name>.sql

# 3. Test by resetting the local database (applies all migrations + seed)
npm run supabase:reset

# 4. Update types/database.ts if the schema change affects TypeScript types
```
