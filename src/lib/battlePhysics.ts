/**
 * Ultra Battle Physics Engine
 * Boids-based steering with wide enemy search + fallback attraction
 */

import {
  type BattleSoA,
  FLAG_ALIVE,
  FLAG_LOCKED,
  TEAM_MEN,
  TEAM_WOMEN,
  killUnit,
  setFormationLocked,
} from './battleSoA';
import {
  type SpatialHashGrid,
  rebuildGrid,
  queryRadius,
  findNearestEnemy,
} from './spatialHash';
import {
  type ParticlePool,
  spawnParticle,
  PARTICLE_SPARK,
  PARTICLE_DUST,
} from './particlePool';

export type BattlePhase = 'stand' | 'melee' | 'sudden_death' | 'victory';

export interface PhysicsConfig {
  moveSpeed: number;
  chargeSpeed: number;
  attackRange: number;
  baseDamage: number;
  separationRadius: number;
  separationStrength: number;
  cohesionRadius: number;
  cohesionStrength: number;
  alignmentStrength: number;
  attractionStrength: number;
  maxSpeed: number;
  rageSpeedMultiplier: number;
}

export const DEFAULT_CONFIG: PhysicsConfig = {
  moveSpeed: 60,
  chargeSpeed: 120,
  attackRange: 12,
  baseDamage: 25,
  separationRadius: 14,
  separationStrength: 2.5,
  cohesionRadius: 50,
  cohesionStrength: 0.2,
  alignmentStrength: 0.15,
  attractionStrength: 1.2,
  maxSpeed: 100,
  rageSpeedMultiplier: 1.6,
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
 * Spawn impact sparks on hit
 */
function spawnImpactSparks(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 40;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 20, PARTICLE_SPARK, 0.3, 2);
  }
}

/**
 * Spawn dust on death
 */
function spawnDeathDust(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 20 + Math.random() * 30;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 15, PARTICLE_DUST, 0.5, 4);
  }
}

/**
 * Calculate Boids steering forces
 */
function calculateSteering(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  unitIndex: number,
  config: PhysicsConfig
): { fx: number; fy: number } {
  const ux = soa.posX[unitIndex];
  const uy = soa.posY[unitIndex];
  const unitTeam = soa.teamID[unitIndex];
  
  let separationX = 0, separationY = 0;
  let cohesionX = 0, cohesionY = 0;
  let alignmentX = 0, alignmentY = 0;
  
  let sameTeamCount = 0;
  const sepRadiusSq = config.separationRadius * config.separationRadius;
  const cohRadiusSq = config.cohesionRadius * config.cohesionRadius;
  
  for (const otherIdx of queryRadius(grid, ux, uy)) {
    if (otherIdx === unitIndex) continue;
    if ((soa.stateFlags[otherIdx] & FLAG_ALIVE) === 0) continue;
    
    const dx = soa.posX[otherIdx] - ux;
    const dy = soa.posY[otherIdx] - uy;
    const distSq = dx * dx + dy * dy;
    
    // Separation (all units)
    if (distSq < sepRadiusSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const force = (config.separationRadius - dist) / config.separationRadius;
      separationX -= (dx / dist) * force;
      separationY -= (dy / dist) * force;
    }
    
    // Cohesion and alignment (teammates only)
    if (soa.teamID[otherIdx] === unitTeam && distSq < cohRadiusSq) {
      cohesionX += dx;
      cohesionY += dy;
      alignmentX += soa.velX[otherIdx];
      alignmentY += soa.velY[otherIdx];
      sameTeamCount++;
    }
  }
  
  let fx = separationX * config.separationStrength;
  let fy = separationY * config.separationStrength;
  
  if (sameTeamCount > 0) {
    fx += (cohesionX / sameTeamCount) * config.cohesionStrength;
    fy += (cohesionY / sameTeamCount) * config.cohesionStrength;
    fx += (alignmentX / sameTeamCount) * config.alignmentStrength;
    fy += (alignmentY / sameTeamCount) * config.alignmentStrength;
  }
  
  return { fx, fy };
}

