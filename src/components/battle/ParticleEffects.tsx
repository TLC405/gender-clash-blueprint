import { useEffect, useState } from "react";

export type ParticleType = "heart" | "beer" | "flower" | "confetti" | "star" | "cloud";

type Particle = {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  type: ParticleType;
  emoji: string;
  life: number;
  size: number;
};

type ParticleEffectsProps = {
  canvasRef: React.RefObject<HTMLCanvasElement>;
};

const EMOJI_MAP: Record<ParticleType, string[]> = {
  heart: ["❤️", "💕", "💖", "💗", "💓"],
  beer: ["🍺", "🍻"],
  flower: ["🌸", "🌺", "🌼", "🌻", "🌹"],
  confetti: ["🎊", "🎉", "✨", "⭐"],
  star: ["⭐", "✨", "💫"],
  cloud: ["☁️", "💭"]
};

export const useParticleSystem = (canvasRef: React.RefObject<HTMLCanvasElement>) => {
  const [particles, setParticles] = useState<Particle[]>([]);
  let particleId = 0;

  const spawnParticle = (
    x: number, 
    y: number, 
    type: ParticleType, 
    count: number = 5
  ) => {
    const newParticles: Particle[] = [];
    const emojis = EMOJI_MAP[type];
    
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 50 + Math.random() * 100;
      
      newParticles.push({
        id: particleId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 50, // upward bias
        type,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        life: 1.0,
        size: 20 + Math.random() * 10
      });
    }
    
    setParticles(prev => [...prev, ...newParticles]);
  };

  const spawnHeartBurst = (x: number, y: number) => spawnParticle(x, y, "heart", 8);
  const spawnBeerSplash = (x: number, y: number) => spawnParticle(x, y, "beer", 5);
  const spawnFlowerBloom = (x: number, y: number) => spawnParticle(x, y, "flower", 10);
  const spawnConfetti = (x: number, y: number) => spawnParticle(x, y, "confetti", 15);
  const spawnStars = (x: number, y: number) => spawnParticle(x, y, "star", 6);
  const spawnCloud = (x: number, y: number) => spawnParticle(x, y, "cloud", 3);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame: number;
    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Update particles
      setParticles(prevParticles => {
        return prevParticles
          .map(p => ({
            ...p,
            x: p.x + p.vx * deltaTime,
            y: p.y + p.vy * deltaTime,
            vy: p.vy + 200 * deltaTime, // gravity
            life: p.life - deltaTime * 0.5
          }))
          .filter(p => p.life > 0 && p.y < canvas.height + 50);
      });

      animationFrame = requestAnimationFrame(animate);
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [canvasRef]);

  return {
    particles,
    spawnHeartBurst,
    spawnBeerSplash,
    spawnFlowerBloom,
    spawnConfetti,
    spawnStars,
    spawnCloud
  };
};

export const ParticleRenderer = ({ 
  particles 
}: { 
  particles: Particle[] 
}) => {
  return (
    <>
      {particles.map(p => (
        <div
          key={p.id}
          className="absolute pointer-events-none select-none drop-shadow-[0_0_12px_rgba(255,255,255,0.8)]"
          style={{
            left: p.x,
            top: p.y,
            fontSize: p.size,
            opacity: p.life,
            transform: `translate(-50%, -50%) rotate(${p.vx * 0.5}deg) scale(${p.life * 0.5 + 0.5})`,
            transition: 'opacity 0.1s',
            filter: `brightness(${1 + p.life * 0.5}) saturate(${1.2})`,
            textShadow: '0 0 20px currentColor'
          }}
        >
          {p.emoji}
        </div>
      ))}
    </>
  );
};
