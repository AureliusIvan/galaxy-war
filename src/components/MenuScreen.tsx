import React from 'react';
import { Trophy, Zap, Gamepad2 } from 'lucide-react';

interface MenuScreenProps {
  onStart: () => void;
  onShowLeaderboard: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ onStart, onShowLeaderboard }) => {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-blue-900 to-black flex items-center justify-center overflow-hidden">
      {/* Animated Starfield */}
      <div id="stars" />
      <div id="stars2" />
      <div id="stars3" />
      
      <div className="text-center max-w-3xl px-8 z-10 bg-black bg-opacity-20 backdrop-blur-md rounded-2xl p-8 border border-cyan-400 border-opacity-20 shadow-2xl">
        <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 mb-4 animate-pulse-glow">
          GALACTIC WARS
        </h1>
        <p className="text-xl text-gray-200 mb-2">
          Master the Force. Survive endless waves. Claim your place among legends.
        </p>
        <p className="text-lg text-cyan-400 mb-12 font-semibold">
          ⚡ ENDLESS SURVIVAL MODE ⚡
        </p>

        <div className="flex justify-center gap-12 mb-12">
            <div className="text-left">
                <h3 className="text-white font-semibold mb-4 text-lg flex items-center gap-2"><Gamepad2/>Controls</h3>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-300">
                    <span>WASD - Move</span>
                    <span>Mouse - Look</span>
                    <span>L-Click - Attack</span>
                    <span>R-Click - Telekinesis</span>
                    <span>1,2,3 - Switch Weapon</span>
                    <span>R - Reload</span>
                    <span>ESC - Pause</span>
                </div>
            </div>
            <div className="text-left">
                <h3 className="text-white font-semibold mb-4 text-lg">Credit</h3>
                <div className="flex flex-col gap-y-2 text-sm text-gray-300">
                    <span>Ivan</span>
                    <span>Agnes Devita Wijaya</span>
                </div>
            </div>
        </div>
        
        <div className="space-y-4 flex flex-col items-center my-12">
          <button
            onClick={onStart}
            className="bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white text-2xl font-bold px-12 py-4 rounded-lg transform hover:scale-105 transition-all duration-300 shadow-lg w-full max-w-md h-16 animate-gradient-x"
          >
            Begin Survival
          </button>
          
          <button
            onClick={onShowLeaderboard}
            className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white text-2xl font-bold px-12 py-4 rounded-lg transform hover:scale-105 transition-all duration-300 shadow-lg w-full max-w-md h-16 flex items-center justify-center space-x-2 animate-gradient-x"
          >
            <Trophy className="w-6 h-6" />
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