-- ============================================================================
-- QUINIELA DATABASE BOOTSTRAP SCRIPT
-- ============================================================================
-- This script creates a fresh database with the complete schema, RLS policies,
-- functions, triggers, and storage configuration.
--
-- IMPORTANT: This script should be updated whenever schema changes are made.
-- Run this on a fresh Supabase project to bootstrap the entire database.
--
-- Last updated: 2026-01-24
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLES
-- ============================================================================

-- Teams table - Reusable team entities across tournaments
CREATE TABLE IF NOT EXISTS public.teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    country_code TEXT,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournaments table - Competition containers
CREATE TABLE IF NOT EXISTS public.tournaments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    sport TEXT DEFAULT 'soccer',
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'upcoming' CHECK (status IN ('upcoming', 'active', 'completed')),
    scoring_rules JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament Teams junction table - Many-to-many relationship
CREATE TABLE IF NOT EXISTS public.tournament_teams (
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tournament_id, team_id)
);

-- Users table - Extends Supabase auth.users
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    screen_name TEXT,
    avatar_url TEXT,
    is_admin BOOLEAN DEFAULT FALSE,
    webauthn_user_id TEXT UNIQUE,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tournament Participants table - Controls tournament enrollment
CREATE TABLE IF NOT EXISTS public.tournament_participants (
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (tournament_id, user_id)
);

-- Matches table - Individual games within a tournament
CREATE TABLE IF NOT EXISTS public.matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    home_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    away_team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
    match_date TIMESTAMPTZ NOT NULL,
    home_score INTEGER,
    away_score INTEGER,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
    round TEXT,
    multiplier INTEGER DEFAULT 1 CHECK (multiplier >= 1 AND multiplier <= 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Predictions table - User predictions for matches
CREATE TABLE IF NOT EXISTS public.predictions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    match_id UUID NOT NULL REFERENCES public.matches(id) ON DELETE CASCADE,
    predicted_home_score INTEGER NOT NULL,
    predicted_away_score INTEGER NOT NULL,
    points_earned INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, match_id)
);

