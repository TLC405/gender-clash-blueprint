/**
 * Premium Unit Sprite Renderer
 * Larger units, health-based sizing, directional facing, combat glow
 */

import { TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE, FLAG_LOCKED, FLAG_LEADER, type BattleSoA } from './battleSoA';

// Professional color palette
const COLORS = {
  menPrimary: '#3B82F6',
  menSecondary: '#1D4ED8',
  menGlow: '#93C5FD',
  womenPrimary: '#EC4899',
  womenSecondary: '#BE185D',
  womenGlow: '#F9A8D4',
  locked: '#F59E0B',
  lockedDark: '#B45309',
  lockedGlow: '#FCD34D',
  leader: '#FFD700',
  shadow: 'rgba(0, 0, 0, 0.45)',
};

export function initSprites(): void {}

/**
 * Render all units with premium quality
 * Larger size, health-based scaling, directional facing, combat glow
 */
export function renderUnits(
  ctx: CanvasRenderingContext2D,
  soa: BattleSoA,
  _discoMode: boolean = false,
  _globalFrame: number = 0,
  _lighterBlend: boolean = false
): void {
  const BASE_RADIUS = 6;     // Increased from 4
  const LEADER_RADIUS = 9;   // Increased from 6
  const shadowOffsetY = 3;

  ctx.save();

  // Pass 1: Ground shadows (soft, larger)
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const healthRatio = soa.health[i] / 100;
    const baseR = isLeader ? LEADER_RADIUS : BASE_RADIUS;
    // Health-based sizing: shrink when hurt
    const radius = baseR * (0.7 + healthRatio * 0.3);

    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(
      soa.posX[i],
      soa.posY[i] + shadowOffsetY,
      radius * 1.3,
      radius * 0.45,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  // Pass 2: Unit bodies with directional facing and gradients
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const team = soa.teamID[i];
    const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const healthRatio = soa.health[i] / 100;
    const baseR = isLeader ? LEADER_RADIUS : BASE_RADIUS;
    const radius = baseR * (0.7 + healthRatio * 0.3);

    const x = soa.posX[i];
    const y = soa.posY[i];
    const vx = soa.velX[i];
    const vy = soa.velY[i];

    // Color selection
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

    // Directional facing: subtle elongation toward velocity
    const speed = Math.sqrt(vx * vx + vy * vy);
    const stretch = Math.min(speed / 150, 0.25); // Max 25% elongation

    ctx.save();
    ctx.translate(x, y);

    if (speed > 5) {
      const angle = Math.atan2(vy, vx);
      ctx.rotate(angle);
      ctx.scale(1 + stretch, 1 - stretch * 0.3);
    }

    // 3D sphere gradient (highlight offset for depth)
    const bodyGrad = ctx.createRadialGradient(
      -radius * 0.25, -radius * 0.25, 0,
      0, 0, radius
    );
    bodyGrad.addColorStop(0, glow);
    bodyGrad.addColorStop(0.5, primary);
    bodyGrad.addColorStop(1, secondary);

    ctx.globalAlpha = 0.55 + healthRatio * 0.45;
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outline for readability
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.6;
    ctx.stroke();

    // Combat glow: pulse when moving fast (in combat)
    if (speed > 80 && !isLocked) {
      ctx.globalAlpha = 0.15 + Math.sin(Date.now() * 0.01 + i) * 0.08;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.6, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Leader crown ring (drawn without rotation)
    if (isLeader) {
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = COLORS.leader;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.stroke();

      // Inner gold glow
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = COLORS.leader;
      ctx.beginPath();
      ctx.arc(x, y, radius + 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/**
 * Render units to offscreen canvas
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
