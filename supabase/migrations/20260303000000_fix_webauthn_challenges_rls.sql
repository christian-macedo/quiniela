-- Fix WebAuthn challenges RLS INSERT policy
-- The previous policy allowed unauthenticated users to insert rows with user_id IS NULL,
-- which opened a DoS vector (anyone could flood the challenges table).
-- SECURITY DEFINER functions (store_auth_challenge) bypass RLS and handle unauthenticated
-- flows safely, so authenticated direct inserts can be restricted to the user's own id.

DROP POLICY IF EXISTS "Authenticated users can insert challenges" ON webauthn_challenges;

CREATE POLICY "Authenticated users can insert challenges"
  ON webauthn_challenges
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);
