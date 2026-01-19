-- Reset prediction scores to 0 for all matches that are not completed
UPDATE predictions
SET points_earned = 0
WHERE match_id IN (
  SELECT id
  FROM matches
  WHERE status != 'completed'
);
