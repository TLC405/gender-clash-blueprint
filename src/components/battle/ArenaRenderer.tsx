type ArenaLayer = {
  renderBackground: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  renderTurf: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  renderCrowd: (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => void;
  renderLighting: (ctx: CanvasRenderingContext2D, width: number, height: number, phase: string) => void;
};

export const createArenaRenderer = (): ArenaLayer => {
  let crowdWave = 0;

  return {
    renderBackground: (ctx, width, height) => {
      // Stadium shell with gradient (Allegiant-inspired) - using design system
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, 'hsl(240 10% 3.9%)'); // background
      gradient.addColorStop(0.5, 'hsl(240 6% 10%)'); // arena-dark
      gradient.addColorStop(1, 'hsl(240 10% 3.9%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Stadium stands/seating tiers on sides (perspective depth)
      ctx.globalAlpha = 0.3;
      const standHeight = 60;
      const standLayers = 3;
      for (let i = 0; i < standLayers; i++) {
        const layerY = i * 25;
        const layerAlpha = 0.4 - (i * 0.1);
        ctx.globalAlpha = layerAlpha;
        
        // Left stands (MEN side)
        const leftGrad = ctx.createLinearGradient(0, layerY, width * 0.1, layerY);
        leftGrad.addColorStop(0, 'hsl(217 91% 60%)'); // men-primary
        leftGrad.addColorStop(1, 'hsl(240 6% 10%)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, layerY, width * 0.08, standHeight);
        
        // Right stands (WOMEN side)
        const rightGrad = ctx.createLinearGradient(width, layerY, width * 0.9, layerY);
        rightGrad.addColorStop(0, 'hsl(340 82% 52%)'); // women-primary
        rightGrad.addColorStop(1, 'hsl(240 6% 10%)');
        ctx.fillStyle = rightGrad;
        ctx.fillRect(width * 0.92, layerY, width * 0.08, standHeight);
      }
      ctx.globalAlpha = 1;

      // ETFE panel accents (accent color veins)
      ctx.strokeStyle = 'hsl(24 100% 50%)'; // accent
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 5; i++) {
        const x = (width / 5) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + width / 10, height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    },

    renderTurf: (ctx, width, height) => {
      // Main turf base - darker arena floor
      const turfGradient = ctx.createLinearGradient(0, 0, width, 0);
      turfGradient.addColorStop(0, 'hsl(120 30% 8%)'); // Dark green edges
      turfGradient.addColorStop(0.5, 'hsl(120 25% 5%)');
      turfGradient.addColorStop(1, 'hsl(120 30% 8%)');
      ctx.fillStyle = turfGradient;
      ctx.fillRect(0, 0, width, height);

      // Yard lines - using muted
      ctx.strokeStyle = 'hsl(240 3.8% 46.1%)'; // muted
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.1;
      for (let x = 0; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // End zones (Bro Bunker & Empathy Enclave)
      // MEN zone (left) - using men-primary
      const menZone = ctx.createLinearGradient(0, 0, width * 0.15, 0);
      menZone.addColorStop(0, 'hsla(217 91% 60% / 0.25)'); // men-primary with alpha
      menZone.addColorStop(1, 'hsla(217 91% 60% / 0)');
      ctx.fillStyle = menZone;
      ctx.fillRect(0, 0, width * 0.15, height);

      // WOMEN zone (right) - using women-primary
      const womenZone = ctx.createLinearGradient(width, 0, width * 0.85, 0);
      womenZone.addColorStop(0, 'hsla(340 82% 52% / 0.25)'); // women-primary with alpha
      womenZone.addColorStop(1, 'hsla(340 82% 52% / 0)');
      ctx.fillStyle = womenZone;
      ctx.fillRect(width * 0.85, 0, width * 0.15, height);

      // Center "Hot Gates" pass markers - using gold-epic
      const centerX = width / 2;
      const passWidth = 200;
      ctx.strokeStyle = 'hsl(48 96% 53%)'; // gold-epic
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4;
      ctx.setLineDash([10, 10]);
      ctx.beginPath();
      ctx.moveTo(centerX - passWidth / 2, 0);
      ctx.lineTo(centerX - passWidth / 2, height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(centerX + passWidth / 2, 0);
      ctx.lineTo(centerX + passWidth / 2, height);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    },

    renderCrowd: (ctx, width, height, time) => {
      crowdWave += 0.02;
      
      // Simplified crowd sprites along top edge
      ctx.globalAlpha = 0.7;
      for (let i = 0; i < 50; i++) {
        const x = (width / 50) * i;
        const waveOffset = Math.sin(crowdWave + i * 0.5) * 4;
        const y = 20 + waveOffset;
        
        // Alternating team colors - using design system
        const isBlue = i % 2 === 0;
        ctx.fillStyle = isBlue ? 'hsl(217 91% 60%)' : 'hsl(340 82% 52%)'; // men-primary : women-primary
        
        // Simple crowd "head" circles with glow
        ctx.shadowBlur = 8;
        ctx.shadowColor = ctx.fillStyle;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;
    },

    renderLighting: (ctx, width, height, phase) => {
      // Dynamic lighting based on battle phase - using design system colors
      if (phase === 'melee') {
        // Chaotic destructive overlay
        const chaos = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
        chaos.addColorStop(0, 'hsla(0 84.2% 60.2% / 0)'); // destructive
        chaos.addColorStop(1, 'hsla(0 84.2% 60.2% / 0.2)');
        ctx.fillStyle = chaos;
        ctx.fillRect(0, 0, width, height);
      } else if (phase === 'stand') {
        // Organized golden epic glow
        const organized = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
        organized.addColorStop(0, 'hsla(48 96% 53% / 0.15)'); // gold-epic
        organized.addColorStop(1, 'hsla(48 96% 53% / 0)');
        ctx.fillStyle = organized;
        ctx.fillRect(0, 0, width, height);
      } else if (phase === 'sudden_death') {
        // Sudden death pulsing overlay
        const suddenDeath = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
        suddenDeath.addColorStop(0, 'hsla(0 84.2% 60.2% / 0.1)');
        suddenDeath.addColorStop(1, 'hsla(271 81% 56% / 0.15)'); // purple tint
        ctx.fillStyle = suddenDeath;
        ctx.fillRect(0, 0, width, height);
      }
    }
  };
};
