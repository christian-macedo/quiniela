CREATE TABLE IF NOT EXISTS public.tournament_join_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    UNIQUE (tournament_id, user_id, status)
);

CREATE INDEX IF NOT EXISTS idx_tournament_join_requests_tournament_id ON public.tournament_join_requests(tournament_id);
CREATE INDEX IF NOT EXISTS idx_tournament_join_requests_user_id ON public.tournament_join_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tournament_join_requests_status ON public.tournament_join_requests(status) WHERE status = 'pending';

ALTER TABLE public.tournament_join_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own join requests"
    ON public.tournament_join_requests FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create join requests"
    ON public.tournament_join_requests FOR INSERT
    WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can update join requests"
    ON public.tournament_join_requests FOR UPDATE
    USING (public.is_admin(auth.uid()));

CREATE POLICY "Admins can delete join requests"
    ON public.tournament_join_requests FOR DELETE
    USING (public.is_admin(auth.uid()));

CREATE TRIGGER update_tournament_join_requests_updated_at
    BEFORE UPDATE ON public.tournament_join_requests
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

GRANT SELECT ON public.tournament_join_requests TO anon, authenticated;
GRANT INSERT ON public.tournament_join_requests TO authenticated;
GRANT UPDATE, DELETE ON public.tournament_join_requests TO authenticated;
