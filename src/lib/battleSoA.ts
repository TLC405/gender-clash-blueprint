/**
 * Structure of Arrays (SoA) Memory Layout for High-Performance Battle Simulation
 * Enables 20,000+ units at 60 FPS with zero garbage collection
 */

import { teamBalance } from './battleBalance';
import { formationSlot } from './combatChoreography';
import type { FormationPattern } from './arenaOptions';

export const MAX_UNITS = 20000;

// State flag bitmasks
export const FLAG_ALIVE = 0b00000001;
export const FLAG_RAGE = 0b00000010;
export const FLAG_LOCKED = 0b00000100;
export const FLAG_LEADER = 0b00001000;
export const FLAG_HAS_POWERUP = 0b00010000;

// Team IDs
export const TEAM_MEN = 0;
export const TEAM_WOMEN = 1;

// Formation states (stored in upper 4 bits of stateFlags)
export const FORMATION_SCATTERED = 0;
export const FORMATION_FORMING = 1;
export const FORMATION_LOCKED = 2;
export const FORMATION_CHARGING = 3;
export const FORMATION_BROKEN = 4;

export interface BattleSoA {
  // Position (Float32Array for precision)
  posX: Float32Array;      // 4 bytes × 20K = 80KB
  posY: Float32Array;      // 4 bytes × 20K = 80KB
  
  // Velocity
  velX: Float32Array;      // 4 bytes × 20K = 80KB
  velY: Float32Array;      // 4 bytes × 20K = 80KB
  
  // Target position (for steering)
  targetX: Float32Array;   // 4 bytes × 20K = 80KB
  targetY: Float32Array;   // 4 bytes × 20K = 80KB
  
  // Health
  health: Float32Array;    // 4 bytes × 20K = 80KB
  stagger: Float32Array;   // remaining recoil animation/slowdown (seconds)
  attackTimer: Float32Array; // synchronized hit animations, seconds left
  attackKind: Uint8Array;    // 0=none, 1=jab, 2=two-arm shove
  guardTimer: Float32Array;  // short bracing animation, seconds left
  
  // State
  teamID: Uint8Array;      // 1 byte × 20K = 20KB (0=Men, 1=Women)
  stateFlags: Uint8Array;  // 1 byte × 20K = 20KB (bitmask)
  spriteIdx: Uint16Array;  // 2 bytes × 20K = 40KB (for Disco mode hue)
  
  // Formation
  formationRow: Uint16Array;  // 2 bytes × 20K = 40KB
  formationCol: Uint16Array;  // 2 bytes × 20K = 40KB
  squadLane: Uint8Array;       // vertical tactical formation lane
  formationState: Uint8Array; // forming / charging / broken
  
  // Powerup
  powerupType: Uint8Array;    // 1 byte × 20K = 20KB
  powerupEndTime: Float32Array; // 4 bytes × 20K = 80KB
  
  // Battle tactic shared by the two independent armies.
  formationPattern: FormationPattern;
  // Counts
  unitCount: number;
  menCount: number;
  womenCount: number;
}

// Total: ~740KB - fits comfortably in L2/L3 cache!

/**
 * Create a new SoA battle state with pre-allocated TypedArrays
 */
export function createBattleSoA(): BattleSoA {
  return {
    posX: new Float32Array(MAX_UNITS),
    posY: new Float32Array(MAX_UNITS),
    velX: new Float32Array(MAX_UNITS),
    velY: new Float32Array(MAX_UNITS),
    targetX: new Float32Array(MAX_UNITS),
    targetY: new Float32Array(MAX_UNITS),
    health: new Float32Array(MAX_UNITS),
    stagger: new Float32Array(MAX_UNITS),
    attackTimer: new Float32Array(MAX_UNITS),
    attackKind: new Uint8Array(MAX_UNITS),
    guardTimer: new Float32Array(MAX_UNITS),
    teamID: new Uint8Array(MAX_UNITS),
    stateFlags: new Uint8Array(MAX_UNITS),
    spriteIdx: new Uint16Array(MAX_UNITS),
    formationRow: new Uint16Array(MAX_UNITS),
    formationCol: new Uint16Array(MAX_UNITS),
    squadLane: new Uint8Array(MAX_UNITS),
    formationState: new Uint8Array(MAX_UNITS),
    powerupType: new Uint8Array(MAX_UNITS),
    powerupEndTime: new Float32Array(MAX_UNITS),
    formationPattern: 'battle-lines',
    unitCount: 0,
    menCount: 0,
    womenCount: 0,
  };
}

