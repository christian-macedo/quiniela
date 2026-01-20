-- Add Admin Permissions
-- Migration: Add is_admin field and implement first-user auto-admin

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT false;

-- Create index for admin queries (sparse index only for admins)
CREATE INDEX IF NOT EXISTS idx_users_is_admin ON users(is_admin) WHERE is_admin = true;

-- Update the user creation trigger to check if this is the first user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  user_count INTEGER;
BEGIN
  -- Count existing users
  SELECT COUNT(*) INTO user_count FROM public.users;

  -- Insert new user profile
  INSERT INTO public.users (id, email, screen_name, is_admin, created_at, updated_at)
  VALUES (
    new.id,
    new.email,
    new.raw_user_meta_data->>'screen_name',
    (user_count = 0), -- First user becomes admin
    now(),
    now()
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for documentation
COMMENT ON COLUMN users.is_admin IS 'Whether the user has administrator privileges. First user is automatically admin.';
