/**
 * Object Pool Particle System
 * Ring buffer with SoA layout for zero garbage collection
 * Optimized pool size to prevent crashes
 */

const POOL_SIZE = 500; // Reduced from 3000 for stability

// Particle types
export const PARTICLE_HEART = 0;
export const PARTICLE_BEER = 1;
export const PARTICLE_FLOWER = 2;
export const PARTICLE_CONFETTI = 3;
export const PARTICLE_STAR = 4;
export const PARTICLE_CLOUD = 5;
export const PARTICLE_METEOR = 6;
export const PARTICLE_RAGE = 7;

// Emoji arrays for each type
const EMOJI_MAP: Record<number, string[]> = {
  [PARTICLE_HEART]: ['❤️', '💕', '💖', '💗', '💓'],
  [PARTICLE_BEER]: ['🍺', '🍻'],
  [PARTICLE_FLOWER]: ['🌸', '🌺', '🌼', '🌻', '🌹'],
  [PARTICLE_CONFETTI]: ['🎊', '🎉', '✨', '⭐'],
  [PARTICLE_STAR]: ['⭐', '✨', '💫'],
  [PARTICLE_CLOUD]: ['☁️', '💭'],
  [PARTICLE_METEOR]: ['🔥', '💥', '☄️'],
  [PARTICLE_RAGE]: ['💢', '🔥', '⚡'],
};

export interface ParticlePool {
  posX: Float32Array;
  posY: Float32Array;
  velX: Float32Array;
  velY: Float32Array;
  life: Float32Array;      // 0-1, decreases over time
  maxLife: Float32Array;   // Initial life value
  size: Float32Array;      // Render size
  type: Uint8Array;        // Particle type enum
  emojiIdx: Uint8Array;    // Index into emoji array
  head: number;            // Ring buffer write pointer
  activeCount: number;     // Number of active particles
}

/**
 * Create a new particle pool
 */
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
    emojiIdx: new Uint8Array(POOL_SIZE),
    head: 0,
    activeCount: 0,
  };
}

/**
 * Spawn a single particle
 */
export function spawnParticle(
  pool: ParticlePool,
  x: number,
  y: number,
  vx: number,
  vy: number,
  type: number,
  life: number = 1.0,
  size: number = 24
): void {
  const emojis = EMOJI_MAP[type] || EMOJI_MAP[PARTICLE_STAR];
  
  pool.posX[pool.head] = x;
  pool.posY[pool.head] = y;
  pool.velX[pool.head] = vx;
  pool.velY[pool.head] = vy;
  pool.life[pool.head] = life;
  pool.maxLife[pool.head] = life;
  pool.size[pool.head] = size;
  pool.type[pool.head] = type;
  pool.emojiIdx[pool.head] = Math.floor(Math.random() * emojis.length);
  
  pool.head = (pool.head + 1) % POOL_SIZE;
  pool.activeCount = Math.min(pool.activeCount + 1, POOL_SIZE);
}

/**
 * Spawn a burst of particles in a radial pattern
 */
export function spawnBurst(
  pool: ParticlePool,
  x: number,
  y: number,
  type: number,
  count: number = 6, // Reduced default from 8
  speed: number = 100,
  life: number = 1.0,
  size: number = 24
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const particleSpeed = speed * (0.5 + Math.random() * 0.5);
    
    spawnParticle(
      pool,
      x,
      y,
      Math.cos(angle) * particleSpeed,
      Math.sin(angle) * particleSpeed - 50, // Upward bias
      type,
      life * (0.8 + Math.random() * 0.4),
      size * (0.8 + Math.random() * 0.4)
    );
  }
}

/**
 * Spawn heart burst (loveable KO effect for women)
 */
export function spawnHeartBurst(pool: ParticlePool, x: number, y: number): void {
  spawnBurst(pool, x, y, PARTICLE_HEART, 5, 80, 1.2, 20); // Reduced from 8
}

/**
 * Spawn beer splash (loveable KO effect for men)
 */
export function spawnBeerSplash(pool: ParticlePool, x: number, y: number): void {
  spawnBurst(pool, x, y, PARTICLE_BEER, 3, 60, 1.0, 22); // Reduced from 5
}

/**
 * Spawn flower bloom
 */
export function spawnFlowerBloom(pool: ParticlePool, x: number, y: number): void {
  spawnBurst(pool, x, y, PARTICLE_FLOWER, 6, 70, 1.5, 18); // Reduced from 10
}

/**
 * Spawn confetti (victory effect)
 */
export function spawnConfetti(pool: ParticlePool, x: number, y: number): void {
  spawnBurst(pool, x, y, PARTICLE_CONFETTI, 10, 200, 2.0, 28); // Reduced from 20
}

/**
 * Spawn stars (powerup collection)
 */
export function spawnStars(pool: ParticlePool, x: number, y: number): void {
  spawnBurst(pool, x, y, PARTICLE_STAR, 5, 100, 1.0, 20); // Reduced from 8
}

/**
 * Spawn meteor impact
 */
export function spawnMeteorImpact(pool: ParticlePool, x: number, y: number): void {
  // Central explosion - reduced counts
  spawnBurst(pool, x, y, PARTICLE_METEOR, 8, 250, 1.5, 32); // Reduced from 15
  // Secondary debris
  spawnBurst(pool, x, y, PARTICLE_CONFETTI, 5, 150, 1.2, 20); // Reduced from 10
}

/**
 * Spawn rage activation effect
 */
export function spawnRageEffect(pool: ParticlePool, x: number, y: number): void {
  spawnBurst(pool, x, y, PARTICLE_RAGE, 8, 120, 1.0, 24); // Reduced from 12
}

/**
 * Update all particles (physics + life decay)
 */
export function updateParticles(
  pool: ParticlePool,
  deltaTime: number,
  gravity: number = 200
): void {
  const decayRate = 0.5; // Life decay per second
  
  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool.life[i] <= 0) continue;
    
    // Physics update
    pool.posX[i] += pool.velX[i] * deltaTime;
    pool.posY[i] += pool.velY[i] * deltaTime;
    pool.velY[i] += gravity * deltaTime; // Gravity
    
    // Velocity damping
    pool.velX[i] *= 0.99;
    pool.velY[i] *= 0.99;
    
    // Life decay
    pool.life[i] -= decayRate * deltaTime;
    
    if (pool.life[i] <= 0) {
      pool.activeCount = Math.max(0, pool.activeCount - 1);
    }
  }
}

/**
 * Render all active particles
 */
export function renderParticles(
  ctx: CanvasRenderingContext2D,
  pool: ParticlePool
): void {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool.life[i] <= 0) continue;
    
    const lifeRatio = pool.life[i] / pool.maxLife[i];
    const emoji = EMOJI_MAP[pool.type[i]]?.[pool.emojiIdx[i]] || '✨';
    const size = pool.size[i] * (0.5 + lifeRatio * 0.5);
    const rotation = pool.velX[i] * 0.01;
    
    ctx.save();
    ctx.globalAlpha = Math.min(1, lifeRatio * 1.5);
    ctx.translate(pool.posX[i], pool.posY[i]);
    ctx.rotate(rotation);
    ctx.font = `${size}px Arial`;
    ctx.fillText(emoji, 0, 0);
    ctx.restore();
  }
  
  ctx.restore();
}

/**
 * Clear all particles
 */
export function clearParticles(pool: ParticlePool): void {
  pool.life.fill(0);
  pool.head = 0;
  pool.activeCount = 0;
}
