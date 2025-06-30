import * as THREE from 'three';

export class Level {
  private scene: THREE.Scene;
  private levelMeshes: THREE.Object3D[] = [];
  private collidableMeshes: THREE.Mesh[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public loadLevel(levelNumber: number) {
    // Clear existing level
    this.cleanup(this.scene);
    this.levelMeshes = [];
    this.collidableMeshes = [];

    // Create simple arena for all levels
    this.createSimpleArena();
  }

  private createSimpleArena() {
    const arenaSize = 50;
    const wallHeight = 5;
    const wallThickness = 2;

    // Create arena floor
    const floorGeometry = new THREE.PlaneGeometry(arenaSize, arenaSize);
    const floorMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x222244,
      shininess: 30
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    
    this.scene.add(floor);
    this.levelMeshes.push(floor);

    // Add grid lines for visual interest
    const gridHelper = new THREE.GridHelper(arenaSize, 20, 0x444444, 0x222222);
    gridHelper.position.y = 0.01;
    this.scene.add(gridHelper);
    this.levelMeshes.push(gridHelper);

    // Create boundary walls
    const wallMaterial = new THREE.MeshPhongMaterial({ 
      color: 0x334455,
      shininess: 50
    });

    const halfSize = arenaSize / 2;
    const wallOffset = wallThickness / 2;
    
    // North wall (positive Z)
    const northWall = new THREE.Mesh(
      new THREE.BoxGeometry(arenaSize + wallThickness * 2, wallHeight, wallThickness),
      wallMaterial.clone()
    );
    northWall.position.set(0, wallHeight / 2, halfSize + wallOffset);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    northWall.userData = { isCollidable: true };
    this.scene.add(northWall);
    this.levelMeshes.push(northWall);
    this.collidableMeshes.push(northWall);
    
    // South wall (negative Z)
    const southWall = new THREE.Mesh(
      new THREE.BoxGeometry(arenaSize + wallThickness * 2, wallHeight, wallThickness),
      wallMaterial.clone()
    );
    southWall.position.set(0, wallHeight / 2, -halfSize - wallOffset);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    southWall.userData = { isCollidable: true };
    this.scene.add(southWall);
    this.levelMeshes.push(southWall);
    this.collidableMeshes.push(southWall);
    
    // East wall (positive X)
    const eastWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize),
      wallMaterial.clone()
    );
    eastWall.position.set(halfSize + wallOffset, wallHeight / 2, 0);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    eastWall.userData = { isCollidable: true };
    this.scene.add(eastWall);
    this.levelMeshes.push(eastWall);
    this.collidableMeshes.push(eastWall);
    
    // West wall (negative X)
    const westWall = new THREE.Mesh(
      new THREE.BoxGeometry(wallThickness, wallHeight, arenaSize),
      wallMaterial.clone()
    );
    westWall.position.set(-halfSize - wallOffset, wallHeight / 2, 0);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    westWall.userData = { isCollidable: true };
    this.scene.add(westWall);
    this.levelMeshes.push(westWall);
    this.collidableMeshes.push(westWall);

    // Add some platforms for variety
    this.createPlatforms([
      { x: 15, z: 15, size: 4 },
      { x: -15, z: -15, size: 4 },
      { x: 15, z: -15, size: 3 },
      { x: -15, z: 15, size: 3 },
      { x: 0, z: 18, size: 3 },
      { x: 0, z: -18, size: 3 }
    ]);

    // Add some cylindrical obstacles
    this.createObstacles();
  }

  private createPlatforms(platforms: Array<{ x: number, z: number, size: number }>) {
    platforms.forEach(platform => {
      const geometry = new THREE.BoxGeometry(platform.size, 0.5, platform.size);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x666677,
        shininess: 80
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(platform.x, 0.25, platform.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.userData = { isCollidable: true };
      
      this.scene.add(mesh);
      this.levelMeshes.push(mesh);
      this.collidableMeshes.push(mesh);

      // Add glowing edges
      const edgeGeometry = new THREE.EdgesGeometry(geometry);
      const edgeMaterial = new THREE.LineBasicMaterial({ 
        color: 0x00ffff,
        linewidth: 2
      });
      const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
      mesh.add(edges);
    });
  }

  private createObstacles() {
    // Add some cylindrical obstacles
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.CylinderGeometry(1.2, 1.2, 3);
      const material = new THREE.MeshPhongMaterial({ 
        color: 0x444466,
        shininess: 100
      });
      const cylinder = new THREE.Mesh(geometry, material);
      
      const angle = (i / 8) * Math.PI * 2;
      const radius = 12;
      cylinder.position.set(
        Math.cos(angle) * radius,
        1.5,
        Math.sin(angle) * radius
      );
      
      cylinder.castShadow = true;
      cylinder.receiveShadow = true;
      cylinder.userData = { isCollidable: true };
      
      this.scene.add(cylinder);
      this.levelMeshes.push(cylinder);
      this.collidableMeshes.push(cylinder);
    }
  }

  public checkCollision(position: THREE.Vector3, radius: number = 0.5, height: number = 1.0): boolean {
    // First check if player is outside the arena bounds
    const arenaSize = 50;
    const boundary = (arenaSize / 2) - 1; // Add 1 unit buffer from wall
    
    if (Math.abs(position.x) > boundary || 
        Math.abs(position.z) > boundary) {
      return true; // Outside arena bounds
    }
    
    // Then check collision with specific meshes
    const collisionBox = new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(position.x, position.y + height / 2, position.z),
      new THREE.Vector3(radius * 2, height, radius * 2)
    );

    for (const mesh of this.collidableMeshes) {
      // Create bounding box for the mesh
      const meshBox = new THREE.Box3().setFromObject(mesh);
      
      // Expand the mesh box for more reliable collision detection
      meshBox.expandByScalar(0.2);
      
      // Check intersection
      if (collisionBox.intersectsBox(meshBox)) {
        return true; // Collision detected
      }
    }

    return false; // No collision
  }

  public cleanup(scene: THREE.Scene) {
    this.levelMeshes.forEach(mesh => {
      scene.remove(mesh);
      
      // Dispose of geometries and materials
      if (mesh instanceof THREE.Mesh) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach(material => material.dispose());
        } else {
          mesh.material.dispose();
        }
      }
    });
    
    this.levelMeshes = [];
    this.collidableMeshes = [];
  }
}