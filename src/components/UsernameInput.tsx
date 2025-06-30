import React, { useState } from 'react';
import { User, Check } from 'lucide-react';

interface UsernameInputProps {
  onUsernameSet: (username: string) => void;
}

export const UsernameInput: React.FC<UsernameInputProps> = ({ onUsernameSet }) => {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (username.trim().length < 2) {
      setError('Username must be at least 2 characters long');
      return;
    }

    if (username.trim().length > 20) {
      setError('Username must be less than 20 characters');
      return;
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username.trim())) {
      setError('Username can only contain letters, numbers, underscores, and hyphens');
      return;
    }

    onUsernameSet(username.trim());
  };

  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg max-w-md w-full mx-4">
        <div className="text-center mb-6">
          <User className="w-16 h-16 text-cyan-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Welcome, Warrior!</h2>
          <p className="text-gray-300">Enter your username to track your legendary battles</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
              Choose Your Battle Name
            </label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter username..."
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
              maxLength={20}
              autoFocus
            />
            {error && (
              <p className="mt-2 text-sm text-red-400">{error}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={username.trim().length < 2}
            className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 disabled:from-gray-600 disabled:to-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 mx-auto"
          >
            <Check className="w-5 h-5" />
            <span>Ready for Battle</span>
          </button>
      </form>

        <div className="mt-6 text-xs text-gray-400 text-center">
          <p>Your username will be used for the leaderboard</p>
          <p>Choose wisely - only your best score will be shown!</p>
        </div>
      </div>
    </div>
  );
};