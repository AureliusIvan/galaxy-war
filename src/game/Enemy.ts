import * as THREE from 'three';
import { AIState, AICoordinator, PathFinder } from './AIBehavior';

// Texture loader for Denis face
const textureLoader = new THREE.TextureLoader();

export type EnemyType = 'normal' | 'scout' | 'heavy' | 'ranged' | 'exploder' | 'shielded' | 'drone';

interface EnemyConfig {
  maxHealth: number;
  speed: number;
  size: number;
  color: number;
  damage: number;
  attackRange: number;
  explosionRadius?: number;
  hasShield?: boolean;
  canFly?: boolean;
  shootRange?: number;
  shootCooldown?: number;
}

const ENEMY_CONFIGS: Record<EnemyType, EnemyConfig> = {
  normal: {
    maxHealth: 120,
    speed: 0.03,
    size: 1.0,
    color: 0x333333,
    damage: 1,
    attackRange: 2
  },
  scout: {
    maxHealth: 60,
    speed: 0.05,
    size: 0.7,
    color: 0x44aa44,
    damage: 0.5,
    attackRange: 1.5
  },
  heavy: {
    maxHealth: 300,
    speed: 0.015,
    size: 1.4,
    color: 0x884444,
    damage: 3,
    attackRange: 2.5
  },
  ranged: {
    maxHealth: 80,
    speed: 0.02,
    size: 0.9,
    color: 0x4444aa,
    damage: 1.5,
    attackRange: 1.5,
    shootRange: 15,
    shootCooldown: 120
  },
  exploder: {
    maxHealth: 90,
    speed: 0.035,
    size: 1.1,
    color: 0xaa4444,
    damage: 5,
    attackRange: 3,
    explosionRadius: 5
  },
  shielded: {
    maxHealth: 200,
    speed: 0.018,
    size: 1.3,
    color: 0x6666aa,
    damage: 2,
    attackRange: 2,
    hasShield: true
  },
  drone: {
    maxHealth: 40,
    speed: 0.04,
    size: 0.5,
    color: 0xaaaaaa,
    damage: 0.5,
    attackRange: 1,
    canFly: true
  }
};

interface EnemyProjectile {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  life: number;
}

export class Enemy {
  private mesh: THREE.Group;
  private position: THREE.Vector3;
  private health: number;
  private maxHealth: number;
  private speed: number;
  private scene: THREE.Scene;
  private type: EnemyType;
  private config: EnemyConfig;
  private isLevitating = false;
  private isThrown = false;
  private throwVelocity = new THREE.Vector3();
  private attackCooldown = 0;
  private shootCooldown = 0;
  private moveTimer = 0;
  private targetPosition: THREE.Vector3;
  private denisFaceTexture: THREE.Texture | null = null;
  private stuckTimer = 0;
  private lastPosition = new THREE.Vector3();
  private stuckThreshold = 180;
  private stuckCheckTimer = 0;
  private projectiles: EnemyProjectile[] = [];
  private shield: THREE.Mesh | null = null;
  private shieldActive = true;
  private flyHeight = 0;
  private flyTarget = 2;
  private explosionTriggered = false;
  private id: string;
  private aiState: AIState;
  private pathWaypoints: THREE.Vector3[] = [];
  private currentWaypointIndex = 0;
  private lastPathUpdate = 0;
  private formationRole: 'leader' | 'flanker' | 'support' | 'lone' | null = null;
  private formationId: string | null = null;
  private lastPlayerSightTime = 0;
  private evasionDirection = new THREE.Vector3();
  private predictedPlayerPosition = new THREE.Vector3();
  private lastPlayerPositions: THREE.Vector3[] = [];
  private updateCounter: number;

  constructor(position: THREE.Vector3, scene: THREE.Scene, difficulty: number = 1, type: EnemyType = 'normal') {
    this.position = position.clone();
    this.scene = scene;
    this.type = type;
    this.config = ENEMY_CONFIGS[type];
    this.targetPosition = position.clone();
    this.id = `enemy_${Math.random().toString(36).substr(2, 9)}`;
    this.updateCounter = Math.floor(Math.random() * 20); // Random initial offset
    
    // Initialize AI state
    this.aiState = {
      behavior: 'idle',
      lastKnownPlayerPosition: null,
      currentTarget: null,
      coverPosition: null,
      formationRole: null,
      alertedBy: null,
      engagementDistance: this.config.attackRange * 2,
      lastDamageTime: 0,
      evasionCooldown: 0,
      cooperationCooldown: 0
    };
    
    // Apply difficulty scaling
    this.maxHealth = Math.floor(this.config.maxHealth + difficulty * 20);
    this.health = this.maxHealth;
    this.speed = this.config.speed;
    
    // Set initial flying height for drones
    if (this.config.canFly) {
      this.flyHeight = 2 + Math.random() * 2;
      this.position.y = this.flyHeight;
    }
    
    this.createMesh();
    scene.add(this.mesh);
  }

