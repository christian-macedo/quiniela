-- Add failed_attempts tracking to webauthn_credentials
-- Provides an audit trail for failed WebAuthn verifications per credential.

ALTER TABLE webauthn_credentials
  ADD COLUMN IF NOT EXISTS failed_attempts INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN webauthn_credentials.failed_attempts IS 'Counter incremented on each failed verification attempt; reset to 0 on successful authentication.';

-- Function: Increment failed_attempts counter on a credential
CREATE OR REPLACE FUNCTION increment_credential_failed_attempts(cred_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE webauthn_credentials
  SET
    failed_attempts = failed_attempts + 1,
    updated_at = NOW()
  WHERE credential_id = cred_id;
END;
$$;

COMMENT ON FUNCTION increment_credential_failed_attempts IS 'Increments the failed_attempts counter for a credential after a failed WebAuthn verification.';

-- Update update_credential_counter to also reset failed_attempts on successful auth
CREATE OR REPLACE FUNCTION update_credential_counter(
  cred_id TEXT,
  new_counter BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE webauthn_credentials
  SET
    counter = new_counter,
    last_used_at = NOW(),
    updated_at = NOW(),
    failed_attempts = 0
  WHERE credential_id = cred_id;
END;
$$;

-- Grant execute permission for the new function
GRANT EXECUTE ON FUNCTION increment_credential_failed_attempts(TEXT) TO anon, authenticated;
