-- Update RLS policies to support soft delete functionality
-- Deleted users are hidden from public queries but visible to themselves and admins

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users are viewable by everyone" ON public.users;

-- Create new SELECT policy that filters deleted users
CREATE POLICY "Active users are viewable by everyone"
    ON public.users FOR SELECT
    USING (
        deleted_at IS NULL                  -- Active users visible to all
        OR auth.uid() = id                  -- Deleted users can see their own profile
        OR public.is_admin(auth.uid())      -- Admins can see all users
    );

-- Drop existing UPDATE policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;

-- Create new UPDATE policy that allows self-deletion
CREATE POLICY "Users can update their own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id OR public.is_admin(auth.uid()))
    WITH CHECK (
        -- Regular users can only soft-delete themselves (not reactivate)
        (
            auth.uid() = id
            AND NEW.deleted_at IS NOT NULL    -- Can only set deleted_at
            AND OLD.deleted_at IS NULL        -- Cannot reactivate
        )
        -- Admins can do anything
        OR public.is_admin(auth.uid())
    );

-- Add new DELETE policy for admin hard delete
CREATE POLICY "Admins can hard delete users"
    ON public.users FOR DELETE
    USING (public.is_admin(auth.uid()));
