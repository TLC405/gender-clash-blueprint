/**
 * Structure of Arrays (SoA) Memory Layout for High-Performance Battle Simulation
 * Enables 20,000+ units at 60 FPS with zero garbage collection
 */

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
  
  // State
  teamID: Uint8Array;      // 1 byte × 20K = 20KB (0=Men, 1=Women)
  stateFlags: Uint8Array;  // 1 byte × 20K = 20KB (bitmask)
  spriteIdx: Uint16Array;  // 2 bytes × 20K = 40KB (for Disco mode hue)
  
  // Formation
  formationRow: Uint16Array;  // 2 bytes × 20K = 40KB
  formationCol: Uint16Array;  // 2 bytes × 20K = 40KB
  
  // Powerup
  powerupType: Uint8Array;    // 1 byte × 20K = 20KB
  powerupEndTime: Float32Array; // 4 bytes × 20K = 80KB
  
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
    teamID: new Uint8Array(MAX_UNITS),
    stateFlags: new Uint8Array(MAX_UNITS),
    spriteIdx: new Uint16Array(MAX_UNITS),
    formationRow: new Uint16Array(MAX_UNITS),
    formationCol: new Uint16Array(MAX_UNITS),
    powerupType: new Uint8Array(MAX_UNITS),
    powerupEndTime: new Float32Array(MAX_UNITS),
    unitCount: 0,
    menCount: 0,
    womenCount: 0,
  };
}

/**
 * Initialize units for battle
 * Creates proper army formations centered vertically, facing each other
 */
export function initializeUnits(
  soa: BattleSoA,
  armySize: number,
  canvasWidth: number,
  canvasHeight: number
): void {
  const totalUnits = armySize * 2;
  soa.unitCount = totalUnits;
  soa.menCount = armySize;
  soa.womenCount = armySize;
  
  // Reset all arrays
  soa.posX.fill(0);
  soa.posY.fill(0);
  soa.velX.fill(0);
  soa.velY.fill(0);
  soa.targetX.fill(0);
  soa.targetY.fill(0);
  soa.health.fill(0);
  soa.teamID.fill(0);
  soa.stateFlags.fill(0);
  soa.spriteIdx.fill(0);
  soa.powerupType.fill(0);
  soa.powerupEndTime.fill(0);
  
  // Calculate grid dimensions for a roughly square formation
  const unitsPerRow = Math.ceil(Math.sqrt(armySize * 0.6)); // Slightly wider than tall
  const spacing = 8; // Pixels between units
  
  // Calculate formation dimensions
  const formationWidth = unitsPerRow * spacing;
  const formationHeight = Math.ceil(armySize / unitsPerRow) * spacing;
  
  // Center formations vertically
  const centerY = canvasHeight / 2;
  const startY = centerY - formationHeight / 2;
  
  // Men start at 15% from left, Women at 15% from right
  const menStartX = canvasWidth * 0.12;
  const womenStartX = canvasWidth * 0.88;
  
  // Initialize MEN (left side, facing right)
  for (let i = 0; i < armySize; i++) {
    const row = Math.floor(i / unitsPerRow);
    const col = i % unitsPerRow;
    
    soa.posX[i] = menStartX + col * spacing;
    soa.posY[i] = startY + row * spacing;
    soa.health[i] = 100;
    soa.teamID[i] = TEAM_MEN;
    soa.stateFlags[i] = FLAG_ALIVE | (i === 0 ? FLAG_LEADER : 0);
    soa.formationRow[i] = row;
    soa.formationCol[i] = col;
    soa.spriteIdx[i] = Math.floor(Math.random() * 36);
  }
  
  // Initialize WOMEN (right side, facing left)
  for (let i = 0; i < armySize; i++) {
    const idx = armySize + i;
    const row = Math.floor(i / unitsPerRow);
    const col = i % unitsPerRow;
    
    soa.posX[idx] = womenStartX - col * spacing;
    soa.posY[idx] = startY + row * spacing;
    soa.health[idx] = 100;
    soa.teamID[idx] = TEAM_WOMEN;
    soa.stateFlags[idx] = FLAG_ALIVE | (i === 0 ? FLAG_LEADER : 0);
    soa.formationRow[idx] = row;
    soa.formationCol[idx] = col;
    soa.spriteIdx[idx] = Math.floor(Math.random() * 36);
  }
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
