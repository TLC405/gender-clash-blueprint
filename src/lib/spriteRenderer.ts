/**
 * Clean Unit Sprite Renderer
 * Simple, professional unit rendering - no flashy effects
 */

import { TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE, FLAG_LOCKED, FLAG_LEADER, type BattleSoA } from './battleSoA';

// Simple team colors
const COLORS = {
  men: '#3B82F6',      // Blue
  menDark: '#1D4ED8',
  women: '#EC4899',    // Pink  
  womenDark: '#BE185D',
  locked: '#F59E0B',   // Amber for formation lock
  leader: '#FFD700',   // Gold for leaders
};

/**
 * Initialize sprites (no-op for simple rendering)
 */
export function initSprites(): void {
  // No pre-rendering needed for simple circles
}

/**
 * Render all units as clean, simple circles
 */
export function renderUnits(
  ctx: CanvasRenderingContext2D,
  soa: BattleSoA,
  _discoMode: boolean = false,
  _globalFrame: number = 0,
  _lighterBlend: boolean = false
): void {
  ctx.save();
  
  // Base unit size
  const unitSize = 4;
  const leaderSize = 6;
  
  // Draw all units
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
    
    const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const team = soa.teamID[i];
    const size = isLeader ? leaderSize : unitSize;
    
    // Health-based opacity
    const healthRatio = soa.health[i] / 100;
    const alpha = 0.4 + healthRatio * 0.6;
    
    // Determine color
    let color: string;
    if (isLocked) {
      color = COLORS.locked;
    } else if (team === TEAM_MEN) {
      color = COLORS.men;
    } else {
      color = COLORS.women;
    }
    
    ctx.globalAlpha = alpha;
    
    // Draw unit circle
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(soa.posX[i], soa.posY[i], size, 0, Math.PI * 2);
    ctx.fill();
    
    // Leader indicator - simple ring
    if (isLeader) {
      ctx.strokeStyle = COLORS.leader;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(soa.posX[i], soa.posY[i], size + 2, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  
  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Render units to offscreen canvas (for performance)
 */
export function renderUnitsOffscreen(
  mainCtx: CanvasRenderingContext2D,
  soa: BattleSoA,
  offscreenCanvas: OffscreenCanvas,
  discoMode: boolean = false,
  globalFrame: number = 0
): void {
  const ctx = offscreenCanvas.getContext('2d');
  if (!ctx) return;
  
  ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  
  ctx.save();
  ctx.scale(0.5, 0.5);
  renderUnits(ctx as unknown as CanvasRenderingContext2D, soa, discoMode, globalFrame, false);
  ctx.restore();
  
  mainCtx.drawImage(
    offscreenCanvas,
    0, 0, offscreenCanvas.width, offscreenCanvas.height,
    0, 0, offscreenCanvas.width * 2, offscreenCanvas.height * 2
  );
}
