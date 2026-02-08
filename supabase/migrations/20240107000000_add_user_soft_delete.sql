-- Add soft delete tracking fields to users table
-- This enables user deactivation while preserving data integrity

ALTER TABLE public.users
ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN deletion_reason TEXT DEFAULT NULL,
ADD COLUMN deleted_by UUID REFERENCES public.users(id) DEFAULT NULL;

-- Index for filtering active users (performance optimization)
-- Partial index only includes rows where deleted_at IS NULL
CREATE INDEX idx_users_deleted_at ON public.users(deleted_at)
WHERE deleted_at IS NULL;

-- Comments for clarity
COMMENT ON COLUMN public.users.deleted_at IS 'When set, user is deactivated. NULL = active.';
COMMENT ON COLUMN public.users.deletion_reason IS 'Reason for deletion: self_requested, admin_action, policy_violation, etc.';
COMMENT ON COLUMN public.users.deleted_by IS 'User ID of admin who performed deletion (NULL for self-deletion).';
