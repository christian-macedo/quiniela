-- Fix: Restrict SELECT grant to authenticated role only (remove anon).
-- RLS blocks rows for unauthenticated callers anyway, but defense in depth
-- says unauthenticated users should not have the grant at all.
REVOKE SELECT ON public.tournament_join_requests FROM anon;

-- Fix: Add WITH CHECK to admin UPDATE policy so admins cannot change user_id
-- or tournament_id to arbitrary values.
DROP POLICY "Admins can update join requests" ON public.tournament_join_requests;

CREATE POLICY "Admins can update join requests"
    ON public.tournament_join_requests FOR UPDATE
    USING (public.is_admin(auth.uid()))
    WITH CHECK (public.is_admin(auth.uid()));
