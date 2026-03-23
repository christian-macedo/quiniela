-- Fix 1: Update get_credential_for_verification to expose failed_attempts
-- This allows the application layer to enforce a lockout before attempting verification.

CREATE OR REPLACE FUNCTION get_credential_for_verification(
  user_email TEXT,
  cred_id TEXT
)
RETURNS TABLE (
  user_id UUID,
  credential_id TEXT,
  public_key TEXT,
  counter BIGINT,
  transports TEXT[],
  failed_attempts INTEGER
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

  -- Return credential data including failed_attempts for lockout enforcement
  RETURN QUERY
  SELECT
    wc.user_id,
    wc.credential_id,
    wc.public_key,
    wc.counter,
    wc.transports,
    wc.failed_attempts
  FROM webauthn_credentials wc
  WHERE wc.user_id = found_user_id
    AND wc.credential_id = cred_id;
END;
$$;

-- Fix 2: Revoke anon execute permission on increment_credential_failed_attempts.
-- This function is called server-side using the admin/service-role client,
-- so unauthenticated callers have no legitimate reason to invoke it directly.
REVOKE EXECUTE ON FUNCTION increment_credential_failed_attempts(TEXT) FROM anon;