  private createMesh() {
    this.mesh = new THREE.Group();
    const size = this.config.size;

    if (this.type === 'drone') {
      this.createDroneMesh(size);
    } else {
      this.createRobotMesh(size);
    }

    // Create shield for shielded enemies
    if (this.config.hasShield) {
      this.createShield(size);
    }

    // Health bar
    this.createHealthBar();

    // Set initial position
    this.mesh.position.copy(this.position);
  }

  public getId(): string {
    return this.id;
  }

  public getAIState(): AIState {
    return this.aiState;
  }

  public setFormationRole(role: 'leader' | 'flanker' | 'support' | 'lone', formationId: string) {
    this.formationRole = role;
    this.formationId = formationId;
    this.aiState.formationRole = role;
  }

  public receiveAlert(alerterId: string, playerPosition: THREE.Vector3) {
    this.aiState.alertLevel = Math.min(100, this.aiState.alertLevel + 30);
    this.aiState.lastKnownPlayerPosition = playerPosition.clone();
    this.aiState.alertedBy = alerterId;
    
    // Interrupt current behavior to investigate
    this.moveTimer = 0;
  }

  private updatePlayerTracking(playerPosition: THREE.Vector3) {
    // Track player position history for prediction
    this.lastPlayerPositions.push(playerPosition.clone());
    if (this.lastPlayerPositions.length > 5) {
      this.lastPlayerPositions.shift();
    }
    
    // Calculate predicted player position
    if (this.lastPlayerPositions.length >= 2) {
      const recent = this.lastPlayerPositions[this.lastPlayerPositions.length - 1];
      const prev = this.lastPlayerPositions[this.lastPlayerPositions.length - 2];
      const velocity = recent.clone().sub(prev);
      this.predictedPlayerPosition = recent.clone().add(velocity.multiplyScalar(3)); // Predict 3 frames ahead
    } else {
      this.predictedPlayerPosition = playerPosition.clone();
    }
  }

  private canSeePlayer(playerPosition: THREE.Vector3, level: any): boolean {
    if (!level?.checkCollision) return true;
    
    const direction = playerPosition.clone().sub(this.position).normalize();
    const distance = this.position.distanceTo(playerPosition);
    const steps = Math.floor(distance * 2); // Check every 0.5 units
    
    for (let i = 1; i < steps; i++) {
      const checkPoint = this.position.clone().add(direction.clone().multiplyScalar(i * 0.5));
      if (level.checkCollision(checkPoint, 0.2, 0.2)) {
        return false; // Line of sight blocked
      }
    }
    return true;
  }

  private updateAwareness(playerPosition: THREE.Vector3, level: any) {
    const distance = this.position.distanceTo(playerPosition);
    const hasLineOfSight = this.canSeePlayer(playerPosition, level);
    
    if (hasLineOfSight && distance < 20) {
      // Player is visible
      this.lastPlayerSightTime = Date.now();
      this.aiState.alertLevel = Math.min(100, this.aiState.alertLevel + 5);
      this.aiState.lastKnownPlayerPosition = playerPosition.clone();
      
      // Alert nearby enemies if we spot the player
      if (this.aiState.alertLevel > 50) {
        AICoordinator.getInstance().alertNearbyEnemies(this.id, playerPosition, []);
      }
    } else {
      // Lose awareness over time
      const timeSinceLastSight = Date.now() - this.lastPlayerSightTime;
      if (timeSinceLastSight > 3000) { // 3 seconds
        this.aiState.alertLevel = Math.max(0, this.aiState.alertLevel - 2);
      }
    }
  }

  private findCoverPosition(playerPosition: THREE.Vector3, level: any): THREE.Vector3 | null {
    if (!level?.checkCollision) return null;
    
    const coverSearchRadius = 8;
    const angles = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
    
    for (const angle of angles) {
      for (let distance = 3; distance <= coverSearchRadius; distance += 2) {
        const candidatePos = new THREE.Vector3(
          this.position.x + Math.cos(angle) * distance,
          this.position.y,
          this.position.z + Math.sin(angle) * distance
        );
        
        // Check if position is valid and provides cover
        if (!level.checkCollision(candidatePos, 0.5, 1.5)) {
          // Check if there's an obstacle between this position and player
          const dirToPlayer = playerPosition.clone().sub(candidatePos).normalize();
          const coverCheckPos = candidatePos.clone().add(dirToPlayer.multiplyScalar(1));
          
          if (level.checkCollision(coverCheckPos, 0.5, 1.5)) {
            return candidatePos; // Found cover
          }
        }
      }
    }
    
    return null;
  }

