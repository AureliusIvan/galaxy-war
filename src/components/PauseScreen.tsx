import React from 'react';
import { Play, Home, RotateCcw } from 'lucide-react';

interface PauseScreenProps {
  onResume: () => void;
  onRestart: () => void;
  onMainMenu: () => void;
}

export const PauseScreen: React.FC<PauseScreenProps> = ({
  onResume,
  onRestart,
  onMainMenu
}) => {
  return (
    <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
      <div className="bg-gray-900 p-8 rounded-lg text-center max-w-md w-full mx-4">
        <h2 className="text-3xl font-bold text-cyan-400 mb-2">Game Paused</h2>
        <p className="text-gray-300 mb-8">Take a breather, commander. The galaxy can wait.</p>
        
        <div className="flex flex-col items-center space-y-4">
          <button
            onClick={onResume}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Play className="w-5 h-5" />
            <span>Resume Battle</span>
          </button>
          
          <button
            onClick={onRestart}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <RotateCcw className="w-5 h-5" />
            <span>Restart Mission</span>
          </button>
          
          <button
            onClick={onMainMenu}
            className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2"
          >
            <Home className="w-5 h-5" />
            <span>Main Menu</span>
          </button>
        </div>
        
        <div className="mt-6 text-xs text-gray-400">
          <p>Press ESC to resume or use the buttons above</p>
        </div>
      </div>
    </div>
  );
};