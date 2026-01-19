-- Add WebAuthn/Passkey Support
-- Migration: Add tables for passkey credentials and challenges

-- Add webauthn_user_id to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS webauthn_user_id TEXT UNIQUE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_users_webauthn_user_id ON users(webauthn_user_id);

-- Table: webauthn_credentials
-- Stores registered passkey credentials for users
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  credential_id TEXT NOT NULL UNIQUE,
  public_key TEXT NOT NULL, -- Base64 encoded public key
  counter BIGINT NOT NULL DEFAULT 0,
  device_type TEXT CHECK (device_type IN ('singleDevice', 'multiDevice')),
  backed_up BOOLEAN DEFAULT false,
  transports TEXT[] DEFAULT '{}', -- Array of: 'usb', 'nfc', 'ble', 'internal', 'hybrid'
  aaguid TEXT, -- Authenticator AAGUID (optional)
  credential_name TEXT, -- User-friendly name like "iPhone 15 Pro" (optional)
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for webauthn_credentials
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_id ON webauthn_credentials(credential_id);

-- Table: webauthn_challenges
-- Stores temporary challenges for registration and authentication
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  challenge TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'authentication')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes for webauthn_challenges
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_user ON webauthn_challenges(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_expires ON webauthn_challenges(expires_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_challenges_challenge ON webauthn_challenges(challenge);

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Auto-update updated_at on webauthn_credentials
DROP TRIGGER IF EXISTS update_webauthn_credentials_updated_at ON webauthn_credentials;
CREATE TRIGGER update_webauthn_credentials_updated_at
  BEFORE UPDATE ON webauthn_credentials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function: Clean up expired challenges
CREATE OR REPLACE FUNCTION clean_expired_challenges()
RETURNS void AS $$
BEGIN
  DELETE FROM webauthn_challenges WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Row Level Security (RLS) Policies

-- Enable RLS on webauthn tables
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own credentials
CREATE POLICY "Users can view their own credentials"
  ON webauthn_credentials
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own credentials (through authenticated API)
CREATE POLICY "Users can insert their own credentials"
  ON webauthn_credentials
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own credentials
CREATE POLICY "Users can update their own credentials"
  ON webauthn_credentials
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own credentials
CREATE POLICY "Users can delete their own credentials"
  ON webauthn_credentials
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Users can read their own challenges
CREATE POLICY "Users can view their own challenges"
  ON webauthn_challenges
  FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Policy: Authenticated users can insert challenges
CREATE POLICY "Authenticated users can insert challenges"
  ON webauthn_challenges
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL OR user_id IS NULL);

-- Policy: Users can delete their own challenges
CREATE POLICY "Users can delete their own challenges"
  ON webauthn_challenges
  FOR DELETE
  USING (auth.uid() = user_id OR user_id IS NULL);

-- Comments for documentation
COMMENT ON TABLE webauthn_credentials IS 'Stores WebAuthn passkey credentials for users';
COMMENT ON TABLE webauthn_challenges IS 'Temporarily stores challenges during WebAuthn registration/authentication flows';
COMMENT ON COLUMN webauthn_credentials.credential_id IS 'Unique identifier for the credential (from WebAuthn)';
COMMENT ON COLUMN webauthn_credentials.public_key IS 'Base64 encoded public key for credential verification';
COMMENT ON COLUMN webauthn_credentials.counter IS 'Signature counter to detect cloned authenticators';
COMMENT ON COLUMN webauthn_credentials.device_type IS 'Whether the credential is bound to a single device or can sync across devices';
COMMENT ON COLUMN webauthn_credentials.backed_up IS 'Whether the credential is backed up (e.g., to iCloud Keychain)';
COMMENT ON COLUMN webauthn_credentials.transports IS 'Array of supported transport methods (usb, nfc, ble, internal, hybrid)';
