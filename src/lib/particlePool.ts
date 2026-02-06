/**
 * Ultra Premium Particle System
 * Team-colored effects, bigger explosions, clash dust
 */

const POOL_SIZE = 2048; // Increased for more intense effects

// Particle types
export const PARTICLE_SPARK = 0;
export const PARTICLE_DUST = 1;
export const PARTICLE_CONFETTI = 2;
export const PARTICLE_IMPACT = 3;
export const PARTICLE_GLOW = 4;
export const PARTICLE_SHOCKWAVE = 5;

// Legacy exports for compatibility
export const PARTICLE_HEART = PARTICLE_SPARK;
export const PARTICLE_BEER = PARTICLE_SPARK;
export const PARTICLE_FLOWER = PARTICLE_SPARK;
export const PARTICLE_STAR = PARTICLE_GLOW;
export const PARTICLE_CLOUD = PARTICLE_DUST;
export const PARTICLE_METEOR = PARTICLE_IMPACT;
export const PARTICLE_RAGE = PARTICLE_GLOW;

export interface ParticlePool {
  posX: Float32Array;
  posY: Float32Array;
  velX: Float32Array;
  velY: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  size: Float32Array;
  type: Uint8Array;
  colorIdx: Uint8Array;
  head: number;
  activeCount: number;
}

export function createParticlePool(): ParticlePool {
  return {
    posX: new Float32Array(POOL_SIZE),
    posY: new Float32Array(POOL_SIZE),
    velX: new Float32Array(POOL_SIZE),
    velY: new Float32Array(POOL_SIZE),
    life: new Float32Array(POOL_SIZE),
    maxLife: new Float32Array(POOL_SIZE),
    size: new Float32Array(POOL_SIZE),
    type: new Uint8Array(POOL_SIZE),
    colorIdx: new Uint8Array(POOL_SIZE),
    head: 0,
    activeCount: 0,
  };
}

export function spawnParticle(
  pool: ParticlePool,
  x: number, y: number,
  vx: number, vy: number,
  type: number,
  life: number = 0.5,
  size: number = 3,
  colorIdx: number = 0
): void {
  pool.posX[pool.head] = x;
  pool.posY[pool.head] = y;
  pool.velX[pool.head] = vx;
  pool.velY[pool.head] = vy;
  pool.life[pool.head] = life;
  pool.maxLife[pool.head] = life;
  pool.size[pool.head] = size;
  pool.type[pool.head] = type;
  pool.colorIdx[pool.head] = colorIdx || Math.floor(Math.random() * 6);
  pool.head = (pool.head + 1) % POOL_SIZE;
  pool.activeCount = Math.min(pool.activeCount + 1, POOL_SIZE);
}

// Legacy compatibility
export function spawnBeerSplash(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 4; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 20;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 15, PARTICLE_SPARK, 0.35, 2);
  }
}

export function spawnFlowerBloom(pool: ParticlePool, x: number, y: number): void {
  spawnBeerSplash(pool, x, y);
}

export function spawnHeartBurst(pool: ParticlePool, x: number, y: number): void {
  spawnBeerSplash(pool, x, y);
}

/**
 * Screen-wide confetti on victory
 */
export function spawnConfetti(pool: ParticlePool, x: number, y: number, width?: number): void {
  const spread = width || 200;
  for (let i = 0; i < 40; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 150;
    spawnParticle(
      pool,
      x + (Math.random() - 0.5) * spread,
      y + (Math.random() - 0.5) * 80,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 100,
      PARTICLE_CONFETTI,
      2.5,
      3 + Math.random() * 3
    );
  }
}

export function spawnStars(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 4; i++) {
    spawnParticle(pool, x, y, (Math.random() - 0.5) * 25, -35 - Math.random() * 15, PARTICLE_SPARK, 0.5, 2);
  }
}

export function spawnMeteorImpact(pool: ParticlePool, x: number, y: number): void {
  // Radial burst
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI * 2 * i) / 16;
    const speed = 120 + Math.random() * 60;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, PARTICLE_IMPACT, 0.6, 4);
  }
  // Inner dust cloud
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 40;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 20, PARTICLE_DUST, 1.0, 5);
  }
}

export function spawnRageEffect(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 6; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 45 + Math.random() * 35;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 25, PARTICLE_SPARK, 0.4, 2);
  }
}

