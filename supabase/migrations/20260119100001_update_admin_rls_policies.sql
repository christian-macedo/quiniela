-- Update RLS Policies for Admin-Only Access
-- Migration: Replace authenticated user policies with admin-only policies

-- Drop existing management policies for teams
DROP POLICY IF EXISTS "Authenticated users can insert teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can update teams" ON teams;
DROP POLICY IF EXISTS "Authenticated users can delete teams" ON teams;

-- Drop existing management policies for tournaments
DROP POLICY IF EXISTS "Authenticated users can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can update tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated users can delete tournaments" ON tournaments;

-- Drop existing management policies for tournament_teams
DROP POLICY IF EXISTS "Authenticated users can insert tournament teams" ON tournament_teams;
DROP POLICY IF EXISTS "Authenticated users can delete tournament teams" ON tournament_teams;

-- Drop existing management policies for matches
DROP POLICY IF EXISTS "Authenticated users can insert matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can update matches" ON matches;
DROP POLICY IF EXISTS "Authenticated users can delete matches" ON matches;

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id AND is_admin = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.is_admin IS 'Check if a user has administrator privileges';

-- Teams: Only admins can create/update/delete
CREATE POLICY "Admins can insert teams" ON teams
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update teams" ON teams
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete teams" ON teams
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Tournaments: Only admins can create/update/delete
CREATE POLICY "Admins can insert tournaments" ON tournaments
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update tournaments" ON tournaments
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete tournaments" ON tournaments
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Tournament Teams: Only admins can manage
CREATE POLICY "Admins can insert tournament teams" ON tournament_teams
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can delete tournament teams" ON tournament_teams
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Matches: Only admins can create/update/delete
CREATE POLICY "Admins can insert matches" ON matches
  FOR INSERT
  WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "Admins can update matches" ON matches
  FOR UPDATE
  USING (is_admin(auth.uid()));

CREATE POLICY "Admins can delete matches" ON matches
  FOR DELETE
  USING (is_admin(auth.uid()));

-- Users: Allow admins to update other users' admin status
CREATE POLICY "Admins can update user admin status" ON users
  FOR UPDATE
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));