/**
 * Initialize independently sized armies. A separate column count keeps
 * asymmetric matchups honest and positions both sides inside the arena.
 */
export function initializeUnits(
  soa: BattleSoA,
  menArmySize: number,
  canvasWidth: number,
  canvasHeight: number,
  womenArmySize: number = menArmySize,
  formationPattern: FormationPattern = 'battle-lines'
): void {
  const men = Math.max(1, Math.min(MAX_UNITS / 2, Math.floor(menArmySize)));
  const women = Math.max(1, Math.min(MAX_UNITS - men, Math.floor(womenArmySize)));
  soa.unitCount = men + women;
  soa.menCount = men;
  soa.womenCount = women;
  soa.formationPattern = formationPattern;

  soa.posX.fill(0); soa.posY.fill(0);
  soa.velX.fill(0); soa.velY.fill(0);
  soa.targetX.fill(0); soa.targetY.fill(0);
  soa.health.fill(0); soa.stagger.fill(0); soa.teamID.fill(0);
  soa.attackTimer.fill(0); soa.attackKind.fill(0); soa.guardTimer.fill(0);
  soa.stateFlags.fill(0); soa.spriteIdx.fill(0);
  soa.formationRow.fill(0); soa.formationCol.fill(0);
  soa.squadLane.fill(0); soa.formationState.fill(0);
  soa.powerupType.fill(0); soa.powerupEndTime.fill(0);

  const maxArmy=Math.max(men,women);
  const placeArmy = (count: number, offset: number, team: number) => {
    for(let i=0;i<count;i++){
      const index=offset+i;
      const slot=formationSlot(i,count,maxArmy,team,canvasWidth,canvasHeight,formationPattern);
      soa.posX[index]=slot.x;
      soa.posY[index]=slot.y;
      soa.targetX[index]=slot.x;
      soa.targetY[index]=slot.laneCenterY;
      soa.health[index]=teamBalance(team).maxHealth;
      soa.teamID[index]=team;
      soa.stateFlags[index]=FLAG_ALIVE | (i===0?FLAG_LEADER:0);
      soa.squadLane[index]=slot.lane;
      soa.formationState[index]=FORMATION_FORMING;
      soa.formationRow[index]=slot.row;
      soa.formationCol[index]=slot.col;
      // Avoid global Math.random so a match has a stable identical starting layout.
      soa.spriteIdx[index]=(index*17+team*11)%36;
    }
  };

  placeArmy(men, 0, TEAM_MEN);
  placeArmy(women, men, TEAM_WOMEN);
}

/**
 * Check if unit is alive
 */
export function isAlive(soa: BattleSoA, index: number): boolean {
  return (soa.stateFlags[index] & FLAG_ALIVE) !== 0;
}

/**
 * Check if unit is in formation
 */
export function isInFormation(soa: BattleSoA, index: number): boolean {
  return (soa.stateFlags[index] & FLAG_LOCKED) !== 0;
}

/**
 * Kill a unit
 */
export function killUnit(soa: BattleSoA, index: number): void {
  soa.stateFlags[index] &= ~FLAG_ALIVE;
  soa.health[index] = 0;
  
  if (soa.teamID[index] === TEAM_MEN) {
    soa.menCount--;
  } else {
    soa.womenCount--;
  }
}

/**
 * Set formation state
 */
export function setFormationLocked(soa: BattleSoA, index: number, locked: boolean): void {
  if (locked) {
    soa.stateFlags[index] |= FLAG_LOCKED;
  } else {
    soa.stateFlags[index] &= ~FLAG_LOCKED;
  }
}

/**
 * Get alive unit count for a team
 */
export function getAliveCount(soa: BattleSoA, team: number): number {
  let count = 0;
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) && soa.teamID[i] === team) {
      count++;
    }
  }
  return count;
}
