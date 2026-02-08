-- ============================================================================
-- QUINIELA SEED DATA
-- ============================================================================
-- Development and testing seed data for the Quiniela prediction application
--
-- IMPORTANT: User Management
-- - Users must be created in auth.users FIRST (Supabase Auth requirement)
-- - The handle_new_user() trigger automatically creates public.users profiles
-- - Test-specific data (admin flags, soft-deletes) is added via UPDATE statements
-- - DO NOT insert directly into public.users - it will violate FK constraints
--
-- This file provides:
-- - 32 World Cup 2026 teams
-- - 1 active tournament (FIFA World Cup 2026)
-- - 4 sample group stage matches (1 completed, 3 pending)
-- - 7 test users (5 active, 2 soft-deleted) with auth.users entries
-- - Sample predictions demonstrating various scoring scenarios
-- - Sample rankings data for leaderboard testing
--
-- Test Scenarios Covered:
-- 1. User account creation via auth.users + trigger
-- 2. User account deactivation (soft delete)
-- 3. Email privacy (users with/without screen names)
-- 4. Deleted user anonymization in rankings
-- 5. Prediction scoring and point calculation
-- 6. Tournament leaderboard generation
-- 7. Admin vs regular user permissions
--
-- Usage:
-- 1. Run bootstrap.sql first to create the schema + triggers
-- 2. Run this file to populate with test data
-- 3. Test features in development environment
--
-- ⚠️ WARNING: This file is for DEVELOPMENT/TESTING only
-- Do NOT run in production as it creates test users with known IDs
-- ============================================================================

-- ============================================================================
-- TEAMS
-- ============================================================================
-- Insert sample teams (FIFA World Cup 2026 participants)
INSERT INTO public.teams (name, short_name, country_code) VALUES
  ('Argentina', 'ARG', 'AR'),
  ('Brazil', 'BRA', 'BR'),
  ('France', 'FRA', 'FR'),
  ('Germany', 'GER', 'DE'),
  ('Spain', 'ESP', 'ES'),
  ('England', 'ENG', 'GB'),
  ('Netherlands', 'NED', 'NL'),
  ('Portugal', 'POR', 'PT'),
  ('Belgium', 'BEL', 'BE'),
  ('Italy', 'ITA', 'IT'),
  ('Uruguay', 'URU', 'UY'),
  ('Croatia', 'CRO', 'HR'),
  ('Mexico', 'MEX', 'MX'),
  ('United States', 'USA', 'US'),
  ('Canada', 'CAN', 'CA'),
  ('Japan', 'JPN', 'JP'),
  ('South Korea', 'KOR', 'KR'),
  ('Australia', 'AUS', 'AU'),
  ('Morocco', 'MAR', 'MA'),
  ('Senegal', 'SEN', 'SN'),
  ('Ghana', 'GHA', 'GH'),
  ('Nigeria', 'NGA', 'NG'),
  ('Ecuador', 'ECU', 'EC'),
  ('Colombia', 'COL', 'CO'),
  ('Switzerland', 'SUI', 'CH'),
  ('Denmark', 'DEN', 'DK'),
  ('Poland', 'POL', 'PL'),
  ('Serbia', 'SRB', 'RS'),
  ('Wales', 'WAL', 'GB'),
  ('Saudi Arabia', 'KSA', 'SA'),
  ('Iran', 'IRN', 'IR'),
  ('Cameroon', 'CMR', 'CM')
ON CONFLICT (country_code) DO NOTHING;

-- ============================================================================
-- TOURNAMENT
-- ============================================================================
-- Insert World Cup 2026 tournament
INSERT INTO public.tournaments (name, sport, start_date, end_date, status, scoring_rules)
VALUES (
  'FIFA World Cup 2026',
  'soccer',
  '2026-06-11',
  '2026-07-19',
  'upcoming',
  '{"exact_score": 10, "correct_winner_and_diff": 7, "correct_winner": 5}'::jsonb
);
-- Note: Removed ON CONFLICT - seed data only creates one tournament
-- If re-running seed.sql, manually truncate tables first