  private updatePathfinding(targetPosition: THREE.Vector3, level: any) {
    const currentTime = Date.now();
    
    // Update path every 2 seconds or if target changed significantly
    if (currentTime - this.lastPathUpdate > 2000 || 
        !this.aiState.currentTarget || 
        this.aiState.currentTarget.distanceTo(targetPosition) > 3) {
      
      this.pathWaypoints = PathFinder.findPath(this.position, targetPosition);
      this.currentWaypointIndex = 0;
      this.lastPathUpdate = currentTime;
      this.aiState.currentTarget = targetPosition.clone();
    }
    
    // Move towards current waypoint
    if (this.pathWaypoints.length > this.currentWaypointIndex) {
      const currentWaypoint = this.pathWaypoints[this.currentWaypointIndex];
      const distanceToWaypoint = this.position.distanceTo(currentWaypoint);
      
      if (distanceToWaypoint < 1.5) {
        this.currentWaypointIndex++;
      }
      
      return currentWaypoint;
    }
    
    return targetPosition;
  }

  private performEvasiveManeuvers(playerPosition: THREE.Vector3): THREE.Vector3 {
    if (this.aiState.evasionCooldown > 0) {
      this.aiState.evasionCooldown--;
      // Continue current evasion
      return this.position.clone().add(this.evasionDirection.clone().multiplyScalar(3));
    }
    
    // Start new evasion
    this.aiState.evasionCooldown = 60 + Math.random() * 60; // 1-2 seconds
    
    // Calculate evasion direction (perpendicular to player direction)
    const toPlayer = playerPosition.clone().sub(this.position).normalize();
    this.evasionDirection = new THREE.Vector3(-toPlayer.z, 0, toPlayer.x); // Perpendicular
    
    if (Math.random() < 0.5) {
      this.evasionDirection.multiplyScalar(-1); // Random left/right
    }
    
    return this.position.clone().add(this.evasionDirection.clone().multiplyScalar(5));
  }
  private createDroneMesh(size: number) {
    // Drone body - spherical
    const bodyGeometry = new THREE.SphereGeometry(size * 0.3, 12, 8);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: this.config.color,
      shininess: 100,
      emissive: 0x222222
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.castShadow = true;
    this.mesh.add(body);

    // Propellers
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const propellerGroup = new THREE.Group();
      
      // Propeller arm
      const armGeometry = new THREE.CylinderGeometry(0.02, 0.02, size * 0.4);
      const armMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
      const arm = new THREE.Mesh(armGeometry, armMaterial);
      arm.rotation.z = Math.PI / 2;
      propellerGroup.add(arm);
      
      // Propeller blade
      const bladeGeometry = new THREE.BoxGeometry(size * 0.3, 0.02, 0.05);
      const bladeMaterial = new THREE.MeshPhongMaterial({ color: 0x444444 });
      const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
      blade.position.x = size * 0.2;
      blade.name = 'propeller';
      propellerGroup.add(blade);
      
      propellerGroup.position.x = Math.cos(angle) * size * 0.4;
      propellerGroup.position.z = Math.sin(angle) * size * 0.4;
      propellerGroup.rotation.y = angle;
      
      this.mesh.add(propellerGroup);
    }

