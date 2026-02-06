/**
 * Ultimate Horde Battle Physics Engine
 * Global centroid tracking, fury escalation, knockback, relentless pursuit
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
  moveSpeed: 80,
  chargeSpeed: 250,           // Stronger charge burst
  attackRange: 8,              // Tighter melee
  baseDamage: 30,              // Faster, decisive kills
  separationRadius: 10,
  separationStrength: 1.0,
  cohesionRadius: 60,
  cohesionStrength: 0.06,
  alignmentStrength: 0.06,
  attractionStrength: 4.0,     // Very strong pursuit
  maxSpeed: 180,               // Higher top speed
  rageSpeedMultiplier: 1.4,
};

// Charge state tracking
let chargeApplied = false;
export function resetChargeState(): void {
  chargeApplied = false;
}

// Track initial army sizes for fury calculation
let initialMenCount = 0;
let initialWomenCount = 0;
export function setInitialCounts(men: number, women: number): void {
  initialMenCount = men;
  initialWomenCount = women;
}

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
 * Team-colored hit sparks
 */
function spawnHitSparks(pool: ParticlePool, x: number, y: number, attackerTeam: number): void {
  // colorIdx: 2 = blue, 3 = pink
  const colorIdx = attackerTeam === TEAM_MEN ? 2 : 3;
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 60;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 25, PARTICLE_SPARK, 0.3, 2.5, colorIdx);
  }
}

/**
 * Bigger death explosion with team color
 */
function spawnDeathExplosion(pool: ParticlePool, x: number, y: number, deadTeam: number): void {
  const colorIdx = deadTeam === TEAM_MEN ? 2 : 3;
  // 8 particles per death - larger, more visible
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
    const speed = 40 + Math.random() * 50;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 20, PARTICLE_SPARK, 0.5, 3.5, colorIdx);
  }
  // Dust cloud
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 25;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 10, PARTICLE_DUST, 0.6, 5);
  }
}

/**
 * Compute global centroid for each team (center of mass of all alive units)
 */
function computeTeamCentroids(soa: BattleSoA): {
  menCX: number; menCY: number; menCount: number;
  womenCX: number; womenCY: number; womenCount: number;
} {
  let menSumX = 0, menSumY = 0, menCount = 0;
  let womenSumX = 0, womenSumY = 0, womenCount = 0;

  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
    if (soa.teamID[i] === TEAM_MEN) {
      menSumX += soa.posX[i];
      menSumY += soa.posY[i];
      menCount++;
    } else {
      womenSumX += soa.posX[i];
      womenSumY += soa.posY[i];
      womenCount++;
    }
  }

  return {
    menCX: menCount > 0 ? menSumX / menCount : 0,
    menCY: menCount > 0 ? menSumY / menCount : 0,
    menCount,
    womenCX: womenCount > 0 ? womenSumX / womenCount : 0,
    womenCY: womenCount > 0 ? womenSumY / womenCount : 0,
    womenCount,
  };
}

/**
 * Compute fury multiplier based on casualties
 */
function getFuryMultiplier(aliveCount: number, initialCount: number): number {
  if (initialCount <= 0) return 1.0;
  const casualtyRatio = 1 - (aliveCount / initialCount);
  return 1.0 + casualtyRatio * 0.8; // Up to 1.8x at near-elimination
}

/**
 * Calculate Boids steering forces (separation + cohesion + alignment)
 */
