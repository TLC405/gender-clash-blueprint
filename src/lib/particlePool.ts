/**
 * Ultra-Premium Particle System
 * Disney-quality visual effects with elegant geometric particles
 * No emojis - pure canvas-rendered effects
 */

const POOL_SIZE = 500;

// Particle types - Professional combat effects
export const PARTICLE_IMPACT = 0;     // White/gold impact spark
export const PARTICLE_DUST = 1;       // Soft dust puff
export const PARTICLE_ENERGY = 2;     // Team-colored energy burst
export const PARTICLE_CONFETTI = 3;   // Victory confetti (geometric)
export const PARTICLE_STAR = 4;       // Twinkling star
export const PARTICLE_GLOW = 5;       // Soft ambient glow
export const PARTICLE_METEOR = 6;     // Meteor trail
export const PARTICLE_RAGE = 7;       // Rage activation

// Legacy exports for compatibility
export const PARTICLE_HEART = PARTICLE_ENERGY;
export const PARTICLE_BEER = PARTICLE_IMPACT;
export const PARTICLE_FLOWER = PARTICLE_ENERGY;
export const PARTICLE_CLOUD = PARTICLE_DUST;

// Color palettes for elegant effects
const COLORS = {
  impact: ['#FFFFFF', '#FFD700', '#FFF4E0'],
  dust: ['#8B7355', '#A0937D', '#C4B7A6'],
  energyMen: ['#1E90FF', '#60A5FA', '#93C5FD'],
  energyWomen: ['#FF69B4', '#F472B6', '#FDA4AF'],
  confetti: ['#FFD700', '#FF6B6B', '#4ECDC4', '#9B59B6', '#3498DB'],
  star: ['#FFFFFF', '#FFD700', '#FFF8DC'],
  meteor: ['#FF4500', '#FF6347', '#FFD700', '#FFFFFF'],
  rage: ['#FF0000', '#FF4500', '#FFD700'],
};

export interface ParticlePool {
  posX: Float32Array;
  posY: Float32Array;
  velX: Float32Array;
  velY: Float32Array;
  life: Float32Array;
  maxLife: Float32Array;
  size: Float32Array;
  type: Uint8Array;
  colorIdx: Uint8Array;    // Index into color array
  rotation: Float32Array;  // Rotation for spinning effects
  head: number;
  activeCount: number;
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
    colorIdx: new Uint8Array(POOL_SIZE),
    rotation: new Float32Array(POOL_SIZE),
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
  size: number = 8,
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
  pool.colorIdx[pool.head] = colorIdx;
  pool.rotation[pool.head] = Math.random() * Math.PI * 2;
  
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
  count: number = 6,
  speed: number = 100,
  life: number = 1.0,
  size: number = 8
): void {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const particleSpeed = speed * (0.5 + Math.random() * 0.5);
    
    spawnParticle(
      pool,
      x + (Math.random() - 0.5) * 10,
      y + (Math.random() - 0.5) * 10,
      Math.cos(angle) * particleSpeed,
      Math.sin(angle) * particleSpeed - 30,
      type,
      life * (0.8 + Math.random() * 0.4),
      size * (0.8 + Math.random() * 0.4),
      Math.floor(Math.random() * 5)
    );
  }
}

/**
 * Spawn elegant impact sparks (men KO effect)
 */
export function spawnBeerSplash(pool: ParticlePool, x: number, y: number): void {
  // Golden impact sparks
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.3;
    const speed = 60 + Math.random() * 40;
    spawnParticle(
      pool, x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 20,
      PARTICLE_IMPACT,
      0.6 + Math.random() * 0.3,
      3 + Math.random() * 3,
      Math.floor(Math.random() * 3)
    );
  }
  // Soft dust puff
  for (let i = 0; i < 3; i++) {
    spawnParticle(
      pool, x, y,
      (Math.random() - 0.5) * 30,
      -20 - Math.random() * 20,
      PARTICLE_DUST,
      0.8,
      6 + Math.random() * 4,
      Math.floor(Math.random() * 3)
    );
  }
}

/**
 * Spawn elegant energy burst (women KO effect)
 */
