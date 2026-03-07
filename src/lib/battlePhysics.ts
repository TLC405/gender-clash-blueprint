/**
 * Horde Battle Physics Engine v2
 *
 * Core fixes over v1:
 * - attackRange (14) now equals separationRadius (14) so units CAN actually fight
 * - Hard-body position correction prevents units clipping through each other
 * - Strong combat damping stops the endless overshooting
 * - Enemy search radius raised from 25px → 100px so units always find targets
 * - Pure combat mode (no boids) while engaged stops the wandering-off problem
 * - Boundary return force starts 80px from edge instead of 25px
 * - Units in melee lock into "fighting stance" rather than chasing new targets
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
  unitRadius: number;
  baseDamage: number;
  separationRadius: number;
  separationStrength: number;
  cohesionRadius: number;
  cohesionStrength: number;
  alignmentStrength: number;
  attractionStrength: number;
  maxSpeed: number;
  combatDamping: number;
  travelDamping: number;
  rageSpeedMultiplier: number;
}

export const DEFAULT_CONFIG: PhysicsConfig = {
  moveSpeed: 55,
  chargeSpeed: 180,
  // CRITICAL FIX: attackRange must be >= separationRadius
  // Otherwise units get pushed apart before they can swing
  attackRange: 14,
  unitRadius: 6,
  baseDamage: 22,
  // Hard-body separation — two 6px units touching = 12px apart minimum
  separationRadius: 14,
  separationStrength: 6.0,    // Strong enough to feel solid, not pass-through
  cohesionRadius: 90,
  cohesionStrength: 0.015,    // Gentle grouping, not magnetic clumping
  alignmentStrength: 0.02,
  attractionStrength: 2.8,
  maxSpeed: 130,              // Lower cap → less overshoot
  combatDamping: 0.75,        // Heavy friction when in melee
  travelDamping: 0.94,        // Moderate friction while closing distance
  rageSpeedMultiplier: 1.35,
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

function spawnHitSparks(pool: ParticlePool, x: number, y: number, attackerTeam: number): void {
  const colorIdx = attackerTeam === TEAM_MEN ? 2 : 3;
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 50;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 20, PARTICLE_SPARK, 0.3, 2.5, colorIdx);
  }
}

function spawnDeathExplosion(pool: ParticlePool, x: number, y: number, deadTeam: number): void {
  const colorIdx = deadTeam === TEAM_MEN ? 2 : 3;
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
    const speed = 45 + Math.random() * 55;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 20, PARTICLE_SPARK, 0.55, 4, colorIdx);
  }
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 15 + Math.random() * 20;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 8, PARTICLE_DUST, 0.7, 6);
  }
}

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

function getFuryMultiplier(aliveCount: number, initialCount: number): number {
  if (initialCount <= 0) return 1.0;
  const casualtyRatio = 1 - (aliveCount / initialCount);
  return 1.0 + casualtyRatio * 0.8;
}

/**
 * Boids steering: separation + gentle cohesion + alignment.
 * Only called for units NOT currently in direct melee.
 */
function calculateSteering(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  unitIndex: number,
  config: PhysicsConfig,
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

    // Hard separation for ALL units (same or enemy team)
    if (distSq < sepRadiusSq && distSq > 0.01) {
      const dist = Math.sqrt(distSq);
      // Linear falloff: strong at contact, fades at separationRadius
      const force = (config.separationRadius - dist) / config.separationRadius;
      separationX -= (dx / dist) * force * config.separationStrength;
      separationY -= (dy / dist) * force * config.separationStrength;
    }

    // Cohesion & alignment with teammates only
    if (soa.teamID[otherIdx] === unitTeam && distSq < cohRadiusSq) {
      cohesionX += dx;
      cohesionY += dy;
      alignmentX += soa.velX[otherIdx];
      alignmentY += soa.velY[otherIdx];
      sameTeamCount++;
    }
  }

  let fx = separationX;
  let fy = separationY;

  if (sameTeamCount > 0) {
    fx += (cohesionX / sameTeamCount) * config.cohesionStrength;
    fy += (cohesionY / sameTeamCount) * config.cohesionStrength;
    fx += (alignmentX / sameTeamCount) * config.alignmentStrength;
    fy += (alignmentY / sameTeamCount) * config.alignmentStrength;
  }

  return { fx, fy };
}

/**
 * Hard-body position correction: when two units overlap (dist < separationRadius),
 * push their positions apart so they don't visually clip through each other.
 * Applied as a post-step correction for all pairs within range.
 */
