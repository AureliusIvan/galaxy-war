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
import { supabase } from './lib/supabase';
import StatusAlert from './components/StatusAlert';

export type GameState = 'menu' | 'playing' | 'paused' | 'gameOver' | 'leaderboard' | 'usernameInput';

// Define a type for our status messages to ensure consistency
type StatusMessage = {
  message: string;
  duration: number;
  key: number; // Key to force re-rendering for consecutive messages
};

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
  const [score, setScore] = useState(0);
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

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
          onGameOver: handleGameOver,
          onStatusMessage: showStatusMessage,
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

  const startGame = async (name: string) => {
    setUsername(name);
    localStorage.setItem('galacticWarsUsername', name);
    setGameState('playing');
    setHealth(100);
    setSurvivalTime(0);
    setCurrentWave(1);
    setWaveProgress(0);

    if (canvasRef.current) {
      const gameInstance = new Game(canvasRef.current, {
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
        onGameOver: handleGameOver,
        onStatusMessage: showStatusMessage,
      });

      const audioManager = new AudioManager();
      await gameInstance.init(audioManager);
      
      setGameRef(gameInstance);
      gameInstance.start();
    }
  };

  const handleGameOver = () => {
    setGameState('gameOver');
  };

  const pauseGame = () => {
    setGameState('paused');
    if (gameRef.current) {
      gameRef.current.pause();
    }
  };

  const resumeGame = () => {
    setGameState('playing');
    if (gameRef.current) {
      gameRef.current.resume();
    }
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

  const showStatusMessage = (message: string, duration: number = 2000) => {
    setStatusMessage({ message, duration, key: Date.now() });
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
        <UsernameInput onUsernameSet={startGame} />
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

      {statusMessage && (
        <StatusAlert 
          key={statusMessage.key} 
          message={statusMessage.message} 
          duration={statusMessage.duration}
          onComplete={() => setStatusMessage(null)}
        />
      )}
    </div>
  );
}

export default App;