export function spawnFlowerBloom(pool: ParticlePool, x: number, y: number): void {
  // Soft energy particles
  for (let i = 0; i < 5; i++) {
    const angle = (Math.PI * 2 * i) / 5 + Math.random() * 0.3;
    const speed = 50 + Math.random() * 30;
    spawnParticle(
      pool, x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 25,
      PARTICLE_ENERGY,
      0.8 + Math.random() * 0.4,
      4 + Math.random() * 3,
      Math.floor(Math.random() * 3)
    );
  }
  // Small twinkle
  spawnParticle(pool, x, y, 0, -10, PARTICLE_STAR, 0.5, 6, 0);
}

/**
 * Spawn heart burst (legacy - redirects to energy)
 */
export function spawnHeartBurst(pool: ParticlePool, x: number, y: number): void {
  spawnFlowerBloom(pool, x, y);
}

/**
 * Spawn elegant geometric confetti (victory effect)
 */
export function spawnConfetti(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 25; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 80 + Math.random() * 150;
    spawnParticle(
      pool,
      x + (Math.random() - 0.5) * 100,
      y + (Math.random() - 0.5) * 50,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 100,
      PARTICLE_CONFETTI,
      2.0 + Math.random(),
      4 + Math.random() * 6,
      Math.floor(Math.random() * 5)
    );
  }
}

/**
 * Spawn twinkling stars
 */
export function spawnStars(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 5; i++) {
    spawnParticle(
      pool,
      x + (Math.random() - 0.5) * 40,
      y + (Math.random() - 0.5) * 40,
      (Math.random() - 0.5) * 20,
      -30 - Math.random() * 30,
      PARTICLE_STAR,
      1.0 + Math.random() * 0.5,
      3 + Math.random() * 4,
      Math.floor(Math.random() * 3)
    );
  }
}

/**
 * Spawn meteor impact - dramatic but elegant
 */
export function spawnMeteorImpact(pool: ParticlePool, x: number, y: number): void {
  // Central flash
  spawnParticle(pool, x, y, 0, 0, PARTICLE_STAR, 0.3, 30, 0);
  
  // Radial fire sparks
  for (let i = 0; i < 12; i++) {
    const angle = (Math.PI * 2 * i) / 12;
    const speed = 150 + Math.random() * 100;
    spawnParticle(
      pool, x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed,
      PARTICLE_METEOR,
      0.8 + Math.random() * 0.4,
      4 + Math.random() * 4,
      Math.floor(Math.random() * 4)
    );
  }
  
  // Dust cloud
  for (let i = 0; i < 8; i++) {
    const angle = Math.random() * Math.PI * 2;
    spawnParticle(
      pool, x, y,
      Math.cos(angle) * 60,
      Math.sin(angle) * 40 - 30,
      PARTICLE_DUST,
      1.2,
      8 + Math.random() * 6,
      Math.floor(Math.random() * 3)
    );
  }
}

/**
 * Spawn rage activation effect
 */
export function spawnRageEffect(pool: ParticlePool, x: number, y: number): void {
  for (let i = 0; i < 10; i++) {
    const angle = (Math.PI * 2 * i) / 10;
    const speed = 80 + Math.random() * 60;
    spawnParticle(
      pool, x, y,
      Math.cos(angle) * speed,
      Math.sin(angle) * speed - 40,
      PARTICLE_RAGE,
      0.6 + Math.random() * 0.3,
      4 + Math.random() * 4,
      Math.floor(Math.random() * 3)
    );
  }
}

/**
 * Update all particles (physics + life decay)
 */
