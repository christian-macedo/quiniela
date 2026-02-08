-- Database functions for user deletion and reactivation
-- These functions encapsulate business logic and permissions

-- Function: Soft delete (deactivate) user
-- Can be called by the user themselves or by an admin
CREATE OR REPLACE FUNCTION public.soft_delete_user(
    target_user_id UUID,
    reason TEXT DEFAULT 'self_requested'
)
RETURNS VOID AS $$
BEGIN
    -- Permission check: user can delete themselves, or admin can delete anyone
    IF auth.uid() != target_user_id AND NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Cannot delete other users';
    END IF;

    -- Prevent double-deletion
    IF EXISTS (
        SELECT 1 FROM public.users
        WHERE id = target_user_id AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'User is already deactivated';
    END IF;

    -- Soft delete the user
    UPDATE public.users
    SET
        deleted_at = NOW(),
        deletion_reason = reason,
        deleted_by = CASE
            WHEN auth.uid() = target_user_id THEN NULL  -- Self-deletion
            ELSE auth.uid()                             -- Admin deletion
        END,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function: Reactivate user (admin only)
-- Restores a soft-deleted user account
CREATE OR REPLACE FUNCTION public.reactivate_user(target_user_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Permission check: admin only
    IF NOT public.is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Unauthorized: Admin access required';
    END IF;

    -- Reactivate the user by clearing deletion fields
    UPDATE public.users
    SET
        deleted_at = NULL,
        deletion_reason = NULL,
        deleted_by = NULL,
        updated_at = NOW()
    WHERE id = target_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.soft_delete_user TO authenticated;
GRANT EXECUTE ON FUNCTION public.reactivate_user TO authenticated;

-- Add comments
COMMENT ON FUNCTION public.soft_delete_user IS 'Soft delete (deactivate) a user account. Can be called by user themselves or by admin.';
COMMENT ON FUNCTION public.reactivate_user IS 'Reactivate a soft-deleted user account. Admin only.';
