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
      // Stadium shell with gradient (Allegiant-inspired)
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0f0f0f'); // Deep black top
      gradient.addColorStop(0.5, '#1a1a1a');
      gradient.addColorStop(1, '#0a0a0a');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // ETFE panel accents (orange veins)
      ctx.strokeStyle = '#FF5A00';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.1;
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
      // Main turf base
      const turfGradient = ctx.createLinearGradient(0, 0, width, 0);
      turfGradient.addColorStop(0, '#1a3a1a'); // Dark green edges
      turfGradient.addColorStop(0.5, '#0d2d0d');
      turfGradient.addColorStop(1, '#1a3a1a');
      ctx.fillStyle = turfGradient;
      ctx.fillRect(0, 0, width, height);

      // Yard lines
      ctx.strokeStyle = '#ffffff';
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
      // MEN zone (left)
      const menZone = ctx.createLinearGradient(0, 0, width * 0.15, 0);
      menZone.addColorStop(0, 'rgba(31, 111, 235, 0.2)');
      menZone.addColorStop(1, 'rgba(31, 111, 235, 0)');
      ctx.fillStyle = menZone;
      ctx.fillRect(0, 0, width * 0.15, height);

      // WOMEN zone (right)
      const womenZone = ctx.createLinearGradient(width, 0, width * 0.85, 0);
      womenZone.addColorStop(0, 'rgba(233, 30, 99, 0.2)');
      womenZone.addColorStop(1, 'rgba(233, 30, 99, 0)');
      ctx.fillStyle = womenZone;
      ctx.fillRect(width * 0.85, 0, width * 0.15, height);

      // Center "Hot Gates" pass markers
      const centerX = width / 2;
      const passWidth = 200;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.3;
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
      ctx.globalAlpha = 0.6;
      for (let i = 0; i < 50; i++) {
        const x = (width / 50) * i;
        const waveOffset = Math.sin(crowdWave + i * 0.5) * 3;
        const y = 20 + waveOffset;
        
        // Alternating team colors
        const isBlue = i % 2 === 0;
        ctx.fillStyle = isBlue ? '#1F6FEB' : '#E91E63';
        
        // Simple crowd "head" circles
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    },

    renderLighting: (ctx, width, height, phase) => {
      // Dynamic lighting based on battle phase
      if (phase === 'melee') {
        // Chaotic red overlay
        const chaos = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
        chaos.addColorStop(0, 'rgba(255, 0, 0, 0)');
        chaos.addColorStop(1, 'rgba(255, 0, 0, 0.15)');
        ctx.fillStyle = chaos;
        ctx.fillRect(0, 0, width, height);
      } else if (phase === 'stand') {
        // Organized golden glow
        const organized = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width);
        organized.addColorStop(0, 'rgba(255, 215, 0, 0.1)');
        organized.addColorStop(1, 'rgba(255, 215, 0, 0)');
        ctx.fillStyle = organized;
        ctx.fillRect(0, 0, width, height);
      }
    }
  };
};