/**
 * Clash shockwave ring effect
 */
export function spawnClashShockwave(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 20; i++) {
    const angle = (Math.PI * 2 * i) / 20;
    const speed = 200 + Math.random() * 80;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, PARTICLE_IMPACT, 0.4, 3, 1); // gold
  }
  // Center flash
  spawnParticle(pool, x, y, 0, 0, PARTICLE_GLOW, 0.3, 15, 0); // white
}

export function updateParticles(pool: ParticlePool, deltaTime: number, gravity: number = 120): void {
  const decayRate = 1.0;
  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool.life[i] <= 0) continue;
    pool.posX[i] += pool.velX[i] * deltaTime;
    pool.posY[i] += pool.velY[i] * deltaTime;
    pool.velY[i] += gravity * deltaTime;
    pool.velX[i] *= 0.97;
    pool.velY[i] *= 0.97;
    pool.life[i] -= decayRate * deltaTime;
    if (pool.life[i] <= 0) {
      pool.activeCount = Math.max(0, pool.activeCount - 1);
    }
  }
}

// Professional color palette
const COLORS = [
  '#FFFFFF',  // 0: White
  '#FFD700',  // 1: Gold
  '#3B82F6',  // 2: Blue (men)
  '#EC4899',  // 3: Pink (women)
  '#10B981',  // 4: Emerald
  '#F59E0B',  // 5: Amber
];

export function renderParticles(ctx: CanvasRenderingContext2D, pool: ParticlePool): void {
  ctx.save();

  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool.life[i] <= 0) continue;

    const lifeRatio = pool.life[i] / pool.maxLife[i];
    const alpha = lifeRatio * 0.9;
    const size = pool.size[i] * (0.3 + lifeRatio * 0.7);
    const type = pool.type[i];

    ctx.globalAlpha = alpha;

    if (type === PARTICLE_CONFETTI) {
      ctx.fillStyle = COLORS[pool.colorIdx[i] % COLORS.length];
      ctx.save();
      ctx.translate(pool.posX[i], pool.posY[i]);
      ctx.rotate(pool.velX[i] * 0.1);
      ctx.fillRect(-size / 2, -size / 2, size, size * 0.6);
      ctx.restore();
    } else if (type === PARTICLE_IMPACT) {
      const impactGrad = ctx.createRadialGradient(
        pool.posX[i], pool.posY[i], 0,
        pool.posX[i], pool.posY[i], size
      );
      impactGrad.addColorStop(0, 'rgba(255, 255, 255, 1)');
      impactGrad.addColorStop(0.4, 'rgba(255, 200, 100, 0.8)');
      impactGrad.addColorStop(1, 'rgba(255, 80, 30, 0)');
      ctx.fillStyle = impactGrad;
      ctx.beginPath();
      ctx.arc(pool.posX[i], pool.posY[i], size * 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === PARTICLE_DUST) {
      ctx.fillStyle = `rgba(160, 150, 140, ${alpha * 0.5})`;
      ctx.beginPath();
      ctx.arc(pool.posX[i], pool.posY[i], size, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === PARTICLE_GLOW) {
      const glowGrad = ctx.createRadialGradient(
        pool.posX[i], pool.posY[i], 0,
        pool.posX[i], pool.posY[i], size
      );
      glowGrad.addColorStop(0, `rgba(255, 255, 255, ${alpha})`);
      glowGrad.addColorStop(0.5, `rgba(255, 220, 150, ${alpha * 0.5})`);
      glowGrad.addColorStop(1, 'rgba(255, 200, 100, 0)');
      ctx.fillStyle = glowGrad;
      ctx.beginPath();
      ctx.arc(pool.posX[i], pool.posY[i], size, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // Sparks - team-colored with glow
      const color = COLORS[pool.colorIdx[i] % COLORS.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(pool.posX[i], pool.posY[i], size, 0, Math.PI * 2);
      ctx.fill();
      // Subtle glow around spark
      ctx.globalAlpha = alpha * 0.3;
      ctx.beginPath();
      ctx.arc(pool.posX[i], pool.posY[i], size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

export function clearParticles(pool: ParticlePool): void {
  pool.life.fill(0);
  pool.head = 0;
  pool.activeCount = 0;
}
