import React from 'react';
import { Heart, Users, Pause, Sword, Zap } from 'lucide-react';
import { WeaponType } from '../game/Player';
import { MiniMap } from './MiniMap';
import * as THREE from 'three';
import { AICoordinator } from '../game/AIBehavior';

interface GameUIProps {
  health: number;
  enemiesLeft: number;
  currentWeapon: WeaponType;
  ammo: number;
  maxAmmo: number;
  survivalTime: number;
  currentWave: number;
  waveProgress: number;
  enemiesInWave: number;
  playerPosition: THREE.Vector3;
  onPause: () => void;
  enemies?: any[]; // For showing enemy stats
}

const EnemyThreatIndicator: React.FC<{ threatLevel: number }> = ({ threatLevel }) => {
  const getThreatColor = (level: number) => {
    if (level < 25) return 'text-green-400';
    if (level < 50) return 'text-yellow-400';
    if (level < 75) return 'text-orange-400';
    return 'text-red-400';
  };

  const getThreatText = (level: number) => {
    if (level < 25) return 'LOW';
    if (level < 50) return 'MEDIUM';
    if (level < 75) return 'HIGH';
    return 'CRITICAL';
  };

  return (
    <div className="bg-black bg-opacity-50 p-2 rounded-lg">
      <div className="text-xs text-gray-300 mb-1">THREAT LEVEL</div>
      <div className={`text-sm font-bold ${getThreatColor(threatLevel)}`}>
        {getThreatText(threatLevel)}
      </div>
      <div className="w-16 bg-gray-700 rounded-full h-1 mt-1">
        <div 
          className={`h-1 rounded-full transition-all duration-300 ${
            threatLevel < 25 ? 'bg-green-400' :
            threatLevel < 50 ? 'bg-yellow-400' :
            threatLevel < 75 ? 'bg-orange-400' : 'bg-red-400'
          }`}
          style={{ width: `${threatLevel}%` }}
        />
      </div>
    </div>
  );
};
export const GameUI: React.FC<GameUIProps> = ({ 
  health, 
  enemiesLeft, 
  currentWeapon, 
  ammo, 
  maxAmmo, 
  survivalTime,
  currentWave,
  waveProgress,
  enemiesInWave,
  playerPosition,
  onPause,
  enemies = []
}) => {
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };
  
  // Get threat level safely
  const getThreatLevel = () => {
    try {
      return AICoordinator.getInstance().getPlayerThreatLevel();
    } catch (error) {
      console.warn('Error getting threat level:', error);
      return 0;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Health Bar - Top Left */}
      <div className="absolute top-4 left-4 pointer-events-auto">
        <div className="bg-black bg-opacity-50 p-4 rounded-lg space-y-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-400" />
              <div className="w-32 h-3 bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-red-500 to-red-400 transition-all duration-300"
                  style={{ width: `${Math.max(0, health)}%` }}
                />
              </div>
              <span className="text-white text-sm font-semibold">{Math.max(0, Math.round(health))}</span>
            </div>
          </div>
          
          {/* Weapon and Ammo Display */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              {currentWeapon === 'lightsaber' ? (
                <Sword className="w-5 h-5 text-cyan-400" />
              ) : (
                <Zap className="w-5 h-5 text-red-400" />
              )}
              <span className="text-white text-sm font-semibold capitalize">{currentWeapon}</span>
            </div>
            
            {currentWeapon === 'blaster' && (
              <div className="flex items-center space-x-2">
                <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-yellow-500 to-orange-400 transition-all duration-300"
                    style={{ width: `${(ammo / maxAmmo) * 100}%` }}
                  />
                </div>
                <span className="text-yellow-400 text-sm font-semibold">{ammo}/{maxAmmo}</span>
              </div>
            )}
          </div>
        </div>
      </div>
        
      {/* Wave Information - Top Center */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 pointer-events-auto">
        <div className="bg-black bg-opacity-50 p-4 rounded-lg text-center min-w-[160px]">
          <div className="text-cyan-400 text-lg font-bold">WAVE {currentWave}</div>
          <div className="flex items-center space-x-2 mt-1">
            <Users className="w-4 h-4 text-orange-400" />
            <span className="text-white text-sm">{enemiesLeft}/{enemiesInWave} enemies</span>
          </div>
          
          {/* Enemy type breakdown */}
          {enemies.length > 0 && (
            <div className="text-xs text-gray-300 mt-2">
              <div className="grid grid-cols-2 gap-1">
                {Object.entries(getEnemyTypeCount(enemies)).map(([type, count]) => (
                  <div key={type} className="flex items-center justify-between">
                    <span className="text-gray-400">{getEnemyIcon(type)}</span>
                    <span className="text-orange-300">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Wave Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
            <div 
              className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${waveProgress * 100}%` }}
            />
          </div>
        </div>
      </div>
        
      {/* Mini Map - Top Right */}
      <div className="absolute top-4 right-4 pointer-events-auto">
        <div className="bg-black bg-opacity-50 p-2 rounded-lg">
          <MiniMap 
            playerPosition={playerPosition}
            enemies={enemies}
            currentWave={currentWave}
          />
        </div>
      </div>
      
      {/* Survival Timer - Top Right (below minimap) */}
      <div className="absolute top-[200px] right-4 pointer-events-auto">
        <div className="bg-black bg-opacity-50 p-4 rounded-lg text-center">
          <div className="text-green-400 text-sm font-semibold">SURVIVAL TIME</div>
          <div className="text-white text-lg font-bold">{formatTime(survivalTime)}</div>
        </div>
      </div>
        
      {/* AI Threat Level - Top Right (below survival timer) */}
      <div className="absolute top-[280px] right-4 pointer-events-auto">
        <EnemyThreatIndicator threatLevel={getThreatLevel()} />
      </div>
        
      {/* Pause Button - Top Right (below threat level) */}
      <div className="absolute top-[340px] right-4 pointer-events-auto">
        <button
          onClick={onPause}
          className="bg-black bg-opacity-50 p-3 rounded-lg hover:bg-opacity-70 transition-colors"
        >
          <Pause className="w-5 h-5 text-white" />
        </button>
      </div>

      {/* Crosshair */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
        <div className="w-6 h-6 relative">
          <div className="absolute top-1/2 left-1/2 w-2 h-0.5 bg-cyan-400 transform -translate-x-1/2 -translate-y-1/2"></div>
          <div className="absolute top-1/2 left-1/2 w-0.5 h-2 bg-cyan-400 transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
      </div>

      {/* Bottom instructions */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2">
        <div className="bg-black bg-opacity-50 px-4 py-2 rounded-lg">
          <div className="flex space-x-6 text-xs text-gray-300">
            <span><span className="text-cyan-400">Left Click</span> - Attack (Hold for Auto)</span>
            <span><span className="text-purple-400">Right Click</span> - Telekinesis</span>
            <span><span className="text-yellow-400">Wheel</span> - Switch Weapon</span>
            <span><span className="text-green-400">R</span> - Reload</span>
            <span><span className="text-blue-400">Space</span> - Jump</span>
          </div>
          <div className="flex justify-center space-x-6 text-xs text-gray-400 mt-1">
            <span>💀 Normal • 🏃 Scout • 🛡️ Heavy • 🔫 Ranged • 💥 Exploder • 🛡️ Shielded • 🚁 Drone • 📦 Boxes</span>
          </div>
        </div>
      </div>
    </div>
  );
};
function getEnemyTypeCount(enemies: any[]): Record<string, number> {
  const counts: Record<string, number> = {};
  
  enemies.forEach(enemy => {
    if (enemy.isAlive && enemy.isAlive()) {
      const type = enemy.getType ? enemy.getType() : 'normal';
      counts[type] = (counts[type] || 0) + 1;
    }
  });
  
  return counts;
}

function getEnemyIcon(type: string): string {
  switch (type) {
    case 'normal': return '💀';
    case 'scout': return '🏃';
    case 'heavy': return '🛡️';
    case 'ranged': return '🔫';
    case 'exploder': return '💥';
    case 'shielded': return '🛡️';
    case 'drone': return '🚁';
    default: return '👾';
  }
}