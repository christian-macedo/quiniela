-- Create teams table
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  country_code TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tournaments table
CREATE TABLE tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  sport TEXT NOT NULL DEFAULT 'soccer',
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
  scoring_rules JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create tournament_teams junction table (many-to-many)
CREATE TABLE tournament_teams (
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  PRIMARY KEY (tournament_id, team_id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE NOT NULL,
  home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  away_team_id UUID REFERENCES teams(id) ON DELETE CASCADE NOT NULL,
  match_date TIMESTAMPTZ NOT NULL,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  round TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create users table (extends Supabase auth.users)
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  screen_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create predictions table
CREATE TABLE predictions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  predicted_home_score INTEGER NOT NULL,
  predicted_away_score INTEGER NOT NULL,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, match_id)
);

-- Create tournament_rankings table
CREATE TABLE tournament_rankings (
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  tournament_id UUID REFERENCES tournaments(id) ON DELETE CASCADE,
  total_points INTEGER NOT NULL DEFAULT 0,
  rank INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, tournament_id)
);

-- Create indexes for better query performance
CREATE INDEX idx_matches_tournament ON matches(tournament_id);
CREATE INDEX idx_matches_date ON matches(match_date);
CREATE INDEX idx_predictions_user ON predictions(user_id);
CREATE INDEX idx_predictions_match ON predictions(match_id);
CREATE INDEX idx_tournament_rankings_tournament ON tournament_rankings(tournament_id);
CREATE INDEX idx_tournament_rankings_rank ON tournament_rankings(rank);

-- Create storage buckets for images
INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true);

-- Enable Row Level Security
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_rankings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Teams: public read, admin write
CREATE POLICY "Teams are viewable by everyone" ON teams FOR SELECT USING (true);

-- Tournaments: public read, admin write
CREATE POLICY "Tournaments are viewable by everyone" ON tournaments FOR SELECT USING (true);

-- Tournament teams: public read, admin write
CREATE POLICY "Tournament teams are viewable by everyone" ON tournament_teams FOR SELECT USING (true);

-- Matches: public read, admin write
CREATE POLICY "Matches are viewable by everyone" ON matches FOR SELECT USING (true);

-- Users: public read, own profile write
CREATE POLICY "Users can view all profiles" ON users FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON users FOR INSERT WITH CHECK (auth.uid() = id);

-- Predictions: users can view all, but only insert/update their own
CREATE POLICY "Predictions are viewable by everyone" ON predictions FOR SELECT USING (true);
CREATE POLICY "Users can insert own predictions" ON predictions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own predictions" ON predictions FOR UPDATE USING (auth.uid() = user_id);

-- Tournament rankings: public read
CREATE POLICY "Tournament rankings are viewable by everyone" ON tournament_rankings FOR SELECT USING (true);
