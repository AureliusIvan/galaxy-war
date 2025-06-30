import React, { useEffect, useState } from 'react';
import { Trophy, Clock, Zap, Medal, ArrowLeft } from 'lucide-react';
import { LeaderboardEntry, LeaderboardService } from '../lib/supabase';

interface LeaderboardProps {
  onBack: () => void;
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ onBack }) => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    const data = await LeaderboardService.getTopScores(10);
    setEntries(data);
    setLoading(false);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Trophy className="w-6 h-6 text-yellow-400" />;
      case 2: return <Medal className="w-6 h-6 text-gray-300" />;
      case 3: return <Medal className="w-6 h-6 text-orange-400" />;
      default: return <span className="w-6 h-6 flex items-center justify-center text-gray-400 font-bold">{rank}</span>;
    }
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-blue-900 to-black flex items-center justify-center">
      <div className="bg-gray-900 bg-opacity-90 p-8 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400">
            Elite Commanders
          </h2>
          <button
            onClick={onBack}
            className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading leaderboard...</p>
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No scores yet. Be the first to make history!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {entries.map((entry, index) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-4 rounded-lg transition-colors ${
                  index < 3 
                    ? 'bg-gradient-to-r from-yellow-900/20 to-purple-900/20 border border-yellow-400/30' 
                    : 'bg-gray-800/50 hover:bg-gray-700/50'
                }`}
              >
                <div className="flex items-center space-x-4">
                  {getRankIcon(index + 1)}
                  <div>
                    <p className="text-white font-semibold">{entry.username}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-300">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatTime(entry.survival_time)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Zap className="w-4 h-4" />
                        <span>Wave {entry.wave_reached}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-cyan-400">{entry.score.toLocaleString()}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(entry.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-gray-800/30 rounded-lg">
          <h3 className="text-white font-semibold mb-2">Scoring System</h3>
          <div className="text-sm text-gray-300 space-y-1">
            <p>• Survival Time: 10 points per second</p>
            <p>• Wave Completion: 500 points per wave</p>
            <p>• Total Score = (Time × 10) + (Wave × 500)</p>
          </div>
        </div>
      </div>
    </div>
  );
};