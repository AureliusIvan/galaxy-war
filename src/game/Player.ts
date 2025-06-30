import * as THREE from 'three';
import { Enemy } from './Enemy';
import { ThrowableBox } from './ThrowableBox';
import { ParticleSystem } from './ParticleSystem';
import { AudioManager } from './AudioManager';

export type WeaponType = 'lightsaber' | 'blaster' | 'shotgun';

interface Laser {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  life: number;
}

interface PlayerCallbacks {
  onAmmoChange: (ammo: number, maxAmmo: number) => void;
  onWeaponChange: (weapon: WeaponType) => void;
  onStatusMessage: (message: string, duration?: number) => void;
}

export class Player {
  private camera: THREE.PerspectiveCamera;
  private canvas: HTMLCanvasElement;
  private position = new THREE.Vector3(0, 1.6, 0);
  private velocity = new THREE.Vector3();
  private health = 100;
  private maxHealth = 100;
  private speed = 0.1;
  private baseSpeed = 0.1;
  private maxSpeed = 0.25; // Maximum speed cap
  private _isAttacking = false;
  private attackCooldown = 0;
  private reloadCooldown = 0;
  private isReloading = false;
  private levitatedEnemy: Enemy | null = null;
  private telekinesisParticles: THREE.Points | null = null;
  private levitatedBox: ThrowableBox | null = null;
  private isPointerLocked = false;
  private lastMouseMove = { x: 0, y: 0 };
  private nearestEnemy: Enemy | null = null;
  private nearestBox: ThrowableBox | null = null;
  private lightsaber: THREE.Group | null = null;
  private blaster: THREE.Group | null = null;
  private shotgun: THREE.Group | null = null;
  private scene: THREE.Scene;
  private lasers: Laser[] = [];
  private blasterRecoil = 0;
  private blasterRecoilVelocity = 0;
  private blasterBasePosition = new THREE.Vector3(0, -0.2, -0.6); // Centered position
  private audioManager?: any; // Will be set by Game class
  private particleSystem?: any; // Will be set by Game class
  
  // Weapon system
  private currentWeapon: WeaponType = 'lightsaber';
  private blasterAmmo = 30;
  private maxBlasterAmmo = 30;
  private shotgunAmmo = 8;
  private maxShotgunAmmo = 8;
  private callbacks: Partial<PlayerCallbacks> = {};
  
  // Camera rotation tracking
  private yaw = 0; // Horizontal rotation
  private pitch = 0; // Vertical rotation

  // Jump mechanics
  private isJumping = false;
  private canDoubleJump = false;
  private jumpVelocity = 0;
  private gravity = -0.008; // Gravity force
  private jumpForce = 0.15; // Initial upward force for jump
  private playerHeight = 1.6; // Player's standing height

  // Input tracking
  private keys = {
    forward: false,
    backward: false,
    left: false,
    right: false,
    attack: false,
    telekinesis: false,
    jump: false
  };

  constructor(camera: THREE.PerspectiveCamera, canvas: HTMLCanvasElement, scene: THREE.Scene) {
    this.camera = camera;
    this.canvas = canvas;
    this.scene = scene;
    this.setupControls();
    this.createLightsaber();
    this.createBlaster();
    this.createShotgun();
    this.reset();
  }

  public setAudioManager(audioManager: any) {
    this.audioManager = audioManager;
  }

  public setParticleSystem(particleSystem: any) {
    this.particleSystem = particleSystem;
  }

  public setCallbacks(callbacks: Partial<PlayerCallbacks>) {
    this.callbacks = callbacks;
    
    // Initial callback
    if (this.callbacks.onWeaponChange) {
      this.callbacks.onWeaponChange(this.currentWeapon);
    }
    this.updateAmmoDisplay();
  }

