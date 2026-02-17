-- ============================================================================
-- SEED DATA FOR DEVELOPMENT AND TESTING
-- ============================================================================
-- This file provides sample data for the Quiniela application to support
-- development and testing workflows.
--
-- WHAT IT CREATES:
--   - 32 teams (World Cup 2026 participants)
--   - 1 tournament (FIFA World Cup 2026)
--   - 4 matches (1 completed, 3 scheduled)
--   - 3 test users (1 admin, 2 regular users)
--   - Tournament participant enrollments
--   - Sample predictions for all users on all matches
--   - Scored predictions for completed match
--
-- TEST ACCOUNTS:
--   - admin@quiniela.test / password123 (Admin User) - is_admin: true
--   - player1@quiniela.test / password123 (Soccer Fan) - is_admin: false
--   - player2@quiniela.test / password123 (World Cup Expert) - is_admin: false
--
-- USAGE:
--   psql -h localhost -p 54322 -U postgres -d postgres -f supabase/seed.sql
--
-- WARNING: This seed data is for DEVELOPMENT ONLY. Do not run in production!
-- ============================================================================

-- ============================================================================
-- TEAMS
-- ============================================================================

-- Insert sample teams (FIFA World Cup 2026 participants - examples)
INSERT INTO teams (name, short_name, country_code) VALUES
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
  ('Cameroon', 'CMR', 'CM');

-- ============================================================================
-- TOURNAMENT
-- ============================================================================

-- Insert World Cup 2026 tournament
INSERT INTO tournaments (name, sport, start_date, end_date, status, scoring_rules)
VALUES (
  'FIFA World Cup 2026',
  'soccer',
  '2026-06-11',
  '2026-07-19',
  'upcoming',
  '{"exact_score": 10, "correct_winner_and_diff": 7, "correct_winner": 5}'::jsonb
);

-- ============================================================================
-- TEST USERS
-- ============================================================================
-- Note: In production, users are created via Supabase Auth.
-- For seed data, we create them directly for testing purposes.

-- Create test users in auth.users first (Supabase requires this)
-- WARNING: These IDs are fixed for reproducibility. Change in production!
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
  role,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change_token_current
)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    '00000000-0000-0000-0000-000000000000',
    'admin@quiniela.test',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"screen_name":"Admin User"}'::jsonb,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
    '00000000-0000-0000-0000-000000000000',
    'player1@quiniela.test',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"screen_name":"Soccer Fan"}'::jsonb,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid,
    '00000000-0000-0000-0000-000000000000',
    'player2@quiniela.test',
    crypt('password123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"screen_name":"World Cup Expert"}'::jsonb,
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    ''
  )
ON CONFLICT (id) DO NOTHING;

-- GoTrue cannot scan NULL string columns — ensure all token fields are empty strings
UPDATE auth.users SET
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change = COALESCE(email_change, ''),
  phone_change = COALESCE(phone_change, ''),
  phone_change_token = COALESCE(phone_change_token, ''),
  reauthentication_token = COALESCE(reauthentication_token, ''),
  email_change_confirm_status = COALESCE(email_change_confirm_status, 0)
WHERE email IN ('admin@quiniela.test', 'player1@quiniela.test', 'player2@quiniela.test');

-- Create identity records (required by Supabase Auth for email/password login)
INSERT INTO auth.identities (
  id,
  user_id,
  provider_id,
  provider,
  identity_data,
  last_sign_in_at,
  created_at,
  updated_at
)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'admin@quiniela.test',
    'email',
    '{"sub":"a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11","email":"admin@quiniela.test","email_verified":true}'::jsonb,
    now(),
    now(),
    now()
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
    'player1@quiniela.test',
    'email',
    '{"sub":"b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22","email":"player1@quiniela.test","email_verified":true}'::jsonb,
    now(),
    now(),
    now()
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid,
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid,
    'player2@quiniela.test',
    'email',
    '{"sub":"c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33","email":"player2@quiniela.test","email_verified":true}'::jsonb,
    now(),
    now(),
    now()
  )
ON CONFLICT (provider_id, provider) DO NOTHING;

