/**
 * Premium Unit Sprite Renderer
 * Professional quality with ground shadows and clean readability
 */

import { TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE, FLAG_LOCKED, FLAG_LEADER, type BattleSoA } from './battleSoA';

// Professional color palette
const COLORS = {
  // Teams
  menPrimary: '#3B82F6',
  menSecondary: '#1D4ED8',
  menGlow: '#60A5FA',
  womenPrimary: '#EC4899',
  womenSecondary: '#BE185D',
  womenGlow: '#F472B6',
  
  // States
  locked: '#F59E0B',
  lockedDark: '#B45309',
  lockedGlow: '#FCD34D',
  leader: '#FFD700',
  
  // Effects
  shadow: 'rgba(0, 0, 0, 0.5)',
};

/**
 * Initialize sprites (no-op for gradient rendering)
 */
export function initSprites(): void {
  // No pre-rendering needed
}

/**
 * Render all units with professional quality
 * Includes ground shadows, radial gradients, and clean outlines
 */
export function renderUnits(
  ctx: CanvasRenderingContext2D,
  soa: BattleSoA,
  _discoMode: boolean = false,
  _globalFrame: number = 0,
  _lighterBlend: boolean = false
): void {
  const unitRadius = 4;
  const leaderRadius = 6;
  const shadowOffsetY = 2;

  ctx.save();

  // Pass 1: Ground shadows for depth
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const radius = isLeader ? leaderRadius : unitRadius;

    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(
      soa.posX[i],
      soa.posY[i] + shadowOffsetY,
      radius * 1.1,
      radius * 0.4,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  // Pass 2: Unit bodies with gradients
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const team = soa.teamID[i];
    const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const healthRatio = soa.health[i] / 100;
    const radius = isLeader ? leaderRadius : unitRadius;

    const x = soa.posX[i];
    const y = soa.posY[i];

    // Color based on state
    let primary: string;
    let secondary: string;
    let glow: string;

    if (isLocked) {
      primary = COLORS.locked;
      secondary = COLORS.lockedDark;
      glow = COLORS.lockedGlow;
    } else if (team === TEAM_MEN) {
      primary = COLORS.menPrimary;
      secondary = COLORS.menSecondary;
      glow = COLORS.menGlow;
    } else {
      primary = COLORS.womenPrimary;
      secondary = COLORS.womenSecondary;
      glow = COLORS.womenGlow;
    }

    // Radial gradient for 3D sphere effect
    const bodyGrad = ctx.createRadialGradient(
      x - radius * 0.3, y - radius * 0.3, 0,
      x, y, radius
    );
    bodyGrad.addColorStop(0, glow);
    bodyGrad.addColorStop(0.6, primary);
    bodyGrad.addColorStop(1, secondary);

    // Health affects opacity
    ctx.globalAlpha = 0.5 + healthRatio * 0.5;
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    // Subtle outline for readability
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // Leader indicator ring
    if (isLeader) {
      ctx.strokeStyle = COLORS.leader;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 2.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Render units to offscreen canvas (for performance if needed)
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
