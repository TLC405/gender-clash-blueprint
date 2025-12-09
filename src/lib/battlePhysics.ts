/**
 * High-Performance Battle Physics Engine
 * Boids-based steering with O(N) spatial hashing
 */

import {
  type BattleSoA,
  FLAG_ALIVE,
  FLAG_LOCKED,
  FLAG_RAGE,
  TEAM_MEN,
  TEAM_WOMEN,
  killUnit,
  setFormationLocked,
} from './battleSoA';
import {
  type SpatialHashGrid,
  rebuildGrid,
  queryRadius,
} from './spatialHash';
import {
  type ParticlePool,
  spawnBeerSplash,
  spawnFlowerBloom,
} from './particlePool';

export type BattlePhase = 'stand' | 'melee' | 'sudden_death' | 'victory';

export interface PhysicsConfig {
  moveSpeed: number;
  attackRange: number;
  baseDamage: number;
  separationRadius: number;
  separationStrength: number;
  cohesionRadius: number;
  cohesionStrength: number;
  alignmentRadius: number;
  alignmentStrength: number;
  attractionStrength: number;
  maxSpeed: number;
  formationDefenseBonus: number;
  rageSpeedMultiplier: number;
  rageSeparationMultiplier: number;
  rageAttractionMultiplier: number;
}

export const DEFAULT_CONFIG: PhysicsConfig = {
  moveSpeed: 25,
  attackRange: 8,
  baseDamage: 35,
  separationRadius: 12,
  separationStrength: 3.0,
  cohesionRadius: 40,
  cohesionStrength: 0.15,
  alignmentRadius: 30,
  alignmentStrength: 0.1,
  attractionStrength: 0.8,
  maxSpeed: 60,
  formationDefenseBonus: 1.5,
  rageSpeedMultiplier: 1.5,
  rageSeparationMultiplier: 0.5,
  rageAttractionMultiplier: 2.0,
};

export interface BattleStats {
  menAlive: number;
  womenAlive: number;
  menKills: number;
  womenKills: number;
  menInFormation: number;
  womenInFormation: number;
}

export interface PhysicsResult {
  stats: BattleStats;
  kills: Array<{ x: number; y: number; killerTeam: number }>;
  menFormationActive: boolean;
  womenFormationActive: boolean;
}

/**
 * Find nearest enemy using spatial hash
 */
function findNearestEnemy(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  unitIndex: number,
  searchRadius: number = 200
): number {
  const ux = soa.posX[unitIndex];
  const uy = soa.posY[unitIndex];
  const unitTeam = soa.teamID[unitIndex];
  
  let nearestIdx = -1;
  let nearestDistSq = searchRadius * searchRadius;
  
  for (const otherIdx of queryRadius(grid, ux, uy)) {
    if (otherIdx === unitIndex) continue;
    if ((soa.stateFlags[otherIdx] & FLAG_ALIVE) === 0) continue;
    if (soa.teamID[otherIdx] === unitTeam) continue;
    
    const dx = soa.posX[otherIdx] - ux;
    const dy = soa.posY[otherIdx] - uy;
    const distSq = dx * dx + dy * dy;
    
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearestIdx = otherIdx;
    }
  }
  
  return nearestIdx;
}

/**
 * Calculate Boids steering forces
 */