/**
 * Main physics update loop - with proper enemy search and fallback attraction
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
  
  let menAlive = 0;
  let womenAlive = 0;
  let menKills = 0;
  let womenKills = 0;
  let menInFormation = 0;
  let womenInFormation = 0;
  
  const speedMult = rageActive ? config.rageSpeedMultiplier : 1.0;
  const currentSpeed = phase === 'stand' ? config.moveSpeed * 0.1 : config.chargeSpeed * speedMult;
  const maxSpeed = config.maxSpeed * speedMult;
  const attackRangeSq = config.attackRange * config.attackRange;
  
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
    
    const team = soa.teamID[i];
    if (team === TEAM_MEN) menAlive++;
    else womenAlive++;
    
    const x = soa.posX[i];
    const y = soa.posY[i];
    
    // Stand phase - hold formation with minimal drift
    if (phase === 'stand') {
      soa.velX[i] *= 0.85;
      soa.velY[i] *= 0.85;
      setFormationLocked(soa, i, true);
      if (team === TEAM_MEN) menInFormation++;
      else womenInFormation++;
      continue;
    }
    
    // Break formation in melee
    setFormationLocked(soa, i, false);
    
    // Find nearest enemy using wide search (up to 20 cells = 1000px)
    const enemy = findNearestEnemy(
      grid, x, y, team,
      soa.posX, soa.posY, soa.teamID, soa.stateFlags,
      FLAG_ALIVE, 20
    );
    
    let targetX: number;
    let targetY: number;
    
    if (enemy.index >= 0) {
      targetX = soa.posX[enemy.index];
      targetY = soa.posY[enemy.index];
      
      // Attack if in range
      if (enemy.distSq < attackRangeSq) {
        const damage = config.baseDamage * dt;
        soa.health[enemy.index] -= damage;
        
        // Spawn hit sparks
        spawnImpactSparks(pool, (x + targetX) / 2, (y + targetY) / 2);
        
        if (soa.health[enemy.index] <= 0) {
          killUnit(soa, enemy.index);
          kills.push({ x: targetX, y: targetY, killerTeam: team });
          spawnDeathDust(pool, targetX, targetY);
          
          if (team === TEAM_MEN) menKills++;
          else womenKills++;
        }
        
        // Slow down while attacking
        soa.velX[i] *= 0.7;
        soa.velY[i] *= 0.7;
        continue;
      }
    } else {
      // FALLBACK: No enemy found - move toward enemy territory
      if (team === TEAM_MEN) {
        targetX = canvasWidth * 0.85; // Move right
        targetY = canvasHeight / 2;
      } else {
        targetX = canvasWidth * 0.15; // Move left
        targetY = canvasHeight / 2;
      }
    }
    
    // Calculate direction to target
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    if (dist > 5) {
      // Attraction toward target
      const attractX = (dx / dist) * config.attractionStrength;
      const attractY = (dy / dist) * config.attractionStrength;
      
      // Boids steering
      const steering = calculateSteering(soa, grid, i, config);
      
      // Combine forces
      let forceX = attractX + steering.fx;
      let forceY = attractY + steering.fy;
      
      // Normalize and apply
      const forceMag = Math.sqrt(forceX * forceX + forceY * forceY);
      if (forceMag > 0.001) {
        soa.velX[i] += (forceX / forceMag) * currentSpeed * dt;
        soa.velY[i] += (forceY / forceMag) * currentSpeed * dt;
      }
    }
    
    // Velocity damping
    soa.velX[i] *= 0.94;
    soa.velY[i] *= 0.94;
    
    // Clamp velocity
    const velMag = Math.sqrt(soa.velX[i] * soa.velX[i] + soa.velY[i] * soa.velY[i]);
    if (velMag > maxSpeed) {
      const scale = maxSpeed / velMag;
      soa.velX[i] *= scale;
      soa.velY[i] *= scale;
    }
    
    // Update position
    soa.posX[i] += soa.velX[i] * dt;
    soa.posY[i] += soa.velY[i] * dt;
    
    // Boundary constraints
    const margin = 40;
    soa.posX[i] = Math.max(margin, Math.min(canvasWidth - margin, soa.posX[i]));
    soa.posY[i] = Math.max(margin, Math.min(canvasHeight - margin, soa.posY[i]));
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
 * Apply meteor impact force and damage
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
  
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
    
    const dx = soa.posX[i] - meteorX;
    const dy = soa.posY[i] - meteorY;
    const distSq = dx * dx + dy * dy;
    
    if (distSq < radiusSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      const force = strength * (1 - dist / radius);
      
      soa.velX[i] += (dx / dist) * force;
      soa.velY[i] += (dy / dist) * force;
      
      // Also deal damage
      const damage = 30 * (1 - dist / radius);
      soa.health[i] -= damage;
      if (soa.health[i] <= 0) {
        killUnit(soa, i);
      }
    }
  }
}