-- Link teams to tournament
WITH tournament AS (
  SELECT id FROM public.tournaments WHERE name = 'FIFA World Cup 2026'
)
INSERT INTO public.tournament_teams (tournament_id, team_id)
SELECT tournament.id, teams.id
FROM tournament, public.teams
ON CONFLICT (tournament_id, team_id) DO NOTHING;

-- ============================================================================
-- MATCHES
-- ============================================================================
-- Insert sample matches for Group Stage
WITH
  tournament AS (SELECT id FROM public.tournaments WHERE name = 'FIFA World Cup 2026'),
  arg AS (SELECT id FROM public.teams WHERE short_name = 'ARG'),
  mex AS (SELECT id FROM public.teams WHERE short_name = 'MEX'),
  bra AS (SELECT id FROM public.teams WHERE short_name = 'BRA'),
  ger AS (SELECT id FROM public.teams WHERE short_name = 'GER'),
  fra AS (SELECT id FROM public.teams WHERE short_name = 'FRA'),
  eng AS (SELECT id FROM public.teams WHERE short_name = 'ENG'),
  esp AS (SELECT id FROM public.teams WHERE short_name = 'ESP'),
  ned AS (SELECT id FROM public.teams WHERE short_name = 'NED')
INSERT INTO public.matches (tournament_id, home_team_id, away_team_id, match_date, round, status)
VALUES
  ((SELECT id FROM tournament), (SELECT id FROM arg), (SELECT id FROM mex), '2026-06-11 16:00:00+00', 'Group Stage - Group A', 'scheduled'),
  ((SELECT id FROM tournament), (SELECT id FROM bra), (SELECT id FROM ger), '2026-06-12 19:00:00+00', 'Group Stage - Group B', 'scheduled'),
  ((SELECT id FROM tournament), (SELECT id FROM fra), (SELECT id FROM eng), '2026-06-13 16:00:00+00', 'Group Stage - Group C', 'scheduled'),
  ((SELECT id FROM tournament), (SELECT id FROM esp), (SELECT id FROM ned), '2026-06-14 19:00:00+00', 'Group Stage - Group D', 'scheduled');
-- Note: Removed ON CONFLICT - matches have no natural unique constraint beyond UUID
-- Seed data creates matches once, re-running requires manual cleanup

-- ============================================================================
-- SAMPLE USERS
-- ============================================================================
-- Note: In Supabase, users are managed via auth.users
-- The handle_new_user() trigger automatically creates public.users profiles
--
-- Strategy:
-- 1. Insert into auth.users with test credentials
-- 2. Trigger creates public.users automatically
-- 3. Update public.users with test-specific data (deleted_at, etc.)

