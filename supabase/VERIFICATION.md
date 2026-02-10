# Database Bootstrap and Seed Verification Guide

This guide provides comprehensive verification steps to test the updated `bootstrap.sql` and `seed.sql` files.

## Prerequisites

- Supabase CLI installed (`npm install -g supabase`)
- PostgreSQL client (psql) installed
- Local Supabase instance running

## Quick Start

```bash
# Start fresh Supabase instance
supabase stop --no-backup
supabase start

# Run bootstrap script
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/bootstrap.sql

# Run seed data
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
```

---

## Phase 1: Bootstrap.sql Verification

### 1.1 Check All Tables Exist

Expected: 9 tables

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected output:**
- matches
- predictions
- teams
- tournament_participants
- tournament_teams
- tournaments
- users
- webauthn_challenges
- webauthn_credentials

### 1.2 Check All Indexes Exist

Expected: 15 indexes

```sql
SELECT indexname FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY indexname;
```

**Expected output:**
- idx_matches_date
- idx_matches_tournament
- idx_predictions_match
- idx_predictions_user
- idx_tournament_participants_tournament_id
- idx_tournament_participants_user_id
- idx_users_is_admin
- idx_users_webauthn_user_id
- idx_webauthn_challenges_challenge
- idx_webauthn_challenges_expires
- idx_webauthn_challenges_user
- idx_webauthn_credentials_id
- idx_webauthn_credentials_user
- (plus primary key indexes)

### 1.3 Check All Functions Exist

Expected: 10 functions

```sql
SELECT routine_name FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Expected output:**
- clean_expired_challenges
- get_and_consume_auth_challenge
- get_credential_for_verification
- get_user_credentials_for_auth
- handle_new_user
- is_admin
- store_auth_challenge
- update_credential_counter
- update_last_login
- update_updated_at_column

### 1.4 Check All Triggers Exist

Expected: 8 triggers

```sql
SELECT trigger_name, event_object_table, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema IN ('public', 'auth')
ORDER BY event_object_table, trigger_name;
```

**Expected output:**
- on_auth_user_created (auth.users, INSERT)
- on_auth_user_login (auth.users, UPDATE)
- update_matches_updated_at (matches, UPDATE)
- update_predictions_updated_at (predictions, UPDATE)
- update_teams_updated_at (teams, UPDATE)
- update_tournaments_updated_at (tournaments, UPDATE)
- update_users_updated_at (users, UPDATE)
- update_webauthn_credentials_updated_at (webauthn_credentials, UPDATE)

**CRITICAL**: All 5 core table triggers (teams, tournaments, users, matches, predictions) must be present!

### 1.5 Check RLS Policies Exist

Expected: 30+ policies

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 1.6 Check Storage Buckets Exist

Expected: 2 buckets

```sql
SELECT id, name, public FROM storage.buckets ORDER BY name;
```

**Expected output:**
- team-logos (public: true)
- user-avatars (public: true)

### 1.7 Check Storage Policies Exist

Expected: 8 policies (4 per bucket)

```sql
SELECT policyname, operation FROM storage.policies ORDER BY policyname;
```

**Expected output:**
- Anyone can view avatars (SELECT)
- Anyone can view team logos (SELECT)
- Authenticated users can delete team logos (DELETE)
- Authenticated users can upload team logos (INSERT)
- Authenticated users can update team logos (UPDATE)
- Users can delete their own avatar (DELETE)
- Users can update their own avatar (UPDATE)
- Users can upload their own avatar (INSERT)

**CRITICAL**: Without these storage policies, image uploads will fail!

### 1.8 Check Tournament Rankings View Exists

```sql
SELECT COUNT(*) FROM tournament_rankings;
```

**Expected:** Query should succeed (returns 0 for empty database)

---

## Phase 2: Seed.sql Verification

### 2.1 Check Teams Created

Expected: 32 teams

```sql
SELECT COUNT(*) FROM teams;
```

### 2.2 Check Tournament Created

Expected: 1 tournament

```sql
SELECT name, start_date, end_date, status FROM tournaments;
```

**Expected output:**
- Name: FIFA World Cup 2026
- Start: 2026-06-11
- End: 2026-07-19
- Status: upcoming

### 2.3 Check Test Users Created

Expected: 3 users (1 admin, 2 regular)

```sql
SELECT email, screen_name, is_admin FROM public.users ORDER BY is_admin DESC;
```

**Expected output:**
- admin@quiniela.test, Admin User, true
- player1@quiniela.test, Soccer Fan, false
- player2@quiniela.test, World Cup Expert, false

### 2.4 Check Tournament Participants

Expected: 3 participants

```sql
SELECT COUNT(*) FROM tournament_participants;
```

### 2.5 Check Matches Created

Expected: 4 matches (1 completed, 3 scheduled)

```sql
SELECT round, status, home_score, away_score, multiplier
FROM matches
ORDER BY match_date;
```

**Expected output:**
- Group A, completed, 2, 1, 1 (Argentina 2-1 Mexico)
- Group B, scheduled, null, null, 1
- Group C, scheduled, null, null, 1
- Group D, scheduled, null, null, 2

### 2.6 Check Predictions Created

Expected: 12 predictions (3 users × 4 matches)

```sql
SELECT COUNT(*) FROM predictions;
```

### 2.7 Check Scored Predictions

**CRITICAL TEST**: This verifies the scoring logic works correctly!

```sql
SELECT
  u.screen_name,
  p.predicted_home_score || '-' || p.predicted_away_score as prediction,
  m.home_score || '-' || m.away_score as actual,
  p.points_earned as points
