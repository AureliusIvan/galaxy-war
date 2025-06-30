import React, { useState, useEffect } from 'react';
import { Trophy, Clock, Zap, Target, Award } from 'lucide-react';
import { LeaderboardService } from '../lib/supabase';

interface GameOverScreenProps {
  survivalTime: number;
  waveReached: number;
  username: string;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  survivalTime,
  waveReached,
  username,
  onRestart,
  onMainMenu
}) => {
  const [scoreSubmitted, setScoreSubmitted] = useState(false);
  const [personalBest, setPersonalBest] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState(true);

  const currentScore = Math.floor(survivalTime * 10 + waveReached * 500);

  useEffect(() => {
    submitScore();
  }, []);

  const submitScore = async () => {
    setSubmitting(true);
    
    // Get personal best first
    const best = await LeaderboardService.getUserPersonalBest(username);
    const isPersonalBest = !best || currentScore > best.score;
    setPersonalBest(isPersonalBest);

    // Submit the score
    const success = await LeaderboardService.submitScore(username, survivalTime, waveReached);
    setScoreSubmitted(success);
    setSubmitting(false);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-90 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg text-center max-w-md w-full mx-4">
        <div className="mb-6">
          {personalBest ? (
            <Award className="w-20 h-20 text-yellow-400 mx-auto mb-4 animate-pulse" />
          ) : (
            <Trophy className="w-20 h-20 text-red-400 mx-auto mb-4" />
          )}
          
          <h2 className="text-3xl font-bold text-red-400 mb-2">
            {personalBest ? 'New Personal Best!' : 'Mission Failed'}
          </h2>
          <p className="text-white mb-2">Commander <span className="text-cyan-400 font-semibold">{username}</span></p>
          <p className="text-gray-300">
            {personalBest 
              ? 'You\'ve achieved a new personal record!' 
              : 'The galaxy needs stronger defenders.'
            }
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-6 space-y-4">
          <h3 className="text-xl font-semibold text-white mb-4">Battle Statistics</h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Clock className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300 text-sm">Survival Time</span>
              </div>
              <p className="text-xl font-bold text-blue-400">{formatTime(survivalTime)}</p>
            </div>

            <div className="bg-gray-700 rounded-lg p-3">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Zap className="w-5 h-5 text-orange-400" />
                <span className="text-gray-300 text-sm">Wave Reached</span>
              </div>
              <p className="text-xl font-bold text-orange-400">{waveReached}</p>
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4 mt-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <Target className="w-6 h-6 text-cyan-400" />
              <span className="text-gray-300">Total Score</span>
            </div>
            <p className="text-3xl font-bold text-cyan-400">{currentScore.toLocaleString()}</p>
          </div>
        </div>

        {submitting ? (
          <div className="mb-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
            <p className="text-gray-400">Uploading to galactic database...</p>
          </div>
        ) : (
          <div className="mb-6">
            {scoreSubmitted ? (
              <p className="text-green-400 flex items-center justify-center space-x-2">
                <Trophy className="w-5 h-5" />
                <span>Score saved to leaderboard!</span>
              </p>
            ) : (
              <p className="text-red-400">Failed to save score. Try again later.</p>
            )}
          </div>
        )}

        <div className="flex flex-col items-center space-y-3">
          <button
            onClick={onRestart}
            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            Fight Again
          </button>
          <button
            onClick={onMainMenu}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
          >
            Main Menu
          </button>
        </div>
      </div>
    </div>
  );
};