  private createLightsaber() {
    this.lightsaber = new THREE.Group();
    
    // Lightsaber handle
    const handleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a, // Darker handle
      metalness: 0.9,
      roughness: 0.4,
    });
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.06, 0.4);
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.2;
    this.lightsaber.add(handle);

    // Emitter
    const emitterGeometry = new THREE.CylinderGeometry(0.06, 0.07, 0.1);
    const emitterMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 1.0,
        roughness: 0.2
    });
    const emitter = new THREE.Mesh(emitterGeometry, emitterMaterial);
    emitter.position.y = 0.05;
    handle.add(emitter);

    // Activator button
    const activatorGeometry = new THREE.BoxGeometry(0.02, 0.05, 0.02);
    const activatorMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xcc0000,
        emissiveIntensity: 1.5,
    });
    const activator = new THREE.Mesh(activatorGeometry, activatorMaterial);
    activator.position.set(0, -0.1, 0.06);
    handle.add(activator);

    // Decorative rings
    const ringGeometry = new THREE.TorusGeometry(0.055, 0.005, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x111111,
        metalness: 1.0,
        roughness: 0.2,
    });

    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0;
    handle.add(ring1);

    const ring2 = ring1.clone();
    ring2.position.y = -0.15;
    handle.add(ring2);
    
    // Lightsaber blade - new blue color and tapered
    const bladeGeometry = new THREE.CylinderGeometry(0.02, 0.015, 1.5, 8); // Tapered
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x55aaff, 
      transparent: true,
      opacity: 0.9,
      emissive: 0x3388ff,
      emissiveIntensity: 2.0
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.8; // Adjust position because of tapering
    blade.name = 'blade';
    this.lightsaber.add(blade);
    
    // Glow effect - adjusted for blue
    const glowGeometry = new THREE.CylinderGeometry(0.06, 0.05, 1.5, 8); // Tapered glow
    const glowMaterial = new THREE.MeshPhongMaterial({
      color: 0x3388ff,
      transparent: true,
      opacity: 0.5,
      emissive: 0x0033aa,
      emissiveIntensity: 1.5
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.8;
    this.lightsaber.add(glow);
    
    // Lightsaber core - brighter
    const coreGeometry = new THREE.CylinderGeometry(0.008, 0.008, 1.52, 6);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: false,
      opacity: 1.0,
      emissive: 0xffffff,
      emissiveIntensity: 3.0
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 0.8;
    this.lightsaber.add(core);
    
    // Add outer glow for more dramatic effect
    const outerGlowGeometry = new THREE.CylinderGeometry(0.1, 0.08, 1.6, 8); // Tapered
    const outerGlowMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ccff,
      transparent: true,
      opacity: 0.25,
      emissive: 0x001133,
      emissiveIntensity: 1.0,
      side: THREE.FrontSide,
      blending: THREE.AdditiveBlending,
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    outerGlow.position.y = 0.8;
    this.lightsaber.add(outerGlow);
    
    // Position lightsaber relative to camera
    this.lightsaber.position.set(-0.4, -0.3, -0.8);
    this.lightsaber.rotation.x = Math.PI / 8;
    this.lightsaber.rotation.z = -Math.PI / 6;
    this.lightsaber.visible = false;
    
    this.camera.add(this.lightsaber);
  }

  private createBlaster() {
    this.blaster = new THREE.Group();

    // Main Body
    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc, // Light grey, almost white
      metalness: 0.9,
      roughness: 0.35,
    });

    const mainBodyShape = new THREE.Shape();
    mainBodyShape.moveTo(0, 0);
    mainBodyShape.lineTo(0.3, 0);
    mainBodyShape.lineTo(0.35, 0.05);
    mainBodyShape.lineTo(0.45, 0.05);
    mainBodyShape.lineTo(0.5, 0);
    mainBodyShape.lineTo(0.6, 0);
    mainBodyShape.lineTo(0.6, -0.15);
    mainBodyShape.lineTo(0, -0.15);
    mainBodyShape.lineTo(0, 0);

    const extrudeSettings = { depth: 0.1, bevelEnabled: false };
    const bodyGeometry = new THREE.ExtrudeGeometry(mainBodyShape, extrudeSettings);
    const mainBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    mainBody.position.set(-0.3, 0.05, -0.05);
    this.blaster.add(mainBody);

    // Barrel
    const barrelMaterial = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 1.0,
      roughness: 0.2,
    });
    const barrelGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.4, 32);
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.4, 0.025, 0);
    this.blaster.add(barrel);
    
    // Glowing Indicator Stripes
    const indicatorMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ffff,
      emissive: 0x00ffff,
      emissiveIntensity: 5,
      toneMapped: false, // Make it glow bright
    });

    for (let i = 0; i < 3; i++) {
        const indicatorGeometry = new THREE.BoxGeometry(0.1, 0.01, 0.11);
        const indicator = new THREE.Mesh(indicatorGeometry, indicatorMaterial);
        indicator.position.set(0.1 + i * 0.15, 0.02, 0);
        this.blaster.add(indicator);
    }
    
    // Glowing Barrel Tip
    const barrelTipMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 6,
        toneMapped: false,
    });
    const barrelTipGeometry = new THREE.TorusGeometry(0.03, 0.01, 16, 100);
    const barrelTip = new THREE.Mesh(barrelTipGeometry, barrelTipMaterial);
    barrelTip.rotation.y = Math.PI / 2;
    barrelTip.position.set(0.6, 0.025, 0);
    this.blaster.add(barrelTip);

    // Energy Cell
    const energyCellMaterial = new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        emissive: 0x00ffff,
        emissiveIntensity: 4,
        transparent: true,
        opacity: 0.7,
    });
    const energyCellGeometry = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 16);
    const energyCell = new THREE.Mesh(energyCellGeometry, energyCellMaterial);
    energyCell.position.set(0.05, -0.05, 0);
    energyCell.name = "energyCore"; // Keep name for animations
    this.blaster.add(energyCell);

    // Position blaster relative to camera (centered)
    this.blaster.position.set(0, -0.2, -0.6);
    this.blaster.rotation.set(0, -Math.PI / 2, 0); // Point straight forward
    this.blaster.scale.set(0.9, 0.9, 0.9);
    this.blaster.visible = false;
    
    this.camera.add(this.blaster);
  }

  private createShotgun() {
    this.shotgun = new THREE.Group();

    // Main body
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x3d2d1d, metalness: 0.8, roughness: 0.5 });
    const bodyGeometry = new THREE.BoxGeometry(0.15, 0.18, 0.7);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    this.shotgun.add(body);

    // Barrel
    const barrelMaterial = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.9, roughness: 0.3 });
    const barrelGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 12);
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.65);
    this.shotgun.add(barrel);

    // Pump grip
    const pumpGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8);
    const pumpMaterial = new THREE.MeshStandardMaterial({ color: 0x2a1d0d, metalness: 0.7, roughness: 0.6 });
    const pump = new THREE.Mesh(pumpGeometry, pumpMaterial);
    pump.rotation.x = Math.PI / 2;
    pump.position.set(0, -0.02, 0.4);
    this.shotgun.add(pump);

    // Stock
    const stockGeometry = new THREE.BoxGeometry(0.1, 0.15, 0.4);
    const stock = new THREE.Mesh(stockGeometry, bodyMaterial);
    stock.position.z = -0.5;
    this.shotgun.add(stock);
    
    this.shotgun.position.set(0.35, -0.3, -0.8);
    this.shotgun.rotation.set(-Math.PI / 12, Math.PI / 18, 0);
    this.shotgun.visible = false;
    
    // Add to the camera
    this.camera.add(this.shotgun);
  }

  private switchWeapon() {
    const weapons: WeaponType[] = ['lightsaber', 'blaster', 'shotgun'];
    const currentIndex = weapons.indexOf(this.currentWeapon);
    const nextIndex = (currentIndex + 1) % weapons.length;
    this.currentWeapon = weapons[nextIndex];

    this.updateWeaponVisibility();
    
    if (this.callbacks.onWeaponChange) {
      this.callbacks.onWeaponChange(this.currentWeapon);
    }
  }

  private switchToWeapon(weapon: WeaponType) {
    this.currentWeapon = weapon;
    this.updateWeaponVisibility();
    if (this.callbacks.onWeaponChange) {
      this.callbacks.onWeaponChange(this.currentWeapon);
    }
  }

  private updateWeaponVisibility() {
    this.lightsaber!.visible = this.currentWeapon === 'lightsaber' && !this._isAttacking;
    this.blaster!.visible = this.currentWeapon === 'blaster';
    this.shotgun!.visible = this.currentWeapon === 'shotgun';
    this.updateAmmoDisplay();
  }

  private setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (event) => {
      switch (event.code) {
        case 'KeyW': this.keys.forward = true; break;
        case 'KeyS': this.keys.backward = true; break;
        case 'KeyA': this.keys.left = true; break;
        case 'KeyD': this.keys.right = true; break;
        case 'KeyR': 
          if (this.currentWeapon === 'blaster') {
            this.reloadBlaster();
          } else if (this.currentWeapon === 'shotgun') {
            this.reloadShotgun();
          }
          break;
        case 'Space': 
          event.preventDefault(); // Prevent page scroll
          this.jump(); 
          break;
        case 'Digit1': this.switchToWeapon('lightsaber'); break;
        case 'Digit2': this.switchToWeapon('blaster'); break;
        case 'Digit3': this.switchToWeapon('shotgun'); break;
      }
    });

    document.addEventListener('keyup', (event) => {
      switch (event.code) {
        case 'KeyW': this.keys.forward = false; break;
        case 'KeyS': this.keys.backward = false; break;
        case 'KeyA': this.keys.left = false; break;
        case 'KeyD': this.keys.right = false; break;
        case 'Space': this.keys.jump = false; break;
      }
    });

    // Mouse controls
    this.canvas.addEventListener('mousedown', (event) => {
      if (!this.isPointerLocked) return;
      
      if (event.button === 0) { // Left click - weapon attack
        this.keys.attack = true;
        this.attack();
      } else if (event.button === 2) { // Right click - telekinesis
        this.useTelekinesis();
      }
    });

    this.canvas.addEventListener('mouseup', (event) => {
      if (!this.isPointerLocked) return;
      
      if (event.button === 0) { // Left click release
        this.keys.attack = false;
      }
    });

    // Mouse wheel for weapon switching - use passive event listener
    this.canvas.addEventListener('wheel', (event) => {
      if (!this.isPointerLocked) return;
      event.preventDefault();
      
      if (event.deltaY !== 0) {
        this.switchWeapon();
      }
    }, { passive: false }); // Explicitly set passive to false since we need preventDefault

    this.canvas.addEventListener('contextmenu', (event) => {
      event.preventDefault(); // Prevent right-click menu
    });

    // Mouse movement for looking around
    document.addEventListener('mousemove', (event) => {
      if (!this.isPointerLocked) return;

      const sensitivity = 0.002;
      this.yaw -= event.movementX * sensitivity;
      this.pitch -= event.movementY * sensitivity;
      
      // Limit vertical rotation
      this.pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.pitch));
      
      // Apply rotation to camera
      this.updateCameraRotation();
    });
  }

  private updateCameraRotation() {
    // Apply rotations directly to avoid accumulation issues
    this.camera.rotation.order = 'YXZ';
    this.camera.rotation.y = this.yaw;
    this.camera.rotation.x = this.pitch;
    this.camera.rotation.z = 0;
  }

  private jump() {
    if (!this.isPointerLocked) return;
    
    if (!this.isJumping) {
      // First jump
      this.isJumping = true;
      this.jumpVelocity = this.jumpForce;
      this.canDoubleJump = true;
      this.audioManager?.playJumpSound();
    } else if (this.canDoubleJump) {
      // Double jump
      this.jumpVelocity = this.jumpForce * 0.8; // Slightly weaker second jump
      this.canDoubleJump = false;
      this.audioManager?.playJumpSound();
    }
  }

  public setPointerLocked(locked: boolean) {
    this.isPointerLocked = locked;
  }

  private attack() {
    if (this.attackCooldown <= 0 && !this.isReloading) {
      if (this.currentWeapon === 'lightsaber') {
        this.lightsaberAttack();
      } else if (this.currentWeapon === 'blaster') {
        this.blasterAttack();
      } else if (this.currentWeapon === 'shotgun') {
        this.shotgunAttack();
      }
    }
  }

  private lightsaberAttack() {
    this._isAttacking = true;
    this.attackCooldown = 30; // 0.5 seconds at 60fps
    this.audioManager?.playWeaponSound();
    this.showLightsaber();
  }

  private blasterAttack() {
    if (this.blasterAmmo <= 0) {
      this.reloadBlaster();
      return;
    }
    if (this.isReloading) return;
    
    this.blasterAmmo--;
    this.attackCooldown = 8; // Faster fire rate for automatic mode
    this._isAttacking = true;
    this.audioManager?.playWeaponSound();
    
    this.triggerBlasterRecoil();
    
    this.updateAmmoDisplay();
    
    // Auto-reload when ammo runs out
    if (this.blasterAmmo <= 0) {
      setTimeout(() => {
        this.reloadBlaster();
      }, 200); // Small delay before auto-reload
    }
    
    this.shootLaser();
    this.showBlasterMuzzleFlash();
  }

  private shotgunAttack() {
    if (this.shotgunAmmo <= 0) return;
    
    this.shotgunAmmo--;
    this.attackCooldown = 60; // Slower fire rate for shotgun
    this._isAttacking = true;
    this.audioManager?.playWeaponSound('shotgun'); // Assuming a shotgun sound can be added
    
    // Shoot multiple pellets
    for (let i = 0; i < 8; i++) {
      this.shootLaser(true); // Pass a flag to indicate shotgun spread
    }
    
    this.updateAmmoDisplay();
  }

  private shootLaser(isShotgunPellet = false) {
    // Create laser projectile
    const laserGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2.0); // Slightly thinner laser
    const laserMaterial = new THREE.MeshBasicMaterial({
      color: 0xff0000
    });
    const laserMesh = new THREE.Mesh(laserGeometry, laserMaterial);
    
    // Add glow effect to laser
    const glowGeometry = new THREE.CylinderGeometry(0.06, 0.06, 2.0); // Smaller glow
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4444,
      transparent: true,
      opacity: 0.6 // Higher opacity for more defined glow
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    laserMesh.add(glowMesh);
    
    // Position laser at blaster barrel
    const blasterWorldPosition = new THREE.Vector3();
    this.blaster!.getWorldPosition(blasterWorldPosition);
    
    laserMesh.position.copy(this.camera.position);
    laserMesh.position.add(this.camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(0.5));
    
    // Set laser direction and rotation
    const direction = this.camera.getWorldDirection(new THREE.Vector3());

    if (isShotgunPellet) {
        const spread = 0.08;
        direction.x += (Math.random() - 0.5) * spread;
        direction.y += (Math.random() - 0.5) * spread;
        direction.z += (Math.random() - 0.5) * spread;
    }

    laserMesh.lookAt(laserMesh.position.clone().add(direction));
    laserMesh.rotateX(Math.PI / 2);
    
    this.scene.add(laserMesh);
    
    // Create laser trail effect
    if (this.particleSystem) {
      this.particleSystem.createLaserTrailEffect(laserMesh.position.clone(), direction.clone());
    }
    
    // Create laser object
    const laser: Laser = {
      mesh: laserMesh,
      velocity: direction.multiplyScalar(2.0), // Faster laser speed
      damage: 25,
      life: 60 // 1 second at 60fps
    };
    
    this.lasers.push(laser);
  }

  private triggerBlasterRecoil() {
    if (!this.blaster) return;
    this.blasterRecoilVelocity = 0.05; // Minimized recoil kick
  }

  private updateBlasterRecoil() {
    if (!this.blaster) return;

    // Spring physics for minimized recoil
    const springStiffness = 0.15; // Slightly stiffer for quicker return
    const damping = 0.25; // More damping for less oscillation

    // Force pulling back to base position
    const springForce = -this.blasterRecoil * springStiffness;
    
    // Apply spring force
    this.blasterRecoilVelocity += springForce;
    
    // Apply damping
    this.blasterRecoilVelocity *= (1 - damping);
    
    // Update recoil position
    this.blasterRecoil += this.blasterRecoilVelocity;
    
    // Apply minimized recoil to the blaster model
    const recoilDisplacement = new THREE.Vector3(-this.blasterRecoil, this.blasterRecoil * 0.1, 0); // Less vertical movement
    this.blaster.position.copy(this.blasterBasePosition).add(recoilDisplacement);
  }

  private showBlasterMuzzleFlash() {
    if (this.blaster) {
      // Create muzzle flash light effect
      const originalBodyColor = 0x2a2a2a;
      const flashColor = 0xff6600;
      
      // Flash the main body and other components
      this.blaster.children.forEach(child => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
          if (child.position.z > 0.3) { // Only flash forward components
            child.material.color.setHex(flashColor);
            child.material.emissive.setHex(0x331100);
            child.material.emissiveIntensity = 0.8;
          }
        }
      });
      
      // Create muzzle flash light effect
      const muzzleFlash = new THREE.PointLight(0xff6600, 2, 5);
      muzzleFlash.position.set(0, 0.05, 0.65);
      this.blaster.add(muzzleFlash);
      
      setTimeout(() => {
        if (this.blaster) {
          // Restore original colors
          this.blaster.children.forEach(child => {
            if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshPhongMaterial) {
              child.material.color.setHex(originalBodyColor);
              child.material.emissive.setHex(0x000000);
              child.material.emissiveIntensity = 0;
            }
          });
          
          // Remove muzzle flash light
          this.blaster.remove(muzzleFlash);
        }
      }, 80);
    }
  }

  private showLightsaber() {
    if (this.lightsaber) {
      this.lightsaber.visible = true;
      
      // Attack animation
      const blade = this.lightsaber.getObjectByName('blade') as THREE.Mesh;
      if (blade) {
        // Diagonal slash animation
        const startRotation = this.lightsaber.rotation.clone();
        const targetRotation = startRotation.clone();
        targetRotation.z -= Math.PI / 1.5; // Swing further left
        targetRotation.x -= Math.PI / 4;  // Swing down
        
        const duration = 120; // ms
        const startTime = Date.now();

        const animate = () => {
          if (!this.lightsaber) return;

          const elapsed = Date.now() - startTime;
          let progress = elapsed / duration;
          
          if (progress < 1) {
            // Ease-out quadratic
            const easedProgress = progress * (2 - progress);
            this.lightsaber.rotation.z = startRotation.z + (targetRotation.z - startRotation.z) * easedProgress;
            this.lightsaber.rotation.x = startRotation.x + (targetRotation.x - startRotation.x) * easedProgress;
            requestAnimationFrame(animate);
          } else {
            // Reset rotation after attack
            this.lightsaber.rotation.copy(startRotation);
          }
        };
        
        animate();
      }
      
      // Hide lightsaber after attack
      setTimeout(() => {
        if (this.lightsaber && this.currentWeapon !== 'lightsaber') {
          this.lightsaber.visible = false;
        } else if (this.lightsaber && this.currentWeapon === 'lightsaber') {
          this.lightsaber.visible = false;
        }
      }, 1500);
    }
  }

  private useTelekinesis() {
    if (this.levitatedEnemy) {
      // Throw the levitated enemy
      const throwDirection = this.camera.getWorldDirection(new THREE.Vector3());
      this.audioManager?.playThrowSound();
      this.levitatedEnemy.throw(throwDirection);
      
      // Create dramatic throw effect
      this.createTelekinesisThrowEffect(this.levitatedEnemy.getPosition(), throwDirection);
      
      // Clean up telekinesis particles
      this.cleanupTelekinesisParticles();
      this.levitatedEnemy = null;
    } else if (this.levitatedBox) {
      // Throw the levitated box
      const throwDirection = this.camera.getWorldDirection(new THREE.Vector3());
      this.audioManager?.playThrowSound();
      this.levitatedBox.throw(throwDirection);
      
      // Create throw effect
      this.createTelekinesisThrowEffect(this.levitatedBox.getPosition(), throwDirection);
      
      // Clean up telekinesis particles
      this.cleanupTelekinesisParticles();
      this.levitatedBox = null;
    } else {
      // Try to levitate an enemy
      if (this.nearestEnemy) {
        this.audioManager?.playWeaponSound();
        this.levitatedEnemy = this.nearestEnemy;
        this.levitatedEnemy.levitate();
        
        // Create telekinesis visual effects
        this.createTelekinesisEffect(this.levitatedEnemy.getPosition());
        
        // Add screen shake effect
        this.addCameraShake();
      } else if (this.nearestBox && this.nearestBox.canBePickedUp()) {
        // Levitate a box instead
        this.audioManager?.playWeaponSound();
        this.levitatedBox = this.nearestBox;
        this.levitatedBox.levitate();
        
        // Create telekinesis visual effects
        this.createTelekinesisEffect(this.levitatedBox.getPosition());
        
        // Add screen shake effect
        this.addCameraShake();
      }
    }
  }

  private createTelekinesisEffect(position: THREE.Vector3) {
    // Create swirling particle effect around the levitated enemy
    const particleCount = 100;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Create spiral pattern around enemy
      const angle = (i / particleCount) * Math.PI * 4;
      const radius = 2 + Math.random() * 2;
      const height = (Math.random() - 0.5) * 4;
      
      positions[i * 3] = position.x + Math.cos(angle) * radius;
      positions[i * 3 + 1] = position.y + height;
      positions[i * 3 + 2] = position.z + Math.sin(angle) * radius;

      // Purple/blue telekinesis colors
      colors[i * 3] = 0.5 + Math.random() * 0.5; // Red
      colors[i * 3 + 1] = 0.2 + Math.random() * 0.3; // Green  
      colors[i * 3 + 2] = 1; // Blue
      
      // Store velocities for animation
      velocities[i * 3] = (Math.random() - 0.5) * 0.02;
      velocities[i * 3 + 1] = Math.random() * 0.05;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.02;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.userData = { velocities: velocities };

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    this.telekinesisParticles = new THREE.Points(geometry, material);
    this.scene.add(this.telekinesisParticles);
  }

  private createTelekinesisThrowEffect(position: THREE.Vector3, direction: THREE.Vector3) {
    // Create explosion-like effect when throwing
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Spread particles in throw direction with some randomness
      const spread = 1.5;
      const forward = direction.clone().multiplyScalar(Math.random() * 3);
      const random = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      );
      
      const finalPos = position.clone().add(forward).add(random);
      
      positions[i * 3] = finalPos.x;
      positions[i * 3 + 1] = finalPos.y;
      positions[i * 3 + 2] = finalPos.z;

      // Bright purple/white colors for throw effect
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5;
      colors[i * 3 + 2] = 1;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending
    });

    const throwParticles = new THREE.Points(geometry, material);
    this.scene.add(throwParticles);

    // Animate and remove particles
    let opacity = 1;
    const animate = () => {
      opacity -= 0.05;
      if (material.opacity) {
        material.opacity = opacity;
      }
      
      if (opacity <= 0) {
        this.scene.remove(throwParticles);
        geometry.dispose();
        material.dispose();
      } else {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  private addCameraShake() {
    // Add subtle camera shake for telekinesis
    const originalPosition = this.camera.position.clone();
    const shakeIntensity = 0.05;
    const shakeDuration = 20; // frames
    let shakeTimer = 0;
    
    const shake = () => {
      if (shakeTimer < shakeDuration) {
        const shakeX = (Math.random() - 0.5) * shakeIntensity;
        const shakeY = (Math.random() - 0.5) * shakeIntensity;
        const shakeZ = (Math.random() - 0.5) * shakeIntensity;
        
        this.camera.position.set(
          originalPosition.x + shakeX,
          originalPosition.y + shakeY,
          originalPosition.z + shakeZ
        );
        
        shakeTimer++;
        requestAnimationFrame(shake);
      } else {
        this.camera.position.copy(originalPosition);
      }
    };
    shake();
  }

  private cleanupTelekinesisParticles() {
    if (this.telekinesisParticles) {
      this.scene.remove(this.telekinesisParticles);
      this.telekinesisParticles.geometry.dispose();
      if (this.telekinesisParticles.material instanceof THREE.PointsMaterial) {
        this.telekinesisParticles.material.dispose();
      }
      this.telekinesisParticles = null;
    }
  }

  private updateTelekinesisParticles() {
    if (this.telekinesisParticles && this.levitatedEnemy) {
      const positions = this.telekinesisParticles.geometry.attributes.position.array as Float32Array;
      const velocities = this.telekinesisParticles.geometry.userData.velocities as Float32Array;
      const enemyPos = this.levitatedEnemy.getPosition();
      const time = Date.now() * 0.005;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Create swirling motion around the enemy
        const angle = time + (i / 3) * 0.2;
        const radius = 2 + Math.sin(time + i * 0.1) * 0.5;
        const height = Math.sin(time * 2 + i * 0.05) * 1.5;
        
        positions[i] = enemyPos.x + Math.cos(angle) * radius;
        positions[i + 1] = enemyPos.y + height + 1;
        positions[i + 2] = enemyPos.z + Math.sin(angle) * radius;
      }
      
      this.telekinesisParticles.geometry.attributes.position.needsUpdate = true;
    } else if (this.telekinesisParticles && this.levitatedBox) {
      const positions = this.telekinesisParticles.geometry.attributes.position.array as Float32Array;
      const boxPos = this.levitatedBox.getPosition();
      const time = Date.now() * 0.005;
      
      for (let i = 0; i < positions.length; i += 3) {
        // Create swirling motion around the box
        const angle = time + (i / 3) * 0.2;
        const radius = 1.5 + Math.sin(time + i * 0.1) * 0.3;
        const height = Math.sin(time * 2 + i * 0.05) * 1.0;
        
        positions[i] = boxPos.x + Math.cos(angle) * radius;
        positions[i + 1] = boxPos.y + height + 0.5;
        positions[i + 2] = boxPos.z + Math.sin(angle) * radius;
      }
      
      this.telekinesisParticles.geometry.attributes.position.needsUpdate = true;
    }
  }

  public updateLasers(enemies: Enemy[], level: any): { hitEnemies: Enemy[], lasersToRemove: number[] } {
    const hitEnemies: Enemy[] = [];
    const lasersToRemove: number[] = [];

    this.lasers.forEach((laser, index) => {
      const oldPosition = laser.mesh.position.clone();
      
      // Update laser position
      laser.mesh.position.add(laser.velocity);
      laser.life--;
      
      // Create continuous trail effect for moving laser
      if (this.particleSystem && laser.life > 10) {
        this.particleSystem.createLaserTrailEffect(laser.mesh.position.clone(), laser.velocity.clone().normalize());
      }
      
      // Fade out laser as it approaches end of life
      if (laser.life <= 20) {
        const fadePercent = laser.life / 20;
        
        // Fade the main laser material
        if (laser.mesh.material instanceof THREE.MeshBasicMaterial) {
          laser.mesh.material.opacity = fadePercent;
          laser.mesh.material.transparent = true;
        }
        
        // Fade the glow effect
        const glowMesh = laser.mesh.children[0] as THREE.Mesh;
        if (glowMesh && glowMesh.material instanceof THREE.MeshBasicMaterial) {
          glowMesh.material.opacity = 0.6 * fadePercent;
        }
        
        // Scale down the laser as it fades
        const scale = 0.5 + (fadePercent * 0.5); // Scale from 0.5 to 1.0
        laser.mesh.scale.setScalar(scale);
      }
      
      // Check collision with level geometry
      if (level.checkCollision && level.checkCollision(laser.mesh.position, 0.1, 0.03)) {
        lasersToRemove.push(index);
        return;
      }

      // Check collision with enemies
      enemies.forEach(enemy => {
        if (!enemy.isAlive()) return;
        
        const distance = laser.mesh.position.distanceTo(enemy.getPosition());
        if (distance < 1.5) {
          enemy.takeDamage(laser.damage);
          hitEnemies.push(enemy);
          lasersToRemove.push(index);
        }
      });

      // Remove laser if it's out of range or time
      if (laser.life <= 0 || laser.mesh.position.distanceTo(this.position) > 50) {
        lasersToRemove.push(index);
      }
    });

    // Remove expired lasers (in reverse order to maintain indices)
    lasersToRemove.reverse().forEach(index => {
      if (this.lasers[index]) {
        this.scene.remove(this.lasers[index].mesh);
        this.lasers[index].mesh.geometry.dispose();
        if (this.lasers[index].mesh.material instanceof THREE.Material) {
          this.lasers[index].mesh.material.dispose();
        }
        this.lasers.splice(index, 1);
      }
    });

    return { hitEnemies, lasersToRemove };
  }

  public handleAttacks(enemies: Enemy[], boxes: ThrowableBox[] = []) {
    // Update nearest enemy for telekinesis
    let nearest: Enemy | null = null;
    let nearestDistance = Infinity;

    enemies.forEach(enemy => {
      if (!enemy.isAlive()) return;
      
      const distance = enemy.getPosition().distanceTo(this.position);
      const direction = enemy.getPosition().clone().sub(this.position).normalize();
      const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
      const dot = direction.dot(cameraDirection);

      // Check if enemy is in front of player and within range
      if (distance < 10 && dot > 0.5 && distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });

    // Store reference for telekinesis
    this.nearestEnemy = nearest;
    
    // Update nearest box for telekinesis
    let nearestBox: ThrowableBox | null = null;
    let nearestBoxDistance = Infinity;

    boxes.forEach(box => {
      if (!box.canBePickedUp()) return;
      
      const distance = box.getPosition().distanceTo(this.position);
      const direction = box.getPosition().clone().sub(this.position).normalize();
      const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
      const dot = direction.dot(cameraDirection);

      // Check if box is in front of player and within range
      if (distance < 8 && dot > 0.5 && distance < nearestBoxDistance) {
        nearestBox = box;
        nearestBoxDistance = distance;
      }
    });

    this.nearestBox = nearestBox;
  }

  public update(level?: any) {
    // Update movement
    this.updateMovement(level);
    
    // Update attack cooldown
    if (this.attackCooldown > 0) {
      this.attackCooldown--;
    }
    
    // Handle automatic firing for blaster
    if (this.keys.attack && this.currentWeapon === 'blaster' && this.attackCooldown <= 0 && !this.isReloading) {
      this.blasterAttack();
    }
    
    // Update reload cooldown
    if (this.reloadCooldown > 0) {
      this.reloadCooldown--;
      if (this.reloadCooldown === 0) {
        this.isReloading = false;
      }
    }
    
    if (this._isAttacking && this.attackCooldown <= 5) {
      this._isAttacking = false;
    }

    // Update telekinesis particle effects
    this.updateTelekinesisParticles();

    this.updateBlasterRecoil();

    // Update camera position
    this.camera.position.copy(this.position);

    // Update weapon visibility and animations
    if (this.currentWeapon === 'blaster' && this.blaster) {
      this.blaster.visible = true;
      if (this.lightsaber) this.lightsaber.visible = false;
    } else if (this.currentWeapon === 'lightsaber' && this.lightsaber) {
      if (!this._isAttacking) {
          this.lightsaber.visible = true;
          // Idle animation
          const time = Date.now() * 0.002;
          this.lightsaber.position.y = -0.3 + Math.sin(time) * 0.02;
          this.lightsaber.rotation.z = -Math.PI / 6 + Math.cos(time * 0.5) * 0.05;
      }
      if (this.blaster) this.blaster.visible = false;
    }
  }

  private updateMovement(level?: any) {
    this.velocity.set(0, 0, 0);

    // Get camera direction vectors
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0));

    // Apply movement based on input
    if (this.keys.forward) this.velocity.add(forward.clone().multiplyScalar(this.speed));
    if (this.keys.backward) this.velocity.add(forward.clone().multiplyScalar(-this.speed));
    if (this.keys.left) this.velocity.add(right.clone().multiplyScalar(-this.speed));
    if (this.keys.right) this.velocity.add(right.clone().multiplyScalar(this.speed));

    // Enhanced collision detection
    const newPosition = this.position.clone().add(this.velocity);
    
    // Apply gravity and handle jumping
    if (this.isJumping) {
      this.jumpVelocity += this.gravity;
      this.position.y += this.jumpVelocity;

      // Check for landing
      if (this.position.y <= this.playerHeight) {
        this.position.y = this.playerHeight;
        this.isJumping = false;
        this.jumpVelocity = 0;
        this.canDoubleJump = false;
        this.audioManager?.playLandingSound();
        
        // Create landing particle effect
        if (this.particleSystem) {
          this.particleSystem.createLandingEffect(this.position.clone());
        }
      }
    }
    
    if (level && level.checkCollision) {
      // Use larger collision radius for more reliable collision detection
      const collisionRadius = 0.6;
      const playerHeight = this.playerHeight;
      
      if (!level.checkCollision(newPosition, collisionRadius, playerHeight)) {
        this.position.copy(newPosition);
      } else {
        // Enhanced wall sliding - try each axis separately
        const testX = this.position.clone();
        testX.x = newPosition.x;
        if (!level.checkCollision(testX, collisionRadius, playerHeight)) {
          this.position.x = newPosition.x;
        }
        
        const testZ = this.position.clone();
        testZ.z = newPosition.z;
        if (!level.checkCollision(testZ, collisionRadius, playerHeight)) {
          this.position.z = newPosition.z;
        }
        
        // Simplified collision handling for better performance
        if (level.checkCollision(testX, collisionRadius, playerHeight) && level.checkCollision(testZ, collisionRadius, playerHeight)) {
          // Only try one reduced movement instead of multiple micro-movements
          const reducedVelocity = this.velocity.clone().multiplyScalar(0.3);
          const reducedPosition = this.position.clone().add(reducedVelocity);
          if (!level.checkCollision(reducedPosition, collisionRadius, playerHeight)) {
            this.position.copy(reducedPosition);
          }
          // If still blocked, just don't move this frame
        }
      }
    } else {
      this.position.copy(newPosition);
    }

    // Keep player above ground
    this.position.y = Math.max(this.playerHeight, this.position.y);
  }

  private reloadBlaster() {
    if (this.blasterAmmo >= this.maxBlasterAmmo || this.isReloading || this.reloadCooldown > 0) {
      return;
    }
    this.callbacks.onStatusMessage?.('Reloading Blaster...', 1500);
    this.isReloading = true;
    this.reloadCooldown = 90; // 1.5 seconds at 60fps
    
    // Animate reload
    this.animateReload();
    
    setTimeout(() => {
      this.blasterAmmo = this.maxBlasterAmmo;
      this.isReloading = false;
      this.updateAmmoDisplay();
    }, 1500);
  }
  
  private animateReload() {
    const weapon = this.currentWeapon === 'blaster' ? this.blaster : this.shotgun;
    if (!weapon) return;

    const originalPosition = weapon.position.clone();
    const originalRotation = weapon.rotation.clone();
    
    let duration = 1200; // Total duration of animation
    let downwardMotion = -0.2;
    let rotation = -Math.PI / 4;

    if (this.currentWeapon === 'shotgun') {
        duration = 1800; // Longer for shotgun pump
        downwardMotion = -0.3;
        rotation = -Math.PI / 6;
    }

    const startTime = Date.now();

    const animate = () => {
        const elapsed = Date.now() - startTime;
        let progress = elapsed / duration;

        if (progress >= 1) {
            weapon.position.copy(originalPosition);
            weapon.rotation.copy(originalRotation);
            return;
        }

        // Use a sinusoidal ease-in-out for smooth motion
        progress = 0.5 * (1 - Math.cos(progress * Math.PI));

        // Animation sequence
        if (this.currentWeapon === 'blaster') {
            // Quick downward snap and tilt
            const peak = 0.5; // at what point animation changes
            if (progress < peak) {
                const phaseProgress = progress / peak;
                weapon.position.y = originalPosition.y + downwardMotion * phaseProgress;
                weapon.rotation.x = originalRotation.x + rotation * phaseProgress;
                weapon.rotation.z = originalRotation.z + (rotation / 2) * phaseProgress;
            } else {
                const phaseProgress = (progress - peak) / (1 - peak);
                weapon.position.y = (originalPosition.y + downwardMotion) - (downwardMotion * phaseProgress);
                weapon.rotation.x = (originalRotation.x + rotation) - (rotation * phaseProgress);
                weapon.rotation.z = (originalRotation.z + rotation / 2) - ((rotation/2) * phaseProgress);
            }
        } else if (this.currentWeapon === 'shotgun') {
            // Pumping animation
            const pumpTime = 0.4;
            const returnTime = 0.8;
            
            if (progress < pumpTime) { // "Pump back"
                const phaseProgress = progress / pumpTime;
                weapon.position.z = originalPosition.z - 0.2 * phaseProgress;
            } else if (progress < returnTime) { // Hold
                 weapon.position.z = originalPosition.z - 0.2;
            } else { // "Pump forward"
                const phaseProgress = (progress - returnTime) / (1 - returnTime);
                weapon.position.z = (originalPosition.z - 0.2) + (0.2 * phaseProgress);
            }
        }
        
        requestAnimationFrame(animate);
    };
    
    animate();
  }
  
  public getReloadProgress(): number {
    if (!this.isReloading) return 1;
    return 1 - (this.reloadCooldown / 90);
  }
  
  public isCurrentlyReloading(): boolean {
    return this.isReloading;
  }

  // Add method to manually reload (for UI button if needed)
  public manualReload() {
    this.blasterAmmo = this.maxBlasterAmmo;
    if (this.callbacks.onAmmoChange) {
      this.callbacks.onAmmoChange(this.blasterAmmo, this.maxBlasterAmmo);
    }
    
    // Play reload sound
    this.audioManager?.playReloadSound();
  }

  public reset() {
    this.position.set(0, this.playerHeight, 0);
    this.velocity.set(0, 0, 0);
    this.health = this.maxHealth;
    this.speed = this.baseSpeed; // Reset speed to base
    this.camera.position.copy(this.position);
    this.yaw = 0;
    this.pitch = 0;
    this.isJumping = false;
    this.canDoubleJump = false;
    this.jumpVelocity = 0;
    this.updateCameraRotation();
    this.levitatedEnemy = null;
    this.levitatedBox = null;
    this.currentWeapon = 'lightsaber';
    this.blasterAmmo = this.maxBlasterAmmo;
    this.isReloading = false;
    this.reloadCooldown = 0;
    
    // Clear all lasers
    this.cleanupTelekinesisParticles();
    this.lasers.forEach(laser => {
      this.scene.remove(laser.mesh);
      laser.mesh.geometry.dispose();
      if (laser.mesh.material instanceof THREE.Material) {
        laser.mesh.material.dispose();
      }
    });
    this.lasers = [];
    
    // Reset weapon visibility
    if (this.lightsaber) this.lightsaber.visible = false;
    if (this.blaster) this.blaster.visible = false;
    
    // Trigger callbacks
    if (this.callbacks.onAmmoChange) this.callbacks.onAmmoChange(this.blasterAmmo, this.maxBlasterAmmo);
    if (this.callbacks.onWeaponChange) this.callbacks.onWeaponChange(this.currentWeapon);
  }

  public takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
  }

  public heal(amount: number) {
    this.health = Math.min(this.maxHealth, this.health + amount);
  }

  public increaseSpeed(multiplier: number) {
    const newSpeed = this.speed * multiplier;
    this.speed = Math.min(newSpeed, this.maxSpeed); // Cap the speed
    setTimeout(() => {
      this.speed = this.baseSpeed; // Reset to base speed after boost
    }, 10000); // Speed boost lasts 10 seconds
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public getHealth(): number {
    return this.health;
  }

  public isAttacking(): boolean {
    return this._isAttacking;
  }

  public getCurrentWeapon(): WeaponType {
    return this.currentWeapon;
  }
  
  public getCurrentSpeed(): number {
    return this.speed;
  }
  
  public getMaxSpeed(): number {
    return this.maxSpeed;
  }

  public getBlasterAmmo(): number {
    return this.blasterAmmo;
  }

  public getLevitatedEnemy(): Enemy | null {
    return this.levitatedEnemy;
  }
  
  public getLevitatedBox(): ThrowableBox | null {
    return this.levitatedBox;
  }

  public setLevitatedEnemy(enemy: Enemy | null) {
    this.levitatedEnemy = enemy;
  }

  public findTargetBox(boxes: ThrowableBox[]): ThrowableBox | null {
    let nearest: ThrowableBox | null = null;
    let nearestDistance = Infinity;

    boxes.forEach(box => {
      if (!box.canBePickedUp()) return;
      
      const distance = box.getPosition().distanceTo(this.position);
      const direction = box.getPosition().clone().sub(this.position).normalize();
      const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
      const dot = direction.dot(cameraDirection);

      // Check if box is in front of player and within range
      if (distance < 8 && dot > 0.7 && distance < nearestDistance) {
        nearest = box;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  public findTargetEnemy(enemies: Enemy[]): Enemy | null {
    let nearest: Enemy | null = null;
    let nearestDistance = Infinity;

    enemies.forEach(enemy => {
      if (!enemy.isAlive()) return;
      
      const distance = enemy.getPosition().distanceTo(this.position);
      const direction = enemy.getPosition().clone().sub(this.position).normalize();
      const cameraDirection = this.camera.getWorldDirection(new THREE.Vector3());
      const dot = direction.dot(cameraDirection);

      // Check if enemy is in front of player and within range
      if (distance < 10 && dot > 0.7 && distance < nearestDistance) {
        nearest = enemy;
        nearestDistance = distance;
      }
    });

    return nearest;
  }

  public cleanup() {
    // Clean up lasers
    this.lasers.forEach(laser => {
      this.scene.remove(laser.mesh);
      laser.mesh.geometry.dispose();
      if (laser.mesh.material instanceof THREE.Material) {
        laser.mesh.material.dispose();
      }
    });
    this.lasers = [];

    // Clean up weapons
    this.cleanupTelekinesisParticles();
    
    if (this.lightsaber) {
      this.camera.remove(this.lightsaber);
      this.lightsaber.traverse((child) => {
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

    if (this.blaster) {
      this.camera.remove(this.blaster);
      this.blaster.traverse((child) => {
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

  private updateAmmoDisplay() {
    if (this.currentWeapon === 'blaster') {
      this.callbacks.onAmmoChange?.(this.blasterAmmo, this.maxBlasterAmmo);
    } else if (this.currentWeapon === 'shotgun') {
      this.callbacks.onAmmoChange?.(this.shotgunAmmo, this.maxShotgunAmmo);
    } else {
      this.callbacks.onAmmoChange?.(-1, -1); // No ammo for lightsaber
    }
  }

  private reloadShotgun() {
    if (this.shotgunAmmo >= this.maxShotgunAmmo || this.isReloading || this.reloadCooldown > 0) {
      return;
    }
    this.callbacks.onStatusMessage?.('Reloading Shotgun...', 2000);
    this.isReloading = true;
    this.reloadCooldown = 120; // Slower reload for shotgun
    
    // Animate reload (can be a different animation)
    this.animateReload(); 
    
    setTimeout(() => {
      this.shotgunAmmo = this.maxShotgunAmmo;
      this.isReloading = false;
      this.updateAmmoDisplay();
    }, 2000);
  }
}