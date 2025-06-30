import React, { useEffect, useRef } from 'react';
import { Enemy } from '../game/Enemy';
import * as THREE from 'three';

interface MiniMapProps {
  playerPosition: THREE.Vector3;
  enemies: Enemy[];
  currentWave: number;
  className?: string;
}

export const MiniMap: React.FC<MiniMapProps> = ({ 
  playerPosition, 
  enemies, 
  currentWave,
  className = "" 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const size = 160; // Fixed size for mini-map
    canvas.width = size;
    canvas.height = size;

    // Clear canvas
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size, size);

    // Calculate scale for 50x50 arena
    const arenaSize = 50;
    const scale = size / arenaSize;

    // Draw arena floor
    ctx.fillStyle = '#334455';
    ctx.fillRect(0, 0, size, size);

    // Draw arena boundary walls
    ctx.strokeStyle = '#556677';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
    
    // Draw inner grid for reference
    ctx.strokeStyle = '#445566';
    ctx.lineWidth = 1;
    const gridSize = 10;
    for (let i = 1; i < gridSize; i++) {
      const pos = (i / gridSize) * size;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, size);
      ctx.moveTo(0, pos);
      ctx.lineTo(size, pos);
      ctx.stroke();
    }

    // Draw enemies
    enemies.forEach(enemy => {
      if (!enemy.isAlive()) return;
      
      const pos = enemy.getPosition();
      // Convert world coordinates to minimap coordinates
      const drawX = ((pos.x + arenaSize/2) / arenaSize) * size;
      const drawZ = ((pos.z + arenaSize/2) / arenaSize) * size;
      
      // Different colors for different enemy types
      const type = enemy.getType();
      let color = '#ff4444';
      switch (type) {
        case 'scout': color = '#44aa44'; break;
        case 'heavy': color = '#aa4444'; break;
        case 'ranged': color = '#4444aa'; break;
        case 'exploder': color = '#aa4400'; break;
        case 'shielded': color = '#6666aa'; break;
        case 'drone': color = '#aaaaaa'; break;
        default: color = '#ff4444';
      }
      
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(drawX, drawZ, 2, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw player
    const playerDrawX = ((playerPosition.x + arenaSize/2) / arenaSize) * size;
    const playerDrawZ = ((playerPosition.z + arenaSize/2) / arenaSize) * size;
    
    // Player dot with glow effect
    ctx.shadowColor = '#00ffff';
    ctx.shadowBlur = 8;
    ctx.fillStyle = '#00ffff';
    ctx.beginPath();
    ctx.arc(playerDrawX, playerDrawZ, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Reset shadow
    ctx.shadowBlur = 0;
    
    // Player direction indicator
    const directionLength = 8;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playerDrawX, playerDrawZ);
    // Point in direction of movement (simplified)
    ctx.lineTo(playerDrawX + directionLength * 0.7, playerDrawZ - directionLength * 0.7);
    ctx.stroke();

  }, [playerPosition, enemies, currentWave]);

  return (
    <div className={`relative ${className}`}>
      <canvas 
        ref={canvasRef}
        className="w-40 h-40 rounded border border-gray-600"
      />
      <div className="absolute top-1 right-1 bg-black bg-opacity-50 px-1 py-0.5 rounded text-xs text-white">
        Wave {currentWave}
      </div>
      <div className="absolute bottom-1 left-1 bg-black bg-opacity-50 px-1 py-0.5 rounded text-xs text-cyan-400">
        MAP
      </div>
    </div>
  );
};