    // Drone eyes - use MeshPhongMaterial for emissive properties
    const eyeGeometry = new THREE.SphereGeometry(0.03, 8, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.1, 0.05, size * 0.28);
    this.mesh.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.1, 0.05, size * 0.28);
    this.mesh.add(rightEye);
  }

  private createRobotMesh(size: number) {
    // Robot body
    const bodyGeometry = new THREE.BoxGeometry(size * 0.8, size * 1.2, size * 0.6);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
      color: this.config.color,
      shininess: 100 
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = size * 0.6;
    body.castShadow = true;
    this.mesh.add(body);

    // Special markings for different types
    if (this.type === 'exploder') {
      // Add warning stripes
      const stripeGeometry = new THREE.BoxGeometry(size * 0.82, size * 0.1, size * 0.62);
      const stripeMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
      for (let i = 0; i < 3; i++) {
        const stripe = new THREE.Mesh(stripeGeometry, stripeMaterial);
        stripe.position.y = size * (0.3 + i * 0.3);
        this.mesh.add(stripe);
      }
    }

    // Robot head
    const headGeometry = new THREE.BoxGeometry(size * 0.5, size * 0.5, size * 0.5);
    const headMaterial = new THREE.MeshPhongMaterial({
      color: this.config.color,
      shininess: 100
    });
    
    if (this.denisFaceTexture && (this.type === 'normal' || Math.random() < 0.3)) {
      headMaterial.map = this.denisFaceTexture;
    }
    
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = size * 1.45;
    head.castShadow = true;
    this.mesh.add(head);

    // Robot eyes - use MeshPhongMaterial for emissive properties
    const eyeGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const eyeColor = this.type === 'exploder' ? 0xff4444 : 0xff0000;
    const eyeMaterial = new THREE.MeshPhongMaterial({ 
      color: eyeColor,
      emissive: eyeColor,
      emissiveIntensity: 0.5
    });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-size * 0.15, size * 1.5, size * 0.26);
    this.mesh.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(size * 0.15, size * 1.5, size * 0.26);
    this.mesh.add(rightEye);

    // Robot arms - different based on type
    const armGeometry = new THREE.BoxGeometry(size * 0.2, size * 0.8, size * 0.2);
    let armMaterial = new THREE.MeshPhongMaterial({ color: this.config.color });
    
    if (this.type === 'ranged') {
      // Make right arm look like a blaster
      const blasterGeometry = new THREE.BoxGeometry(size * 0.15, size * 0.25, size * 0.6);
      armMaterial = new THREE.MeshPhongMaterial({ color: 0x222222 });
    }
    
    const leftArm = new THREE.Mesh(armGeometry, armMaterial);
    leftArm.position.set(-size * 0.6, size * 0.6, 0);
    leftArm.castShadow = true;
    this.mesh.add(leftArm);
    
    const rightArm = new THREE.Mesh(armGeometry, armMaterial.clone());
    rightArm.position.set(size * 0.6, size * 0.6, 0);
    rightArm.castShadow = true;
    this.mesh.add(rightArm);

    // Robot legs - thicker for heavy types
    const legWidth = this.type === 'heavy' ? size * 0.35 : size * 0.25;
    const legGeometry = new THREE.BoxGeometry(legWidth, size * 0.6, legWidth);
    const legMaterial = new THREE.MeshPhongMaterial({ color: this.config.color });
    
    const leftLeg = new THREE.Mesh(legGeometry, legMaterial);
    leftLeg.position.set(-size * 0.2, -size * 0.3, 0);
    leftLeg.castShadow = true;
    this.mesh.add(leftLeg);
    
    const rightLeg = new THREE.Mesh(legGeometry, legMaterial);
    rightLeg.position.set(size * 0.2, -size * 0.3, 0);
    rightLeg.castShadow = true;
    this.mesh.add(rightLeg);
  }

  private createShield(size: number) {
    const shieldGeometry = new THREE.CylinderGeometry(size * 0.8, size * 0.8, size * 1.6, 16, 1, true, 0, Math.PI);
    const shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x0088ff,
      transparent: true,
      opacity: 0.3,
      side: THREE.DoubleSide
    });
    
    this.shield = new THREE.Mesh(shieldGeometry, shieldMaterial);
    this.shield.position.y = size * 0.6;
    this.shield.rotation.y = Math.PI; // Face forward
    this.mesh.add(this.shield);
  }

  private createHealthBar() {
    const healthBarGroup = new THREE.Group();
    
    // Background
    const bgGeometry = new THREE.PlaneGeometry(1, 0.1);
    const bgMaterial = new THREE.MeshBasicMaterial({ 
      color: 0x330000,
      transparent: true,
      opacity: 0.8
    });
    const background = new THREE.Mesh(bgGeometry, bgMaterial);
    background.position.y = this.config.size * 2;
    healthBarGroup.add(background);

    // Health bar
    const healthGeometry = new THREE.PlaneGeometry(1, 0.08);
    const healthMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xff0000,
      transparent: true,
      opacity: 0.9
    });
    const healthBar = new THREE.Mesh(healthGeometry, healthMaterial);
    healthBar.position.y = this.config.size * 2;
    healthBar.position.z = 0.01;
    healthBar.name = 'healthBar';
    healthBarGroup.add(healthBar);

    this.mesh.add(healthBarGroup);
  }

  private updateHealthBar() {
    const healthBar = this.mesh.getObjectByName('healthBar') as THREE.Mesh;
    if (healthBar) {
      const healthPercent = this.health / this.maxHealth;
      healthBar.scale.x = healthPercent;
      healthBar.position.x = (healthPercent - 1) * 0.5;
      
      const material = healthBar.material as THREE.MeshBasicMaterial;
      if (healthPercent > 0.6) {
        material.color.setHex(0x00ff00);
      } else if (healthPercent > 0.3) {
        material.color.setHex(0xffff00);
      } else {
        material.color.setHex(0xff0000);
      }
    }
  }

  public update(playerPosition: THREE.Vector3, level?: any) {
    if (!this.isAlive()) return;

    this.updateCounter++;

    // Update AI systems (heavily throttled to prevent performance issues)
    if (this.updateCounter % 10 === 0) { // Only 10% of frames (reduced from 30%)
      try {
        this.updatePlayerTracking(playerPosition);
        this.updateAwareness(playerPosition, level);
      } catch (error) {
        console.warn('AI update error:', error);
      }
    }
    
    // Update projectiles
    this.updateProjectiles();

    if (this.isLevitating) {
      this.mesh.rotation.y += 0.05;
      this.mesh.position.y = this.position.y + Math.sin(Date.now() * 0.01) * 0.2;
      return;
    }

    if (this.isThrown) {
      this.handleThrowPhysics(level);
      return;
    }

    // Type-specific updates (throttled)
    if (this.updateCounter % 2 === 0) { // Only 50% of frames
      this.updateByType(playerPosition, level);
    }

    // Update formation if part of one (more throttling)
    if (this.formationRole && this.formationId && this.updateCounter % 10 === 0) { // Reduced to 10%
      try {
        const coordinator = AICoordinator.getInstance();
        const formationTarget = coordinator.getFormationPosition(
          this.id, this.formationRole, this.formationId, this.position, playerPosition
        );
        
        // Blend formation movement with individual behavior
        this.targetPosition = this.targetPosition.clone().lerp(formationTarget, 0.3);
      } catch (error) {
        console.warn('Formation update error:', error);
      }
    }

    // Update mesh position (always)
    this.mesh.position.copy(this.position);
    
    // Update health bar and visual effects (throttled)
    if (this.updateCounter % 3 === 0) { // Only 30% of frames
      this.updateHealthBar();

      // Make health bar face camera
      const healthBarGroup = this.mesh.children.find(child => child instanceof THREE.Group && child.children.length > 0);
      if (healthBarGroup) {
        healthBarGroup.lookAt(playerPosition);
      }

      // Animate propellers for drones
      if (this.type === 'drone') {
        this.mesh.traverse((child) => {
          if (child.name === 'propeller') {
            child.rotation.y += 0.5;
          }
        });
      }

      // Pulse exploder warning
      if (this.type === 'exploder' && !this.explosionTriggered) {
        const distance = this.position.distanceTo(playerPosition);
        if (distance < this.config.explosionRadius!) {
          const intensity = Math.sin(Date.now() * 0.02) * 0.5 + 0.5;
          this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
              child.material.emissive.setRGB(intensity * 0.5, 0, 0);
            }
          });
        }
      }
    }
  }

  private updateByType(playerPosition: THREE.Vector3, level?: any) {
    const distance = this.position.distanceTo(playerPosition);
    const threatLevel = AICoordinator.getInstance().getPlayerThreatLevel();

    switch (this.type) {
      case 'scout':
        this.updateScoutBehavior(playerPosition, level, distance);
        break;
      case 'heavy':
        this.updateHeavyBehavior(playerPosition, level, distance, threatLevel);
        break;
      case 'ranged':
        this.updateRangedBehavior(playerPosition, level, distance, threatLevel);
        break;
      case 'exploder':
        this.updateExploderBehavior(playerPosition, level, distance);
        break;
      case 'shielded':
        this.updateShieldedBehavior(playerPosition, level, distance);
        break;
      case 'drone':
        this.updateDroneBehavior(playerPosition, level, distance);
        break;
      default:
        this.updateNormalBehavior(playerPosition, level, distance, threatLevel);
        break;
    }
  }

  private updateScoutBehavior(playerPosition: THREE.Vector3, level: any, distance: number) {
    // Enhanced scout behavior with evasion and flanking
    const threatLevel = AICoordinator.getInstance().getPlayerThreatLevel();
    const alertLevel = this.aiState.alertLevel;
    
    if (distance > 12) {
      // Close distance quickly
      const target = this.updatePathfinding(playerPosition, level);
      this.moveTowardsTarget(target, level, 1.8);
    } else if (distance < 2 || (alertLevel > 70 && distance < 4)) {
      // Retreat or evade
      const evasionTarget = this.performEvasiveManeuvers(playerPosition);
      this.moveTowardsTarget(evasionTarget, level, 2.0);
    } else {
      // Aggressive flanking
      const flankAngle = Date.now() * 0.002 + this.id.length; // Unique per enemy
      const flankRadius = 4 + Math.sin(Date.now() * 0.001) * 2;
      const flankTarget = new THREE.Vector3(
        playerPosition.x + Math.cos(flankAngle) * flankRadius,
        this.position.y,
        playerPosition.z + Math.sin(flankAngle) * flankRadius
      );
      const target = this.updatePathfinding(flankTarget, level);
      this.moveTowardsTarget(target, level, 1.4);
    }

    this.handleAttack(playerPosition, distance);
  }

  private updateHeavyBehavior(playerPosition: THREE.Vector3, level: any, distance: number, threatLevel: number) {
    // Heavy enemies use cover and coordinated attacks
    if (distance > 15) {
      // Close distance using pathfinding
      const target = this.updatePathfinding(playerPosition, level);
      this.moveTowardsTarget(target, level, 0.9);
    } else if (this.health < this.maxHealth * 0.4) {
      // Seek cover when damaged
      if (!this.aiState.coverPosition) {
        this.aiState.coverPosition = this.findCoverPosition(playerPosition, level);
      }
      
      if (this.aiState.coverPosition) {
        const target = this.updatePathfinding(this.aiState.coverPosition, level);
        this.moveTowardsTarget(target, level, 1.2);
        
        // Clear cover position when reached
        if (this.position.distanceTo(this.aiState.coverPosition) < 2) {
          this.aiState.coverPosition = null;
        }
      } else {
        this.moveTowardsTarget(playerPosition, level, 0.8);
      }
    } else {
      // Aggressive advance
      const target = this.updatePathfinding(playerPosition, level);
      this.moveTowardsTarget(target, level, 1.0);
    }
    
    this.handleAttack(playerPosition, distance);
  }

  private updateRangedBehavior(playerPosition: THREE.Vector3, level: any, distance: number, threatLevel: number) {
    // Enhanced ranged behavior with predictive shooting and cover usage
    const optimalRange = 8 + threatLevel * 0.05; // Increase range with threat
    const hasLineOfSight = this.canSeePlayer(playerPosition, level);
    
    if (!hasLineOfSight || distance > optimalRange + 3) {
      // Move to get line of sight or close distance
      const target = this.updatePathfinding(playerPosition, level);
      this.moveTowardsTarget(target, level, 1.2);
    } else if (distance < optimalRange - 3 || this.health < this.maxHealth * 0.5) {
      // Retreat to optimal range or seek cover
      if (this.health < this.maxHealth * 0.5 && !this.aiState.coverPosition) {
        this.aiState.coverPosition = this.findCoverPosition(playerPosition, level);
      }
      
      if (this.aiState.coverPosition && this.health < this.maxHealth * 0.5) {
        const target = this.updatePathfinding(this.aiState.coverPosition, level);
        this.moveTowardsTarget(target, level, 1.4);
      } else {
        const evasionTarget = this.performEvasiveManeuvers(playerPosition);
        this.moveTowardsTarget(evasionTarget, level, 1.2);
      }
    } else {
      // Maintain position and strafe
      if (this.aiState.evasionCooldown <= 0) {
        const evasionTarget = this.performEvasiveManeuvers(playerPosition);
        this.moveTowardsTarget(evasionTarget, level, 0.8);
      }
    }

    // Shoot at player
    const adjustedCooldown = Math.max(30, this.config.shootCooldown! - threatLevel);
    this.shootCooldown--;
    if (this.shootCooldown <= 0 && distance <= this.config.shootRange! && hasLineOfSight) {
      this.shootAtPlayer(this.predictedPlayerPosition); // Shoot at predicted position
      this.shootCooldown = adjustedCooldown;
    }

    this.handleAttack(playerPosition, distance);
    this.moveTimer++;
  }

  private updateExploderBehavior(playerPosition: THREE.Vector3, level: any, distance: number) {
    // Exploder bots rush towards the player
    this.moveTowardsTarget(playerPosition, level, 1.5);
    
    // Explode when close or when dying
    if ((distance < this.config.explosionRadius! || this.health <= 0) && !this.explosionTriggered) {
      this.explode();
    }
  }

  private updateShieldedBehavior(playerPosition: THREE.Vector3, level: any, distance: number) {
    // Shielded enemies always face the player
    this.mesh.lookAt(playerPosition);
    this.moveTowardsTarget(playerPosition, level, 1.0);
    this.handleAttack(playerPosition, distance);
    
    // Update shield visibility based on health
    if (this.shield) {
      const shieldStrength = this.health / this.maxHealth;
      (this.shield.material as THREE.MeshBasicMaterial).opacity = 0.2 + shieldStrength * 0.3;
      this.shieldActive = shieldStrength > 0.3;
    }
  }

  private updateDroneBehavior(playerPosition: THREE.Vector3, level: any, distance: number) {
    // Drones fly around and dive at the player
    this.flyTarget = 2 + Math.sin(Date.now() * 0.001) * 1;
    this.position.y += (this.flyTarget - this.position.y) * 0.02;
    
    if (distance > 4) {
      this.moveTowardsTarget(playerPosition, level, 1.2);
    } else {
      // Dive attack pattern
      if (this.moveTimer % 120 < 60) {
        // Dive down
        this.flyTarget = playerPosition.y + 0.5;
        this.moveTowardsTarget(playerPosition, level, 1.5);
      } else {
        // Fly back up
        this.flyTarget = playerPosition.y + 3 + Math.random() * 2;
        const retreatDirection = this.position.clone().sub(playerPosition).normalize();
        const retreatTarget = this.position.clone().add(retreatDirection.multiplyScalar(3));
        retreatTarget.y = this.flyTarget;
        this.moveTowardsTarget(retreatTarget, level, 1.0);
      }
    }

    this.handleAttack(playerPosition, distance);
    this.moveTimer++;
  }

  private updateNormalBehavior(playerPosition: THREE.Vector3, level: any, distance: number, threatLevel: number) {
    // Enhanced normal behavior with basic tactics
    const speedMultiplier = 1.0 + (threatLevel * 0.01);
    
    if (distance > 10) {
      // Use pathfinding for long distances
      const target = this.updatePathfinding(playerPosition, level);
      this.moveTowardsTarget(target, level, speedMultiplier);
    } else {
      // Direct movement for close combat
      this.moveTowardsTarget(playerPosition, level, speedMultiplier);
    }
    
    this.handleAttack(playerPosition, distance);
  }

  private moveTowardsTarget(target: THREE.Vector3, level: any, speedMultiplier: number = 1.0) {
    this.moveTimer++;
    
    if (this.moveTimer > 30) {
      this.targetPosition = target.clone();
      this.moveTimer = 0;
    }

    const direction = this.targetPosition.clone().sub(this.position);
    const distance = direction.length();
    
    if (distance > 1.5) {
      direction.normalize();
      const newPosition = this.position.clone().add(direction.multiplyScalar(this.speed * speedMultiplier));
      
      if (level && level.checkCollision) {
        const enemyRadius = this.config.size * 0.6;
        const enemyHeight = this.config.size * 1.6; // Enemy height
        
        if (!level.checkCollision(newPosition, enemyRadius, enemyHeight)) {
          this.position.copy(newPosition);
        } else {
          this.handleObstacleAvoidance(direction, level, enemyRadius, enemyHeight, speedMultiplier);
        }
      } else {
        this.position.copy(newPosition);
      }
      
      if (!this.config.canFly) {
        this.mesh.lookAt(this.targetPosition);
      }
    }
  }

  private handleObstacleAvoidance(direction: THREE.Vector3, level: any, radius: number, height: number, speedMultiplier: number) {
    const angles = [Math.PI / 4, -Math.PI / 4, Math.PI / 2, -Math.PI / 2];
    
    for (const angle of angles) {
      const testDir = direction.clone();
      testDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      const testPos = this.position.clone().add(testDir.multiplyScalar(this.speed * speedMultiplier * 0.8));
      
      if (!level.checkCollision(testPos, radius, height)) {
        this.position.copy(testPos);
        return;
      }
    }
  }

  private handleAttack(playerPosition: THREE.Vector3, distance: number) {
    if (distance < this.config.attackRange && this.attackCooldown <= 0) {
      this.attack();
      this.attackCooldown = 60;
    }

    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
  }

  private handleThrowPhysics(level: any) {
    const oldPosition = this.position.clone();
    this.position.add(this.throwVelocity);
    this.throwVelocity.multiplyScalar(0.95);
    this.throwVelocity.y -= 0.01;
    
    // Check if enemy is stuck
    this.stuckCheckTimer++;
    if (this.stuckCheckTimer > 60) { // Check every second
      const distance = this.position.distanceTo(this.lastPosition);
      if (distance < 0.1 && this.throwVelocity.length() < 0.05) {
        // Enemy is stuck, force it to stop being thrown
        this.isThrown = false;
        this.throwVelocity.set(0, 0, 0);
        this.position.y = this.config.canFly ? this.flyHeight : 0.1;
        this.findSafeLandingPosition(level);
        this.stuckCheckTimer = 0;
        return;
      }
      this.lastPosition.copy(this.position);
      this.stuckCheckTimer = 0;
    }
    
    const enemyRadius = this.config.size * 0.6;
    const enemyHeight = this.config.size * 1.6;
    
    if (level && level.checkCollision && level.checkCollision(this.position, enemyRadius, enemyHeight)) {
      this.position.copy(oldPosition);
      this.findSafeLandingPosition(level);
    }
    
    const groundLevel = this.config.canFly ? 0.1 : 0.1;
    if (this.position.y <= groundLevel) {
      this.position.y = groundLevel;
      this.isThrown = false;
      this.throwVelocity.set(0, 0, 0);
      this.stuckCheckTimer = 0;
      
      if (level && level.checkCollision && level.checkCollision(this.position, enemyRadius, enemyHeight)) {
        this.findSafeLandingPosition(level);
      }
      
      this.takeDamage(30);
      this.mesh.rotation.set(0, this.mesh.rotation.y, 0);
    }
    
    this.mesh.position.copy(this.position);
    this.mesh.rotation.x += 0.2;
    this.mesh.rotation.z += 0.15;
  }

  private shootAtPlayer(playerPosition: THREE.Vector3) {
    const projectileGeometry = new THREE.SphereGeometry(0.05, 8, 8);
    const projectileMaterial = new THREE.MeshPhongMaterial({
      color: 0xff4444,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });
    const projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);
    
    projectileMesh.position.copy(this.position);
    projectileMesh.position.y += this.config.size * 0.5;
    
    const direction = playerPosition.clone().sub(this.position).normalize();
    direction.y += 0.1; // Slight upward aim
    
    this.scene.add(projectileMesh);
    
    const projectile: EnemyProjectile = {
      mesh: projectileMesh,
      velocity: direction.multiplyScalar(0.3),
      damage: this.config.damage,
      life: 180 // 3 seconds
    };
    
    this.projectiles.push(projectile);
  }

  private updateProjectiles() {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      
      projectile.mesh.position.add(projectile.velocity);
      projectile.life--;
      
      if (projectile.life <= 0) {
        this.scene.remove(projectile.mesh);
        projectile.mesh.geometry.dispose();
        (projectile.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
      }
    }
  }

  private explode() {
    if (this.explosionTriggered) return;
    this.explosionTriggered = true;

    // Create explosion effect
    this.createExplosionEffect();
    
    // Mark for removal
    this.health = 0;
  }

  private createExplosionEffect() {
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = Math.random() * 3;

      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      colors[i * 3] = 1;
      colors[i * 3 + 1] = Math.random() * 0.5;
      colors[i * 3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const explosion = new THREE.Points(geometry, material);
    explosion.position.copy(this.position);
    this.scene.add(explosion);

    // Animate explosion
    let scale = 0;
    const animate = () => {
      scale += 0.1;
      explosion.scale.setScalar(scale);
      material.opacity = Math.max(0, 1 - scale * 0.5);
      
      if (scale < 3) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(explosion);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  private attack() {
    this.mesh.scale.set(1.2, 1.2, 1.2);
    setTimeout(() => {
      if (this.mesh) {
        this.mesh.scale.set(1, 1, 1);
      }
    }, 200);
  }

  private findSafeLandingPosition(level: any) {
    if (!level || !level.checkCollision) return;
    
    const enemyRadius = this.config.size * 0.6;
    const enemyHeight = this.config.size * 1.6;
    
    for (let radius = 1; radius <= 5; radius++) {
      for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 8) {
        const testX = this.position.x + Math.cos(angle) * radius;
        const testZ = this.position.z + Math.sin(angle) * radius;
        const testPosition = new THREE.Vector3(testX, this.config.canFly ? this.flyHeight : 0.1, testZ);
        
        if (!level.checkCollision(testPosition, enemyRadius, enemyHeight)) {
          this.position.copy(testPosition);
          return;
        }
      }
    }
    
    // If all else fails, move to a safe default position
    this.position.set(
      (Math.random() - 0.5) * 20, // Random X within arena
      this.config.canFly ? this.flyHeight : 0.1,
      (Math.random() - 0.5) * 20  // Random Z within arena
    );
    
    // Ensure we're not outside arena bounds
    this.position.x = Math.max(-24, Math.min(24, this.position.x));
    this.position.z = Math.max(-24, Math.min(24, this.position.z));
    this.position.y = this.config.canFly ? this.flyHeight : 0.1;
  }

  public takeDamage(amount: number, fromFront: boolean = true) {
    this.aiState.lastDamageTime = Date.now();
    this.aiState.alertLevel = Math.min(100, this.aiState.alertLevel + 25);
    
    // Alert nearby enemies when taking damage
    AICoordinator.getInstance().alertNearbyEnemies(this.id, this.position, []);
    AICoordinator.getInstance().updatePlayerThreatLevel('damage');
    
    // Shield protection for shielded enemies
    if (this.config.hasShield && this.shieldActive && fromFront) {
      amount *= 0.2; // 80% damage reduction from front
      
      // Shield flash effect
      if (this.shield) {
        const material = this.shield.material as THREE.MeshBasicMaterial;
        const originalColor = material.color.getHex();
        material.color.setHex(0xffffff);
        setTimeout(() => {
          material.color.setHex(originalColor);
        }, 100);
      }
    }

    this.health = Math.max(0, this.health - amount);
    
    // Damage flash effect
    this.mesh.children.forEach(child => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
        const originalColor = child.material.color.clone();
        child.material.color.setHex(0xff0000);
        setTimeout(() => {
          if (child.material instanceof THREE.MeshPhongMaterial) {
            child.material.color.copy(originalColor);
          }
        }, 100);
      }
    });

    // Exploder special behavior
    if (this.type === 'exploder' && this.health <= this.maxHealth * 0.3 && !this.explosionTriggered) {
      this.explode();
    }
    
    // Clear cover position when taking damage to find new cover
    this.aiState.coverPosition = null;
  }

  public checkProjectileHit(playerPosition: THREE.Vector3, playerRadius: number = 0.5): boolean {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      const distance = projectile.mesh.position.distanceTo(playerPosition);
      
      if (distance < playerRadius) {
        // Remove projectile
        this.scene.remove(projectile.mesh);
        projectile.mesh.geometry.dispose();
        (projectile.mesh.material as THREE.Material).dispose();
        this.projectiles.splice(i, 1);
        
        return true;
      }
    }
    return false;
  }

  public getExplosionDamage(playerPosition: THREE.Vector3): number {
    if (this.type !== 'exploder' || !this.explosionTriggered) return 0;
    
    const distance = this.position.distanceTo(playerPosition);
    if (distance > this.config.explosionRadius!) return 0;
    
    const damageRatio = 1 - (distance / this.config.explosionRadius!);
    return Math.floor(50 * damageRatio); // Max 50 explosion damage
  }

  public levitate() {
    this.isLevitating = true;
    this.isThrown = false;
  }

  public throw(direction: THREE.Vector3) {
    this.isLevitating = false;
    this.isThrown = true;
    this.throwVelocity = direction.normalize().multiplyScalar(0.3);
    this.throwVelocity.y = 0.1;
  }

  public setPosition(position: THREE.Vector3) {
    this.position.copy(position);
    this.mesh.position.copy(position);
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getType(): EnemyType {
    return this.type;
  }

  public getDamage(): number {
    return this.config.damage;
  }

  public isAlive(): boolean {
    return this.health > 0;
  }

  public isBeingThrown(): boolean {
    return this.isThrown;
  }

  public cleanup(scene: THREE.Scene) {
    // Clean up projectiles
    this.projectiles.forEach(projectile => {
      scene.remove(projectile.mesh);
      projectile.mesh.geometry.dispose();
      (projectile.mesh.material as THREE.Material).dispose();
    });
    this.projectiles = [];

    scene.remove(this.mesh);
    
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }
}