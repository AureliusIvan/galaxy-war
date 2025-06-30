import * as THREE from 'three';

export interface AIState {
  alertLevel: number; // 0-100, how aware the enemy is of player
  lastKnownPlayerPosition: THREE.Vector3 | null;
  currentTarget: THREE.Vector3 | null;
  coverPosition: THREE.Vector3 | null;
  formationRole: 'leader' | 'flanker' | 'support' | 'lone' | null;
  alertedBy: string | null; // ID of enemy that alerted this one
  engagementDistance: number;
  lastDamageTime: number;
  evasionCooldown: number;
  cooperationCooldown: number;
}

export interface FormationGroup {
  id: string;
  leader: string; // Enemy ID
  members: string[]; // Enemy IDs
  targetPosition: THREE.Vector3;
  formationType: 'surround' | 'pincer' | 'line' | 'scatter';
  lastUpdate: number;
}

export class AICoordinator {
  private static instance: AICoordinator;
  private formations: Map<string, FormationGroup> = new Map();
  private alertNetwork: Map<string, Set<string>> = new Map(); // Enemy ID -> Set of nearby enemy IDs
  private lastFormationUpdate = 0;
  private playerThreatLevel = 0; // Increases based on player actions

  static getInstance(): AICoordinator {
    if (!AICoordinator.instance) {
      AICoordinator.instance = new AICoordinator();
    }
    return AICoordinator.instance;
  }

  public updatePlayerThreatLevel(action: 'kill' | 'damage' | 'telekinesis' | 'headshot') {
    switch (action) {
      case 'kill': this.playerThreatLevel += 15; break;
      case 'damage': this.playerThreatLevel += 5; break;
      case 'telekinesis': this.playerThreatLevel += 10; break;
      case 'headshot': this.playerThreatLevel += 20; break;
    }
    this.playerThreatLevel = Math.min(100, this.playerThreatLevel);
    
    // Decay threat level over time
    setTimeout(() => {
      this.playerThreatLevel = Math.max(0, this.playerThreatLevel - 5);
    }, 5000);
  }

  public getPlayerThreatLevel(): number {
    return this.playerThreatLevel;
  }

  public alertNearbyEnemies(alerterId: string, position: THREE.Vector3, enemies: any[]) {
    const alertRadius = 15;
    
    enemies.forEach(enemy => {
      if (enemy.getId() !== alerterId && enemy.isAlive()) {
        const distance = enemy.getPosition().distanceTo(position);
        if (distance <= alertRadius) {
          enemy.receiveAlert(alerterId, position);
        }
      }
    });
  }

  public updateFormations(enemies: any[], playerPosition: THREE.Vector3) {
    if (Date.now() - this.lastFormationUpdate < 2000) return; // Update every 2 seconds
    
    this.lastFormationUpdate = Date.now();
    
    // Clear old formations
    this.formations.clear();
    
    // Group nearby enemies
    const aliveEnemies = enemies.filter(e => e.isAlive() && !e.isBeingThrown());
    const groups = this.clusterEnemies(aliveEnemies, 12); // Group enemies within 12 units
    
    groups.forEach((group, index) => {
      if (group.length >= 2) {
        const formationId = `formation_${index}`;
        const leader = group.reduce((prev, current) => 
          prev.getAIState().alertLevel > current.getAIState().alertLevel ? prev : current
        );
        
        const formation: FormationGroup = {
          id: formationId,
          leader: leader.getId(),
          members: group.map(e => e.getId()),
          targetPosition: playerPosition.clone(),
          formationType: this.selectFormationType(group.length, playerPosition, group),
          lastUpdate: Date.now()
        };
        
        this.formations.set(formationId, formation);
        
        // Assign roles to group members
        group.forEach((enemy, i) => {
          if (enemy.getId() === leader.getId()) {
            enemy.setFormationRole('leader', formationId);
          } else if (i < 2) {
            enemy.setFormationRole('flanker', formationId);
          } else {
            enemy.setFormationRole('support', formationId);
          }
        });
      }
    });
  }