function applyHardBodyCorrection(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  config: PhysicsConfig
): void {
  const minDist = config.separationRadius * 0.85; // allow slight overlap for density
  const minDistSq = minDist * minDist;

  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    for (const j of queryRadius(grid, soa.posX[i], soa.posY[i])) {
      if (j <= i) continue;
      if ((soa.stateFlags[j] & FLAG_ALIVE) === 0) continue;

      const dx = soa.posX[j] - soa.posX[i];
      const dy = soa.posY[j] - soa.posY[i];
      const distSq = dx * dx + dy * dy;

      if (distSq < minDistSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        const overlap = (minDist - dist) * 0.4; // 40% correction per frame
        const nx = dx / dist;
        const ny = dy / dist;
        soa.posX[i] -= nx * overlap;
        soa.posY[i] -= ny * overlap;
        soa.posX[j] += nx * overlap;
        soa.posY[j] += ny * overlap;
      }
    }
  }
}

/**
 * Main physics update — fixed combat loop with proper collision and engagement
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
  const dt = Math.min(deltaTime * battleSpeed, 0.05);
  const kills: Array<{ x: number; y: number; killerTeam: number }> = [];

  // Rebuild spatial hash each frame
  rebuildGrid(grid, soa.posX, soa.posY, soa.stateFlags, soa.unitCount, FLAG_ALIVE);

  const centroids = computeTeamCentroids(soa);

  let menAlive = centroids.menCount;
  let womenAlive = centroids.womenCount;
  let menKills = 0;
  let womenKills = 0;
  let menInFormation = 0;
  let womenInFormation = 0;

  const menFury = getFuryMultiplier(menAlive, initialMenCount);
  const womenFury = getFuryMultiplier(womenAlive, initialWomenCount);
  const speedMult = rageActive ? config.rageSpeedMultiplier : 1.0;
  const attackRangeSq = config.attackRange * config.attackRange;

  // One-time charge burst when melee starts
  if (phase === 'melee' && !chargeApplied) {
    chargeApplied = true;
    for (let i = 0; i < soa.unitCount; i++) {
      if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
      const chargeDir = soa.teamID[i] === TEAM_MEN ? 1 : -1;
      soa.velX[i] = chargeDir * config.chargeSpeed * (0.6 + Math.random() * 0.8);
      soa.velY[i] = (Math.random() - 0.5) * config.chargeSpeed * 0.45;
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

    // Stand phase: hold formation, damp velocity to near-zero
    if (phase === 'stand') {
      soa.velX[i] *= 0.7;
      soa.velY[i] *= 0.7;
      setFormationLocked(soa, i, true);
      if (team === TEAM_MEN) menInFormation++;
      else womenInFormation++;
      // Still apply separation so formation doesn't compress into a blob
      const steering = calculateSteering(soa, grid, i, config);
      soa.velX[i] += steering.fx * 0.3;
      soa.velY[i] += steering.fy * 0.3;
      soa.posX[i] += soa.velX[i] * dt;
      soa.posY[i] += soa.velY[i] * dt;
      continue;
    }

    // Find nearest enemy — raised search radius to 100px so units don't lose targets
    const enemy = findNearestEnemy(
      grid, x, y, team,
      soa.posX, soa.posY, soa.teamID, soa.stateFlags,
      FLAG_ALIVE, 100
    );

    const hasDirectTarget = enemy.index >= 0;
    const inMelee = hasDirectTarget && enemy.distSq < attackRangeSq * 4; // within 2x attack range

    // === COMBAT MODE ===
    if (hasDirectTarget && enemy.distSq < attackRangeSq) {
      const targetX = soa.posX[enemy.index];
      const targetY = soa.posY[enemy.index];

      // Deal damage
      const damage = config.baseDamage * fury * dt;
      soa.health[enemy.index] -= damage;
      spawnHitSparks(pool, (x + targetX) / 2, (y + targetY) / 2, team);

      // Knockback to target
      const kbDx = targetX - x;
      const kbDy = targetY - y;
      const kbDist = Math.sqrt(kbDx * kbDx + kbDy * kbDy);
      if (kbDist > 0.1) {
        const kbScale = 12 / kbDist;
        soa.velX[enemy.index] += kbDx * kbScale;
        soa.velY[enemy.index] += kbDy * kbScale;
      }

      if (soa.health[enemy.index] <= 0) {
        killUnit(soa, enemy.index);
        kills.push({ x: targetX, y: targetY, killerTeam: team });
        spawnDeathExplosion(pool, targetX, targetY, soa.teamID[enemy.index]);
        if (team === TEAM_MEN) menKills++;
        else womenKills++;
        // Brief kill momentum — lunge forward
        if (kbDist > 0.1) {
          soa.velX[i] += (kbDx / kbDist) * 40;
          soa.velY[i] += (kbDy / kbDist) * 40;
        }
      } else {
        // Lunge into target on each hit (small)
        if (kbDist > 0.1) {
          soa.velX[i] += (kbDx / kbDist) * 18 * dt;
          soa.velY[i] += (kbDy / kbDist) * 18 * dt;
        }
      }

      // Heavy damping in melee — units should plant their feet and swing
      soa.velX[i] *= config.combatDamping;
      soa.velY[i] *= config.combatDamping;

    } else {
      // === PURSUIT MODE ===
      let targetX: number;
      let targetY: number;

      if (hasDirectTarget) {
        // Chase nearest enemy
        targetX = soa.posX[enemy.index];
        targetY = soa.posY[enemy.index];
      } else {
        // No enemy in sight — move toward enemy centroid
        if (team === TEAM_MEN) {
          targetX = centroids.womenCX > 0 ? centroids.womenCX : canvasWidth * 0.85;
          targetY = centroids.womenCY > 0 ? centroids.womenCY : canvasHeight / 2;
        } else {
          targetX = centroids.menCX > 0 ? centroids.menCX : canvasWidth * 0.15;
          targetY = centroids.menCY > 0 ? centroids.menCY : canvasHeight / 2;
        }
      }

      const dx = targetX - x;
      const dy = targetY - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        const urgency = dist > 250 ? 2.2 : dist > 100 ? 1.5 : dist > 40 ? 1.1 : 0.8;
        const attractForce = config.attractionStrength * urgency * fury;
        soa.velX[i] += (dx / dist) * attractForce * config.moveSpeed * dt;
        soa.velY[i] += (dy / dist) * attractForce * config.moveSpeed * dt;
      }

      // Boids only while travelling (not in close melee)
      if (!inMelee) {
        const steering = calculateSteering(soa, grid, i, config);
        soa.velX[i] += steering.fx * config.moveSpeed * dt;
        soa.velY[i] += steering.fy * config.moveSpeed * dt;
      }

      // Travel damping — moderate friction so they don't overshoot
      soa.velX[i] *= config.travelDamping;
      soa.velY[i] *= config.travelDamping;
    }

    // Clamp to max speed
    const velMag = Math.sqrt(soa.velX[i] * soa.velX[i] + soa.velY[i] * soa.velY[i]);
    if (velMag > unitMaxSpeed) {
      const scale = unitMaxSpeed / velMag;
      soa.velX[i] *= scale;
      soa.velY[i] *= scale;
    }

    // Move
    soa.posX[i] += soa.velX[i] * dt;
    soa.posY[i] += soa.velY[i] * dt;

    // Boundary — return force starts 80px from edge, gets stronger near wall
    const edgeMargin = 20;
    const returnZone = 80;

    if (soa.posX[i] < returnZone) {
      const depth = (returnZone - soa.posX[i]) / returnZone;
      soa.velX[i] += depth * depth * 200 * dt;
      if (soa.posX[i] < edgeMargin) { soa.posX[i] = edgeMargin; soa.velX[i] = Math.abs(soa.velX[i]) * 0.4; }
    } else if (soa.posX[i] > canvasWidth - returnZone) {
      const depth = (soa.posX[i] - (canvasWidth - returnZone)) / returnZone;
      soa.velX[i] -= depth * depth * 200 * dt;
      if (soa.posX[i] > canvasWidth - edgeMargin) { soa.posX[i] = canvasWidth - edgeMargin; soa.velX[i] = -Math.abs(soa.velX[i]) * 0.4; }
    }

    if (soa.posY[i] < returnZone) {
      const depth = (returnZone - soa.posY[i]) / returnZone;
      soa.velY[i] += depth * depth * 200 * dt;
      if (soa.posY[i] < edgeMargin) { soa.posY[i] = edgeMargin; soa.velY[i] = Math.abs(soa.velY[i]) * 0.4; }
    } else if (soa.posY[i] > canvasHeight - returnZone) {
      const depth = (soa.posY[i] - (canvasHeight - returnZone)) / returnZone;
      soa.velY[i] -= depth * depth * 200 * dt;
      if (soa.posY[i] > canvasHeight - edgeMargin) { soa.posY[i] = canvasHeight - edgeMargin; soa.velY[i] = -Math.abs(soa.velY[i]) * 0.4; }
    }
  }

  // Hard-body correction pass — shove overlapping units apart so they look solid
  // Skip this for very large armies (> 3000 total) to maintain 60fps
  if (soa.unitCount <= 3000) {
    applyHardBodyCorrection(soa, grid, config);
  }

  return {
    stats: { menAlive, womenAlive, menKills, womenKills, menInFormation, womenInFormation },
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
      const damage = 50 * (1 - dist / radius);
      soa.health[i] -= damage;
      if (soa.health[i] <= 0) killUnit(soa, i);
    }
  }
}