function calculateSteering(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  unitIndex: number,
  config: PhysicsConfig,
  rageActive: boolean
): { fx: number; fy: number } {
  const ux = soa.posX[unitIndex];
  const uy = soa.posY[unitIndex];
  const unitTeam = soa.teamID[unitIndex];
  
  let separationX = 0, separationY = 0;
  let cohesionX = 0, cohesionY = 0;
  let alignmentX = 0, alignmentY = 0;
  let attractionX = 0, attractionY = 0;
  
  let sameTeamCount = 0;
  let nearestEnemyDistSq = Infinity;
  let nearestEnemyX = 0, nearestEnemyY = 0;
  
  const sepRadiusSq = config.separationRadius * config.separationRadius;
  const cohRadiusSq = config.cohesionRadius * config.cohesionRadius;
  
  // Query neighbors
  for (const otherIdx of queryRadius(grid, ux, uy)) {
    if (otherIdx === unitIndex) continue;
    if ((soa.stateFlags[otherIdx] & FLAG_ALIVE) === 0) continue;
    
    const dx = soa.posX[otherIdx] - ux;
    const dy = soa.posY[otherIdx] - uy;
    const distSq = dx * dx + dy * dy;
    
    const isSameTeam = soa.teamID[otherIdx] === unitTeam;
    
    // Separation (applies to all units)
    if (distSq < sepRadiusSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const force = 1 / (dist + 0.1);
      separationX -= (dx / dist) * force;
      separationY -= (dy / dist) * force;
    }
    
    if (isSameTeam) {
      // Cohesion and alignment only for same team
      if (distSq < cohRadiusSq) {
        cohesionX += dx;
        cohesionY += dy;
        alignmentX += soa.velX[otherIdx];
        alignmentY += soa.velY[otherIdx];
        sameTeamCount++;
      }
    } else {
      // Track nearest enemy for attraction
      if (distSq < nearestEnemyDistSq) {
        nearestEnemyDistSq = distSq;
        nearestEnemyX = dx;
        nearestEnemyY = dy;
      }
    }
  }
  
  // Normalize cohesion and alignment
  if (sameTeamCount > 0) {
    cohesionX /= sameTeamCount;
    cohesionY /= sameTeamCount;
    alignmentX /= sameTeamCount;
    alignmentY /= sameTeamCount;
  }
  
  // Attraction to nearest enemy
  if (nearestEnemyDistSq < Infinity) {
    const dist = Math.sqrt(nearestEnemyDistSq);
    if (dist > 0.1) {
      attractionX = nearestEnemyX / dist;
      attractionY = nearestEnemyY / dist;
    }
  }
  
  // Apply weights with rage modifiers
  const sepMult = rageActive ? config.rageSeparationMultiplier : 1.0;
  const attMult = rageActive ? config.rageAttractionMultiplier : 1.0;
  
  let fx = 
    separationX * config.separationStrength * sepMult +
    cohesionX * config.cohesionStrength +
    alignmentX * config.alignmentStrength +
    attractionX * config.attractionStrength * attMult;
  
  let fy = 
    separationY * config.separationStrength * sepMult +
    cohesionY * config.cohesionStrength +
    alignmentY * config.alignmentStrength +
    attractionY * config.attractionStrength * attMult;
  
  return { fx, fy };
}

/**
 * Main physics update loop
 */
