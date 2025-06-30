import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if Supabase is available
export const isSupabaseAvailable = !!(supabaseUrl && supabaseAnonKey);

// Create client only if environment variables are available
export const supabase = isSupabaseAvailable 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export interface LeaderboardEntry {
  id: string;
  username: string;
  survival_time: number;
  wave_reached: number;
  score: number;
  created_at: string;
}

export class LeaderboardService {
  static async getTopScores(limit: number = 10): Promise<LeaderboardEntry[]> {
    if (!isSupabaseAvailable || !supabase) {
      console.warn('Supabase not available - returning empty leaderboard');
      return [];
    }

    // Get the best score for each username
    const { data, error } = await supabase
      .rpc('get_best_scores_per_user', { score_limit: limit });

    if (error) {
      console.error('Error fetching leaderboard:', error);
      return [];
    }

    return data || [];
  }

  static async submitScore(username: string, survivalTime: number, waveReached: number): Promise<boolean> {
    if (!isSupabaseAvailable || !supabase) {
      console.warn('Supabase not available - score not submitted');
      return false;
    }

    // Calculate score based on survival time and wave reached
    const score = Math.floor(survivalTime * 10 + waveReached * 500);

    const { error } = await supabase
      .from('leaderboard')
      .insert({
        username,
        survival_time: survivalTime,
        wave_reached: waveReached,
        score
      });

    if (error) {
      console.error('Error submitting score:', error);
      return false;
    }

    return true;
  }

  static async getUserPersonalBest(username: string): Promise<LeaderboardEntry | null> {
    if (!isSupabaseAvailable || !supabase) {
      console.warn('Supabase not available - returning null for personal best');
      return null;
    }

    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .eq('username', username)
      .order('score', { ascending: false })
      .limit(1);

    if (error) {
      console.error('Error fetching personal best:', error);
      return null;
    }

    return data?.[0] || null;
  }
}