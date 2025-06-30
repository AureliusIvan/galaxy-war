import React from 'react';
import { Trophy } from 'lucide-react';

interface MenuScreenProps {
  onStart: () => void;
  onShowLeaderboard: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ onStart, onShowLeaderboard }) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-purple-900 via-blue-900 to-black flex items-center justify-center overflow-hidden">
      {/* Neon blue starfield background */}
      <div className="absolute top-10 left-10 w-1 h-1 bg-cyan-400 rounded-full opacity-60 blur-sm"></div>
      <div className="absolute top-20 right-20 w-2 h-2 bg-blue-400 rounded-full opacity-40 blur-sm"></div>
      <div className="absolute bottom-32 left-32 w-1 h-1 bg-cyan-300 rounded-full opacity-80"></div>
      <div className="absolute bottom-20 right-32 w-1 h-1 bg-blue-300 rounded-full opacity-70"></div>
      <div className="absolute top-1/2 left-1/4 w-2 h-2 bg-cyan-400 rounded-full opacity-50 blur-sm"></div>
      <div className="absolute top-1/3 right-1/3 w-1 h-1 bg-blue-400 rounded-full opacity-90"></div>
      <div className="absolute bottom-1/3 left-1/2 w-1 h-1 bg-cyan-200 rounded-full opacity-60"></div>
      <div className="absolute top-16 left-1/3 w-1 h-1 bg-blue-200 rounded-full opacity-70"></div>
      <div className="absolute top-40 right-1/4 w-2 h-2 bg-cyan-400 rounded-full opacity-30 blur-sm"></div>
      <div className="absolute bottom-40 left-20 w-1 h-1 bg-blue-300 rounded-full opacity-80"></div>
      <div className="absolute top-1/4 right-10 w-1 h-1 bg-cyan-300 rounded-full opacity-50"></div>
      <div className="absolute bottom-1/4 right-1/2 w-2 h-2 bg-blue-400 rounded-full opacity-60 blur-sm"></div>
      <div className="absolute top-2/3 left-16 w-1 h-1 bg-cyan-400 rounded-full opacity-75"></div>
      <div className="absolute bottom-16 right-16 w-1 h-1 bg-blue-200 rounded-full opacity-85"></div>
      <div className="absolute top-80 left-1/2 w-1 h-1 bg-cyan-300 rounded-full opacity-40"></div>
      <div className="absolute top-12 right-1/2 w-2 h-2 bg-blue-400 rounded-full opacity-35 blur-sm"></div>
      <div className="absolute bottom-12 left-1/3 w-1 h-1 bg-cyan-200 rounded-full opacity-90"></div>
      <div className="absolute top-60 right-20 w-1 h-1 bg-blue-300 rounded-full opacity-55"></div>
      <div className="absolute bottom-60 left-10 w-2 h-2 bg-cyan-400 rounded-full opacity-45 blur-sm"></div>
      <div className="absolute top-32 left-2/3 w-1 h-1 bg-blue-200 rounded-full opacity-80"></div>
      
      <div className="text-center max-w-2xl px-8">
        <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-400 mb-4 drop-shadow-2xl">
          GALACTIC WARS
        </h1>
        <p className="text-xl text-gray-300 mb-2">
          Master the Force. Survive endless waves. Claim your place among legends.
        </p>
        <p className="text-lg text-cyan-400 mb-12 font-semibold">
          ⚡ ENDLESS SURVIVAL MODE ⚡
        </p>

        <div className="mb-12">
          <h3 className="text-white font-semibold mb-4">Controls</h3>
          <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300">
            <span>WASD - Move</span>
            <span>Mouse - Look</span>
            <span>Left Click - Attack</span>
            <span>Right Click - Telekinesis</span>
            <span>Mouse Wheel - Switch Weapon</span>
            <span>R - Reload</span>
            <span>ESC - Pause</span>
          </div>
        </div>
        
        <div className="mb-12">
          <h3 className="text-white font-semibold mb-2">Credit</h3>
          <div className="flex justify-center flex-wrap gap-x-6 gap-y-2 text-sm text-gray-300">
            <span>Ivan</span>
            <span>Agnes Devita Wijaya</span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={onStart}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white text-xl font-bold px-12 py-4 rounded-lg transform hover:scale-105 transition-all duration-200 shadow-lg w-full max-w-xs h-16"
          >
            Begin Survival
          </button>
          
          <button
            onClick={onShowLeaderboard}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white text-xl font-bold px-12 py-4 rounded-lg transform hover:scale-105 transition-all duration-200 shadow-lg w-full max-w-xs h-16 flex items-center justify-center space-x-2"
          >
            <Trophy className="w-5 h-5" />
            <span>Leaderboard</span>
          </button>
        </div>
        
        {/* Built with Bolt.new badge */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
          <p className="text-gray-400 text-sm opacity-75 hover:opacity-100 transition-opacity">
            Built with <span className="text-cyan-400 font-semibold">Bolt.new</span>
          </p>
        </div>
      </div>
    </div>
  );
};