export function updatePhysics(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  pool: ParticlePool,
  config: PhysicsConfig,
  phase: BattlePhase,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number,
  battleSpeed: number = 1,
  rageActive: boolean = false
): PhysicsResult {
  const dt = deltaTime * battleSpeed;
  const kills: Array<{ x: number; y: number; killerTeam: number }> = [];
  
  // Rebuild spatial hash
  rebuildGrid(grid, soa.posX, soa.posY, soa.stateFlags, soa.unitCount, FLAG_ALIVE);
  
  const centerX = canvasWidth / 2;
  const passWidth = 200;
  
  let menAlive = 0;
  let womenAlive = 0;
  let menKills = 0;
  let womenKills = 0;
  let menInFormation = 0;
  let womenInFormation = 0;
  
  const maxSpeed = rageActive ? config.maxSpeed * config.rageSpeedMultiplier : config.maxSpeed;
  const attackRangeSq = config.attackRange * config.attackRange;
  
  // Update all units
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
    
    const team = soa.teamID[i];
    if (team === TEAM_MEN) menAlive++;
    else womenAlive++;
    
    // Check formation state
    const inCenterPass = Math.abs(soa.posX[i] - centerX) < passWidth / 2;
    const shouldLock = phase === 'stand' && inCenterPass;
    setFormationLocked(soa, i, shouldLock);
    
    if (shouldLock) {
      if (team === TEAM_MEN) menInFormation++;
      else womenInFormation++;
    }
    
    const formationBonus = shouldLock ? config.formationDefenseBonus : 1.0;
    
    // Find nearest enemy
    const targetIdx = findNearestEnemy(soa, grid, i);
    
    if (targetIdx >= 0) {
      const dx = soa.posX[targetIdx] - soa.posX[i];
      const dy = soa.posY[targetIdx] - soa.posY[i];
      const distSq = dx * dx + dy * dy;
      
      if (distSq < attackRangeSq) {
        // Attack
        const damage = config.baseDamage * dt / formationBonus;
        soa.health[targetIdx] -= damage;
        
        if (soa.health[targetIdx] <= 0) {
          killUnit(soa, targetIdx);
          
          kills.push({
            x: soa.posX[targetIdx],
            y: soa.posY[targetIdx],
            killerTeam: team,
          });
          
          // Spawn loveable KO effect
          if (team === TEAM_MEN) {
            spawnBeerSplash(pool, soa.posX[targetIdx], soa.posY[targetIdx]);
            menKills++;
          } else {
            spawnFlowerBloom(pool, soa.posX[targetIdx], soa.posY[targetIdx]);
            womenKills++;
          }
        }
        
        // Stop moving when attacking
        soa.velX[i] *= 0.5;
        soa.velY[i] *= 0.5;
      } else {
        // Move toward target with Boids steering
        const { fx, fy } = calculateSteering(soa, grid, i, config, rageActive);
        
        const moveSpeedMult = shouldLock ? 0.7 : 1.0;
        const speed = config.moveSpeed * moveSpeedMult * (rageActive ? config.rageSpeedMultiplier : 1.0);
        
        soa.velX[i] += fx * speed * dt;
        soa.velY[i] += fy * speed * dt;
      }
    }
    
    // Clamp velocity
    const velMag = Math.sqrt(soa.velX[i] * soa.velX[i] + soa.velY[i] * soa.velY[i]);
    if (velMag > maxSpeed) {
      const scale = maxSpeed / velMag;
      soa.velX[i] *= scale;
      soa.velY[i] *= scale;
    }
    
    // Velocity damping
    soa.velX[i] *= 0.95;
    soa.velY[i] *= 0.95;
    
    // Update position
    soa.posX[i] += soa.velX[i] * dt;
    soa.posY[i] += soa.velY[i] * dt;
    
    // Boundary constraints
    soa.posX[i] = Math.max(10, Math.min(canvasWidth - 10, soa.posX[i]));
    soa.posY[i] = Math.max(10, Math.min(canvasHeight - 10, soa.posY[i]));
  }
  
  return {
    stats: {
      menAlive,
      womenAlive,
      menKills,
      womenKills,
      menInFormation,
      womenInFormation,
    },
    kills,
    menFormationActive: menInFormation > menAlive * 0.5,
    womenFormationActive: womenInFormation > womenAlive * 0.5,
  };
}

/**
 * Apply meteor impact to units in radius
 */
export function applyMeteorImpact(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  meteorX: number,
  meteorY: number,
  radius: number = 100,
  strength: number = 500
): void {
  const radiusSq = radius * radius;
  
  for (const idx of queryRadius(grid, meteorX, meteorY)) {
    if ((soa.stateFlags[idx] & FLAG_ALIVE) === 0) continue;
    
    const dx = soa.posX[idx] - meteorX;
    const dy = soa.posY[idx] - meteorY;
    const distSq = dx * dx + dy * dy;
    
    if (distSq < radiusSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const force = strength * (1 - dist / radius);
      
      soa.velX[idx] += (dx / dist) * force;
      soa.velY[idx] += (dy / dist) * force;
    }
  }
}
