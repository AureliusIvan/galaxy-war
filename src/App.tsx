import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Game } from './game/Game';
import { GameUI } from './components/GameUI';
import { MenuScreen } from './components/MenuScreen';
import { Leaderboard } from './components/Leaderboard';
import { UsernameInput } from './components/UsernameInput';
import { PauseScreen } from './components/PauseScreen';
import { GameOverScreen } from './components/GameOverScreen';
import { WeaponType } from './game/Player';
import { AudioManager } from './game/AudioManager';

export type GameState = 'menu' | 'playing' | 'paused' | 'gameOver' | 'leaderboard' | 'usernameInput';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [gameState, setGameState] = useState<GameState>('menu');
  const [health, setHealth] = useState(100);
  const [enemiesLeft, setEnemiesLeft] = useState(0);
  const [enemiesInWave, setEnemiesInWave] = useState(0);
  const [currentWeapon, setCurrentWeapon] = useState<WeaponType>('lightsaber');
  const [ammo, setAmmo] = useState(12);
  const [maxAmmo, setMaxAmmo] = useState(12);
  const [survivalTime, setSurvivalTime] = useState(0);
  const [currentWave, setCurrentWave] = useState(1);
  const [waveProgress, setWaveProgress] = useState(0);
  const [username, setUsername] = useState<string>('');
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(0, 1.6, 0));

  // Create audio manager instance
  const audioManagerRef = useRef<AudioManager | null>(null);
  if (!audioManagerRef.current) {
    audioManagerRef.current = new AudioManager();
  }

  useEffect(() => {
    // Check for stored username
    const storedUsername = localStorage.getItem('galacticWarsUsername');
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    if (canvasRef.current && gameState === 'playing') {
      if (!gameRef.current) {
        gameRef.current = new Game(canvasRef.current, {
          onHealthChange: setHealth,
          onEnemiesChange: setEnemiesLeft,
          onEnemiesInWaveChange: setEnemiesInWave,
          onAmmoChange: (ammo, maxAmmo) => {
            setAmmo(ammo);
            setMaxAmmo(maxAmmo);
          },
          onWeaponChange: setCurrentWeapon,
          onWaveComplete: setCurrentWave,
          onWaveProgress: setWaveProgress,
          onSurvivalTimeChange: setSurvivalTime,
          onPlayerPositionChange: setPlayerPosition,
          onGameOver: () => setGameState('gameOver'),
        });
        
        // Initialize game with audio manager asynchronously
        (async () => {
          if (gameRef.current && audioManagerRef.current) {
            await gameRef.current.init(audioManagerRef.current);
            gameRef.current.start();
          }
        })();
      } else {
        gameRef.current.start();
      }
    }

    return () => {
      if (gameRef.current && gameState !== 'playing') {
        gameRef.current.cleanup();
        gameRef.current = null;
      }
    };
  }, [gameState]);

  const startGame = () => {
    if (!username) {
      setGameState('usernameInput');
      return;
    }
    setGameState('playing');
    setHealth(100);
    setSurvivalTime(0);
    setCurrentWave(1);
    setWaveProgress(0);
  };

  const handleUsernameSet = (newUsername: string) => {
    setUsername(newUsername);
    localStorage.setItem('galacticWarsUsername', newUsername);
    setGameState('playing');
    setHealth(100);
    setSurvivalTime(0);
    setCurrentWave(1);
    setWaveProgress(0);
  };

  const restartGame = () => {
    setHealth(100);
    setSurvivalTime(0);
    setCurrentWave(1);
    setWaveProgress(0);
    setGameState('playing');
    if (gameRef.current) {
      gameRef.current.restart();
    }
  };

  const resumeGame = () => {
    setGameState('playing');
    if (gameRef.current) {
      gameRef.current.resume();
    }
  };

  const pauseGame = () => {
    setGameState('paused');
    if (gameRef.current) {
      gameRef.current.pause();
    }
  };

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: gameState === 'playing' ? 'block' : 'none' }}
      />

      {gameState === 'menu' && (
        <MenuScreen 
          onStart={startGame} 
          onShowLeaderboard={() => setGameState('leaderboard')}
        />
      )}

      {gameState === 'leaderboard' && (
        <Leaderboard onBack={() => setGameState('menu')} />
      )}

      {gameState === 'usernameInput' && (
        <UsernameInput onUsernameSet={handleUsernameSet} />
      )}

      {gameState === 'playing' && (
        <GameUI
          health={health}
          enemiesLeft={enemiesLeft}
          enemiesInWave={enemiesInWave}
          currentWeapon={currentWeapon}
          ammo={ammo}
          maxAmmo={maxAmmo}
          survivalTime={survivalTime}
          currentWave={currentWave}
          waveProgress={waveProgress}
          playerPosition={playerPosition}
          onPause={pauseGame}
          enemies={gameRef.current?.getEnemies ? gameRef.current.getEnemies() : []}
        />
      )}

      {gameState === 'paused' && (
        <PauseScreen
          onResume={resumeGame}
          onRestart={restartGame}
          onMainMenu={() => setGameState('menu')}
        />
      )}

      {gameState === 'gameOver' && (
        <GameOverScreen
          survivalTime={survivalTime}
          waveReached={currentWave}
          username={username}
          onRestart={restartGame}
          onMainMenu={() => setGameState('menu')}
        />
      )}
    </div>
  );
}

export default App;