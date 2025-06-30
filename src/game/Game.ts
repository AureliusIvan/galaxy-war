import * as THREE from 'three';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Level } from './Level';
import { PowerUp } from './PowerUp';
import { ParticleSystem } from './ParticleSystem';
import { WeaponType } from './Player';
import { EnemyType } from './Enemy';
import { ThrowableBox } from './ThrowableBox';
import { AudioManager } from './AudioManager';
import { AICoordinator, PathFinder } from './AIBehavior';

interface GameCallbacks {
  onHealthChange: (health: number) => void;
  onEnemiesChange: (count: number) => void;
  onEnemiesInWaveChange: (count: number) => void;
  onAmmoChange: (ammo: number, maxAmmo: number) => void;
  onWeaponChange: (weapon: WeaponType) => void;
  onWaveComplete: (wave: number) => void;
  onWaveProgress: (progress: number) => void;
  onSurvivalTimeChange: (time: number) => void;
  onPlayerPositionChange: (position: THREE.Vector3) => void;
  onGameOver: () => void;
}

export class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private player: Player;
  private enemies: Enemy[] = [];
  private powerUps: PowerUp[] = [];
  private throwableBoxes: ThrowableBox[] = [];
  private level: Level;
  private particleSystem: ParticleSystem;
  private audioManager: AudioManager | null = null;
  private animationId: number | null = null;
  private callbacks: GameCallbacks;
  private currentWave = 1;
  private enemiesInCurrentWave = 0;
  private initialEnemiesInWave = 0;
  private survivalTime = 0;
  private gameStartTime = 0;
  private waveStartTime = 0;
  private betweenWaves = false;
  private waveTransitionTimer = 0;
  private isPointerLocked = false;
  private gameRunning = false;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.callbacks = callbacks;
    
    // Initialize Three.js
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x000011, 10, 100);
    
    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    
    // Add camera to scene so lightsaber (child of camera) is visible
    this.scene.add(this.camera);
    
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x000011);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Initialize game objects
    this.level = new Level(this.scene);
    this.player = new Player(this.camera, canvas, this.scene);
    
    this.particleSystem = new ParticleSystem(this.scene);

    this.setupLighting();
    this.setupEventListeners();
  }

  public async init(audioManager: AudioManager) {
    this.audioManager = audioManager;
    await this.audioManager.init();
    
    // Set up player callbacks
    this.player.setCallbacks({
      onAmmoChange: this.callbacks.onAmmoChange,
      onWeaponChange: this.callbacks.onWeaponChange
    });
    
    // Give player access to audio manager
    this.player.setAudioManager(this.audioManager);
    
    // Give player access to particle system
    this.player.setParticleSystem(this.particleSystem);
  }

  private setupLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(directionalLight);

    // Point lights for atmosphere
    const pointLight1 = new THREE.PointLight(0x00ffff, 0.5, 30);
    pointLight1.position.set(-10, 5, -10);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xff00ff, 0.5, 30);
    pointLight2.position.set(10, 5, 10);
    this.scene.add(pointLight2);
  }

  private setupEventListeners() {
    window.addEventListener('resize', this.onWindowResize.bind(this));
    
    // Pointer lock for FPS controls
    this.renderer.domElement.addEventListener('click', () => {
      if (!this.isPointerLocked) {
        this.renderer.domElement.requestPointerLock();
      }
    });

    document.addEventListener('pointerlockchange', () => {
      this.isPointerLocked = document.pointerLockElement === this.renderer.domElement;
      this.player.setPointerLocked(this.isPointerLocked);
    });

    // Game controls
    document.addEventListener('keydown', (event) => {
      if (event.code === 'Escape') {
        // Handle pause
        document.exitPointerLock();
        if (this.gameRunning) {
          this.pause();
          // Note: The actual pause state change is handled by the parent component
        }
      }
    });
  }

  private cleanupInvalidEnemies() {
    const playerPosition = this.player.getPosition();
    
    // Remove enemies that are too far from player or stuck outside bounds
    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const enemy = this.enemies[i];
      const enemyPos = enemy.getPosition();
      
      // Check if enemy is too far outside the arena or stuck
      const distanceFromCenter = Math.sqrt(enemyPos.x * enemyPos.x + enemyPos.z * enemyPos.z);
      const isOutOfBounds = distanceFromCenter > 30; // Arena is 50x50, so 30 is a reasonable limit
      const isTooFarFromPlayer = enemyPos.distanceTo(playerPosition) > 100; // Remove if extremely far
      const isStuckUnderground = enemyPos.y < -5; // Remove if fallen through floor
      
      if (isOutOfBounds || isTooFarFromPlayer || isStuckUnderground) {
        console.log(`Removing invalid enemy at position: ${enemyPos.x}, ${enemyPos.y}, ${enemyPos.z}`);
        enemy.cleanup(this.scene);
        this.enemies.splice(i, 1);
        this.callbacks.onEnemiesChange(this.enemies.length);
        this.updateWaveProgress();
      }
    }
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private async startFirstWave() {
    this.currentWave = 1;
    await this.spawnWave(1);
    this.gameStartTime = Date.now();
    this.waveStartTime = Date.now();
  }

  private async spawnWave(waveNumber: number) {
    // Clear existing enemies and power-ups
    this.enemies.forEach(enemy => enemy.cleanup(this.scene));
    this.powerUps.forEach(powerUp => powerUp.cleanup(this.scene));
    this.throwableBoxes.forEach(box => box.cleanup(this.scene));
    this.enemies = [];
    this.powerUps = [];
    this.throwableBoxes = [];

    // Load level geometry (always use level 1 for endless mode)
    this.level.loadLevel(1);

    // Initialize AI systems AFTER level is loaded (asynchronously)
    try {
      await PathFinder.initializeGrid(this.level);
    } catch (error) {
      console.warn('Failed to initialize AI pathfinding:', error);
    }

    // Calculate enemies for this wave - starts with 3, increases gradually 
    this.enemiesInCurrentWave = Math.min(5 + Math.floor(waveNumber * 1.8), 25); // Cap at 25 enemies max
    this.initialEnemiesInWave = this.enemiesInCurrentWave;
    
    this.spawnEnemies(waveNumber);
    
    // Spawn throwable boxes
    this.spawnThrowableBoxes();
    
    this.betweenWaves = false;
    this.waveStartTime = Date.now();
    
    this.callbacks.onEnemiesChange(this.enemies.length);
    this.callbacks.onEnemiesInWaveChange(this.initialEnemiesInWave);
    this.callbacks.onWaveProgress(0);
  }

  private spawnEnemies(waveNumber: number) {
    const enemyCount = this.enemiesInCurrentWave;
    const spawnRadius = 15;
    const maxAttempts = 50;

    // Determine enemy types for this wave
    const enemyTypes = this.determineEnemyTypes(waveNumber);

    for (let i = 0; i < enemyCount; i++) {
      let spawnPosition: THREE.Vector3 | null = null;
      let attempts = 0;
      
      // Try to find a valid spawn position
      while (attempts < maxAttempts && !spawnPosition) {
        const angle = (i / enemyCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
        const distance = 10 + Math.random() * spawnRadius;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const testPosition = new THREE.Vector3(x, 0, z);
        
        // Check if this position is valid (not colliding with level geometry)
        if (!this.level.checkCollision(testPosition, 0.8)) {
          // Also check if it's not too close to existing enemies
          let tooClose = false;
          for (const existingEnemy of this.enemies) {
            if (existingEnemy.getPosition().distanceTo(testPosition) < 3) {
              tooClose = true;
              break;
            }
          }
          
          if (!tooClose) {
            spawnPosition = testPosition;
          }
        }
        attempts++;
      }
      
      // If we found a valid position, spawn the enemy
      if (spawnPosition) {
        const enemyType = enemyTypes[i % enemyTypes.length];
        const enemy = new Enemy(
          spawnPosition,
          this.scene,
          Math.floor(waveNumber / 2) + 2, // Difficulty increases every 2 waves, with higher base
          enemyType
        );
        this.enemies.push(enemy);
      } else {
        console.warn(`Could not find valid spawn position for enemy ${i + 1}`);
      }
    }
    
    // Update enemy count based on actually spawned enemies
    this.callbacks.onEnemiesChange(this.enemies.length);
  }

  private determineEnemyTypes(waveNumber: number): EnemyType[] {
    const types: EnemyType[] = [];
    
    // Base composition - always include normal enemies
    const normalCount = Math.max(1, Math.floor(this.enemiesInCurrentWave * 0.4));
    for (let i = 0; i < normalCount; i++) {
      types.push('normal');
    }
    
    // Introduce new types based on wave number
    if (waveNumber >= 2) {
      // Scouts appear from wave 2
      const scoutCount = Math.floor(this.enemiesInCurrentWave * 0.3);
      for (let i = 0; i < scoutCount; i++) {
        types.push('scout');
      }
    }
    
    if (waveNumber >= 3) {
      // Heavy enemies from wave 3
      const heavyCount = Math.floor(this.enemiesInCurrentWave * 0.2);
      for (let i = 0; i < heavyCount; i++) {
        types.push('heavy');
      }
    }
    
    if (waveNumber >= 4) {
      // Ranged enemies from wave 4
      const rangedCount = Math.floor(this.enemiesInCurrentWave * 0.25);
      for (let i = 0; i < rangedCount; i++) {
        types.push('ranged');
      }
    }
    
    if (waveNumber >= 5) {
      // Flying drones from wave 5
      const droneCount = Math.floor(this.enemiesInCurrentWave * 0.15);
      for (let i = 0; i < droneCount; i++) {
        types.push('drone');
      }
    }
    
    if (waveNumber >= 6) {
      // Exploder bots from wave 6 (rare but dangerous)
      const exploderCount = Math.max(1, Math.floor(this.enemiesInCurrentWave * 0.1));
      for (let i = 0; i < exploderCount; i++) {
        types.push('exploder');
      }
    }
    
    if (waveNumber >= 8) {
      // Shielded sentinels from wave 8 (mini-bosses)
      const shieldedCount = Math.max(1, Math.floor(this.enemiesInCurrentWave * 0.15));
      for (let i = 0; i < shieldedCount; i++) {
        types.push('shielded');
      }
    }
    
    // Shuffle the array to randomize spawn order
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    
    return types;
  }

  private spawnThrowableBoxes() {
    // Spawn 3-5 boxes per wave
    const boxCount = 3 + Math.floor(Math.random() * 3);
    
    for (let i = 0; i < boxCount; i++) {
      let spawnPosition: THREE.Vector3 | null = null;
      let attempts = 0;
      const maxAttempts = 30;
      
      while (attempts < maxAttempts && !spawnPosition) {
        const angle = Math.random() * Math.PI * 2;
        const distance = 5 + Math.random() * 15;
        const x = Math.cos(angle) * distance;
        const z = Math.sin(angle) * distance;
        const testPosition = new THREE.Vector3(x, 0.5, z);
        
        // Check if position is valid
        if (!this.level.checkCollision(testPosition, 0.6)) {
          // Make sure it's not too close to existing boxes
          let tooClose = false;
          for (const existingBox of this.throwableBoxes) {
            if (existingBox.getPosition().distanceTo(testPosition) < 3) {
              tooClose = true;
              break;
            }
          }
          
          if (!tooClose) {
            spawnPosition = testPosition;
          }
        }
        attempts++;
      }
      
      if (spawnPosition) {
        const box = new ThrowableBox(spawnPosition, this.scene);
        this.throwableBoxes.push(box);
      }
    }
  }

  private startNextWave() {
    this.currentWave++;
    this.callbacks.onWaveComplete(this.currentWave);
    
    // Start transition period
    this.betweenWaves = true;
    this.waveTransitionTimer = 180; // 3 seconds at 60fps
    
    // Show wave transition UI (you could add this later)
    console.log(`Wave ${this.currentWave} incoming!`);
  }

  private updateSurvivalTime() {
    if (this.gameStartTime > 0 && this.gameRunning) {
      this.survivalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
      this.callbacks.onSurvivalTimeChange(this.survivalTime);
    }
  }

  private updateWaveProgress() {
    if (this.initialEnemiesInWave > 0) {
      const killed = this.initialEnemiesInWave - this.enemies.length;
      const progress = killed / this.initialEnemiesInWave;
      this.callbacks.onWaveProgress(progress);
    }
  }

  private checkCollisions() {
    const playerPosition = this.player.getPosition();

    // Update laser collisions
    const laserResults = this.player.updateLasers(this.enemies, this.level);
    laserResults.hitEnemies.forEach(enemy => {
      this.audioManager?.playHitSound();
      this.particleSystem.createHitEffect(enemy.getPosition());
      
      if (!enemy.isAlive()) {
        this.spawnPowerUp(enemy.getPosition());
        enemy.cleanup(this.scene);
        const index = this.enemies.indexOf(enemy);
        if (index > -1) {
          this.enemies.splice(index, 1);
          this.callbacks.onEnemiesChange(this.enemies.length);
          this.updateWaveProgress();
        }
      }
    });

    // Check enemy collisions with player attacks - use reverse iteration to safely remove elements
    for (let enemyIndex = this.enemies.length - 1; enemyIndex >= 0; enemyIndex--) {
      const enemy = this.enemies[enemyIndex];
      
      // Check lightsaber attack
      if (this.player.isAttacking() && enemy.isAlive()) {
        const distance = enemy.getPosition().distanceTo(playerPosition);
        if (distance < 3) {
          const isBehind = this.isPlayerBehindEnemy(enemy, playerPosition);
          this.audioManager?.playHitSound();
          try {
            AICoordinator.getInstance().updatePlayerThreatLevel('damage');
          } catch (error) {
            console.warn('AI threat update error:', error);
          }
          enemy.takeDamage(35, !isBehind); // More damage from behind
          this.particleSystem.createHitEffect(enemy.getPosition());
          
          if (!enemy.isAlive()) {
            try {
              AICoordinator.getInstance().updatePlayerThreatLevel('kill');
            } catch (error) {
              console.warn('AI threat update error:', error);
            }
            this.spawnPowerUp(enemy.getPosition());
            enemy.cleanup(this.scene);
            this.enemies.splice(enemyIndex, 1);
            this.callbacks.onEnemiesChange(this.enemies.length);
            this.updateWaveProgress();
            continue; // Skip to next enemy since this one is removed
          }
        }
      }

      // Check telekinesis
      const levitatedEnemy = this.player.getLevitatedEnemy();
      if (levitatedEnemy === enemy) {
        // Enemy is being levitated
        const targetPos = playerPosition.clone().add(
          this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(5)
        );
        targetPos.y += 2;
        enemy.setPosition(targetPos);
      }

      // Check thrown enemy collisions
      if (enemy.isBeingThrown()) {
        // Check collision with other enemies - use reverse iteration
        for (let otherIndex = this.enemies.length - 1; otherIndex >= 0; otherIndex--) {
          const otherEnemy = this.enemies[otherIndex];
          if (otherEnemy !== enemy && otherEnemy.isAlive()) {
            const distance = enemy.getPosition().distanceTo(otherEnemy.getPosition());
            if (distance < 2) {
              this.audioManager?.playHitSound();
              otherEnemy.takeDamage(75);
              enemy.takeDamage(25);
              
              this.particleSystem.createExplosion(otherEnemy.getPosition());
              
              if (!otherEnemy.isAlive()) {
                try {
                  AICoordinator.getInstance().updatePlayerThreatLevel('kill');
                } catch (error) {
                  console.warn('AI threat update error:', error);
                }
                this.spawnPowerUp(otherEnemy.getPosition());
                otherEnemy.cleanup(this.scene);
                this.enemies.splice(otherIndex, 1);
                this.callbacks.onEnemiesChange(this.enemies.length);
                this.updateWaveProgress();
              }
            }
          }
        }
      }

      // Check enemy damage to player
      if (enemy.isAlive() && !enemy.isBeingThrown()) {
        const distance = enemy.getPosition().distanceTo(playerPosition);
        if (distance < 2) {
          this.player.takeDamage(enemy.getDamage() * 0.5); // Reduced damage for better health system
          this.callbacks.onHealthChange(this.player.getHealth());
        }
        
        // Check ranged enemy projectile hits
        if (enemy.checkProjectileHit(playerPosition, 0.8)) {
          this.player.takeDamage(enemy.getDamage()); // Normal projectile damage
          this.callbacks.onHealthChange(this.player.getHealth());
          this.particleSystem.createHitEffect(playerPosition);
        }
        
        // Check explosion damage
        const explosionDamage = enemy.getExplosionDamage(playerPosition);
        if (explosionDamage > 0) {
          this.player.takeDamage(explosionDamage);
          this.callbacks.onHealthChange(this.player.getHealth());
          this.particleSystem.createExplosion(enemy.getPosition());
        }
      }
    }

    // Check throwable box interactions
    for (let boxIndex = this.throwableBoxes.length - 1; boxIndex >= 0; boxIndex--) {
      const box = this.throwableBoxes[boxIndex];
      
      // Check if player is targeting this box for telekinesis
      const levitatedBox = this.player.getLevitatedBox();
      if (levitatedBox === box) {
        // Box is being levitated
        const targetPos = playerPosition.clone().add(
          this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4)
        );
        targetPos.y += 1;
        box.setPosition(targetPos);
      }
    }

    // Check power-up collection
    for (let index = this.powerUps.length - 1; index >= 0; index--) {
      const powerUp = this.powerUps[index];
      const distance = powerUp.getPosition().distanceTo(playerPosition);
      if (distance < 2) {
        powerUp.apply(this.player);
        this.callbacks.onHealthChange(this.player.getHealth());
        powerUp.cleanup(this.scene);
        this.powerUps.splice(index, 1);
        this.particleSystem.createPickupEffect(powerUp.getPosition());
      }
    }

    // Check wave completion
    if (this.enemies.length === 0) {
      if (!this.betweenWaves) {
        this.startNextWave();
      }
    }

    // Check lose condition
    if (this.player.getHealth() <= 0) {
      this.gameRunning = false; // Stop survival time counter
      this.callbacks.onGameOver();
    }
  }

  private isPlayerBehindEnemy(enemy: Enemy, playerPosition: THREE.Vector3): boolean {
    const enemyPosition = enemy.getPosition();
    const enemyToPlayer = playerPosition.clone().sub(enemyPosition).normalize();
    
    // For simplicity, assume enemy faces towards (0,0,0) or last known player position
    // In a more complex system, you'd track enemy facing direction
    const enemyForward = new THREE.Vector3(0, 0, 1); // Default forward direction
    
    const dot = enemyToPlayer.dot(enemyForward);
    return dot < 0; // Player is behind if dot product is negative
  }

  private spawnPowerUp(position: THREE.Vector3) {
    if (Math.random() < 0.8) { // 80% chance to drop power-up (increased for better health system)
      // Higher chance for health power-ups
      const type = Math.random() < 0.8 ? 'health' : 'speed';
      const powerUp = new PowerUp(position.clone(), type, this.scene);
      this.powerUps.push(powerUp);
    }
  }

  private gameLoop = () => {
    if (!this.animationId || !this.gameRunning) return;

    // Update survival time
    this.updateSurvivalTime();

    // Update player position for UI
    this.callbacks.onPlayerPositionChange(this.player.getPosition());

    // Handle wave transitions
    if (this.betweenWaves) {
      this.waveTransitionTimer--;
      if (this.waveTransitionTimer <= 0) {
        // Spawn wave asynchronously
        this.spawnWave(this.currentWave).catch(error => {
          console.warn('Failed to spawn wave:', error);
        });
      }
    }

    // Clean up stuck or invalid enemies
    this.cleanupInvalidEnemies();

    // Update game objects
    this.player.update(this.level);

    // Update AI coordination (heavily throttled)
    if (Math.random() < 0.02) { // Only 2% of frames to reduce load
      try {
        AICoordinator.getInstance().updateFormations(this.enemies, this.player.getPosition());
      } catch (error) {
        console.warn('AI coordination error:', error);
      }
    }

    this.enemies.forEach(enemy => enemy.update(this.player.getPosition(), this.level));
    this.powerUps.forEach(powerUp => powerUp.update());
    this.throwableBoxes.forEach(box => box.update(this.enemies, this.level));
    this.particleSystem.update();

    // Handle player attacks
    this.player.handleAttacks(this.enemies, this.throwableBoxes);

    // Check collisions
    this.checkCollisions();

    // Render
    this.renderer.render(this.scene, this.camera);

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  public restart() {
    this.stop();
    
    // Reset game state
    this.currentWave = 1;
    this.survivalTime = 0;
    this.betweenWaves = false;
    this.waveTransitionTimer = 0;
    this.gameRunning = false;
    
    // Clear existing entities
    this.enemies.forEach(enemy => enemy.cleanup(this.scene));
    this.powerUps.forEach(powerUp => powerUp.cleanup(this.scene));
    this.throwableBoxes.forEach(box => box.cleanup(this.scene));
    try {
      AICoordinator.getInstance().cleanup();
    } catch (error) {
      console.warn('AI cleanup error:', error);
    }
    this.enemies = [];
    this.powerUps = [];
    this.throwableBoxes = [];
    
    // Reset player
    this.player.reset();
    
    // Start first wave asynchronously
    this.startFirstWave().catch(error => {
      console.warn('Failed to start first wave on restart:', error);
    });
    
    // Restart game loop
    this.start();
  }

  public start() {
    if (!this.animationId) {
      // Start background music and first wave
      this.audioManager?.startBackgroundMusic();
      this.gameRunning = true;
      this.animationId = requestAnimationFrame(this.gameLoop);
      
      // Start first wave asynchronously
      this.startFirstWave().catch(error => {
        console.warn('Failed to start first wave:', error);
      });
    }
  }

  public resume() {
    if (!this.animationId && !this.gameRunning) {
      this.gameRunning = true;
      this.gameStartTime = Date.now() - (this.survivalTime * 1000); // Adjust start time to maintain survival time
      this.audioManager?.startBackgroundMusic();
      this.animationId = requestAnimationFrame(this.gameLoop);
    }
  }

  public pause() {
    this.gameRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.audioManager?.stopBackgroundMusic();
  }

  private stop() {
    this.gameRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.audioManager?.stopBackgroundMusic();
  }

  public cleanup() {
    this.stop();
    
    // Clean up game objects
    this.enemies.forEach(enemy => enemy.cleanup(this.scene));
    this.powerUps.forEach(powerUp => powerUp.cleanup(this.scene));
    this.throwableBoxes.forEach(box => box.cleanup(this.scene));
    this.level.cleanup(this.scene);
    this.particleSystem.cleanup();
    try {
      AICoordinator.getInstance().cleanup();
    } catch (error) {
      console.warn('AI cleanup error:', error);
    }
    this.player.cleanup();
    this.audioManager?.cleanup();

    // Remove event listeners
    window.removeEventListener('resize', this.onWindowResize.bind(this));
    
    // Clean up Three.js objects
    this.scene.clear();
    this.renderer.dispose();
  }
  
  public getEnemies(): Enemy[] {
    return this.enemies;
  }
}