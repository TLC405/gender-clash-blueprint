/**
 * Ultra-Premium Sprite Renderer
 * Disney-quality unit rendering with smooth gradients and polish
 */

import { TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE, FLAG_LOCKED, FLAG_LEADER, type BattleSoA } from './battleSoA';

// Team color palettes - rich, saturated Disney-style colors
const TEAM_COLORS = {
  men: {
    primary: '#1E90FF',      // Dodger blue
    secondary: '#60A5FA',    // Light blue
    glow: '#93C5FD',         // Pale blue glow
    dark: '#1D4ED8',         // Deep blue
  },
  women: {
    primary: '#EC4899',      // Pink
    secondary: '#F472B6',    // Light pink
    glow: '#FBCFE8',         // Pale pink glow
    dark: '#BE185D',         // Deep pink
  },
  locked: {
    primary: '#F59E0B',      // Amber
    secondary: '#FCD34D',    // Yellow
    glow: '#FEF3C7',         // Cream glow
  },
  leader: {
    ring: '#FFD700',         // Gold
    glow: '#FEF08A',         // Light gold
  }
};

// Pre-rendered sprite cache
const spriteCache = new Map<string, HTMLCanvasElement>();

/**
 * Create a high-quality unit sprite with Disney-style polish
 */
function createUnitSprite(
  teamColors: typeof TEAM_COLORS.men,
  size: number,
  isLeader: boolean = false,
  isLocked: boolean = false
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  const padding = size * 0.5; // Extra space for glow
  canvas.width = size + padding * 2;
  canvas.height = size + padding * 2;
  const ctx = canvas.getContext('2d')!;
  
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const radius = size / 2;
  
  // Outer glow (soft ambient)
  const outerGlow = ctx.createRadialGradient(cx, cy, radius * 0.5, cx, cy, radius * 2);
  outerGlow.addColorStop(0, isLocked ? TEAM_COLORS.locked.glow + '40' : teamColors.glow + '30');
  outerGlow.addColorStop(0.5, isLocked ? TEAM_COLORS.locked.glow + '10' : teamColors.glow + '10');
  outerGlow.addColorStop(1, 'transparent');
  ctx.fillStyle = outerGlow;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2);
  ctx.fill();
  
  // Main body gradient
  const bodyGrad = ctx.createRadialGradient(
    cx - radius * 0.3, cy - radius * 0.3, 0,
    cx, cy, radius
  );
  
  if (isLocked) {
    bodyGrad.addColorStop(0, '#FFFFFF');
    bodyGrad.addColorStop(0.3, TEAM_COLORS.locked.secondary);
    bodyGrad.addColorStop(0.7, TEAM_COLORS.locked.primary);
    bodyGrad.addColorStop(1, teamColors.dark);
  } else {
    bodyGrad.addColorStop(0, '#FFFFFF');
    bodyGrad.addColorStop(0.2, teamColors.glow);
    bodyGrad.addColorStop(0.5, teamColors.secondary);
    bodyGrad.addColorStop(0.8, teamColors.primary);
    bodyGrad.addColorStop(1, teamColors.dark);
  }
  
  // Draw main circle
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Inner highlight (Disney polish)
  const highlight = ctx.createRadialGradient(
    cx - radius * 0.3, cy - radius * 0.4, 0,
    cx - radius * 0.2, cy - radius * 0.2, radius * 0.5
  );
  highlight.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
  highlight.addColorStop(0.5, 'rgba(255, 255, 255, 0.2)');
  highlight.addColorStop(1, 'transparent');
  ctx.fillStyle = highlight;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  
  // Leader ring
  if (isLeader) {
    ctx.strokeStyle = TEAM_COLORS.leader.ring;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 8;
    ctx.shadowColor = TEAM_COLORS.leader.glow;
    ctx.beginPath();
    ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.shadowBlur = 0;
    
    // Crown/star indicator
    ctx.fillStyle = TEAM_COLORS.leader.ring;
    const starSize = radius * 0.4;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * starSize;
      const y = cy - radius - 4 + Math.sin(angle) * starSize * 0.5;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  
  return canvas;
}