function calculateSteering(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  unitIndex: number,
  config: PhysicsConfig,
  inCombatZone: boolean
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

    // Cohesion & alignment (teammates only, NOT in combat zone)
    if (!inCombatZone && soa.teamID[otherIdx] === unitTeam && distSq < cohRadiusSq) {
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
 * Main physics update loop - with global centroid tracking and fury escalation
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

  // GLOBAL CENTROID: Compute center of mass for each team
  const centroids = computeTeamCentroids(soa);

  let menAlive = centroids.menCount;
  let womenAlive = centroids.womenCount;
  let menKills = 0;
  let womenKills = 0;
  let menInFormation = 0;
  let womenInFormation = 0;

  // FURY ESCALATION: Survivors fight harder as casualties mount
  const menFury = getFuryMultiplier(menAlive, initialMenCount);
  const womenFury = getFuryMultiplier(womenAlive, initialWomenCount);

  const speedMult = rageActive ? config.rageSpeedMultiplier : 1.0;
  const attackRangeSq = config.attackRange * config.attackRange;

  // CHARGE IMPULSE: One-time burst toward enemy territory on melee start
  if (phase === 'melee' && !chargeApplied) {
    chargeApplied = true;
    for (let i = 0; i < soa.unitCount; i++) {
      if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
      const team = soa.teamID[i];
      const chargeDir = team === TEAM_MEN ? 1 : -1;
      // Random spread for natural charge look
      soa.velX[i] = chargeDir * config.chargeSpeed * (0.7 + Math.random() * 0.6);
      soa.velY[i] = (Math.random() - 0.5) * config.chargeSpeed * 0.4;
      setFormationLocked(soa, i, false);
    }
  }

  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const team = soa.teamID[i];
    const x = soa.posX[i];
    const y = soa.posY[i];
    const fury = team === TEAM_MEN ? menFury : womenFury;
    const unitMaxSpeed = config.maxSpeed * speedMult * fury;

    // Stand phase: hold formation
    if (phase === 'stand') {
      soa.velX[i] *= 0.8;
      soa.velY[i] *= 0.8;
      setFormationLocked(soa, i, true);
      if (team === TEAM_MEN) menInFormation++;
      else womenInFormation++;
      continue;
    }

    // TARGETING: Try spatial hash first, then fall back to GLOBAL CENTROID
    const enemy = findNearestEnemy(
      grid, x, y, team,
      soa.posX, soa.posY, soa.teamID, soa.stateFlags,
      FLAG_ALIVE, 25
    );

    let targetX: number;
    let targetY: number;
    let hasDirectTarget = false;

    if (enemy.index >= 0) {
      targetX = soa.posX[enemy.index];
      targetY = soa.posY[enemy.index];
      hasDirectTarget = true;

      // ATTACK: In range
      if (enemy.distSq < attackRangeSq) {
        const damage = config.baseDamage * fury * dt;
        soa.health[enemy.index] -= damage;

        // Team-colored hit sparks
        spawnHitSparks(pool, (x + targetX) / 2, (y + targetY) / 2, team);

        // KNOCKBACK: Push target away from attacker
        const kbDx = targetX - x;
        const kbDy = targetY - y;
        const kbDist = Math.sqrt(kbDx * kbDx + kbDy * kbDy);
        if (kbDist > 0.1) {
          soa.velX[enemy.index] += (kbDx / kbDist) * 15;
          soa.velY[enemy.index] += (kbDy / kbDist) * 15;
        }

        if (soa.health[enemy.index] <= 0) {
          killUnit(soa, enemy.index);
          kills.push({ x: targetX, y: targetY, killerTeam: team });
          spawnDeathExplosion(pool, targetX, targetY, soa.teamID[enemy.index]);

          if (team === TEAM_MEN) menKills++;
          else womenKills++;

          // KILL MOMENTUM: Push through
          if (kbDist > 0.1) {
            soa.velX[i] += (kbDx / kbDist) * 50;
            soa.velY[i] += (kbDy / kbDist) * 50;
          }
        }

        // ATTACK LUNGE
        if (kbDist > 0.1) {
          const ldx = targetX - x;
          const ldy = targetY - y;
          const ldist = Math.sqrt(ldx * ldx + ldy * ldy);
          if (ldist > 0.1) {
            soa.velX[i] += (ldx / ldist) * 35 * dt;
            soa.velY[i] += (ldy / ldist) * 35 * dt;
          }
        }

        soa.velX[i] *= 0.93;
        soa.velY[i] *= 0.93;
      }
    } else {
      // GLOBAL CENTROID FALLBACK: Always have a target
      if (team === TEAM_MEN) {
        targetX = centroids.womenCX || canvasWidth * 0.85;
        targetY = centroids.womenCY || canvasHeight / 2;
      } else {
        targetX = centroids.menCX || canvasWidth * 0.15;
        targetY = centroids.menCY || canvasHeight / 2;
      }
    }

    // PURSUIT: Direct force toward target
    const dx = targetX - x;
    const dy = targetY - y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 2) {
      // Distance urgency: farther = stronger pull
      const urgency = hasDirectTarget
        ? (dist > 300 ? 2.5 : dist > 150 ? 1.8 : dist > 50 ? 1.2 : 1.0)
        : 2.0; // Strong pull toward centroid

      const attractForce = config.attractionStrength * urgency * fury;
      const attractX = (dx / dist) * attractForce;
      const attractY = (dy / dist) * attractForce;

      // Boids steering (disabled in close combat)
      const inCombatZone = hasDirectTarget && dist < 60;
      const steering = inCombatZone
        ? { fx: 0, fy: 0 }
        : calculateSteering(soa, grid, i, config, inCombatZone);

      soa.velX[i] += (attractX + steering.fx) * config.moveSpeed * dt;
      soa.velY[i] += (attractY + steering.fy) * config.moveSpeed * dt;
    }

    // Minimal damping to maintain momentum
    soa.velX[i] *= 0.985;
    soa.velY[i] *= 0.985;

    // Clamp velocity
    const velMag = Math.sqrt(soa.velX[i] * soa.velX[i] + soa.velY[i] * soa.velY[i]);
    if (velMag > unitMaxSpeed) {
      const scale = unitMaxSpeed / velMag;
      soa.velX[i] *= scale;
      soa.velY[i] *= scale;
    }

    // Update position
    soa.posX[i] += soa.velX[i] * dt;
    soa.posY[i] += soa.velY[i] * dt;

    // SOFT BOUNDARY: Bounce + return force
    const margin = 25;
    const returnForce = 120;

    if (soa.posX[i] < margin) {
      soa.posX[i] = margin;
      soa.velX[i] = Math.abs(soa.velX[i]) * 0.5 + returnForce * dt;
    } else if (soa.posX[i] > canvasWidth - margin) {
      soa.posX[i] = canvasWidth - margin;
      soa.velX[i] = -Math.abs(soa.velX[i]) * 0.5 - returnForce * dt;
    }

    if (soa.posY[i] < margin) {
      soa.posY[i] = margin;
      soa.velY[i] = Math.abs(soa.velY[i]) * 0.5 + returnForce * dt;
    } else if (soa.posY[i] > canvasHeight - margin) {
      soa.posY[i] = canvasHeight - margin;
      soa.velY[i] = -Math.abs(soa.velY[i]) * 0.5 - returnForce * dt;
    }
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

      const damage = 40 * (1 - dist / radius);
      soa.health[i] -= damage;
      if (soa.health[i] <= 0) {
        killUnit(soa, i);
      }
    }
  }
}
