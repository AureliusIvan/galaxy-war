import React, { useState } from 'react';
import { Trophy, Zap, Gamepad2, Settings, Sword, Target, Users, Star, Play, ArrowRight } from 'lucide-react';

interface MenuScreenProps {
  onStart: () => void;
  onShowLeaderboard: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ onStart, onShowLeaderboard }) => {
  const [showSettings, setShowSettings] = useState(false);

  const toggleSettings = () => {
    setShowSettings(!showSettings);
  };

  return (
    <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-blue-900 to-black flex items-center justify-center overflow-hidden">
      {/* Animated Starfield */}
      <div id="stars" />
      <div id="stars2" />
      <div id="stars3" />
      
      {/* Settings Button - Top Right */}
      <button
        onClick={toggleSettings}
        className="absolute top-6 right-6 z-20 bg-gray-800 bg-opacity-50 hover:bg-opacity-70 text-gray-300 hover:text-white p-3 rounded-full transition-all duration-300 border border-gray-600 hover:border-cyan-400"
      >
        <Settings className="w-6 h-6" />
      </button>

      {/* Settings Panel */}
      {showSettings && (
        <div className="absolute top-20 right-6 z-20 bg-gray-900 bg-opacity-95 backdrop-blur-md border border-cyan-400 border-opacity-30 rounded-lg p-6 min-w-[300px]">
          <h3 className="text-cyan-400 font-bold text-lg mb-4 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Sound Effects</span>
              <button className="w-12 h-6 bg-cyan-500 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 transition-all duration-300"></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Music</span>
              <button className="w-12 h-6 bg-cyan-500 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute right-0.5 top-0.5 transition-all duration-300"></div>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-300">Fullscreen</span>
              <button className="w-12 h-6 bg-gray-600 rounded-full relative">
                <div className="w-5 h-5 bg-white rounded-full absolute left-0.5 top-0.5 transition-all duration-300"></div>
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="text-center max-w-5xl px-8 z-10 bg-black bg-opacity-20 backdrop-blur-md rounded-3xl p-10 border border-cyan-400 border-opacity-20 shadow-2xl">
        <div className="relative">
          <h1 className="text-8xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-blue-400 to-purple-400 mb-6 animate-pulse-glow">
            GALACTIC WARS
          </h1>
          
          {/* Decorative elements */}
          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
            <div className="flex items-center gap-2 text-cyan-400">
              <Star className="w-4 h-4 animate-pulse" />
              <div className="w-16 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent"></div>
              <Star className="w-4 h-4 animate-pulse" />
            </div>
          </div>
        </div>
        
        <div className="mb-8">
          <p className="text-xl text-gray-200 mb-3 leading-relaxed">
            Master the Force. Survive endless waves. Claim your place among legends.
          </p>
          <div className="flex items-center justify-center gap-3 mb-6">
            <Zap className="w-5 h-5 text-cyan-400" />
            <p className="text-lg text-cyan-400 font-semibold">
              ENDLESS SURVIVAL MODE
            </p>
            <Zap className="w-5 h-5 text-cyan-400" />
          </div>
          
          {/* Game Features */}
          <div className="flex justify-center gap-8 mb-8">
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Sword className="w-4 h-4 text-blue-400" />
              <span>3 Weapons</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Target className="w-4 h-4 text-red-400" />
              <span>Multiple Enemies</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-300">
              <Users className="w-4 h-4 text-green-400" />
              <span>Global Leaderboard</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
          {/* Controls Section */}
          <div className="bg-gray-800 bg-opacity-40 rounded-xl p-6 border border-gray-700 border-opacity-50">
            <h3 className="text-white font-bold mb-6 text-lg flex items-center gap-2">
              <Gamepad2 className="w-5 h-5 text-cyan-400" />
              Controls
            </h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">WASD</kbd>
                <span>Move</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">Mouse</kbd>
                <span>Look</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">L-Click</kbd>
                <span>Attack</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">R-Click</kbd>
                <span>Telekinesis</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">1,2,3</kbd>
                <span>Switch Weapon</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">R</kbd>
                <span>Reload</span>
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs">ESC</kbd>
                <span>Pause</span>
              </div>
            </div>
          </div>

          {/* Credits Section */}
          <div className="bg-gray-800 bg-opacity-40 rounded-xl p-6 border border-gray-700 border-opacity-50">
            <h3 className="text-white font-bold mb-6 text-lg flex items-center gap-2">
              <Star className="w-5 h-5 text-yellow-400" />
              Credits
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
                <span className="text-gray-300">Aurelius Ivan Wijaya</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                <span className="text-gray-300">Agnes Devita Wijaya</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-center gap-4 mb-8">
          <button
            onClick={onStart}
            className="group bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-400 hover:to-purple-400 text-white text-2xl font-bold px-16 py-5 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 w-full max-w-md h-20 flex items-center justify-center gap-3 animate-gradient-x"
          >
            <Play className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" />
            <span>Begin Survival</span>
            <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform duration-300" />
          </button>
          
          <button
            onClick={onShowLeaderboard}
            className="group bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white text-xl font-bold px-12 py-4 rounded-xl transform hover:scale-105 transition-all duration-300 shadow-lg shadow-yellow-500/25 hover:shadow-yellow-500/40 w-full max-w-md h-16 flex items-center justify-center gap-3 animate-gradient-x"
          >
            <Trophy className="w-6 h-6 group-hover:scale-110 transition-transform duration-300" />
            <span>Leaderboard</span>
          </button>
        </div>
        
        {/* Built with Bolt.new badge */}
        <div className="flex items-center justify-center gap-2 text-gray-400 text-sm opacity-75 hover:opacity-100 transition-opacity">
          <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
          <span>Built with <span className="text-cyan-400 font-semibold">Bolt.new</span></span>
          <div className="w-8 h-0.5 bg-gradient-to-r from-transparent via-gray-400 to-transparent"></div>
        </div>
      </div>
    </div>
  );
};