FROM predictions p
JOIN public.users u ON p.user_id = u.id
JOIN matches m ON p.match_id = m.id
WHERE m.status = 'completed'
ORDER BY p.points_earned DESC, u.screen_name;
```

**Expected output:**
| screen_name | prediction | actual | points |
|-------------|------------|--------|--------|
| Admin User | 2-1 | 2-1 | 3 |
| World Cup Expert | 3-2 | 2-1 | 2 |
| Soccer Fan | 1-0 | 2-1 | 1 |

**Scoring breakdown:**
- Admin User: Exact score → 3 points
- World Cup Expert: Correct winner + goal difference (both +1) → 2 points
- Soccer Fan: Correct winner only → 1 point

### 2.8 Check Tournament Rankings View

```sql
SELECT screen_name, total_points, rank, predictions_count
FROM tournament_rankings
ORDER BY rank;
```

**Expected output:**
| screen_name | total_points | rank | predictions_count |
|-------------|--------------|------|-------------------|
| Admin User | 3 | 1 | 1 |
| World Cup Expert | 2 | 2 | 1 |
| Soccer Fan | 1 | 3 | 1 |

---

## Phase 3: Functional Testing

### 3.1 Test User Creation Trigger

```sql
-- Create a test user in auth.users
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  aud,
  role
)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000000',
  'test@example.com',
  crypt('password', gen_salt('bf')),
  now(),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"screen_name":"Test User"}'::jsonb,
  'authenticated',
  'authenticated'
);

-- Verify public.users row was auto-created
SELECT id, email, screen_name, is_admin FROM public.users
WHERE email = 'test@example.com';
```

**Expected:** User should be auto-created in public.users with is_admin = false

### 3.2 Test Updated_at Triggers

**CRITICAL TEST**: Verifies all 5 core table triggers work!

```sql
-- Test teams trigger
INSERT INTO teams (name, short_name) VALUES ('Test Team', 'TST');
SELECT created_at, updated_at FROM teams WHERE name = 'Test Team';
-- Should be equal initially

UPDATE teams SET name = 'Test Team Updated' WHERE name = 'Test Team';
SELECT created_at, updated_at FROM teams WHERE name = 'Test Team Updated';
-- updated_at should be newer than created_at

-- Test tournaments trigger
INSERT INTO tournaments (name, sport, start_date, end_date)
VALUES ('Test Tournament', 'soccer', '2027-01-01', '2027-01-31');
SELECT created_at, updated_at FROM tournaments WHERE name = 'Test Tournament';

UPDATE tournaments SET name = 'Test Tournament Updated' WHERE name = 'Test Tournament';
SELECT created_at, updated_at FROM tournaments WHERE name = 'Test Tournament Updated';
-- updated_at should be newer

-- Test matches trigger
WITH tourn AS (SELECT id FROM tournaments WHERE name LIKE 'Test Tournament%' LIMIT 1),
     team AS (SELECT id FROM teams WHERE name LIKE 'Test Team%' LIMIT 1)
INSERT INTO matches (tournament_id, home_team_id, away_team_id, match_date, round)
SELECT tourn.id, team.id, team.id, '2027-01-15', 'Test Round'
FROM tourn, team;

SELECT created_at, updated_at FROM matches WHERE round = 'Test Round';

UPDATE matches SET round = 'Test Round Updated' WHERE round = 'Test Round';
SELECT created_at, updated_at FROM matches WHERE round = 'Test Round Updated';
-- updated_at should be newer

-- Test predictions trigger (requires match_id)
WITH match AS (SELECT id FROM matches WHERE round LIKE 'Test Round%' LIMIT 1),
     usr AS (SELECT id FROM public.users WHERE email = 'test@example.com')
INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score)
SELECT usr.id, match.id, 2, 1 FROM usr, match;

SELECT created_at, updated_at FROM predictions WHERE user_id = (SELECT id FROM public.users WHERE email = 'test@example.com');

