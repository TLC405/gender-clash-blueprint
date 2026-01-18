/**
 * Minimal Particle System
 * Clean, subtle effects - no flashy cartoon particles
 */

const POOL_SIZE = 300;

// Simple particle types
export const PARTICLE_SPARK = 0;
export const PARTICLE_DUST = 1;
export const PARTICLE_CONFETTI = 2;

// Legacy exports for compatibility
export const PARTICLE_HEART = PARTICLE_SPARK;
export const PARTICLE_BEER = PARTICLE_SPARK;
export const PARTICLE_FLOWER = PARTICLE_SPARK;
export const PARTICLE_STAR = PARTICLE_SPARK;
export const PARTICLE_CLOUD = PARTICLE_DUST;
export const PARTICLE_METEOR = PARTICLE_SPARK;
export const PARTICLE_RAGE = PARTICLE_SPARK;

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
  x: number,
  y: number,
  vx: number,
  vy: number,
  type: number,
  life: number = 0.5,
  size: number = 2
): void {
  pool.posX[pool.head] = x;
  pool.posY[pool.head] = y;
  pool.velX[pool.head] = vx;
  pool.velY[pool.head] = vy;
  pool.life[pool.head] = life;
  pool.maxLife[pool.head] = life;
  pool.size[pool.head] = size;
  pool.type[pool.head] = type;
  pool.colorIdx[pool.head] = Math.floor(Math.random() * 3);
  
  pool.head = (pool.head + 1) % POOL_SIZE;
  pool.activeCount = Math.min(pool.activeCount + 1, POOL_SIZE);
}

// Small spark burst on unit death
export function spawnBeerSplash(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 30 + Math.random() * 20;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 20, PARTICLE_SPARK, 0.4, 2);
  }
}

export function spawnFlowerBloom(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 25 + Math.random() * 15;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 15, PARTICLE_SPARK, 0.4, 2);
  }
}

export function spawnHeartBurst(pool: ParticlePool, x: number, y: number): void {
  spawnFlowerBloom(pool, x, y);
}

export function spawnConfetti(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 50 + Math.random() * 100;
    spawnParticle(
      pool, 
      x + (Math.random() - 0.5) * 80, 
      y + (Math.random() - 0.5) * 40,
      Math.cos(angle) * speed, 
      Math.sin(angle) * speed - 60, 
      PARTICLE_CONFETTI, 
      1.5, 
      3
    );
  }
}

export function spawnStars(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 3; i++) {
    spawnParticle(pool, x, y, (Math.random() - 0.5) * 20, -30, PARTICLE_SPARK, 0.5, 2);
  }
}

export function spawnMeteorImpact(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 8; i++) {
    const angle = (Math.PI * 2 * i) / 8;
    const speed = 80 + Math.random() * 40;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, PARTICLE_SPARK, 0.6, 3);
  }
}

export function spawnRageEffect(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 40 + Math.random() * 30;
    spawnParticle(pool, x, y, Math.cos(angle) * speed, Math.sin(angle) * speed - 20, PARTICLE_SPARK, 0.4, 2);
  }
}

export function updateParticles(pool: ParticlePool, deltaTime: number, gravity: number = 100): void {
  const decayRate = 1.0;
  
  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool.life[i] <= 0) continue;
    
    pool.posX[i] += pool.velX[i] * deltaTime;
    pool.posY[i] += pool.velY[i] * deltaTime;
    pool.velY[i] += gravity * deltaTime;
    pool.velX[i] *= 0.98;
    pool.velY[i] *= 0.98;
    pool.life[i] -= decayRate * deltaTime;
    
    if (pool.life[i] <= 0) {
      pool.activeCount = Math.max(0, pool.activeCount - 1);
    }
  }
}

const COLORS = ['#FFFFFF', '#FFD700', '#FF6B6B', '#4ECDC4', '#3B82F6', '#EC4899'];

export function renderParticles(ctx: CanvasRenderingContext2D, pool: ParticlePool): void {
  ctx.save();
  
  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool.life[i] <= 0) continue;
    
    const lifeRatio = pool.life[i] / pool.maxLife[i];
    const alpha = lifeRatio * 0.8;
    const size = pool.size[i] * (0.5 + lifeRatio * 0.5);
    
    ctx.globalAlpha = alpha;
    ctx.fillStyle = COLORS[pool.colorIdx[i] % COLORS.length];
    ctx.beginPath();
    ctx.arc(pool.posX[i], pool.posY[i], size, 0, Math.PI * 2);
    ctx.fill();
  }
  
  ctx.globalAlpha = 1;
  ctx.restore();
}

export function clearParticles(pool: ParticlePool): void {
  pool.life.fill(0);
  pool.head = 0;
  pool.activeCount = 0;
}