-- Step 1: Insert test users into auth.users
-- These will trigger automatic creation of public.users profiles
INSERT INTO auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_user_meta_data,
    raw_app_meta_data,
    aud,
    role,
    created_at,
    updated_at
)
VALUES
    -- Admin user
    (
        '550e8400-e29b-41d4-a716-446655440001',
        '00000000-0000-0000-0000-000000000000',
        'admin@quiniela.test',
        '',
        NOW() - INTERVAL '30 days',
        '{"screen_name": "AdminUser"}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated',
        NOW() - INTERVAL '30 days',
        NOW() - INTERVAL '30 days'
    ),

    -- Active regular users
    (
        '550e8400-e29b-41d4-a716-446655440002',
        '00000000-0000-0000-0000-000000000000',
        'player1@quiniela.test',
        '',
        NOW() - INTERVAL '25 days',
        '{"screen_name": "ProPlayer"}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated',
        NOW() - INTERVAL '25 days',
        NOW() - INTERVAL '25 days'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440003',
        '00000000-0000-0000-0000-000000000000',
        'player2@quiniela.test',
        '',
        NOW() - INTERVAL '20 days',
        '{"screen_name": "SilentStriker"}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated',
        NOW() - INTERVAL '20 days',
        NOW() - INTERVAL '20 days'
    ),
    (
        '550e8400-e29b-41d4-a716-446655440004',
        '00000000-0000-0000-0000-000000000000',
        'player3@quiniela.test',
        '',
        NOW() - INTERVAL '15 days',
        '{"screen_name": "GoldenBoots"}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated',
        NOW() - INTERVAL '15 days',
        NOW() - INTERVAL '15 days'
    ),

    -- User without screen name (tests screen name prompt)
    (
        '550e8400-e29b-41d4-a716-446655440005',
        '00000000-0000-0000-0000-000000000000',
        'noname@quiniela.test',
        '',
        NOW() - INTERVAL '10 days',
        '{}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated',
        NOW() - INTERVAL '10 days',
        NOW() - INTERVAL '10 days'
    ),

    -- User to be deleted (will update public.users after trigger creates it)
    (
        '550e8400-e29b-41d4-a716-446655440006',
        '00000000-0000-0000-0000-000000000000',
        'deleted@quiniela.test',
        '',
        NOW() - INTERVAL '28 days',
        '{"screen_name": "FormerChampion"}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated',
        NOW() - INTERVAL '28 days',
        NOW() - INTERVAL '28 days'
    ),

    -- User to be banned by admin
    (
        '550e8400-e29b-41d4-a716-446655440007',
        '00000000-0000-0000-0000-000000000000',
        'banned@quiniela.test',
        '',
        NOW() - INTERVAL '22 days',
        '{"screen_name": "RuleBreaker"}'::jsonb,
        '{}'::jsonb,
        'authenticated',
        'authenticated',
        NOW() - INTERVAL '22 days',
        NOW() - INTERVAL '22 days'
    )
ON CONFLICT (id) DO NOTHING;

-- Step 2: Update public.users with test-specific data
-- The handle_new_user() trigger has already created these profiles
-- Now we add admin flag, soft-delete status, etc.

-- Make first user an admin
UPDATE public.users
SET is_admin = true
WHERE id = '550e8400-e29b-41d4-a716-446655440001';

-- Soft-delete a user (self-requested)
UPDATE public.users
SET
    deleted_at = NOW() - INTERVAL '7 days',
    deletion_reason = 'self_requested',
    deleted_by = NULL
WHERE id = '550e8400-e29b-41d4-a716-446655440006';

-- Soft-delete a user (admin action)
UPDATE public.users
SET
    deleted_at = NOW() - INTERVAL '3 days',
    deletion_reason = 'admin_action',
    deleted_by = '550e8400-e29b-41d4-a716-446655440001'
WHERE id = '550e8400-e29b-41d4-a716-446655440007';

-- ============================================================================
-- TOURNAMENT PARTICIPANTS
-- ============================================================================
-- Link all active users to the World Cup tournament

INSERT INTO public.tournament_participants (tournament_id, user_id, joined_at)
SELECT
  t.id,
  u.id,
  u.created_at + INTERVAL '1 day'  -- Joined 1 day after signup
FROM public.tournaments t
CROSS JOIN public.users u
WHERE t.name = 'FIFA World Cup 2026'
  AND u.deleted_at IS NULL  -- Only active users participate
ON CONFLICT (tournament_id, user_id) DO NOTHING;

-- ============================================================================
-- SAMPLE PREDICTIONS
-- ============================================================================
-- Add predictions for testing scoring and rankings

-- Get match and user IDs for predictions
DO $$
DECLARE
  v_tournament_id UUID;
  v_user1 UUID := '550e8400-e29b-41d4-a716-446655440002';  -- ProPlayer
  v_user2 UUID := '550e8400-e29b-41d4-a716-446655440003';  -- SilentStriker
  v_user3 UUID := '550e8400-e29b-41d4-a716-446655440004';  -- GoldenBoots
  v_user_deleted UUID := '550e8400-e29b-41d4-a716-446655440006';  -- FormerChampion (deleted)
  v_match_ids UUID[];