UPDATE predictions SET predicted_home_score = 3 WHERE user_id = (SELECT id FROM public.users WHERE email = 'test@example.com');
SELECT created_at, updated_at FROM predictions WHERE user_id = (SELECT id FROM public.users WHERE email = 'test@example.com');
-- updated_at should be newer

-- Test users trigger
UPDATE public.users SET screen_name = 'Updated Test User' WHERE email = 'test@example.com';
SELECT created_at, updated_at FROM public.users WHERE email = 'test@example.com';
-- updated_at should be newer
```

**Expected:** In all cases, `updated_at` should be greater than `created_at` after UPDATE.

### 3.3 Test Admin Permissions

```sql
-- Verify admin user has permission
SELECT public.is_admin((SELECT id FROM public.users WHERE email = 'admin@quiniela.test'));
-- Expected: true

-- Verify regular user does not have permission
SELECT public.is_admin((SELECT id FROM public.users WHERE email = 'player1@quiniela.test'));
-- Expected: false
```

### 3.4 Test Storage Policies (Manual)

**Note:** Storage policy testing requires authentication context, which is difficult to simulate in psql. Test these manually in the application:

1. **Upload avatar as authenticated user** → Should succeed
2. **Attempt to upload to another user's folder** → Should fail (403)
3. **View avatar as anonymous user** → Should succeed
4. **Upload team logo as authenticated user** → Should succeed
5. **View team logo as anonymous user** → Should succeed

---

## Phase 4: Application Integration Testing

### 4.1 Test Login with Seed Accounts

1. Start the Next.js app: `npm run dev`
2. Navigate to login page: `http://localhost:3000/login`
3. Try logging in with test accounts:
   - `admin@quiniela.test` / `password123` → Should work, user should have admin badge
   - `player1@quiniela.test` / `password123` → Should work, regular user
   - `player2@quiniela.test` / `password123` → Should work, regular user

### 4.2 Test Predictions Display

1. As any test user, navigate to World Cup tournament
2. Check predictions page - should see existing predictions for all 4 matches
3. Verify Argentina 2-1 Mexico shows as completed with final score
4. Verify other 3 matches show as scheduled

### 4.3 Test Rankings Display

1. Navigate to rankings page
2. Should see all 3 users ranked:
   - Admin User (3 points, rank 1)
   - World Cup Expert (2 points, rank 2)
   - Soccer Fan (1 point, rank 3)
3. Verify predictions count shows 1 for each user (only completed match counts)

---

## Common Issues and Troubleshooting

### Issue: Storage buckets not created

**Error:** `INSERT into storage.buckets failed`

**Solution:** Create buckets manually via Supabase Dashboard or using:
```sql
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
    ('team-logos', 'team-logos', true, 52428800, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']),
    ('user-avatars', 'user-avatars', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;
```

### Issue: Storage policies fail to create

**Error:** `policy already exists`

**Solution:** This is expected if running bootstrap.sql multiple times. The `DROP POLICY IF EXISTS` statements handle this gracefully.

### Issue: Test users can't log in

**Error:** `Invalid login credentials`

**Solution:** Check that passwords are being hashed correctly with `crypt()` function. Verify the `pgcrypto` extension is enabled:
```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

### Issue: Predictions not scored

**Check:**
1. Match status is 'completed'
2. Match has non-null home_score and away_score
3. Predictions were created before match was completed
4. Run the scoring query manually from seed.sql

### Issue: Rankings view empty

**Check:**
1. Predictions have points_earned > 0
2. Users are enrolled in tournament_participants
3. Query the view directly: `SELECT * FROM tournament_rankings;`

---

## Success Criteria

✅ **All bootstrap.sql checks pass:**
- 9 tables created
- 15 indexes created
- 10 functions created
- 8 triggers created (including 5 critical updated_at triggers)
- 30+ RLS policies created
- 2 storage buckets created
- 8 storage policies created

✅ **All seed.sql checks pass:**
- 32 teams created
- 1 tournament created
- 4 matches created (1 completed with scores)
- 3 test users created (1 admin, 2 regular)
- 3 tournament participants enrolled
- 12 predictions created
- Completed match predictions scored correctly (3, 2, 1 points)
- Tournament rankings view populated correctly

✅ **Functional tests pass:**
- User creation trigger works
- All 5 updated_at triggers work (teams, tournaments, users, matches, predictions)
- Admin permission checks work
- Storage policies enforce correct access

✅ **Application integration works:**
- Test users can log in
- Predictions display correctly
- Rankings display correctly
- Completed match shows scores and points

---

## Next Steps After Verification

Once verification is complete:

1. ✅ Commit changes to git
2. ✅ Update team documentation if needed
3. ✅ Consider running verification on a fresh production-like environment
4. ✅ Archive this verification guide for future reference

**Note:** This verification guide should be run whenever `bootstrap.sql` or `seed.sql` are modified to ensure database integrity.
