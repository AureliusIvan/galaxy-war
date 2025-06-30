import * as THREE from 'three';
import { Enemy } from './Enemy';

export class ThrowableBox {
  private mesh: THREE.Group;
  private position: THREE.Vector3;
  private velocity = new THREE.Vector3();
  private isThrown = false;
  private isLevitating = false;
  private rotationVelocity = new THREE.Vector3();
  private scene: THREE.Scene;
  private damage = 40;
  private hasHitEnemy = false;
  private stuckCheckTimer = 0;
  private lastPosition = new THREE.Vector3();

  constructor(position: THREE.Vector3, scene: THREE.Scene) {
    this.position = position.clone();
    this.scene = scene;
    this.createMesh();
    scene.add(this.mesh);
  }

  private createMesh() {
    this.mesh = new THREE.Group();
    
    // Main box
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
    const boxMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x8B4513,
      shininess: 30,
      transparent: false
    });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.castShadow = true;
    box.receiveShadow = true;
    this.mesh.add(box);

    // Add some detail - metal corners
    const cornerGeometry = new THREE.BoxGeometry(0.1, 0.1, 1.1);
    const cornerMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x444444,
      shininess: 100
    });

    // Add corner reinforcements
    const corners = [
      { x: 0.45, y: 0.45, z: 0 },
      { x: -0.45, y: 0.45, z: 0 },
      { x: 0.45, y: -0.45, z: 0 },
      { x: -0.45, y: -0.45, z: 0 }
    ];

    corners.forEach(corner => {
      const cornerMesh = new THREE.Mesh(cornerGeometry, cornerMaterial.clone());
      cornerMesh.position.set(corner.x, corner.y, corner.z);
      this.mesh.add(cornerMesh);
    });

    // Add some warning text/markings
    const textGeometry = new THREE.PlaneGeometry(0.8, 0.2);
    const textMaterial = new THREE.MeshBasicMaterial({ 
      color: 0xffff00,
      transparent: true,
      opacity: 0.8
    });
    const textPlane = new THREE.Mesh(textGeometry, textMaterial);
    textPlane.position.set(0, 0, 0.51);
    this.mesh.add(textPlane);

    // Add glow effect when levitating
    const glowGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x00ffff,
      transparent: true,
      opacity: 0,
      wireframe: true
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.name = 'glow';
    this.mesh.add(glow);

    this.mesh.position.copy(this.position);
  }

  public update(enemies: Enemy[], level?: any) {
    if (this.isLevitating) {
      // Rotate while levitating
      this.mesh.rotation.y += 0.05;
      this.mesh.rotation.x += 0.02;
      
      // Update glow effect
      const glow = this.mesh.getObjectByName('glow') as THREE.Mesh;
      if (glow && glow.material instanceof THREE.MeshBasicMaterial) {
        glow.material.opacity = 0.3 + Math.sin(Date.now() * 0.01) * 0.2;
        glow.rotation.x += 0.03;
        glow.rotation.y += 0.05;
      }
      return;
    }

    if (this.isThrown) {
      this.handleThrowPhysics(enemies, level);
    } else {
      // Static box - just sit there
      this.mesh.position.copy(this.position);
    }
  }

  private handleThrowPhysics(enemies: Enemy[], level?: any) {
    const oldPosition = this.position.clone();
    
    // Check if box is stuck
    this.stuckCheckTimer++;
    if (this.stuckCheckTimer > 120) { // Check every 2 seconds
      const distance = this.position.distanceTo(this.lastPosition);
      if (distance < 0.05 && this.velocity.length() < 0.02) {
        // Box is stuck, force it to stop being thrown
        this.isThrown = false;
        this.velocity.set(0, 0, 0);
        this.rotationVelocity.set(0, 0, 0);
        this.position.y = 0.5;
        this.hasHitEnemy = false; // Reset so it can damage enemies again
        this.stuckCheckTimer = 0;
        return;
      }
      this.lastPosition.copy(this.position);
      this.stuckCheckTimer = 0;
    }
    
    // Update position
    this.position.add(this.velocity);
    
    // Apply gravity
    this.velocity.y -= 0.015;
    
    // Apply air resistance
    this.velocity.multiplyScalar(0.98);
    
    // Update rotation
    this.mesh.rotation.x += this.rotationVelocity.x;
    this.mesh.rotation.y += this.rotationVelocity.y;
    this.mesh.rotation.z += this.rotationVelocity.z;
    
    // Slow down rotation
    this.rotationVelocity.multiplyScalar(0.95);

    // Check collision with enemies
    if (!this.hasHitEnemy) {
      for (const enemy of enemies) {
        if (enemy.isAlive()) {
          const distance = this.position.distanceTo(enemy.getPosition());
          if (distance < 2) {
            enemy.takeDamage(this.damage);
            this.hasHitEnemy = true;
            
            // Create impact effect
            this.createImpactEffect();
            
            // Bounce off the enemy
            const bounceDirection = this.position.clone().sub(enemy.getPosition()).normalize();
            this.velocity.copy(bounceDirection.multiplyScalar(0.1));
            this.velocity.y = Math.abs(this.velocity.y);
            
            break;
          }
        }
      }
    }

    // Check collision with level
    if (level && level.checkCollision && level.checkCollision(this.position, 0.5, 1.0)) {
      this.position.copy(oldPosition);
      
      // Bounce off walls
      this.velocity.x *= -0.6;
      this.velocity.z *= -0.6;
      this.velocity.y = Math.abs(this.velocity.y) * 0.4;
      
      // Add some rotation on bounce
      this.rotationVelocity.set(
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2,
        (Math.random() - 0.5) * 0.2
      );
    }

    // Check ground collision
    if (this.position.y <= 0.5) {
      this.position.y = 0.5;
      this.velocity.y = Math.abs(this.velocity.y) * 0.3; // Bounce with energy loss
      this.velocity.x *= 0.8; // Friction
      this.velocity.z *= 0.8;
      
      // Stop if moving very slowly
      if (this.velocity.length() < 0.02) {
        this.isThrown = false;
        this.velocity.set(0, 0, 0);
        this.rotationVelocity.set(0, 0, 0);
        this.hasHitEnemy = false; // Reset so it can damage enemies again
        this.stuckCheckTimer = 0;
      }
    }

    this.mesh.position.copy(this.position);
  }

  private createImpactEffect() {
    // Create sparks/debris effect
    const particleCount = 30;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Spread particles around impact point
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = Math.random() * 2;

      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      // Orange/yellow spark colors
      colors[i * 3] = 1; // Red
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.5; // Green
      colors[i * 3 + 2] = 0; // Blue
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 1
    });

    const sparks = new THREE.Points(geometry, material);
    sparks.position.copy(this.position);
    this.scene.add(sparks);

    // Remove sparks after animation
    let scale = 0;
    const animate = () => {
      scale += 0.1;
      sparks.scale.setScalar(scale);
      material.opacity = Math.max(0, 1 - scale * 0.5);
      
      if (scale < 3) {
        requestAnimationFrame(animate);
      } else {
        this.scene.remove(sparks);
        geometry.dispose();
        material.dispose();
      }
    };
    animate();
  }

  public levitate() {
    this.isLevitating = true;
    this.isThrown = false;
    this.velocity.set(0, 0, 0);
    
    // Show glow effect
    const glow = this.mesh.getObjectByName('glow') as THREE.Mesh;
    if (glow && glow.material instanceof THREE.MeshBasicMaterial) {
      glow.material.opacity = 0.4;
    }
  }

  public throw(direction: THREE.Vector3) {
    this.isLevitating = false;
    this.isThrown = true;
    this.hasHitEnemy = false;
    
    // Set throw velocity
    this.velocity = direction.normalize().multiplyScalar(0.4);
    this.velocity.y += 0.1; // Add some upward trajectory
    
    // Add random rotation
    this.rotationVelocity.set(
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3,
      (Math.random() - 0.5) * 0.3
    );
    
    // Hide glow effect
    const glow = this.mesh.getObjectByName('glow') as THREE.Mesh;
    if (glow && glow.material instanceof THREE.MeshBasicMaterial) {
      glow.material.opacity = 0;
    }
  }

  public setPosition(position: THREE.Vector3) {
    this.position.copy(position);
    this.mesh.position.copy(position);
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public isBeingLevitated(): boolean {
    return this.isLevitating;
  }

  public isBeingThrown(): boolean {
    return this.isThrown;
  }

  public canBePickedUp(): boolean {
    return !this.isLevitating && !this.isThrown;
  }

  public cleanup(scene: THREE.Scene) {
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