  private clusterEnemies(enemies: any[], maxDistance: number): any[][] {
    const clusters: any[][] = [];
    const visited = new Set<string>();
    
    enemies.forEach(enemy => {
      if (visited.has(enemy.getId())) return;
      
      const cluster = [enemy];
      visited.add(enemy.getId());
      
      enemies.forEach(other => {
        if (!visited.has(other.getId()) && 
            enemy.getPosition().distanceTo(other.getPosition()) <= maxDistance) {
          cluster.push(other);
          visited.add(other.getId());
        }
      });
      
      clusters.push(cluster);
    });
    
    return clusters;
  }

  private selectFormationType(groupSize: number, playerPos: THREE.Vector3, group: any[]): 'surround' | 'pincer' | 'line' | 'scatter' {
    const threatLevel = this.playerThreatLevel;
    
    if (threatLevel > 70) return 'scatter'; // High threat - spread out
    if (groupSize >= 4) return 'surround';   // Large group - surround
    if (groupSize === 3) return 'pincer';    // Medium group - pincer
    return 'line';                           // Small group - line formation
  }

  public getFormationPosition(enemyId: string, role: string, formationId: string, currentPos: THREE.Vector3, playerPos: THREE.Vector3): THREE.Vector3 {
    const formation = this.formations.get(formationId);
    if (!formation) return currentPos.clone();
    
    const angle = Math.atan2(playerPos.z - currentPos.z, playerPos.x - currentPos.x);
    const distance = 8 + Math.random() * 4; // 8-12 units from player
    
    switch (formation.formationType) {
      case 'surround':
        return this.getSurroundPosition(enemyId, formation, playerPos, distance);
      case 'pincer':
        return this.getPincerPosition(role, playerPos, distance);
      case 'line':
        return this.getLinePosition(role, playerPos, angle, distance);
      case 'scatter':
        return this.getScatterPosition(currentPos, playerPos, distance);
      default:
        return currentPos.clone();
    }
  }

  private getSurroundPosition(enemyId: string, formation: FormationGroup, playerPos: THREE.Vector3, distance: number): THREE.Vector3 {
    const memberIndex = formation.members.indexOf(enemyId);
    const totalMembers = formation.members.length;
    const angleStep = (Math.PI * 2) / totalMembers;
    const angle = memberIndex * angleStep;
    
    return new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      playerPos.y,
      playerPos.z + Math.sin(angle) * distance
    );
  }

  private getPincerPosition(role: string, playerPos: THREE.Vector3, distance: number): THREE.Vector3 {
    const angle = role === 'flanker' ? Math.PI / 3 : -Math.PI / 3; // 60 degrees apart
    
    return new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      playerPos.y,
      playerPos.z + Math.sin(angle) * distance
    );
  }

  private getLinePosition(role: string, playerPos: THREE.Vector3, baseAngle: number, distance: number): THREE.Vector3 {
    const offset = role === 'flanker' ? Math.PI / 6 : 0; // 30 degree offset for flankers
    const angle = baseAngle + offset;
    
    return new THREE.Vector3(
      playerPos.x + Math.cos(angle) * distance,
      playerPos.y,
      playerPos.z + Math.sin(angle) * distance
    );
  }

  private getScatterPosition(currentPos: THREE.Vector3, playerPos: THREE.Vector3, distance: number): THREE.Vector3 {
    // Move away from player and add randomness
    const direction = currentPos.clone().sub(playerPos).normalize();
    const randomAngle = (Math.random() - 0.5) * Math.PI / 2; // +/- 45 degrees
    
    direction.applyAxisAngle(new THREE.Vector3(0, 1, 0), randomAngle);
    
    return playerPos.clone().add(direction.multiplyScalar(distance + Math.random() * 5));
  }

  public cleanup() {
    this.formations.clear();
    this.alertNetwork.clear();
    this.playerThreatLevel = 0;
  }
}

export class PathFinder {
  private static gridSize = 1; // 1 unit per grid cell
  private static arenaSize = 50;
  private static grid: boolean[][] | null = null;
  
  static initializeGrid(level: any) {
    if (!level) {
      console.warn('Cannot initialize pathfinding: level is null');
      return;
    }
    
    const size = Math.floor(this.arenaSize / this.gridSize);
    this.grid = Array(size).fill(null).map(() => Array(size).fill(false));
    
    // Mark obstacle cells (simplified to reduce load time)
    const step = 2; // Check every 2nd cell to speed up initialization
    for (let x = 0; x < size; x++) {
      for (let z = 0; z < size; z++) {
        if (x % step !== 0 || z % step !== 0) continue; // Skip some cells
        
        const worldX = (x - size / 2) * this.gridSize;
        const worldZ = (z - size / 2) * this.gridSize;
        const worldPos = new THREE.Vector3(worldX, 1, worldZ);
        
        if (level.checkCollision && level.checkCollision(worldPos, 0.5, 1)) {
          this.grid[x][z] = true; // Mark as obstacle
        }
      }
    }
  }
  
