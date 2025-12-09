/**
 * High-Performance Sprite Renderer
 * Pre-baked sprite atlas with batched drawing for 60 FPS at 20K+ units
 */

import { TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE, FLAG_LOCKED, FLAG_LEADER, type BattleSoA } from './battleSoA';

const SPRITE_SIZE = 32;
const HUE_VARIANTS = 36; // 10-degree increments

let spriteAtlas: OffscreenCanvas | null = null;
let menBaseSprite: OffscreenCanvas | null = null;
let womenBaseSprite: OffscreenCanvas | null = null;
let discoAtlas: OffscreenCanvas | null = null;

/**
 * Generate a soft-glow particle sprite
 */
function generateParticleSprite(color: string, glowColor: string): OffscreenCanvas {
  const sprite = new OffscreenCanvas(SPRITE_SIZE, SPRITE_SIZE);
  const ctx = sprite.getContext('2d')!;
  
  const center = SPRITE_SIZE / 2;
  
  // Outer glow
  const outerGrad = ctx.createRadialGradient(center, center, 0, center, center, center);
  outerGrad.addColorStop(0, glowColor);
  outerGrad.addColorStop(0.5, `${color}88`);
  outerGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = outerGrad;
  ctx.fillRect(0, 0, SPRITE_SIZE, SPRITE_SIZE);
  
  // Inner core
  const innerGrad = ctx.createRadialGradient(center, center, 0, center, center, center * 0.4);
  innerGrad.addColorStop(0, '#ffffff');
  innerGrad.addColorStop(0.5, color);
  innerGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = innerGrad;
  ctx.beginPath();
  ctx.arc(center, center, center * 0.6, 0, Math.PI * 2);
  ctx.fill();
  
  return sprite;
}

/**
 * Generate disco mode sprite atlas (36 hue variants)
 */
function generateDiscoAtlas(): OffscreenCanvas {
  const atlas = new OffscreenCanvas(SPRITE_SIZE * HUE_VARIANTS, SPRITE_SIZE * 2);
  const ctx = atlas.getContext('2d')!;
  
  for (let i = 0; i < HUE_VARIANTS; i++) {
    const hue = (i * 10) % 360;
    const color = `hsl(${hue}, 100%, 60%)`;
    const glow = `hsl(${hue}, 100%, 80%)`;
    
    // Men row (bottom)
    const menSprite = generateParticleSprite(color, glow);
    ctx.drawImage(menSprite, i * SPRITE_SIZE, 0);
    
    // Women row (top)
    const womenSprite = generateParticleSprite(color, glow);
    ctx.drawImage(womenSprite, i * SPRITE_SIZE, SPRITE_SIZE);
  }
  
  return atlas;
}

/**
 * Initialize sprite assets
 */
export function initSprites(): void {
  // Men sprite (blue)
  menBaseSprite = generateParticleSprite('#1F6FEB', '#60A5FA');
  
  // Women sprite (pink)
  womenBaseSprite = generateParticleSprite('#E91E63', '#F472B6');
  
  // Create main atlas (Men top row, Women bottom row)
  spriteAtlas = new OffscreenCanvas(SPRITE_SIZE * 3, SPRITE_SIZE * 2);
  const ctx = spriteAtlas.getContext('2d')!;
  
  // Normal sprites
  ctx.drawImage(menBaseSprite, 0, 0);
  ctx.drawImage(womenBaseSprite, 0, SPRITE_SIZE);
  
  // Locked/formation sprites (golden glow)
  const menLocked = generateParticleSprite('#FFD700', '#FDE68A');
  const womenLocked = generateParticleSprite('#FFD700', '#FDE68A');
  ctx.drawImage(menLocked, SPRITE_SIZE, 0);
  ctx.drawImage(womenLocked, SPRITE_SIZE, SPRITE_SIZE);
  
  // Leader sprites (larger, brighter)
  const menLeader = generateParticleSprite('#00AEEF', '#7DD3FC');
  const womenLeader = generateParticleSprite('#FF6B9A', '#FDA4AF');
  ctx.drawImage(menLeader, SPRITE_SIZE * 2, 0);
  ctx.drawImage(womenLeader, SPRITE_SIZE * 2, SPRITE_SIZE);
  
  // Disco atlas
  discoAtlas = generateDiscoAtlas();
}

/**
 * Render all units using batched sprite blitting
 * Optimized for minimal state changes and maximum cache coherency
 */
export function renderUnits(
  ctx: CanvasRenderingContext2D,
  soa: BattleSoA,
  discoMode: boolean = false,
  globalFrame: number = 0,
  lighterBlend: boolean = true
): void {
  if (!spriteAtlas || !discoAtlas) {
    initSprites();
    if (!spriteAtlas || !discoAtlas) return;
  }
  
  ctx.save();
  
  // Use lighter blend for additive glow effect
  if (lighterBlend) {
    ctx.globalCompositeOperation = 'lighter';
  }
  
  const unitSize = 6; // Rendered size on canvas
  const leaderSize = 10;
  
  if (discoMode) {
    // Disco mode - use hue-shifted atlas
    for (let i = 0; i < soa.unitCount; i++) {
      if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
      
      const hueIdx = (soa.spriteIdx[i] + globalFrame) % HUE_VARIANTS;
      const row = soa.teamID[i]; // 0 for men, 1 for women
      const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
      const size = isLeader ? leaderSize : unitSize;
      
      // Health-based alpha
      const alpha = Math.max(0.3, soa.health[i] / 100);
      ctx.globalAlpha = alpha;
      
      ctx.drawImage(
        discoAtlas,
        hueIdx * SPRITE_SIZE, row * SPRITE_SIZE,
        SPRITE_SIZE, SPRITE_SIZE,
        soa.posX[i] - size / 2, soa.posY[i] - size / 2,
        size, size
      );
    }
  } else {
    // Normal mode - batch by team for minimal state changes
    // First pass: Draw all normal units
    for (let i = 0; i < soa.unitCount; i++) {
      if ((soa.stateFlags[i] & FLAG_ALIVE) === 0) continue;
      
      const isLocked = (soa.stateFlags[i] & FLAG_LOCKED) !== 0;
      const isLeader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
      const row = soa.teamID[i];
      const col = isLeader ? 2 : (isLocked ? 1 : 0);
      const size = isLeader ? leaderSize : unitSize;
      
      // Health-based alpha
      const alpha = Math.max(0.3, soa.health[i] / 100);
      ctx.globalAlpha = alpha;
      
      ctx.drawImage(
        spriteAtlas,
        col * SPRITE_SIZE, row * SPRITE_SIZE,
        SPRITE_SIZE, SPRITE_SIZE,
        soa.posX[i] - size / 2, soa.posY[i] - size / 2,
        size, size
      );
    }
  }
  
  ctx.restore();
}

/**
 * Render units to a lower-resolution offscreen canvas for performance
 * Then blit to main canvas (reduces overdraw cost)
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
  
  // Clear offscreen
  ctx.clearRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);
  
  // Render to offscreen at half resolution - cast to CanvasRenderingContext2D
  ctx.save();
  ctx.scale(0.5, 0.5);
  renderUnits(ctx as unknown as CanvasRenderingContext2D, soa, discoMode, globalFrame, true);
  ctx.restore();
  
  // Blit to main canvas (upscaled)
  mainCtx.drawImage(
    offscreenCanvas,
    0, 0, offscreenCanvas.width, offscreenCanvas.height,
    0, 0, offscreenCanvas.width * 2, offscreenCanvas.height * 2
  );
}
