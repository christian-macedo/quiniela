-- Fix: Replace the UNIQUE(tournament_id, user_id, status) constraint with a
-- partial unique index on pending rows only.
--
-- The original three-column UNIQUE allowed a user to hold approved + rejected +
-- pending rows simultaneously for the same tournament (one per status value),
-- which could create contradictory state. It also permanently blocked a second
-- rejection once a (tournament_id, user_id, 'rejected') row existed.
--
-- The partial index enforces "at most one pending request per user per tournament"
-- while allowing arbitrarily many historical (approved/rejected) rows.
ALTER TABLE public.tournament_join_requests DROP CONSTRAINT tournament_join_requests_tournament_id_user_id_status_key;

CREATE UNIQUE INDEX idx_tournament_join_requests_one_pending_per_user
    ON public.tournament_join_requests (tournament_id, user_id)
    WHERE status = 'pending';
