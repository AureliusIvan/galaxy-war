import * as THREE from 'three';

export class ParticleSystem {
  private scene: THREE.Scene;
  private particles: Array<{
    mesh: THREE.Points;
    velocity: THREE.Vector3;
    life: number;
    maxLife: number;
  }> = [];
  private maxParticles = 100; // Cap to prevent performance issues

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public createHitEffect(position: THREE.Vector3) {
    // Check particle limit
    if (this.particles.length >= this.maxParticles) return;
    
    const particleCount = 30; // Reduced for performance
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Spread particles in all directions
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = Math.random() * 0.8; // Larger spread

      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      // Red to yellow colors
      colors[i * 3] = 1; // Red
      colors[i * 3 + 1] = Math.random() * 0.8; // More varied colors
      colors[i * 3 + 2] = 0; // Blue
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15, // Larger particles
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending // Better glow effect
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    this.scene.add(points);

    // Create velocity for explosion
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.2,
      Math.random() * 0.1,
      (Math.random() - 0.5) * 0.2
    );

    this.particles.push({
      mesh: points,
      velocity,
      life: 80, // Longer lasting effect
      maxLife: 80
    });
  }

  public createExplosion(position: THREE.Vector3) {
    // Check particle limit
    if (this.particles.length >= this.maxParticles) return;
    
    const particleCount = 35; // Reduced for performance
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // More dramatic explosion spread
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = Math.random() * 1.5;

      positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
      positions[i * 3 + 1] = Math.cos(phi) * radius;
      positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;

      // Orange to red explosion colors
      colors[i * 3] = 1; // Red
      colors[i * 3 + 1] = Math.random() * 0.8; // Green
      colors[i * 3 + 2] = Math.random() * 0.3; // Blue
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 1
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    this.scene.add(points);

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.3,
      Math.random() * 0.15,
      (Math.random() - 0.5) * 0.3
    );

    this.particles.push({
      mesh: points,
      velocity,
      life: 90,
      maxLife: 90
    });
  }

  public createPickupEffect(position: THREE.Vector3) {
    // Check particle limit
    if (this.particles.length >= this.maxParticles) return;
    
    const particleCount = 15; // Reduced for performance
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Upward spiral effect
      const angle = (i / particleCount) * Math.PI * 4;
      const radius = 0.5;
      const height = (i / particleCount) * 2;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Bright pickup colors
      colors[i * 3] = Math.random(); // Red
      colors[i * 3 + 1] = 1; // Green
      colors[i * 3 + 2] = Math.random(); // Blue
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 1
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    this.scene.add(points);

    const velocity = new THREE.Vector3(0, 0.05, 0); // Upward movement

    this.particles.push({
      mesh: points,
      velocity,
      life: 45,
      maxLife: 45
    });
  }

  public createLaserTrailEffect(position: THREE.Vector3, direction: THREE.Vector3) {
    const particleCount = 15;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Create particles behind the laser in the opposite direction of movement
      const trailDistance = (i / particleCount) * 2; // Trail extends 2 units behind
      const oppositeDirection = direction.clone().multiplyScalar(-trailDistance);
      
      // Add some random spread to make the trail more natural
      const spread = 0.1;
      const randomOffset = new THREE.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      );
      
      const particlePos = position.clone().add(oppositeDirection).add(randomOffset);
      
      positions[i * 3] = particlePos.x;
      positions[i * 3 + 1] = particlePos.y;
      positions[i * 3 + 2] = particlePos.z;

      // Red to orange gradient for laser trail
      const intensity = 1 - (i / particleCount); // Fade towards the back
      colors[i * 3] = 1; // Red
      colors[i * 3 + 1] = 0.3 + intensity * 0.5; // Green (orange when combined with red)
      colors[i * 3 + 2] = 0; // Blue
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    // Quick fade-out for trail particles
    this.particles.push({
      mesh: points,
      velocity: new THREE.Vector3(0, 0, 0), // Trail particles don't move
      life: 20, // Very short lifespan for trailing effect
      maxLife: 20
    });
  }

  public createLandingEffect(position: THREE.Vector3) {
    const particleCount = 25;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Spread particles outward from landing point
      const angle = (i / particleCount) * Math.PI * 2;
      const radius = Math.random() * 1.5;
      const height = Math.random() * 0.5;

      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = height;
      positions[i * 3 + 2] = Math.sin(angle) * radius;

      // Dust/debris colors - grays and browns
      colors[i * 3] = 0.6 + Math.random() * 0.3; // Red
      colors[i * 3 + 1] = 0.5 + Math.random() * 0.3; // Green
      colors[i * 3 + 2] = 0.4 + Math.random() * 0.2; // Blue
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.NormalBlending
    });

    const points = new THREE.Points(geometry, material);
    points.position.copy(position);
    points.position.y = 0.1; // Just above ground
    this.scene.add(points);

    // Create velocity for outward expansion
    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.1,
      Math.random() * 0.05,
      (Math.random() - 0.5) * 0.1
    );

    this.particles.push({
      mesh: points,
      velocity,
      life: 60, // 1 second
      maxLife: 60
    });
  }

  public update() {
    // Use reverse iteration to safely remove particles during loop
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      particle.life--;
      
      // Update position
      particle.mesh.position.add(particle.velocity);
      
      // Update velocity (gravity, friction)
      particle.velocity.y -= 0.001; // Gravity
      particle.velocity.multiplyScalar(0.98); // Friction
      
      // Update opacity based on life
      const lifePercent = particle.life / particle.maxLife;
      if (particle.mesh.material instanceof THREE.PointsMaterial) {
        particle.mesh.material.opacity = lifePercent;
      }
      
      // Remove dead particles
      if (particle.life <= 0) {
        this.scene.remove(particle.mesh);
        particle.mesh.geometry.dispose();
        if (particle.mesh.material instanceof THREE.PointsMaterial) {
          particle.mesh.material.dispose();
        }
        this.particles.splice(i, 1);
      }
    }
  }

  public cleanup() {
    this.particles.forEach(particle => {
      this.scene.remove(particle.mesh);
      particle.mesh.geometry.dispose();
      if (particle.mesh.material instanceof THREE.PointsMaterial) {
        particle.mesh.material.dispose();
      }
    });
    this.particles = [];
  }
}