BEGIN
  -- Get tournament ID
  SELECT id INTO v_tournament_id FROM public.tournaments WHERE name = 'FIFA World Cup 2026';

  -- Get first 4 match IDs
  SELECT ARRAY_AGG(id ORDER BY match_date) INTO v_match_ids
  FROM public.matches
  WHERE tournament_id = v_tournament_id
  LIMIT 4;

  -- Insert predictions for match 1 (will be scored as exact match)
  INSERT INTO public.predictions (user_id, match_id, predicted_home_score, predicted_away_score, points_earned, created_at)
  VALUES
    (v_user1, v_match_ids[1], 2, 1, 0, NOW() - INTERVAL '5 days'),    -- Exact prediction
    (v_user2, v_match_ids[1], 2, 0, 0, NOW() - INTERVAL '5 days'),    -- Correct diff
    (v_user3, v_match_ids[1], 3, 1, 0, NOW() - INTERVAL '5 days'),    -- Correct winner
    (v_user_deleted, v_match_ids[1], 1, 1, 0, NOW() - INTERVAL '6 days')  -- Wrong (but user is deleted)
  ON CONFLICT (user_id, match_id) DO NOTHING;

  -- Insert predictions for match 2 (pending)
  INSERT INTO public.predictions (user_id, match_id, predicted_home_score, predicted_away_score, points_earned, created_at)
  VALUES
    (v_user1, v_match_ids[2], 1, 0, 0, NOW() - INTERVAL '4 days'),
    (v_user2, v_match_ids[2], 2, 1, 0, NOW() - INTERVAL '4 days'),
    (v_user3, v_match_ids[2], 0, 0, 0, NOW() - INTERVAL '4 days')
  ON CONFLICT (user_id, match_id) DO NOTHING;

  -- Insert predictions for match 3 (pending)
  INSERT INTO public.predictions (user_id, match_id, predicted_home_score, predicted_away_score, points_earned, created_at)
  VALUES
    (v_user1, v_match_ids[3], 3, 2, 0, NOW() - INTERVAL '3 days'),
    (v_user2, v_match_ids[3], 1, 1, 0, NOW() - INTERVAL '3 days')
  ON CONFLICT (user_id, match_id) DO NOTHING;

  -- Insert predictions for match 4 (pending)
  INSERT INTO public.predictions (user_id, match_id, predicted_home_score, predicted_away_score, points_earned, created_at)
  VALUES
    (v_user1, v_match_ids[4], 2, 2, 0, NOW() - INTERVAL '2 days'),
    (v_user3, v_match_ids[4], 1, 0, 0, NOW() - INTERVAL '2 days')
  ON CONFLICT (user_id, match_id) DO NOTHING;
END $$;

-- ============================================================================
-- SCORE COMPLETED MATCHES
-- ============================================================================
-- Score the first match to generate ranking data

DO $$
DECLARE
  v_tournament_id UUID;
  v_match_id UUID;
BEGIN
  -- Get tournament ID
  SELECT id INTO v_tournament_id FROM public.tournaments WHERE name = 'FIFA World Cup 2026';

  -- Get first match ID
  SELECT id INTO v_match_id
  FROM public.matches
  WHERE tournament_id = v_tournament_id
  ORDER BY match_date
  LIMIT 1;

  -- Score the match as 2-1
  UPDATE public.matches
  SET
    home_score = 2,
    away_score = 1,
    status = 'completed',
    updated_at = NOW()
  WHERE id = v_match_id;

  -- Calculate points for predictions
  -- Exact score (2-1) = 3 points
  UPDATE public.predictions
  SET
    points_earned = 3,
    updated_at = NOW()
  WHERE match_id = v_match_id
    AND predicted_home_score = 2
    AND predicted_away_score = 1;

  -- Correct goal difference (+1) = 2 points
  UPDATE public.predictions
  SET
    points_earned = 2,
    updated_at = NOW()
  WHERE match_id = v_match_id
    AND predicted_home_score - predicted_away_score = 1
    AND predicted_home_score != 2;  -- Exclude exact match

  -- Correct winner (home) = 1 point
  UPDATE public.predictions
  SET
    points_earned = 1,
    updated_at = NOW()
  WHERE match_id = v_match_id
    AND predicted_home_score > predicted_away_score
    AND points_earned = 0;  -- Not already scored
END $$;
