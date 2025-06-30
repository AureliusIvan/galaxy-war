/*
  # Fix leaderboard sorting order

  1. Updates
    - Update `get_best_scores_per_user` function to sort by score first
    - Ensures highest scores appear at the top of leaderboard
    - Maintains distinct username requirement while proper sorting

  2. Changes
    - Change ORDER BY from username-first to score-first sorting
    - Keep DISTINCT ON username to show only best score per user
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

-- Create a view that properly sorts the results by score
CREATE OR REPLACE VIEW leaderboard_top_scores AS
SELECT * FROM get_best_scores_per_user(50)
ORDER BY score DESC, created_at DESC;