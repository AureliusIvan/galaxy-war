import * as THREE from 'three';
import { Player } from './Player';

export type PowerUpType = 'health' | 'speed';

export class PowerUp {
  private mesh: THREE.Group;
  private position: THREE.Vector3;
  private type: PowerUpType;
  private rotationSpeed = 0.05;
  private bobSpeed = 0.1;
  private bobAmount = 0.3;
  private baseY: number;

  constructor(position: THREE.Vector3, type: PowerUpType, scene: THREE.Scene) {
    this.position = position.clone();
    this.position.y += 1; // Hover above ground
    this.baseY = this.position.y;
    this.type = type;
    
    this.createMesh();
    scene.add(this.mesh);
  }

  private createMesh() {
    this.mesh = new THREE.Group();

    let geometry: THREE.BufferGeometry;
    let material: THREE.MeshPhongMaterial;

    if (this.type === 'health') {
      // Health power-up - red cross/plus shape
      geometry = new THREE.BoxGeometry(0.6, 0.2, 0.2);
      material = new THREE.MeshPhongMaterial({ 
        color: 0xff3333,
        emissive: 0x441111,
        shininess: 100
      });
      
      const horizontal = new THREE.Mesh(geometry, material);
      this.mesh.add(horizontal);
      
      const vertical = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 0.6, 0.2),
        material.clone()
      );
      this.mesh.add(vertical);
      
    } else if (this.type === 'speed') {
      // Speed power-up - lightning bolt shape
      geometry = new THREE.ConeGeometry(0.3, 0.8, 6);
      material = new THREE.MeshPhongMaterial({ 
        color: 0x33ff33,
        emissive: 0x114411,
        shininess: 100
      });
      
      const cone = new THREE.Mesh(geometry, material);
      this.mesh.add(cone);
    }

    // Add glowing effect
    const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: this.type === 'health' ? 0xff6666 : 0x66ff66,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.mesh.add(glow);

    // Add particle effect
    this.addParticles();

    this.mesh.position.copy(this.position);
  }

  private addParticles() {
    const particleCount = 20;
    const particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 2;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: this.type === 'health' ? 0xff3333 : 0x33ff33,
      size: 0.05,
      transparent: true,
      opacity: 0.6
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    this.mesh.add(particles);
  }

  public update() {
    // Rotate the power-up
    this.mesh.rotation.y += this.rotationSpeed;
    
    // Bob up and down
    const bobOffset = Math.sin(Date.now() * 0.005) * this.bobAmount;
    this.position.y = this.baseY + bobOffset;
    this.mesh.position.copy(this.position);

    // Animate particles
    const particles = this.mesh.children.find(child => child instanceof THREE.Points) as THREE.Points;
    if (particles) {
      particles.rotation.x += 0.01;
      particles.rotation.y += 0.015;
    }

    // Pulse the glow effect
    const glow = this.mesh.children.find(child => 
      child instanceof THREE.Mesh && 
      child.material instanceof THREE.MeshBasicMaterial &&
      child.material.transparent
    ) as THREE.Mesh;
    
    if (glow && glow.material instanceof THREE.MeshBasicMaterial) {
      glow.material.opacity = 0.2 + Math.sin(Date.now() * 0.01) * 0.1;
    }
  }

  public apply(player: Player) {
    if (this.type === 'health') {
      player.heal(50); // Increased healing amount
    } else if (this.type === 'speed') {
      player.increaseSpeed(1.5);
    }
  }

  public getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  public cleanup(scene: THREE.Scene) {
    scene.remove(this.mesh);
    
    // Dispose of geometries and materials
    this.mesh.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach(material => material.dispose());
        } else {
          child.material.dispose();
        }
      } else if (child instanceof THREE.Points) {
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