-- Create corresponding profiles in public.users
-- The trigger handle_new_user() normally does this, but for seed data we do it manually
INSERT INTO public.users (id, email, screen_name, is_admin, created_at, updated_at)
VALUES
  (
    'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
    'admin@quiniela.test',
    'Admin User',
    true,  -- First user is admin
    now(),
    now()
  ),
  (
    'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'::uuid,
    'player1@quiniela.test',
    'Soccer Fan',
    false,
    now(),
    now()
  ),
  (
    'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a33'::uuid,
    'player2@quiniela.test',
    'World Cup Expert',
    false,
    now(),
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- Ensure admin flag is set correctly (the handle_new_user trigger may have
-- already created these rows with is_admin=false before the explicit INSERT above)
UPDATE public.users SET is_admin = true WHERE email = 'admin@quiniela.test';

-- ============================================================================
-- TOURNAMENT TEAMS
-- ============================================================================

-- Link teams to tournament (get tournament_id first)
WITH tournament AS (
  SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'
)
INSERT INTO tournament_teams (tournament_id, team_id)
SELECT tournament.id, teams.id
FROM tournament, teams;

-- ============================================================================
-- TOURNAMENT PARTICIPANTS
-- ============================================================================
-- Enroll test users in the tournament so they can submit predictions

WITH tournament AS (
  SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'
)
INSERT INTO tournament_participants (tournament_id, user_id, joined_at)
SELECT
  tournament.id,
  u.id,
  now() - interval '1 day'  -- Joined yesterday
FROM tournament, public.users u
WHERE u.email IN ('admin@quiniela.test', 'player1@quiniela.test', 'player2@quiniela.test')
ON CONFLICT (tournament_id, user_id) DO NOTHING;

-- ============================================================================
-- MATCHES
-- ============================================================================

-- Insert some example matches for Group Stage
WITH
  tournament AS (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  arg AS (SELECT id FROM teams WHERE short_name = 'ARG'),
  mex AS (SELECT id FROM teams WHERE short_name = 'MEX'),
  bra AS (SELECT id FROM teams WHERE short_name = 'BRA'),
  ger AS (SELECT id FROM teams WHERE short_name = 'GER'),
  fra AS (SELECT id FROM teams WHERE short_name = 'FRA'),
  eng AS (SELECT id FROM teams WHERE short_name = 'ENG'),
  esp AS (SELECT id FROM teams WHERE short_name = 'ESP'),
  ned AS (SELECT id FROM teams WHERE short_name = 'NED')
INSERT INTO matches (tournament_id, home_team_id, away_team_id, match_date, round, status, home_score, away_score, multiplier)
VALUES
  -- COMPLETED MATCH (for testing scoring)
  (
    (SELECT id FROM tournament),
    (SELECT id FROM arg),
    (SELECT id FROM mex),
    '2026-06-11 16:00:00+00'::timestamptz,
    'Group Stage - Group A',
    'completed',
    2,  -- Argentina won 2-1
    1,
    1   -- Standard multiplier
  ),
  -- SCHEDULED MATCHES
  (
    (SELECT id FROM tournament),
    (SELECT id FROM bra),
    (SELECT id FROM ger),
    '2026-06-12 19:00:00+00'::timestamptz,
    'Group Stage - Group B',
    'scheduled',
    NULL,
    NULL,
    1
  ),
  (
    (SELECT id FROM tournament),
    (SELECT id FROM fra),
    (SELECT id FROM eng),
    '2026-06-13 16:00:00+00'::timestamptz,
    'Group Stage - Group C',
    'scheduled',
    NULL,
    NULL,
    1
  ),
  (
    (SELECT id FROM tournament),
    (SELECT id FROM esp),
    (SELECT id FROM ned),
    '2026-06-14 19:00:00+00'::timestamptz,
    'Group Stage - Group D',
    'scheduled',
    NULL,
    NULL,
    2   -- Important match, 2x multiplier
  );

-- ============================================================================
-- SAMPLE PREDICTIONS
-- ============================================================================
-- Create predictions for all test users on all matches

WITH
  tournament AS (SELECT id FROM tournaments WHERE name = 'FIFA World Cup 2026'),
  admin_user AS (SELECT id FROM public.users WHERE email = 'admin@quiniela.test'),
  player1 AS (SELECT id FROM public.users WHERE email = 'player1@quiniela.test'),
  player2 AS (SELECT id FROM public.users WHERE email = 'player2@quiniela.test'),
  matches AS (
    SELECT id, home_team_id, away_team_id, round
    FROM matches
    WHERE tournament_id = (SELECT id FROM tournament)
    ORDER BY match_date
  )
INSERT INTO predictions (user_id, match_id, predicted_home_score, predicted_away_score, created_at)
SELECT user_id, match_id, home_score, away_score, now()
FROM (
  -- Admin User predictions (optimistic)
  SELECT
    (SELECT id FROM admin_user) as user_id,
    m.id as match_id,
    CASE m.round
      WHEN 'Group Stage - Group A' THEN 2  -- Argentina 2-1 Mexico
      WHEN 'Group Stage - Group B' THEN 3  -- Brazil 3-2 Germany
      WHEN 'Group Stage - Group C' THEN 1  -- France 1-1 England
      WHEN 'Group Stage - Group D' THEN 2  -- Spain 2-0 Netherlands
    END as home_score,
    CASE m.round
      WHEN 'Group Stage - Group A' THEN 1
      WHEN 'Group Stage - Group B' THEN 2
      WHEN 'Group Stage - Group C' THEN 1
      WHEN 'Group Stage - Group D' THEN 0
    END as away_score
  FROM matches m

  UNION ALL

  -- Player 1 predictions (conservative)
  SELECT
    (SELECT id FROM player1) as user_id,
    m.id as match_id,
    CASE m.round
      WHEN 'Group Stage - Group A' THEN 1  -- Argentina 1-0 Mexico
      WHEN 'Group Stage - Group B' THEN 2  -- Brazil 2-1 Germany
      WHEN 'Group Stage - Group C' THEN 0  -- France 0-0 England
      WHEN 'Group Stage - Group D' THEN 1  -- Spain 1-1 Netherlands
    END as home_score,
    CASE m.round
      WHEN 'Group Stage - Group A' THEN 0
      WHEN 'Group Stage - Group B' THEN 1
      WHEN 'Group Stage - Group C' THEN 0
      WHEN 'Group Stage - Group D' THEN 1
    END as away_score
  FROM matches m

  UNION ALL

  -- Player 2 predictions (high-scoring)
  SELECT
    (SELECT id FROM player2) as user_id,
    m.id as match_id,
    CASE m.round
      WHEN 'Group Stage - Group A' THEN 3  -- Argentina 3-2 Mexico
      WHEN 'Group Stage - Group B' THEN 4  -- Brazil 4-3 Germany
      WHEN 'Group Stage - Group C' THEN 2  -- France 2-1 England
      WHEN 'Group Stage - Group D' THEN 3  -- Spain 3-1 Netherlands
    END as home_score,
    CASE m.round
      WHEN 'Group Stage - Group A' THEN 2
      WHEN 'Group Stage - Group B' THEN 3
      WHEN 'Group Stage - Group C' THEN 1
      WHEN 'Group Stage - Group D' THEN 1
    END as away_score
  FROM matches m
) all_predictions
ON CONFLICT (user_id, match_id) DO NOTHING;

-- ============================================================================
-- SCORE COMPLETED MATCH PREDICTIONS
-- ============================================================================
-- Calculate points for the completed match (Argentina 2-1 Mexico)

WITH
  completed_match AS (
    SELECT id, home_score, away_score, multiplier
    FROM matches
    WHERE status = 'completed'
    AND round = 'Group Stage - Group A'
  ),
  scored_predictions AS (
    SELECT
      p.id,
      p.user_id,
      p.predicted_home_score,
      p.predicted_away_score,
      m.home_score as actual_home,
      m.away_score as actual_away,
      m.multiplier,
      -- Calculate points based on scoring rules
      CASE
        -- Exact score: 3 points
        WHEN p.predicted_home_score = m.home_score
         AND p.predicted_away_score = m.away_score THEN 3
        -- Correct winner + goal difference: 2 points
        WHEN SIGN(p.predicted_home_score - p.predicted_away_score) = SIGN(m.home_score - m.away_score)
         AND ABS(p.predicted_home_score - p.predicted_away_score) = ABS(m.home_score - m.away_score) THEN 2
        -- Correct winner only: 1 point
        WHEN SIGN(p.predicted_home_score - p.predicted_away_score) = SIGN(m.home_score - m.away_score) THEN 1
        -- Incorrect: 0 points
        ELSE 0
      END * m.multiplier as points
    FROM predictions p
    JOIN completed_match m ON p.match_id = m.id
  )
UPDATE predictions p
SET
  points_earned = sp.points,
  updated_at = now()
FROM scored_predictions sp
WHERE p.id = sp.id;

-- Show results
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