/**
 * Get or create cached sprite
 */
function getSprite(team: number, size: number, isLeader: boolean, isLocked: boolean): HTMLCanvasElement {
  const key = `${team}-${size}-${isLeader}-${isLocked}`;
  
  if (!spriteCache.has(key)) {
    const colors = team === TEAM_MEN ? TEAM_COLORS.men : TEAM_COLORS.women;
    spriteCache.set(key, createUnitSprite(colors, size, isLeader, isLocked));
  }
  
  return spriteCache.get(key)!;
}

/**
 * Initialize sprites (pre-warm cache)
 */
export function initSprites(): void {
  // Pre-create common sprite variants
  const sizes = [12, 16, 20];
  for (const size of sizes) {
    for (const team of [TEAM_MEN, TEAM_WOMEN]) {
      getSprite(team, size, false, false);
      getSprite(team, size, false, true);
      getSprite(team, size, true, false);
      getSprite(team, size, true, true);
    }
  }
}

/**
 * Render all units with Disney-quality polish
 */
export function renderUnits(
  ctx: CanvasRenderingContext2D,
  soa: BattleSoA,
  discoMode: boolean = false,
  globalFrame: number = 0,
  lighterBlend: boolean = false
): void {
  ctx.save();
  
  // Sort by Y for proper layering (units in front drawn on top)
  const indices: number[] = [];
  for (let i = 0; i < soa.unitCount; i++) {
    if ((soa.stateFlags[i] & FLAG_ALIVE) !== 0) {
      indices.push(i);
    }
  }
  indices.sort((a, b) => soa.posY[a] - soa.posY[b]);
  
  // Unit sizing
  const baseSize = 12;
  const leaderSize = 18;
  
  for (const i of indices) {
    const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
    const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const team = soa.teamID[i];
    const size = isLeader ? leaderSize : baseSize;
    
    // Health-based visual feedback
    const healthRatio = soa.health[i] / 100;
    const alpha = 0.5 + healthRatio * 0.5;
    const scale = 0.8 + healthRatio * 0.2;
    
    // Get cached sprite
    const sprite = getSprite(team, size, isLeader, isLocked);
    
    // Draw with health-based modifications
    ctx.save();
    ctx.globalAlpha = alpha;
    
    const drawSize = size * scale;
    const padding = size * 0.5;
    
    // Disco mode - hue rotation
    if (discoMode) {
      const hue = ((soa.spriteIdx[i] + globalFrame) % 36) * 10;
      ctx.filter = `hue-rotate(${hue}deg)`;
    }
    
    ctx.drawImage(
      sprite,
      soa.posX[i] - drawSize / 2 - padding,
      soa.posY[i] - drawSize / 2 - padding,
      sprite.width * (drawSize / size),
      sprite.height * (drawSize / size)
    );
    
    // Low health warning indicator
    if (healthRatio < 0.3 && healthRatio > 0) {
      ctx.globalAlpha = 0.6 * (1 - healthRatio / 0.3);
      ctx.fillStyle = '#FF0000';
      ctx.beginPath();
      ctx.arc(soa.posX[i], soa.posY[i], drawSize * 0.3, 0, Math.PI * 2);
      ctx.fill();
    }
    
    ctx.restore();
  }
  
  ctx.restore();
}

/**
 * Render units to offscreen canvas (performance optimization)
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
  
  // Render at half resolution
  ctx.save();
  ctx.scale(0.5, 0.5);
  renderUnits(ctx as unknown as CanvasRenderingContext2D, soa, discoMode, globalFrame, false);
  ctx.restore();
  
  // Blit to main canvas
  mainCtx.drawImage(
    offscreenCanvas,
    0, 0, offscreenCanvas.width, offscreenCanvas.height,
    0, 0, offscreenCanvas.width * 2, offscreenCanvas.height * 2
  );
}
