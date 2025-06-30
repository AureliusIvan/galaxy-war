import * as THREE from 'three';
import { Enemy } from './Enemy';
import { ThrowableBox } from './ThrowableBox';

export type WeaponType = 'lightsaber' | 'blaster' | 'shotgun';

interface Laser {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  damage: number;
  life: number;
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
  private audioManager?: any; // Will be set by Game class
  private particleSystem?: any; // Will be set by Game class
  
  // Weapon system
  private currentWeapon: WeaponType = 'lightsaber';
  private blasterAmmo = 30;
  private maxBlasterAmmo = 30;
  private shotgunAmmo = 8;
  private maxShotgunAmmo = 8;
  private onAmmoChange?: (ammo: number, maxAmmo: number) => void;
  private onWeaponChange?: (weapon: WeaponType) => void;
  
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

  public setCallbacks(callbacks: { onAmmoChange?: (ammo: number, maxAmmo: number) => void, onWeaponChange?: (weapon: WeaponType) => void }) {
    this.onAmmoChange = callbacks.onAmmoChange;
    this.onWeaponChange = callbacks.onWeaponChange;
    
    // Initial callback
    this.updateAmmoDisplay();
    if (this.onWeaponChange) this.onWeaponChange(this.currentWeapon);
  }

  private createLightsaber() {
    this.lightsaber = new THREE.Group();
    
    // Lightsaber handle
    const handleMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x4a4a4a,
      metalness: 0.8,
      roughness: 0.3,
    });
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.06, 0.4);
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);
    handle.position.y = -0.2;
    this.lightsaber.add(handle);

    // Activator button
    const activatorGeometry = new THREE.BoxGeometry(0.02, 0.05, 0.02);
    const activatorMaterial = new THREE.MeshStandardMaterial({
        color: 0xff0000,
        emissive: 0xaa0000,
        emissiveIntensity: 1,
    });
    const activator = new THREE.Mesh(activatorGeometry, activatorMaterial);
    activator.position.set(0, -0.1, 0.05);
    handle.add(activator);

    // Decorative rings
    const ringGeometry = new THREE.TorusGeometry(0.055, 0.005, 16, 32);
    const ringMaterial = new THREE.MeshStandardMaterial({
        color: 0x222222,
        metalness: 0.9,
        roughness: 0.2,
    });

    const ring1 = new THREE.Mesh(ringGeometry, ringMaterial);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0;
    handle.add(ring1);

    const ring2 = ring1.clone();
    ring2.position.y = -0.15;
    handle.add(ring2);
    
    // Lightsaber blade - use MeshPhongMaterial for emissive properties
    const bladeGeometry = new THREE.CylinderGeometry(0.013, 0.013, 1.5);
    const bladeMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x00ffff, 
      transparent: true,
      opacity: 0.9,
      emissive: 0x00ffff,
      emissiveIntensity: 1.5
    });
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.y = 0.6;
    blade.name = 'blade';
    this.lightsaber.add(blade);
    
    // Add glow effect - use MeshPhongMaterial for emissive properties
    const glowGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.5);
    const glowMaterial = new THREE.MeshPhongMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0.6,
      emissive: 0x004444,
      emissiveIntensity: 1.2
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.y = 0.6;
    this.lightsaber.add(glow);
    
    // Add outer glow for more dramatic effect - use MeshPhongMaterial for emissive properties
    const outerGlowGeometry = new THREE.CylinderGeometry(0.08, 0.08, 1.6);
    const outerGlowMaterial = new THREE.MeshPhongMaterial({
      color: 0x88ffff,
      transparent: true,
      opacity: 0.4,
      emissive: 0x002222,
      emissiveIntensity: 0.8
    });
    const outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
    outerGlow.position.y = 0.6;
    this.lightsaber.add(outerGlow);
    
    // Add lightsaber core for more intensity - use MeshPhongMaterial for emissive properties
    const coreGeometry = new THREE.CylinderGeometry(0.01, 0.01, 1.5);
    const coreMaterial = new THREE.MeshPhongMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 1.0,
      emissive: 0xffffff,
      emissiveIntensity: 2.0
    });
    const core = new THREE.Mesh(coreGeometry, coreMaterial);
    core.position.y = 0.6;
    this.lightsaber.add(core);
    
    // Add additional bright glow effect - use MeshPhongMaterial for emissive properties
    const superGlowGeometry = new THREE.CylinderGeometry(0.1, 0.1, 1.8);
    const superGlowMaterial = new THREE.MeshPhongMaterial({
      color: 0xaaffff,
      transparent: true,
      opacity: 0.3,
      emissive: 0x003333,
      emissiveIntensity: 1.5
    });
    const superGlow = new THREE.Mesh(superGlowGeometry, superGlowMaterial);
    superGlow.position.y = 0.6;
    this.lightsaber.add(superGlow);
    
    // Position lightsaber relative to camera
    this.lightsaber.position.set(-0.4, -0.3, -0.8);
    this.lightsaber.rotation.x = Math.PI / 8;
    this.lightsaber.rotation.z = -Math.PI / 6;
    this.lightsaber.visible = false;
    
    this.camera.add(this.lightsaber);
  }

  private createBlaster() {
    this.blaster = new THREE.Group();
    
    // Main blaster body - more detailed design
    const bodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2a2a2a,
      metalness: 0.7,
      roughness: 0.4,
    });
    const bodyGeometry = new THREE.BoxGeometry(0.12, 0.22, 0.5);
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.z = -0.1;
    this.blaster.add(body);
    
    // Upper body section
    const upperBodyMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.3,
    });
    const upperBodyGeometry = new THREE.BoxGeometry(0.1, 0.08, 0.45);
    const upperBody = new THREE.Mesh(upperBodyGeometry, upperBodyMaterial);
    upperBody.position.set(0, 0.12, -0.05);
    this.blaster.add(upperBody);
    
    // Main barrel - longer and more detailed
    const barrelMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.2,
    });
    const barrelGeometry = new THREE.CylinderGeometry(0.025, 0.03, 0.45, 12); // Slightly longer and more polys
    const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.05, 0.42); // Adjusted position
    this.blaster.add(barrel);
    
    // Barrel tip with energy chamber
    const barrelTipMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x0066cc,
      metalness: 0.5,
      roughness: 0.1,
      emissive: 0x00aaff,
      emissiveIntensity: 2,
    });
    const barrelTipGeometry = new THREE.CylinderGeometry(0.035, 0.025, 0.08);
    const barrelTip = new THREE.Mesh(barrelTipGeometry, barrelTipMaterial);
    barrelTip.rotation.x = Math.PI / 2;
    barrelTip.position.set(0, 0.05, 0.6);
    this.blaster.add(barrelTip);
    
    // Enhanced grip with texture details
    const gripMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x2d2d2d,
      metalness: 0.6,
      roughness: 0.6,
    });
    const gripGeometry = new THREE.BoxGeometry(0.06, 0.18, 0.1);
    const grip = new THREE.Mesh(gripGeometry, gripMaterial);
    grip.position.set(0, -0.18, -0.15);
    this.blaster.add(grip);
    
    // Trigger guard
    const triggerGuardMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x444444,
      metalness: 0.8,
      roughness: 0.2,
    });
    const triggerGuardGeometry = new THREE.TorusGeometry(0.05, 0.008, 8, 16, Math.PI);
    const triggerGuard = new THREE.Mesh(triggerGuardGeometry, triggerGuardMaterial);
    triggerGuard.position.set(0, -0.1, -0.05);
    triggerGuard.rotation.x = Math.PI / 2;
    this.blaster.add(triggerGuard);
    
    // Trigger
    const triggerMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x666666,
      metalness: 0.9,
      roughness: 0.1,
    });
    const triggerGeometry = new THREE.BoxGeometry(0.02, 0.04, 0.01);
    const trigger = new THREE.Mesh(triggerGeometry, triggerMaterial);
    trigger.position.set(0, -0.08, -0.05);
    trigger.name = 'trigger'; // Name it for recoil animation
    this.blaster.add(trigger);
    
    // Scope rail
    const scopeRailMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x1a1a1a,
      metalness: 0.8,
      roughness: 0.2,
    });
    const scopeRailGeometry = new THREE.BoxGeometry(0.08, 0.02, 0.3);
    const scopeRail = new THREE.Mesh(scopeRailGeometry, scopeRailMaterial);
    scopeRail.position.set(0, 0.16, 0);
    this.blaster.add(scopeRail);
    
    // Mini scope
    const scopeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      metalness: 0.9,
      roughness: 0.1,
    });
    const scopeGeometry = new THREE.CylinderGeometry(0.02, 0.025, 0.08);
    const scope = new THREE.Mesh(scopeGeometry, scopeMaterial);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.18, 0.1);
    this.blaster.add(scope);
    
    // Energy core/power cell
    const energyCoreMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 3,
      transparent: true,
      opacity: 0.8
    });
    const energyCoreGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.12);
    const energyCore = new THREE.Mesh(energyCoreGeometry, energyCoreMaterial);
    energyCore.position.set(0.04, 0, -0.2);
    energyCore.name = 'energyCore'; // For recoil animation
    this.blaster.add(energyCore);
    
    // Side vents
    const ventMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      metalness: 0.9,
      roughness: 0.2,
    });
    for (let i = 0; i < 3; i++) {
      const ventGeometry = new THREE.BoxGeometry(0.015, 0.03, 0.002);
      const vent = new THREE.Mesh(ventGeometry, ventMaterial);
      vent.position.set(0.065, 0.02 - (i * 0.02), 0.1 + (i * 0.08));
      this.blaster.add(vent);
      
      // Mirror on the other side
      const vent2 = vent.clone();
      vent2.position.x = -0.065;
      this.blaster.add(vent2);
    }
    
    // Ammo counter display (small rectangular screen)
    const ammoDisplayMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ccff,
      emissive: 0x00aaff,
      emissiveIntensity: 4,
    });
    const ammoDisplayGeometry = new THREE.BoxGeometry(0.04, 0.02, 0.002);
    const ammoDisplay = new THREE.Mesh(ammoDisplayGeometry, ammoDisplayMaterial);
    ammoDisplay.position.set(-0.04, 0.08, -0.15);
    ammoDisplay.name = 'ammoDisplay';
    this.blaster.add(ammoDisplay);
    
    // Position blaster relative to camera
    this.blaster.position.set(0.35, -0.25, -0.7);
    this.blaster.rotation.set(-Math.PI / 10, Math.PI / 24, 0);
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
    
    if (this.onWeaponChange) {
      this.onWeaponChange(this.currentWeapon);
    }
  }

  private switchToWeapon(weapon: WeaponType) {
    this.currentWeapon = weapon;
    this.updateWeaponVisibility();
    if (this.onWeaponChange) {
      this.onWeaponChange(this.currentWeapon);
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
    if (this.blasterAmmo <= 0) return;
    if (this.blasterAmmo <= 0) {
      this.reloadBlaster();
      return;
    }
    if (this.isReloading) return;
    
    this.blasterAmmo--;
    this.attackCooldown = 8; // Faster fire rate for automatic mode
    this._isAttacking = true;
    this.audioManager?.playWeaponSound();
    
    // Trigger recoil animation
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
    
    // Store original position and rotation
    const originalPosition = this.blaster.position.clone();
    const originalRotation = this.blaster.rotation.clone();
    
    // Recoil values
    const recoilDistance = 0.08;
    const recoilUpward = 0.03;
    const recoilRotation = 0.1;
    const recoilDuration = 120; // ms
    const returnDuration = 180; // ms
    
    // Apply recoil
    this.blaster.position.z -= recoilDistance;
    this.blaster.position.y += recoilUpward;
    this.blaster.rotation.x += recoilRotation;
    
    // Animate trigger pull
    const trigger = this.blaster.getObjectByName('trigger') as THREE.Mesh;
    if (trigger) {
      trigger.position.z -= 0.01;
      setTimeout(() => {
        if (trigger) {
          trigger.position.z += 0.01;
        }
      }, recoilDuration / 2);
    }
    
    // Animate energy core flash
    const energyCore = this.blaster.getObjectByName('energyCore') as THREE.Mesh;
    if (energyCore && energyCore.material instanceof THREE.MeshPhongMaterial) {
      const originalIntensity = energyCore.material.emissiveIntensity;
      energyCore.material.emissiveIntensity = 1.5;
      setTimeout(() => {
        if (energyCore && energyCore.material instanceof THREE.MeshPhongMaterial) {
          energyCore.material.emissiveIntensity = originalIntensity;
        }
      }, recoilDuration);
    }
    
    // Return to original position
    setTimeout(() => {
      if (this.blaster) {
        // Smooth return animation
        const startTime = Date.now();
        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / returnDuration, 1);
          
          // Ease-out function for smooth return
          const easeOut = 1 - Math.pow(1 - progress, 3);
          
          this.blaster!.position.lerpVectors(this.blaster!.position, originalPosition, easeOut * 0.3);
          this.blaster!.rotation.x = originalRotation.x + (this.blaster!.rotation.x - originalRotation.x) * (1 - easeOut * 0.3);
          
          if (progress < 1) {
            requestAnimationFrame(animate);
          } else {
            // Ensure exact original position
            this.blaster!.position.copy(originalPosition);
            this.blaster!.rotation.copy(originalRotation);
          }
        };
        animate();
      }
    }, recoilDuration);
  }

  private showBlasterMuzzleFlash() {
    if (this.blaster) {
      // Enhanced muzzle flash effect
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
        // Quick slash animation
        const startRotation = this.lightsaber.rotation.z;
        const targetRotation = startRotation - Math.PI / 2; // Negative for right-to-left motion
        
        const animate = (progress: number) => {
          if (this.lightsaber) {
            this.lightsaber.rotation.z = startRotation + (targetRotation - startRotation) * progress;
            
            if (progress < 1) {
              requestAnimationFrame(() => animate(progress + 0.1));
            } else {
              // Reset rotation after attack
              setTimeout(() => {
                if (this.lightsaber) {
                  this.lightsaber.rotation.z = startRotation;
                }
              }, 100);
            }
          }
        };
        
        animate(0);
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
    // Don't reload if already full, already reloading, or in cooldown
    if (this.blasterAmmo >= this.maxBlasterAmmo || this.isReloading || this.reloadCooldown > 0) {
      return;
    }
    
    this.isReloading = true;
    this.reloadCooldown = 90; // 1.5 seconds at 60fps
    
    // Animate reload
    this.animateReload();
    
    // Restore ammo after reload time
    setTimeout(() => {
      this.blasterAmmo = this.maxBlasterAmmo;
      if (this.onAmmoChange) {
        this.onAmmoChange(this.blasterAmmo, this.maxBlasterAmmo);
      }
    }, 1500);
  }
  
  private animateReload() {
    if (!this.blaster) return;
    
    // Reload animation - rotate weapon down and back up
    const originalRotation = this.blaster.rotation.x;
    const reloadRotation = originalRotation - Math.PI / 6;
    
    // Down motion
    const animateDown = (progress: number) => {
      if (this.blaster) {
        this.blaster.rotation.x = originalRotation + (reloadRotation - originalRotation) * progress;
        this.blaster.position.y = -0.2 - progress * 0.3;
        
        if (progress < 1) {
          requestAnimationFrame(() => animateDown(progress + 0.1));
        } else {
          // Start up motion after brief pause
          setTimeout(() => {
            const animateUp = (upProgress: number) => {
              if (this.blaster) {
                this.blaster.rotation.x = reloadRotation + (originalRotation - reloadRotation) * upProgress;
                this.blaster.position.y = -0.5 + upProgress * 0.3;
                
                if (upProgress < 1) {
                  requestAnimationFrame(() => animateUp(upProgress + 0.08));
                }
              }
            };
            animateUp(0);
          }, 300);
        }
      }
    };
    animateDown(0);
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
    if (this.onAmmoChange) {
      this.onAmmoChange(this.blasterAmmo, this.maxBlasterAmmo);
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
    if (this.onAmmoChange) this.onAmmoChange(this.blasterAmmo, this.maxBlasterAmmo);
    if (this.onWeaponChange) this.onWeaponChange(this.currentWeapon);
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
    if (!this.onAmmoChange) return;

    if (this.currentWeapon === 'blaster') {
      this.onAmmoChange(this.blasterAmmo, this.maxBlasterAmmo);
    } else if (this.currentWeapon === 'shotgun') {
      this.onAmmoChange(this.shotgunAmmo, this.maxShotgunAmmo);
    } else {
      this.onAmmoChange(-1, -1); // For lightsaber
    }
  }

  private reloadShotgun() {
    if (this.shotgunAmmo >= this.maxShotgunAmmo || this.isReloading || this.reloadCooldown > 0) {
      return;
    }
    
    this.isReloading = true;
    this.reloadCooldown = 120; // Slower reload for shotgun
    
    // Animate reload (can be a different animation)
    this.animateReload(); 
    
    setTimeout(() => {
      this.shotgunAmmo = this.maxShotgunAmmo;
      this.updateAmmoDisplay();
    }, 2000);
  }
}