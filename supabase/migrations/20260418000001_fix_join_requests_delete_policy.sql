-- Fix: Allow users to delete their own pending join requests (cancel feature).
-- The original migration only allowed admins to delete, blocking the user cancel UX.
-- Both policies coexist: users can delete their own pending requests; admins can delete any.

CREATE POLICY "Users can delete their own pending join requests"
    ON public.tournament_join_requests FOR DELETE
    USING (auth.uid() = user_id AND status = 'pending');
