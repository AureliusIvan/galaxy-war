/*
  # Create leaderboard table

  1. New Tables
    - `leaderboard`
      - `id` (uuid, primary key)
      - `username` (text, not null)
      - `survival_time` (integer, survival time in seconds)
      - `wave_reached` (integer, highest wave reached)
      - `score` (integer, calculated score based on time and wave)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on `leaderboard` table
    - Add policy for anyone to read leaderboard data
    - Add policy for anyone to insert their score
*/

CREATE TABLE IF NOT EXISTS leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text NOT NULL,
  survival_time integer NOT NULL DEFAULT 0,
  wave_reached integer NOT NULL DEFAULT 1,
  score integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read leaderboard data
CREATE POLICY "Anyone can read leaderboard"
  ON leaderboard
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- Allow anyone to insert their score
CREATE POLICY "Anyone can insert leaderboard entry"
  ON leaderboard
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Create index for better performance on leaderboard queries
CREATE INDEX IF NOT EXISTS leaderboard_score_idx ON leaderboard(score DESC);
CREATE INDEX IF NOT EXISTS leaderboard_created_at_idx ON leaderboard(created_at DESC);