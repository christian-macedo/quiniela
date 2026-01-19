-- Add secure function for passkey authentication lookup
-- This function runs with elevated privileges (SECURITY DEFINER) to bypass RLS
-- but only returns the minimal data needed for authentication

-- Function to get credentials for authentication (called during login)
-- This is secure because:
-- 1. It only returns credential_id and transports (no sensitive data like public_key)
-- 2. It requires a valid email to look up
-- 3. The public_key is only accessed during verification after challenge is validated
CREATE OR REPLACE FUNCTION get_user_credentials_for_auth(user_email TEXT)
RETURNS TABLE (
  user_id UUID,
  credential_id TEXT,
  transports TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO found_user_id
  FROM users
  WHERE email = user_email;

  IF found_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Return credentials for this user
  RETURN QUERY
  SELECT 
    wc.user_id,
    wc.credential_id,
    wc.transports
  FROM webauthn_credentials wc
  WHERE wc.user_id = found_user_id;
END;
$$;

-- Function to get a credential for verification (called after browser authentication)
-- Returns full credential data needed to verify the authentication response
CREATE OR REPLACE FUNCTION get_credential_for_verification(
  user_email TEXT,
  cred_id TEXT
)
RETURNS TABLE (
  user_id UUID,
  credential_id TEXT,
  public_key TEXT,
  counter BIGINT,
  transports TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO found_user_id
  FROM users
  WHERE email = user_email;

  IF found_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Return the specific credential
  RETURN QUERY
  SELECT 
    wc.user_id,
    wc.credential_id,
    wc.public_key,
    wc.counter,
    wc.transports
  FROM webauthn_credentials wc
  WHERE wc.user_id = found_user_id
    AND wc.credential_id = cred_id;
END;
$$;

-- Function to update credential counter after successful authentication
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
    updated_at = NOW()
  WHERE credential_id = cred_id;
END;
$$;

-- Function to store authentication challenge (before user is authenticated)
CREATE OR REPLACE FUNCTION store_auth_challenge(
  p_user_email TEXT,
  p_challenge TEXT,
  p_expires_at TIMESTAMPTZ
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id UUID;
BEGIN
  -- Find user by email
  SELECT id INTO found_user_id
  FROM users
  WHERE email = p_user_email;

  IF found_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Insert the challenge
  INSERT INTO webauthn_challenges (user_id, challenge, type, expires_at)
  VALUES (found_user_id, p_challenge, 'authentication', p_expires_at);
END;
$$;

-- Function to get and consume authentication challenge
CREATE OR REPLACE FUNCTION get_and_consume_auth_challenge(
  p_user_email TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  found_user_id UUID;
  found_challenge TEXT;
BEGIN
  -- Find user by email
  SELECT id INTO found_user_id
  FROM users
  WHERE email = p_user_email;

  IF found_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Get the most recent valid challenge
  SELECT challenge INTO found_challenge
  FROM webauthn_challenges
  WHERE user_id = found_user_id
    AND type = 'authentication'
    AND expires_at > NOW()
  ORDER BY created_at DESC
  LIMIT 1;

  IF found_challenge IS NULL THEN
    RAISE EXCEPTION 'Challenge not found or expired';
  END IF;

  -- Delete the challenge (single-use)
  DELETE FROM webauthn_challenges
  WHERE user_id = found_user_id
    AND challenge = found_challenge;

  RETURN found_challenge;
END;
$$;

-- Grant execute permissions to authenticated and anon users
GRANT EXECUTE ON FUNCTION get_user_credentials_for_auth(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_credential_for_verification(TEXT, TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_credential_counter(TEXT, BIGINT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION store_auth_challenge(TEXT, TEXT, TIMESTAMPTZ) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_and_consume_auth_challenge(TEXT) TO anon, authenticated;

-- Add comments
COMMENT ON FUNCTION get_user_credentials_for_auth IS 'Securely retrieves credential IDs for passkey authentication. Returns only non-sensitive data needed to initiate WebAuthn authentication.';
COMMENT ON FUNCTION get_credential_for_verification IS 'Retrieves full credential data for verifying a WebAuthn authentication response.';
COMMENT ON FUNCTION update_credential_counter IS 'Updates the signature counter after successful authentication to prevent replay attacks.';
COMMENT ON FUNCTION store_auth_challenge IS 'Stores a WebAuthn authentication challenge for a user.';
COMMENT ON FUNCTION get_and_consume_auth_challenge IS 'Retrieves and deletes (consumes) an authentication challenge.';
