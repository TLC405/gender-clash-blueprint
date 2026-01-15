/**
 * Professional Stadium Arena Renderer
 * High-detail battlefield with multi-tier seating, lighting rigs, and immersive effects
 */

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
      gradient.addColorStop(0, 'hsl(240 10% 3.9%)');
      gradient.addColorStop(0.3, 'hsl(240 6% 8%)');
      gradient.addColorStop(0.7, 'hsl(240 6% 6%)');
      gradient.addColorStop(1, 'hsl(240 10% 3.9%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Stadium dome/roof structure at top
      ctx.fillStyle = 'hsl(240 6% 12%)';
      ctx.beginPath();
      ctx.ellipse(width / 2, -height * 0.3, width * 0.7, height * 0.5, 0, 0, Math.PI);
      ctx.fill();

      // Stadium stands/seating tiers - 5 tier structure
      const standLayers = 5;
      for (let i = 0; i < standLayers; i++) {
        const layerY = i * 20;
        const layerAlpha = 0.5 - (i * 0.08);
        const tierWidth = 0.1 - (i * 0.01);
        ctx.globalAlpha = layerAlpha;
        
        // Left stands (MEN side) - gradient tiers
        const leftGrad = ctx.createLinearGradient(0, layerY, width * tierWidth, layerY);
        leftGrad.addColorStop(0, 'hsl(217 91% 50%)');
        leftGrad.addColorStop(1, 'hsl(240 6% 10%)');
        ctx.fillStyle = leftGrad;
        ctx.fillRect(0, layerY, width * tierWidth, 50);
        
        // Right stands (WOMEN side) - gradient tiers
        const rightGrad = ctx.createLinearGradient(width, layerY, width * (1 - tierWidth), layerY);
        rightGrad.addColorStop(0, 'hsl(340 82% 45%)');
        rightGrad.addColorStop(1, 'hsl(240 6% 10%)');
        ctx.fillStyle = rightGrad;
        ctx.fillRect(width * (1 - tierWidth), layerY, width * tierWidth, 50);
      }
      ctx.globalAlpha = 1;

      // Stadium lighting rigs (spotlights)
      ctx.fillStyle = 'hsl(240 6% 15%)';
      const rigPositions = [0.15, 0.35, 0.65, 0.85];
      for (const pos of rigPositions) {
        ctx.fillRect(width * pos - 5, 0, 10, 30);
        // Light housing
        ctx.beginPath();
        ctx.arc(width * pos, 30, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      // ETFE panel accents (accent color veins)
      ctx.strokeStyle = 'hsl(24 100% 50%)';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.15;
      for (let i = 0; i < 7; i++) {
        const x = (width / 7) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + width / 14, height);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Vignette corners for depth
      const vignette = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.8);
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(0.7, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    },

    renderTurf: (ctx, width, height) => {
      // Main turf base with grass stripe pattern
      for (let stripe = 0; stripe < 20; stripe++) {
        const stripeWidth = width / 20;
        const x = stripe * stripeWidth;
        const isLight = stripe % 2 === 0;
        
        ctx.fillStyle = isLight ? 'hsl(120 30% 12%)' : 'hsl(120 25% 8%)';
        ctx.fillRect(x, 0, stripeWidth, height);
      }

      // Field boundary lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 3;
      ctx.strokeRect(width * 0.05, height * 0.05, width * 0.9, height * 0.9);

      // Yard lines grid
      ctx.strokeStyle = 'hsl(240 3.8% 46.1%)';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.15;
      for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;

      // Hash marks on sides
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      for (let y = 0; y < height; y += 50) {
        // Left hash
        ctx.beginPath();
        ctx.moveTo(width * 0.08, y);
        ctx.lineTo(width * 0.12, y);
        ctx.stroke();
        // Right hash
        ctx.beginPath();
        ctx.moveTo(width * 0.88, y);
        ctx.lineTo(width * 0.92, y);
        ctx.stroke();
      }

      // End zones with team colors and gradients
      // MEN zone (left) - Bro Bunker
      const menZone = ctx.createLinearGradient(0, 0, width * 0.18, 0);
      menZone.addColorStop(0, 'hsla(217 91% 50% / 0.35)');
      menZone.addColorStop(0.7, 'hsla(217 91% 50% / 0.15)');
      menZone.addColorStop(1, 'hsla(217 91% 50% / 0)');
      ctx.fillStyle = menZone;
      ctx.fillRect(0, 0, width * 0.18, height);
      
      // Men end zone text
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'hsl(217 91% 70%)';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.translate(width * 0.08, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('TEAM MEN', 0, 0);
      ctx.restore();

      // WOMEN zone (right) - Empathy Enclave
      const womenZone = ctx.createLinearGradient(width, 0, width * 0.82, 0);
      womenZone.addColorStop(0, 'hsla(340 82% 45% / 0.35)');
      womenZone.addColorStop(0.7, 'hsla(340 82% 45% / 0.15)');
      womenZone.addColorStop(1, 'hsla(340 82% 45% / 0)');
      ctx.fillStyle = womenZone;
      ctx.fillRect(width * 0.82, 0, width * 0.18, height);
      
      // Women end zone text
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.fillStyle = 'hsl(340 82% 70%)';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.translate(width * 0.92, height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText('TEAM WOMEN', 0, 0);
      ctx.restore();

      // Center field emblem - TLC ARENA
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Center circle
      ctx.strokeStyle = 'hsl(48 96% 53%)';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 60, 0, Math.PI * 2);
      ctx.stroke();
      
      // Inner circle
      ctx.beginPath();
      ctx.arc(centerX, centerY, 30, 0, Math.PI * 2);
      ctx.stroke();
      
      // TLC text
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = 'hsl(48 96% 53%)';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TLC', centerX, centerY - 5);
      ctx.font = '10px Arial';
      ctx.fillText('ARENA', centerX, centerY + 12);
      ctx.globalAlpha = 1;

      // Center "Hot Gates" pass markers
      const passWidth = 180;
      ctx.strokeStyle = 'hsl(48 96% 53%)';
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.5;
      ctx.setLineDash([12, 8]);
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

      // Corner flags
      const cornerSize = 15;
      ctx.fillStyle = 'hsl(48 96% 53%)';
      ctx.globalAlpha = 0.6;
      // Top-left
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(cornerSize, 0);
      ctx.lineTo(0, cornerSize);
      ctx.fill();
      // Top-right
      ctx.beginPath();
      ctx.moveTo(width, 0);
      ctx.lineTo(width - cornerSize, 0);
      ctx.lineTo(width, cornerSize);
      ctx.fill();
      // Bottom-left
      ctx.beginPath();
      ctx.moveTo(0, height);
      ctx.lineTo(cornerSize, height);
      ctx.lineTo(0, height - cornerSize);
      ctx.fill();
      // Bottom-right
      ctx.beginPath();
      ctx.moveTo(width, height);
      ctx.lineTo(width - cornerSize, height);
      ctx.lineTo(width, height - cornerSize);
      ctx.fill();
      ctx.globalAlpha = 1;
    },

    renderCrowd: (ctx, width, height, time) => {
      crowdWave += 0.03;
      
      // Top crowd - larger and more detailed
      ctx.globalAlpha = 0.8;
      const crowdCount = 80;
      
      for (let i = 0; i < crowdCount; i++) {
        const x = (width / crowdCount) * i + (width / crowdCount / 2);
        const waveOffset = Math.sin(crowdWave + i * 0.4) * 5;
        const y = 15 + waveOffset;
        
        // Team-based coloring with sections
        const sectionProgress = i / crowdCount;
        let crowdColor: string;
        
        if (sectionProgress < 0.35) {
          // Men section (left)
          crowdColor = 'hsl(217 91% 60%)';
        } else if (sectionProgress > 0.65) {
          // Women section (right)
          crowdColor = 'hsl(340 82% 52%)';
        } else {
          // Neutral center - alternating
          crowdColor = i % 2 === 0 ? 'hsl(48 96% 53%)' : 'hsl(0 0% 80%)';
        }
        
        ctx.fillStyle = crowdColor;
        
        // Crowd "head" with glow
        ctx.shadowBlur = 6;
        ctx.shadowColor = crowdColor;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
        
        // Occasionally show raised arms (cheering)
        if ((i + Math.floor(time * 2)) % 8 < 2) {
          ctx.fillRect(x - 1, y - 10 + waveOffset * 0.5, 2, 6);
        }
      }
      ctx.shadowBlur = 0;
      
      // Side crowds (dugout area spectators)
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 15; i++) {
        const y = 80 + i * 35;
        if (y > height - 50) break;
        
        // Left side (men)
        const leftWave = Math.sin(crowdWave + i * 0.6) * 3;
        ctx.fillStyle = 'hsl(217 91% 55%)';
        ctx.beginPath();
        ctx.arc(8 + leftWave, y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Right side (women)
        const rightWave = Math.sin(crowdWave + i * 0.6 + 1) * 3;
        ctx.fillStyle = 'hsl(340 82% 50%)';
        ctx.beginPath();
        ctx.arc(width - 8 + rightWave, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      
      // Banners/flags waving
      ctx.globalAlpha = 0.4;
      const bannerWave = Math.sin(time * 3) * 5;
      
      // Men banner
      ctx.fillStyle = 'hsl(217 91% 60%)';
      ctx.beginPath();
      ctx.moveTo(width * 0.15, 25);
      ctx.lineTo(width * 0.15 + 30 + bannerWave, 20);
      ctx.lineTo(width * 0.15 + 25 + bannerWave, 30);
      ctx.fill();
      
      // Women banner
      ctx.fillStyle = 'hsl(340 82% 52%)';
      ctx.beginPath();
      ctx.moveTo(width * 0.85, 25);
      ctx.lineTo(width * 0.85 - 30 - bannerWave, 20);
      ctx.lineTo(width * 0.85 - 25 - bannerWave, 30);
      ctx.fill();
      
      ctx.globalAlpha = 1;
    },

    renderLighting: (ctx, width, height, phase) => {
      // Stadium spotlight beams from corners
      ctx.globalAlpha = 0.08;
      const spotPositions = [
        { x: 0, y: 0, targetX: width * 0.4, targetY: height * 0.6 },
        { x: width, y: 0, targetX: width * 0.6, targetY: height * 0.6 },
        { x: 0, y: height, targetX: width * 0.35, targetY: height * 0.3 },
        { x: width, y: height, targetX: width * 0.65, targetY: height * 0.3 },
      ];
      
      for (const spot of spotPositions) {
        const gradient = ctx.createRadialGradient(
          spot.targetX, spot.targetY, 0,
          spot.targetX, spot.targetY, 150
        );
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(spot.targetX, spot.targetY, 150, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Dynamic lighting based on battle phase
      if (phase === 'melee') {
        // Chaotic red overlay with pulse
        const chaos = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.8);
        chaos.addColorStop(0, 'hsla(0 84% 50% / 0)');
        chaos.addColorStop(0.5, 'hsla(0 84% 50% / 0.05)');
        chaos.addColorStop(1, 'hsla(0 84% 50% / 0.15)');
        ctx.fillStyle = chaos;
        ctx.fillRect(0, 0, width, height);
        
        // Red edge glow
        ctx.strokeStyle = 'hsla(0 84% 50% / 0.3)';
        ctx.lineWidth = 8;
        ctx.strokeRect(0, 0, width, height);
      } else if (phase === 'stand') {
        // Organized golden epic glow
        const organized = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.7);
        organized.addColorStop(0, 'hsla(48 96% 53% / 0.12)');
        organized.addColorStop(0.5, 'hsla(48 96% 53% / 0.05)');
        organized.addColorStop(1, 'hsla(48 96% 53% / 0)');
        ctx.fillStyle = organized;
        ctx.fillRect(0, 0, width, height);
      } else if (phase === 'sudden_death') {
        // Intense pulsing overlay
        const suddenDeath = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.6);
        suddenDeath.addColorStop(0, 'hsla(0 84% 50% / 0.15)');
        suddenDeath.addColorStop(0.5, 'hsla(271 81% 56% / 0.1)');
        suddenDeath.addColorStop(1, 'hsla(0 84% 50% / 0.2)');
        ctx.fillStyle = suddenDeath;
        ctx.fillRect(0, 0, width, height);
        
        // Pulsing border
        ctx.strokeStyle = 'hsla(0 84% 50% / 0.5)';
        ctx.lineWidth = 4;
        ctx.strokeRect(0, 0, width, height);
      } else if (phase === 'victory') {
        // Victory celebration lighting
        const victory = ctx.createRadialGradient(width / 2, height / 2, 0, width / 2, height / 2, width * 0.5);
        victory.addColorStop(0, 'hsla(48 96% 53% / 0.2)');
        victory.addColorStop(0.5, 'hsla(48 96% 53% / 0.1)');
        victory.addColorStop(1, 'hsla(48 96% 53% / 0)');
        ctx.fillStyle = victory;
        ctx.fillRect(0, 0, width, height);
      }
    }
  };
};