-- WebAuthn Credentials table - Passkey support
CREATE TABLE IF NOT EXISTS public.webauthn_credentials (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    credential_id TEXT NOT NULL UNIQUE,
    public_key TEXT NOT NULL,
    counter BIGINT DEFAULT 0,
    device_type TEXT CHECK (device_type IN ('singleDevice', 'multiDevice')),
    backed_up BOOLEAN DEFAULT FALSE,
    transports TEXT[] DEFAULT '{}',
    aaguid TEXT,
    credential_name TEXT,
    last_used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- WebAuthn Challenges table - Temporary challenge storage
CREATE TABLE IF NOT EXISTS public.webauthn_challenges (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    challenge TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_tournament ON public.matches(tournament_id);
CREATE INDEX IF NOT EXISTS idx_matches_date ON public.matches(match_date);

-- Predictions indexes
CREATE INDEX IF NOT EXISTS idx_predictions_user ON public.predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_predictions_match ON public.predictions(match_id);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_webauthn_user_id ON public.users(webauthn_user_id);
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON public.users(is_admin) WHERE is_admin = TRUE;

-- WebAuthn indexes
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user ON public.webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_id ON public.webauthn_credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user ON public.webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON public.webauthn_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON public.webauthn_challenges(challenge);

-- Tournament participants indexes
CREATE INDEX IF NOT EXISTS idx_tournament_participants_tournament_id ON public.tournament_participants(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_participants_user_id ON public.tournament_participants(user_id);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Tournament Rankings view - Dynamically calculates rankings from predictions
CREATE OR REPLACE VIEW public.tournament_rankings AS
SELECT
    p.user_id,
    m.tournament_id,
    u.screen_name,
    u.avatar_url,
    COUNT(DISTINCT p.id) AS predictions_count,
    COALESCE(SUM(p.points_earned), 0) AS total_points,
    RANK() OVER (
        PARTITION BY m.tournament_id
        ORDER BY COALESCE(SUM(p.points_earned), 0) DESC
    ) AS rank
FROM public.predictions p
JOIN public.matches m ON p.match_id = m.id
JOIN public.users u ON p.user_id = u.id
JOIN public.tournament_participants tp ON tp.tournament_id = m.tournament_id AND tp.user_id = p.user_id
GROUP BY p.user_id, m.tournament_id, u.screen_name, u.avatar_url;

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Admin check function - Used in RLS policies
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.users
        WHERE id = user_id AND is_admin = TRUE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Handle new user signup - Creates profile and sets first user as admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_count INTEGER;
BEGIN
    -- Count existing users to determine if this is the first user
    SELECT COUNT(*) INTO user_count FROM public.users;

    INSERT INTO public.users (id, email, screen_name, is_admin)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'screen_name', split_part(NEW.email, '@', 1)),
        user_count = 0  -- First user becomes admin
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update last login timestamp
CREATE OR REPLACE FUNCTION public.update_last_login()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
        UPDATE public.users
        SET last_login = NEW.last_sign_in_at
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- WebAuthn: Get user credentials for authentication
CREATE OR REPLACE FUNCTION public.get_user_credentials_for_auth(user_email TEXT)
RETURNS TABLE (
    credential_id TEXT,
    transports TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT wc.credential_id, wc.transports
    FROM public.webauthn_credentials wc
    JOIN public.users u ON wc.user_id = u.id
    WHERE u.email = user_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- WebAuthn: Get credential for verification
CREATE OR REPLACE FUNCTION public.get_credential_for_verification(user_email TEXT, cred_id TEXT)
RETURNS TABLE (
    id UUID,
    user_id UUID,
    credential_id TEXT,
    public_key TEXT,
    counter BIGINT,
    transports TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT wc.id, wc.user_id, wc.credential_id, wc.public_key, wc.counter, wc.transports
    FROM public.webauthn_credentials wc
    JOIN public.users u ON wc.user_id = u.id
    WHERE u.email = user_email AND wc.credential_id = cred_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- WebAuthn: Update credential counter after authentication
CREATE OR REPLACE FUNCTION public.update_credential_counter(cred_id TEXT, new_counter BIGINT)
RETURNS VOID AS $$
BEGIN
    UPDATE public.webauthn_credentials
    SET counter = new_counter, last_used_at = NOW(), updated_at = NOW()
    WHERE credential_id = cred_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- WebAuthn: Store authentication challenge
CREATE OR REPLACE FUNCTION public.store_auth_challenge(
    p_user_email TEXT,
    p_challenge TEXT,
    p_expires_at TIMESTAMPTZ
)
RETURNS VOID AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Get user ID from email
    SELECT id INTO v_user_id FROM public.users WHERE email = p_user_email;

    -- Delete any existing challenges for this user
    DELETE FROM public.webauthn_challenges WHERE user_id = v_user_id AND type = 'authentication';

    -- Insert new challenge
    INSERT INTO public.webauthn_challenges (user_id, challenge, type, expires_at)
    VALUES (v_user_id, p_challenge, 'authentication', p_expires_at);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- WebAuthn: Get and consume authentication challenge (single-use)
CREATE OR REPLACE FUNCTION public.get_and_consume_auth_challenge(p_user_email TEXT)
RETURNS TEXT AS $$
DECLARE
    v_challenge TEXT;
    v_user_id UUID;
BEGIN
    -- Get user ID from email
    SELECT id INTO v_user_id FROM public.users WHERE email = p_user_email;

    -- Get the challenge
    SELECT challenge INTO v_challenge
    FROM public.webauthn_challenges
    WHERE user_id = v_user_id
      AND type = 'authentication'
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- Delete the challenge (single-use)
    DELETE FROM public.webauthn_challenges
    WHERE user_id = v_user_id AND type = 'authentication';

    RETURN v_challenge;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- WebAuthn: Clean expired challenges
CREATE OR REPLACE FUNCTION public.clean_expired_challenges()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM public.webauthn_challenges WHERE expires_at < NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger: Create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: Update last login timestamp
DROP TRIGGER IF EXISTS on_auth_user_login ON auth.users;
CREATE TRIGGER on_auth_user_login
    AFTER UPDATE OF last_sign_in_at ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.update_last_login();

-- Trigger: Update updated_at on webauthn_credentials
DROP TRIGGER IF EXISTS update_webauthn_credentials_updated_at ON public.webauthn_credentials;
CREATE TRIGGER update_webauthn_credentials_updated_at
    BEFORE UPDATE ON public.webauthn_credentials
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS POLICIES: Teams
-- ============================================================================
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;
CREATE POLICY "Teams are viewable by everyone"
    ON public.teams FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Teams are insertable by admins" ON public.teams;
CREATE POLICY "Teams are insertable by admins"
    ON public.teams FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Teams are updatable by admins" ON public.teams;
CREATE POLICY "Teams are updatable by admins"
    ON public.teams FOR UPDATE
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Teams are deletable by admins" ON public.teams;
CREATE POLICY "Teams are deletable by admins"
    ON public.teams FOR DELETE
    USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Tournaments
-- ============================================================================
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON public.tournaments;
CREATE POLICY "Tournaments are viewable by everyone"
    ON public.tournaments FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Tournaments are insertable by admins" ON public.tournaments;
CREATE POLICY "Tournaments are insertable by admins"
    ON public.tournaments FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tournaments are updatable by admins" ON public.tournaments;
CREATE POLICY "Tournaments are updatable by admins"
    ON public.tournaments FOR UPDATE
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tournaments are deletable by admins" ON public.tournaments;
CREATE POLICY "Tournaments are deletable by admins"
    ON public.tournaments FOR DELETE
    USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Tournament Teams
-- ============================================================================
DROP POLICY IF EXISTS "Tournament teams are viewable by everyone" ON public.tournament_teams;
CREATE POLICY "Tournament teams are viewable by everyone"
    ON public.tournament_teams FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Tournament teams are insertable by admins" ON public.tournament_teams;
CREATE POLICY "Tournament teams are insertable by admins"
    ON public.tournament_teams FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tournament teams are deletable by admins" ON public.tournament_teams;
CREATE POLICY "Tournament teams are deletable by admins"
    ON public.tournament_teams FOR DELETE
    USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Users
-- ============================================================================
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;
CREATE POLICY "Users are viewable by everyone"
    ON public.users FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.users;
CREATE POLICY "Users can insert their own profile"
    ON public.users FOR INSERT
    WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Tournament Participants
-- ============================================================================
DROP POLICY IF EXISTS "Tournament participants are viewable by everyone" ON public.tournament_participants;
CREATE POLICY "Tournament participants are viewable by everyone"
    ON public.tournament_participants FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Tournament participants are insertable by admins" ON public.tournament_participants;
CREATE POLICY "Tournament participants are insertable by admins"
    ON public.tournament_participants FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tournament participants are deletable by admins" ON public.tournament_participants;
CREATE POLICY "Tournament participants are deletable by admins"
    ON public.tournament_participants FOR DELETE
    USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Matches
-- ============================================================================
DROP POLICY IF EXISTS "Matches are viewable by everyone" ON public.matches;
CREATE POLICY "Matches are viewable by everyone"
    ON public.matches FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Matches are insertable by admins" ON public.matches;
CREATE POLICY "Matches are insertable by admins"
    ON public.matches FOR INSERT
    WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Matches are updatable by admins" ON public.matches;
CREATE POLICY "Matches are updatable by admins"
    ON public.matches FOR UPDATE
    USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Matches are deletable by admins" ON public.matches;
CREATE POLICY "Matches are deletable by admins"
    ON public.matches FOR DELETE
    USING (public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: Predictions
-- ============================================================================
DROP POLICY IF EXISTS "Predictions are viewable by everyone" ON public.predictions;
CREATE POLICY "Predictions are viewable by everyone"
    ON public.predictions FOR SELECT
    USING (TRUE);

DROP POLICY IF EXISTS "Users can insert their own predictions" ON public.predictions;
CREATE POLICY "Users can insert their own predictions"
    ON public.predictions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own predictions" ON public.predictions;
CREATE POLICY "Users can update their own predictions"
    ON public.predictions FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

-- ============================================================================
-- RLS POLICIES: WebAuthn Credentials
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can view their own credentials"
    ON public.webauthn_credentials FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can insert their own credentials"
    ON public.webauthn_credentials FOR INSERT
    WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can update their own credentials"
    ON public.webauthn_credentials FOR UPDATE
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own credentials" ON public.webauthn_credentials;
CREATE POLICY "Users can delete their own credentials"
    ON public.webauthn_credentials FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================================================
-- RLS POLICIES: WebAuthn Challenges
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own challenges" ON public.webauthn_challenges;
CREATE POLICY "Users can view their own challenges"
    ON public.webauthn_challenges FOR SELECT
    USING (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can insert their own challenges" ON public.webauthn_challenges;
CREATE POLICY "Users can insert their own challenges"
    ON public.webauthn_challenges FOR INSERT
    WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

DROP POLICY IF EXISTS "Users can delete their own challenges" ON public.webauthn_challenges;
CREATE POLICY "Users can delete their own challenges"
    ON public.webauthn_challenges FOR DELETE
    USING (auth.uid() = user_id OR user_id IS NULL);

-- ============================================================================
-- STORAGE BUCKETS
-- ============================================================================

-- Create storage buckets (run these via Supabase Dashboard or API if not available)
-- INSERT INTO storage.buckets (id, name, public) VALUES ('team-logos', 'team-logos', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('user-avatars', 'user-avatars', true);

-- Storage policies for team-logos bucket
-- Note: These need to be created via Supabase Dashboard or storage API
-- Policies:
--   - SELECT: public (anyone can view)
--   - INSERT/UPDATE/DELETE: authenticated users (admins typically manage team logos)

-- Storage policies for user-avatars bucket
-- Policies:
--   - SELECT: public (anyone can view)
--   - INSERT/UPDATE/DELETE: authenticated users for their own avatar
--     (auth.uid()::text = (storage.foldername(name))[1])

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Grant select on all tables to anon and authenticated
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated;

-- Grant insert, update, delete on specific tables to authenticated
GRANT INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT INSERT, UPDATE ON public.predictions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.webauthn_credentials TO authenticated;
GRANT INSERT, DELETE ON public.webauthn_challenges TO authenticated;

-- Grant all on admin-managed tables to authenticated (RLS will restrict)
GRANT INSERT, UPDATE, DELETE ON public.teams TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tournaments TO authenticated;
GRANT INSERT, DELETE ON public.tournament_teams TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.matches TO authenticated;
GRANT INSERT, DELETE ON public.tournament_participants TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_admin TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_credentials_for_auth TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_credential_for_verification TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_credential_counter TO authenticated;
GRANT EXECUTE ON FUNCTION public.store_auth_challenge TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_and_consume_auth_challenge TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.clean_expired_challenges TO authenticated;

-- ============================================================================
-- END OF BOOTSTRAP SCRIPT
-- ============================================================================
