/**
 * Premium Unit Sprite Renderer v3
 * Larger units, specular highlights, team rings, health bars, 
 * movement trails, stand-phase breathing, combat flash
 */

import { TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE, FLAG_LOCKED, FLAG_LEADER, type BattleSoA } from './battleSoA';

const COLORS = {
  menPrimary: '#3B82F6',
  menSecondary: '#1D4ED8',
  menGlow: '#93C5FD',
  menRing: 'rgba(59, 130, 246, 0.35)',
  womenPrimary: '#EC4899',
  womenSecondary: '#BE185D',
  womenGlow: '#F9A8D4',
  womenRing: 'rgba(236, 72, 153, 0.35)',
  locked: '#F59E0B',
  lockedDark: '#B45309',
  lockedGlow: '#FCD34D',
  lockedRing: 'rgba(245, 158, 11, 0.35)',
  leader: '#FFD700',
  shadow: 'rgba(0, 0, 0, 0.5)',
  healthGreen: '#22C55E',
  healthYellow: '#EAB308',
  healthRed: '#EF4444',
  specular: 'rgba(255, 255, 255, 0.85)',
};

export function initSprites(): void {}

/**
 * Render all units with premium broadcast quality
 */
export function renderUnits(
  ctx: CanvasRenderingContext2D,
  soa: BattleSoA,
  _discoMode: boolean = false,
  _globalFrame: number = 0,
  _lighterBlend: boolean = false,
  currentPhase: string = 'melee'
): void {
  const BASE_RADIUS = 7;
  const LEADER_RADIUS = 11;
  const shadowOffsetY = 4;
  const now = Date.now();

  // Stand-phase breathing: pulsing scale
  let breathScale = 1.0;
  if (currentPhase === 'stand') {
    breathScale = 1.0 + Math.sin(now * 0.004) * 0.06;
  }

  ctx.save();

  // Pass 1: Movement trails (afterimages for fast units)
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const vx = soa.velX[i];
    const vy = soa.velY[i];
    const speed = Math.sqrt(vx * vx + vy * vy);

    if (speed > 60) {
      const team = soa.teamID[i];
      const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
      const color = isLocked ? COLORS.locked : (team === TEAM_MEN ? COLORS.menPrimary : COLORS.womenPrimary);
      const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
      const baseR = isLeader ? LEADER_RADIUS : BASE_RADIUS;
      const healthRatio = soa.health[i] / 100;
      const radius = baseR * (0.7 + healthRatio * 0.3) * breathScale;

      const dirX = vx / speed;
      const dirY = vy / speed;

      // Ghost 1: 20% opacity
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(soa.posX[i] - dirX * radius * 2.5, soa.posY[i] - dirY * radius * 2.5, radius * 0.7, 0, Math.PI * 2);
      ctx.fill();

      // Ghost 2: 10% opacity
      ctx.globalAlpha = 0.08;
      ctx.beginPath();
      ctx.arc(soa.posX[i] - dirX * radius * 4.5, soa.posY[i] - dirY * radius * 4.5, radius * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Pass 2: Ground shadows
  ctx.globalAlpha = 1;
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const healthRatio = soa.health[i] / 100;
    const baseR = isLeader ? LEADER_RADIUS : BASE_RADIUS;
    const radius = baseR * (0.7 + healthRatio * 0.3) * breathScale;

    ctx.fillStyle = COLORS.shadow;
    ctx.beginPath();
    ctx.ellipse(
      soa.posX[i],
      soa.posY[i] + shadowOffsetY,
      radius * 1.4,
      radius * 0.4,
      0, 0, Math.PI * 2
    );
    ctx.fill();
  }

  // Pass 3: Team-colored outer rings (faint identification aura)
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const team = soa.teamID[i];
    const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const healthRatio = soa.health[i] / 100;
    const baseR = isLeader ? LEADER_RADIUS : BASE_RADIUS;
    const radius = baseR * (0.7 + healthRatio * 0.3) * breathScale;

    const ringColor = isLocked ? COLORS.lockedRing : (team === TEAM_MEN ? COLORS.menRing : COLORS.womenRing);

    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = ringColor;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(soa.posX[i], soa.posY[i], radius + 2.5, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Pass 4: Unit bodies with directional facing, gradients, specular highlights
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;

    const team = soa.teamID[i];
    const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const healthRatio = soa.health[i] / 100;
    const baseR = isLeader ? LEADER_RADIUS : BASE_RADIUS;
    const radius = baseR * (0.7 + healthRatio * 0.3) * breathScale;

    const x = soa.posX[i];
    const y = soa.posY[i];
    const vx = soa.velX[i];
    const vy = soa.velY[i];

    let primary: string, secondary: string, glow: string;

    if (isLocked) {
      primary = COLORS.locked; secondary = COLORS.lockedDark; glow = COLORS.lockedGlow;
    } else if (team === TEAM_MEN) {
      primary = COLORS.menPrimary; secondary = COLORS.menSecondary; glow = COLORS.menGlow;
    } else {
      primary = COLORS.womenPrimary; secondary = COLORS.womenSecondary; glow = COLORS.womenGlow;
    }

    const speed = Math.sqrt(vx * vx + vy * vy);
    const stretch = Math.min(speed / 150, 0.25);

    ctx.save();
    ctx.translate(x, y);

    if (speed > 5) {
      const angle = Math.atan2(vy, vx);
      ctx.rotate(angle);
      ctx.scale(1 + stretch, 1 - stretch * 0.3);
    }

    // 3D sphere gradient
    const bodyGrad = ctx.createRadialGradient(
      -radius * 0.3, -radius * 0.3, 0,
      0, 0, radius
    );
    bodyGrad.addColorStop(0, glow);
    bodyGrad.addColorStop(0.45, primary);
    bodyGrad.addColorStop(1, secondary);

    ctx.globalAlpha = 0.6 + healthRatio * 0.4;
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    // Specular highlight (bright white dot, top-left)
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = COLORS.specular;
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.35, radius * 0.22, 0, Math.PI * 2);
    ctx.fill();

    // Combat glow pulse (fast-moving units in combat)
    if (speed > 80 && !isLocked) {
      ctx.globalAlpha = 0.2 + Math.sin(now * 0.012 + i) * 0.1;
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, radius * 1.7, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    // Leader star decoration
    if (isLeader) {
      ctx.globalAlpha = 0.95;
      ctx.strokeStyle = COLORS.leader;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.stroke();

      // Gold inner glow
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = COLORS.leader;
      ctx.beginPath();
      ctx.arc(x, y, radius + 4, 0, Math.PI * 2);
      ctx.fill();

      // Star above leader
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = COLORS.leader;
      drawStar(ctx, x, y - radius - 7, 4, 5);
    }

    // Health bar (only when < 80% HP)
    if (healthRatio < 0.8) {
      const barW = radius * 2.2;
      const barH = 2;
      const barX = x - barW / 2;
      const barY = y + radius + 5;

      // Background
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(barX, barY, barW, barH);

      // Health fill
      ctx.globalAlpha = 0.85;
      const hColor = healthRatio > 0.5 ? COLORS.healthGreen : healthRatio > 0.25 ? COLORS.healthYellow : COLORS.healthRed;
      ctx.fillStyle = hColor;
      ctx.fillRect(barX, barY, barW * healthRatio, barH);
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

/** Draw a small 5-pointed star */
function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, points: number) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (Math.PI * i) / points - Math.PI / 2;
    const rad = i % 2 === 0 ? r : r * 0.45;
    const method = i === 0 ? 'moveTo' : 'lineTo';
    ctx[method](cx + Math.cos(angle) * rad, cy + Math.sin(angle) * rad);
  }
  ctx.closePath();
  ctx.fill();
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