export function updateParticles(
  pool: ParticlePool,
  deltaTime: number,
  gravity: number = 150
): void {
  const decayRate = 0.6;
  
  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool.life[i] <= 0) continue;
    
    // Physics update
    pool.posX[i] += pool.velX[i] * deltaTime;
    pool.posY[i] += pool.velY[i] * deltaTime;
    
    // Gravity (reduced for dust, none for stars)
    const gravityMod = pool.type[i] === PARTICLE_DUST ? 0.3 : 
                       pool.type[i] === PARTICLE_STAR ? 0.1 : 1.0;
    pool.velY[i] += gravity * gravityMod * deltaTime;
    
    // Rotation for confetti
    if (pool.type[i] === PARTICLE_CONFETTI) {
      pool.rotation[i] += pool.velX[i] * 0.02 * deltaTime;
    }
    
    // Velocity damping
    pool.velX[i] *= 0.98;
    pool.velY[i] *= 0.98;
    
    // Life decay
    pool.life[i] -= decayRate * deltaTime;
    
    if (pool.life[i] <= 0) {
      pool.activeCount = Math.max(0, pool.activeCount - 1);
    }
  }
}

/**
 * Get color for particle type
 */
function getParticleColor(type: number, colorIdx: number): string {
  let palette: string[];
  switch (type) {
    case PARTICLE_IMPACT: palette = COLORS.impact; break;
    case PARTICLE_DUST: palette = COLORS.dust; break;
    case PARTICLE_ENERGY: palette = COLORS.energyWomen; break;
    case PARTICLE_CONFETTI: palette = COLORS.confetti; break;
    case PARTICLE_STAR: palette = COLORS.star; break;
    case PARTICLE_METEOR: palette = COLORS.meteor; break;
    case PARTICLE_RAGE: palette = COLORS.rage; break;
    default: palette = COLORS.star;
  }
  return palette[colorIdx % palette.length];
}

/**
 * Render all active particles - Disney-quality geometric shapes
 */
export function renderParticles(
  ctx: CanvasRenderingContext2D,
  pool: ParticlePool
): void {
  ctx.save();
  
  for (let i = 0; i < POOL_SIZE; i++) {
    if (pool.life[i] <= 0) continue;
    
    const lifeRatio = pool.life[i] / pool.maxLife[i];
    const color = getParticleColor(pool.type[i], pool.colorIdx[i]);
    const size = pool.size[i] * (0.3 + lifeRatio * 0.7);
    const alpha = Math.min(1, lifeRatio * 1.5);
    
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(pool.posX[i], pool.posY[i]);
    
    const type = pool.type[i];
    
    if (type === PARTICLE_STAR) {
      // 4-point star with glow
      ctx.rotate(pool.rotation[i]);
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 2);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color + '88');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, size * 2, 0, Math.PI * 2);
      ctx.fill();
      
      // Star core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      for (let j = 0; j < 4; j++) {
        const angle = (j / 4) * Math.PI * 2;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
        const midAngle = angle + Math.PI / 4;
        ctx.lineTo(Math.cos(midAngle) * size * 0.3, Math.sin(midAngle) * size * 0.3);
      }
      ctx.closePath();
      ctx.fill();
      
    } else if (type === PARTICLE_CONFETTI) {
      // Spinning rectangle
      ctx.rotate(pool.rotation[i]);
      ctx.fillStyle = color;
      ctx.shadowBlur = 4;
      ctx.shadowColor = color;
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
      
    } else if (type === PARTICLE_DUST) {
      // Soft circle with blur
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, color + 'AA');
      gradient.addColorStop(0.7, color + '44');
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
      
    } else if (type === PARTICLE_IMPACT || type === PARTICLE_METEOR || type === PARTICLE_RAGE) {
      // Sharp spark with trail
      ctx.fillStyle = color;
      ctx.shadowBlur = 6;
      ctx.shadowColor = color;
      
      // Elongated based on velocity
      const velMag = Math.sqrt(pool.velX[i] ** 2 + pool.velY[i] ** 2);
      const stretch = Math.min(3, velMag / 50);
      const angle = Math.atan2(pool.velY[i], pool.velX[i]);
      
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.ellipse(0, 0, size * stretch, size * 0.5, 0, 0, Math.PI * 2);
      ctx.fill();
      
      // Hot core
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.3, 0, Math.PI * 2);
      ctx.fill();
      
    } else {
      // Energy glow (default)
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, '#FFFFFF');
      gradient.addColorStop(0.3, color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, size, 0, Math.PI * 2);
      ctx.fill();
    }
    
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

// Legacy compatibility export
export { spawnParticle as emojiIdx };
