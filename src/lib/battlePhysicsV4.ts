/**
 * TLC Battle / Atomic Physics V4
 *
 * Deterministic fixed-step steering + spatially bounded perception.
 * Instead of full rigid-body physics, each dot is a crowd agent with local
 * steering and delayed damage. The update order does not favor either side.
 *
 * Sources / design decisions: docs/physics-research.md
 * - G. Fiedler, Fix Your Timestep!
 * - C. Reynolds, Steering Behaviors for Autonomous Characters
 * - van den Berg et al., ORCA (principles only; this is NOT ORCA)
 */
import {
  type BattleSoA,
  MAX_UNITS, FLAG_ALIVE, TEAM_MEN, TEAM_WOMEN,
  killUnit, setFormationLocked
} from './battleSoA';
import {
  type SpatialHashGrid, rebuildGrid, queryRadius, findNearestEnemy
} from './spatialHash';
import {
  type ParticlePool, spawnParticle, PARTICLE_SPARK, PARTICLE_DUST
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
  /** Maximum damage per second a surrounded unit can receive. */
  incomingDamageCap: number;
  /** Number of spatial cells each agent can sense for enemies. */
  enemySightCells: number;
}

export const DEFAULT_CONFIG: PhysicsConfig = {
  moveSpeed: 95,
  chargeSpeed: 175,
  attackRange: 10.5,
  baseDamage: 18,
  separationRadius: 9,
  separationStrength: 1.7,
  cohesionRadius: 60,
  cohesionStrength: 0.038,
  alignmentStrength: 0.035,
  attractionStrength: 3.2,
  maxSpeed: 175,
  rageSpeedMultiplier: 1.3,
  incomingDamageCap: 65,
  enemySightCells: 3,
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

export interface MeteorImpactResult {
  menLost: number;
  womenLost: number;
  totalLost: number;
  hits: number;
}

interface CombatRuntime {
  charged: boolean;
  menInitial: number;
  womenInitial: number;
  tick: number;
  pendingDamage: Float32Array;
  impulseX: Float32Array;
  impulseY: Float32Array;
  nextVX: Float32Array;
  nextVY: Float32Array;
}

const runtimes = new WeakMap<BattleSoA, CombatRuntime>();
let legacyInitial = { men: 0, women: 0 };

function getRuntime(soa: BattleSoA): CombatRuntime {
  let runtime = runtimes.get(soa);
  if (!runtime) {
    runtime = {
      charged: false,
      menInitial: legacyInitial.men || soa.menCount,
      womenInitial: legacyInitial.women || soa.womenCount,
      tick: 0,
      pendingDamage: new Float32Array(MAX_UNITS),
      impulseX: new Float32Array(MAX_UNITS),
      impulseY: new Float32Array(MAX_UNITS),
      nextVX: new Float32Array(MAX_UNITS),
      nextVY: new Float32Array(MAX_UNITS),
    };
    runtimes.set(soa, runtime);
  }
  return runtime;
}

/** Reset a specific battle (the optional argument supports old callers). */
export function resetChargeState(soa?: BattleSoA): void {
  if (soa) runtimes.delete(soa);
  legacyInitial = { men: 0, women: 0 };
}

export function setInitialCounts(men: number, women: number, soa?: BattleSoA): void {
  if (soa) {
    const runtime = getRuntime(soa);
    runtime.menInitial = Math.max(1, men);
    runtime.womenInitial = Math.max(1, women);
    return;
  }
  legacyInitial = { men, women };
}

/** A reproducible per-agent pseudo-random value. Independent of global Math.random. */
function noise(unit: number, salt: number): number {
  let n = Math.imul(unit + 1, 0x9e3779b1) ^ Math.imul(salt + 1, 0x85ebca6b);
  n ^= n >>> 16;
  n = Math.imul(n, 0x7feb352d);
  n ^= n >>> 15;
  return (n >>> 0) / 4294967296;
}

function fury(alive: number, initial: number): number {
  const loss = Math.max(0, Math.min(1, 1 - alive / Math.max(1, initial)));
  return 1 + loss * 0.35; // restrained comeback boost, not runaway 1.8x
}

/**
 * Local steering. Allies keep space even at the frontline, while enemy
 * repulsion is deliberately softer so opposing formations can make contact.
 * This is Reynolds-inspired, not a claim of implementing full ORCA.
 */
function localSteering(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  i: number,
  config: PhysicsConfig,
  inCombat: boolean
): { x: number; y: number } {
  const x = soa.posX[i];
  const y = soa.posY[i];
  const team = soa.teamID[i];
  const sep2 = config.separationRadius * config.separationRadius;
  const coh2 = config.cohesionRadius * config.cohesionRadius;
  let sx = 0, sy = 0, cx = 0, cy = 0, ax = 0, ay = 0, allies = 0;
  let inspected = 0;

  for (const j of queryRadius(grid, x, y)) {
    if (j === i || (soa.stateFlags[j] & FLAG_ALIVE) === 0) continue;
    const dx = soa.posX[j] - x;
    const dy = soa.posY[j] - y;
    const d2 = dx * dx + dy * dy;
    const sameSide = soa.teamID[j] === team;

    if (d2 < sep2) {
      const d = Math.sqrt(d2);
      const weight = sameSide ? 1 : 0.18;
      if (d > 0.0001) {
        const strength = (config.separationRadius - d) / config.separationRadius;
        sx -= (dx / d) * strength * weight;
        sy -= (dy / d) * strength * weight;
      } else {
        // Stable paired jitter for perfectly stacked units.
        const angle = noise(Math.min(i, j), Math.max(i, j)) * Math.PI * 2;
        const direction = i < j ? 1 : -1;
        sx += Math.cos(angle) * direction * weight;
        sy += Math.sin(angle) * direction * weight;
      }
    }
    if (!inCombat && sameSide && d2 < coh2) {
      cx += dx; cy += dy;
      ax += soa.velX[j]; ay += soa.velY[j];
      allies++;
    }
    // Budget nearby pairs in packed 2,400-agent battles.
    if (++inspected >= 48) break;
  }
  // Prevent very dense formations from creating arbitrary giant impulses.
  const magnitude = Math.hypot(sx, sy);
  if (magnitude > 3) { sx *= 3 / magnitude; sy *= 3 / magnitude; }
  const cohX = allies ? (cx / allies) * config.cohesionStrength : 0;
  const cohY = allies ? (cy / allies) * config.cohesionStrength : 0;
  const alignX = allies ? (ax / allies - soa.velX[i]) * config.alignmentStrength : 0;
  const alignY = allies ? (ay / allies - soa.velY[i]) * config.alignmentStrength : 0;
  return {
    x: sx * config.separationStrength + cohX + alignX,
    y: sy * config.separationStrength + cohY + alignY,
  };
}

function centroid(soa: BattleSoA) {
  let mx = 0, my = 0, wcx = 0, wcy = 0, mn = 0, wn = 0;
  for (let i = 0; i < soa.unitCount; i++) {
    if (!(soa.stateFlags[i] & FLAG_ALIVE)) continue;
    if (soa.teamID[i] === TEAM_MEN) { mx += soa.posX[i]; my += soa.posY[i]; mn++; }
    else { wcx += soa.posX[i]; wcy += soa.posY[i]; wn++; }
  }
  return {
    menX: mn ? mx / mn : 0, menY: mn ? my / mn : 0,
    womenX: wn ? wcx / wn : 0, womenY: wn ? wcy / wn : 0,
    mn, wn,
  };
}

function effects(pool: ParticlePool, x: number, y: number, attacker: number, seed: number, death: boolean): void {
  const particles = death ? 7 : 2;
  const color = attacker === TEAM_MEN ? 2 : 3;
  for (let i = 0; i < particles; i++) {
    const angle = (i / particles) * Math.PI * 2 + noise(seed, i) * 0.5;
    const velocity = (death ? 45 : 27) + noise(i, seed) * 35;
    spawnParticle(pool, x, y, Math.cos(angle) * velocity, Math.sin(angle) * velocity,
      PARTICLE_SPARK, death ? 0.4 : 0.16, death ? 2.8 : 1.7, color);
  }
  if (death) spawnParticle(pool, x, y, 0, -10, PARTICLE_DUST, 0.3, 3.5);
}

/** One bounded, fixed-step integration pass. Teams resolve damage simultaneously. */
export function updatePhysics(
  soa: BattleSoA,
  grid: SpatialHashGrid,
  pool: ParticlePool,
  config: PhysicsConfig,
  phase: BattlePhase,
  deltaTime: number,
  canvasWidth: number,
  canvasHeight: number,
  battleSpeed = 1,
  rageActive: boolean | { men: boolean; women: boolean } = false
): PhysicsResult {
  const runtime = getRuntime(soa);
  const kills: PhysicsResult['kills'] = [];
  let menKills = 0, womenKills = 0;
  let menInFormation = 0, womenInFormation = 0;
  const step = Math.min(1 / 30, Math.max(0, deltaTime)) * Math.min(2, Math.max(0.1, battleSpeed));
  const frozen = phase === 'stand' || phase === 'victory' || step <= 0;
  const menRage = typeof rageActive === 'boolean' ? rageActive : rageActive.men;
  const womenRage = typeof rageActive === 'boolean' ? rageActive : rageActive.women;

  if (!frozen && phase === 'melee' && !runtime.charged) {
    runtime.charged = true;
    for (let i = 0; i < soa.unitCount; i++) {
      if (!(soa.stateFlags[i] & FLAG_ALIVE)) continue;
      const side = soa.teamID[i] === TEAM_MEN ? 1 : -1;
      soa.velX[i] = side * Math.min(config.chargeSpeed * (0.65 + noise(i, 71) * 0.4), config.maxSpeed);
      soa.velY[i] = (noise(i, 73) - 0.5) * config.chargeSpeed * 0.25;
      setFormationLocked(soa, i, false);
    }
  }

  rebuildGrid(grid, soa.posX, soa.posY, soa.stateFlags, soa.unitCount, FLAG_ALIVE);
  const teams = centroid(soa);
  const r = runtime;
  r.pendingDamage.fill(0, 0, soa.unitCount);
  r.impulseX.fill(0, 0, soa.unitCount);
  r.impulseY.fill(0, 0, soa.unitCount);

  for (let i = 0; i < soa.unitCount; i++) {
    if (!(soa.stateFlags[i] & FLAG_ALIVE)) continue;
    const team = soa.teamID[i];
    if (frozen) {
      r.nextVX[i] = 0;
      r.nextVY[i] = 0;
      if (phase === 'stand') {
        setFormationLocked(soa, i, true);
        if (team === TEAM_MEN) menInFormation++;
        else womenInFormation++;
      }
      continue;
    }

    const x = soa.posX[i], y = soa.posY[i];
    const boosted = team === TEAM_MEN ? menRage : womenRage;
    const strength = team === TEAM_MEN ? fury(teams.mn, r.menInitial) : fury(teams.wn, r.womenInitial);
    const maxSpeed = config.maxSpeed * strength * (boosted ? config.rageSpeedMultiplier : 1) * (phase === 'sudden_death' ? 1.13 : 1);
    const enemy = findNearestEnemy(
      grid, x, y, team, soa.posX, soa.posY, soa.teamID, soa.stateFlags,
      FLAG_ALIVE, config.enemySightCells
    );
    const inCombat = enemy.index >= 0 && enemy.distSq < 55 * 55;
    const tx = enemy.index >= 0 ? soa.posX[enemy.index] : team === TEAM_MEN ? teams.womenX : teams.menX;
    const ty = enemy.index >= 0 ? soa.posY[enemy.index] : team === TEAM_MEN ? teams.womenY : teams.menY;
    const dx = tx - x, dy = ty - y;
    const distance = Math.hypot(dx, dy);
    const nx = distance > 0.001 ? dx / distance : (team === TEAM_MEN ? 1 : -1);
    const ny = distance > 0.001 ? dy / distance : 0;

    if (enemy.index >= 0 && enemy.distSq <= config.attackRange ** 2) {
      const damage = config.baseDamage * strength * step
        * (boosted ? 1.22 : 1) * (phase === 'sudden_death' ? 1.4 : 1);
      r.pendingDamage[enemy.index] += damage;

      // Knockback is accumulated, not applied immediately; no ordering bias.
      r.impulseX[enemy.index] += nx * 7.5;
      r.impulseY[enemy.index] += ny * 7.5;
      // Cap particle emissions (previously every hit emitted 5 sparks, every tick).
      if ((i + r.tick) % 19 === 0) effects(pool, (x + tx) / 2, (y + ty) / 2, team, i + r.tick, false);
    }

    const local = localSteering(soa, grid, i, config, inCombat);
    const shouldMove = (team === TEAM_MEN ? teams.wn > 0 : teams.mn > 0);
    const approach = inCombat && distance < config.attackRange ? 0.15 : 0.74;
    const intendedSpeed = shouldMove ? maxSpeed * approach : 0;
    const response = Math.min(1, config.attractionStrength * step);
    let vx = soa.velX[i] + ((nx * intendedSpeed - soa.velX[i]) * response);
    let vy = soa.velY[i] + ((ny * intendedSpeed - soa.velY[i]) * response);
    vx += local.x * config.moveSpeed * step;
    vy += local.y * config.moveSpeed * step;

    // Exponential drag is timestep-scaled, unlike a per-frame 0.985 multiplier.
    const drag = Math.exp(-(inCombat ? 1.45 : 0.4) * step);
    vx *= drag; vy *= drag;
    const velocity = Math.hypot(vx, vy);
    if (velocity > maxSpeed) { vx = vx / velocity * maxSpeed; vy = vy / velocity * maxSpeed; }
    r.nextVX[i] = vx;
    r.nextVY[i] = vy;
  }

  // Integrate only after everybody has chosen actions from the SAME state.
  // Prevents the first team in array order from observing updated positions.
  if (!frozen) {
    const left = Math.min(25, Math.max(0, canvasWidth / 2 - 1));
    const top = Math.min(25, Math.max(0, canvasHeight / 2 - 1));
    const right = Math.max(left, canvasWidth - left);
    const bottom = Math.max(top, canvasHeight - top);
    for (let i = 0; i < soa.unitCount; i++) {
      if (!(soa.stateFlags[i] & FLAG_ALIVE)) continue;
      const team = soa.teamID[i];
      const boosted = team === TEAM_MEN ? menRage : womenRage;
      const strength = team === TEAM_MEN ? fury(teams.mn, r.menInitial) : fury(teams.wn, r.womenInitial);
      const limit = config.maxSpeed * strength * (boosted ? config.rageSpeedMultiplier : 1) * (phase === 'sudden_death' ? 1.13 : 1);
      let vx = r.nextVX[i] + r.impulseX[i];
      let vy = r.nextVY[i] + r.impulseY[i];
      const velocity = Math.hypot(vx, vy);
      if (velocity > limit) { vx = vx / velocity * limit; vy = vy / velocity * limit; }
      let x = soa.posX[i] + vx * step;
      let y = soa.posY[i] + vy * step;
      if (x < left || x > right) { x = Math.max(left, Math.min(right, x)); vx *= -0.25; }
      if (y < top || y > bottom) { y = Math.max(top, Math.min(bottom, y)); vy *= -0.25; }
      soa.posX[i] = x; soa.posY[i] = y;
      soa.velX[i] = vx; soa.velY[i] = vy;
    }

    // Kill resolution happens after BOTH teams have attacked this tick.
    // Incoming damage saturation reduces the 1v50 instant-delete problem.
    for (let i = 0; i < soa.unitCount; i++) {
      if (!(soa.stateFlags[i] & FLAG_ALIVE)) continue;
      const dmg = Math.min(r.pendingDamage[i], config.incomingDamageCap * step);
      if (dmg <= 0) continue;
      soa.health[i] -= dmg;
      if (soa.health[i] <= 0) {
        const slainTeam = soa.teamID[i];
        const killerTeam = slainTeam === TEAM_MEN ? TEAM_WOMEN : TEAM_MEN;
        killUnit(soa, i);
        kills.push({ x: soa.posX[i], y: soa.posY[i], killerTeam });
        if (killerTeam === TEAM_MEN) menKills++; else womenKills++;
        effects(pool, soa.posX[i], soa.posY[i], slainTeam, i + r.tick, true);
      }
    }
    r.tick++;
  }

  return {
    stats: {
      menAlive: soa.menCount, womenAlive: soa.womenCount,
      menKills, womenKills, menInFormation, womenInFormation,
    },
    kills,
    menFormationActive: phase === 'stand' && menInFormation >= teams.mn * 0.5,
    womenFormationActive: phase === 'stand' && womenInFormation >= teams.wn * 0.5,
  };
}

/**
 * Meteor strikes are environmental eliminations (NOT credited as a team's KO).
 * Return actual casualties so the scoreboard and game-over checks update at once.
 */
export function applyMeteorImpact(
  soa: BattleSoA,
  _grid: SpatialHashGrid,
  meteorX: number,
  meteorY: number,
  radius = 100,
  strength = 500
): MeteorImpactResult {
  const safeRadius = Math.max(1, radius);
  const radiusSq = safeRadius * safeRadius;
  const result: MeteorImpactResult = { menLost: 0, womenLost: 0, totalLost: 0, hits: 0 };
  for (let i = 0; i < soa.unitCount; i++) {
    if (!(soa.stateFlags[i] & FLAG_ALIVE)) continue;
    const dx = soa.posX[i] - meteorX;
    const dy = soa.posY[i] - meteorY;
    const d2 = dx * dx + dy * dy;
    if (d2 >= radiusSq) continue;
    const d = Math.sqrt(d2);
    const falloff = 1 - d / safeRadius;
    const nx = d > 0.001 ? dx / d : Math.cos(noise(i, 101) * Math.PI * 2);
    const ny = d > 0.001 ? dy / d : Math.sin(noise(i, 101) * Math.PI * 2);
    soa.velX[i] += nx * strength * falloff;
    soa.velY[i] += ny * strength * falloff;
    soa.health[i] -= 52 * falloff;
    result.hits++;
    if (soa.health[i] <= 0) {
      const team = soa.teamID[i];
      killUnit(soa, i);
      if (team === TEAM_MEN) result.menLost++; else result.womenLost++;
      result.totalLost++;
    }
  }
  return result;
}