  static findPath(start: THREE.Vector3, end: THREE.Vector3): THREE.Vector3[] {
    if (!this.grid) {
      console.warn('Pathfinding grid not initialized, using direct path');
      return [end]; // Fallback to direct path
    }
    
    try {
      const startGrid = this.worldToGrid(start);
      const endGrid = this.worldToGrid(end);
      
      if (!this.isValidCell(startGrid.x, startGrid.z) || !this.isValidCell(endGrid.x, endGrid.z)) {
        return [end];
      }
      
      const path = this.aStar(startGrid, endGrid);
      return path.map(point => this.gridToWorld(point));
    } catch (error) {
      console.warn('Pathfinding error:', error);
      return [end]; // Fallback to direct path
    }
  }
  
  private static worldToGrid(pos: THREE.Vector3): { x: number, z: number } {
    const size = Math.floor(this.arenaSize / this.gridSize);
    const x = Math.floor((pos.x + this.arenaSize / 2) / this.gridSize);
    const z = Math.floor((pos.z + this.arenaSize / 2) / this.gridSize);
    return { x: Math.max(0, Math.min(size - 1, x)), z: Math.max(0, Math.min(size - 1, z)) };
  }
  
  private static gridToWorld(point: { x: number, z: number }): THREE.Vector3 {
    const worldX = (point.x - Math.floor(this.arenaSize / this.gridSize) / 2) * this.gridSize;
    const worldZ = (point.z - Math.floor(this.arenaSize / this.gridSize) / 2) * this.gridSize;
    return new THREE.Vector3(worldX, 1, worldZ);
  }
  
  private static isValidCell(x: number, z: number): boolean {
    if (!this.grid) return false;
    return x >= 0 && x < this.grid.length && z >= 0 && z < this.grid[0].length && !this.grid[x][z];
  }
  
  private static aStar(start: { x: number, z: number }, end: { x: number, z: number }): { x: number, z: number }[] {
    // Simplified A* implementation
    const openSet = [start];
    const cameFrom = new Map<string, { x: number, z: number }>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    
    const getKey = (point: { x: number, z: number }) => `${point.x},${point.z}`;
    const heuristic = (a: { x: number, z: number }, b: { x: number, z: number }) =>
      Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
    
    gScore.set(getKey(start), 0);
    fScore.set(getKey(start), heuristic(start, end));
    
    while (openSet.length > 0) {
      // Find node with lowest fScore
      openSet.sort((a, b) => (fScore.get(getKey(a)) || Infinity) - (fScore.get(getKey(b)) || Infinity));
      const current = openSet.shift()!;
      
      if (current.x === end.x && current.z === end.z) {
        // Reconstruct path
        const path = [current];
        let curr = current;
        while (cameFrom.has(getKey(curr))) {
          curr = cameFrom.get(getKey(curr))!;
          path.unshift(curr);
        }
        return path;
      }
      
      // Check neighbors
      const neighbors = [
        { x: current.x + 1, z: current.z },
        { x: current.x - 1, z: current.z },
        { x: current.x, z: current.z + 1 },
        { x: current.x, z: current.z - 1 }
      ];
      
      for (const neighbor of neighbors) {
        if (!this.isValidCell(neighbor.x, neighbor.z)) continue;
        
        const tentativeGScore = (gScore.get(getKey(current)) || 0) + 1;
        const neighborKey = getKey(neighbor);
        
        if (tentativeGScore < (gScore.get(neighborKey) || Infinity)) {
          cameFrom.set(neighborKey, current);
          gScore.set(neighborKey, tentativeGScore);
          fScore.set(neighborKey, tentativeGScore + heuristic(neighbor, end));
          
          if (!openSet.find(n => n.x === neighbor.x && n.z === neighbor.z)) {
            openSet.push(neighbor);
          }
        }
      }
      
      // Limit search to prevent infinite loops
      if (openSet.length > 200) break;
    }
    
    return [end]; // Fallback to direct path
  }
}