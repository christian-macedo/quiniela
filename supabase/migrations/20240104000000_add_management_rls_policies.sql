-- Add RLS policies for authenticated users to manage content
-- This enables the tournament/team/match management interfaces

-- Teams: Allow authenticated users to create, update, and delete teams
CREATE POLICY "Authenticated users can insert teams" ON teams
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update teams" ON teams
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete teams" ON teams
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Tournaments: Allow authenticated users to create, update, and delete tournaments
CREATE POLICY "Authenticated users can insert tournaments" ON tournaments
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tournaments" ON tournaments
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tournaments" ON tournaments
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Tournament Teams: Allow authenticated users to manage tournament team relationships
CREATE POLICY "Authenticated users can insert tournament teams" ON tournament_teams
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete tournament teams" ON tournament_teams
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Matches: Allow authenticated users to create, update, and delete matches
CREATE POLICY "Authenticated users can insert matches" ON matches
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update matches" ON matches
  FOR UPDATE
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete matches" ON matches
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Tournament Rankings: Allow system to update rankings (used by match scoring API)
CREATE POLICY "Authenticated users can insert tournament rankings" ON tournament_rankings
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update tournament rankings" ON tournament_rankings
  FOR UPDATE
  USING (auth.role() = 'authenticated');
