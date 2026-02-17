# Migration to View-Based Rankings

This document explains how to migrate from table-based `tournament_rankings` to a dynamic view.

## What Changed

Previously, tournament rankings were stored in a `tournament_rankings` table that needed to be updated every time predictions were scored. Now, rankings are calculated dynamically from the `predictions` table using a database view.

### Benefits:

- **Always up-to-date**: Rankings are calculated in real-time from prediction data
- **Simpler code**: No need to manually update rankings after scoring
- **Data consistency**: Rankings can never be out of sync with predictions
- **Reduced storage**: No duplicate data storage

## How to Apply the Migration

### Option 1: Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard: https://app.supabase.com
2. Navigate to the SQL Editor
3. Copy and paste the contents of `supabase/migrations/20240109000000_drop_rankings_table.sql`
4. Click "Run" to execute the migration

### Option 2: Using psql

If you have direct PostgreSQL access:

```bash
psql <your-connection-string> < supabase/migrations/20240109000000_drop_rankings_table.sql
```

### Option 3: Using Supabase CLI

If you have Supabase CLI installed:

```bash
supabase db push
```

## Verification

After running the migration, verify it worked:

1. Go to the SQL Editor in Supabase Dashboard
2. Run: `SELECT * FROM tournament_rankings LIMIT 5;`
3. You should see rankings calculated from predictions

## Code Changes

The following code changes were made automatically:

1. **API Routes**: Removed all `tournament_rankings` update/upsert logic
   - `app/api/matches/[matchId]/score/route.ts`
   - `app/api/admin/reset-incomplete-predictions/route.ts`

2. **TypeScript Types**: Updated `TournamentRanking` interface to remove `created_at` and `updated_at` fields

3. **Components**: No changes needed - components already just read from rankings

## Rollback

If you need to rollback, you can recreate the table using:

```sql
CREATE TABLE tournament_rankings (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tournament_id)
);

-- And re-enable the update logic in the API routes
```

However, this is not recommended as the view-based approach is superior.
