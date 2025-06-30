/*
  # Add function to get best scores per user

  1. New Function
    - `get_best_scores_per_user` - Returns the best score for each username
    - Takes a limit parameter to control how many results to return
    - Orders by score descending to get top performers

  2. Purpose
    - Ensures each username appears only once in leaderboard
    - Shows only the best achievement for each player
*/

CREATE OR REPLACE FUNCTION get_best_scores_per_user(score_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id uuid,
  username text,
  survival_time integer,
  wave_reached integer,
  score integer,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (l.username)
    l.id,
    l.username,
    l.survival_time,
    l.wave_reached,
    l.score,
    l.created_at
  FROM leaderboard l
  ORDER BY l.username, l.score DESC, l.created_at DESC
  LIMIT score_limit;
END;
$$ LANGUAGE plpgsql;