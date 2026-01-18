/**
 * Clean Professional Arena Renderer
 * Minimalist, premium battlefield - no cartoon effects
 */

type ArenaLayer = {
  renderBackground: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  renderTurf: (ctx: CanvasRenderingContext2D, width: number, height: number) => void;
  renderCrowd: (ctx: CanvasRenderingContext2D, width: number, height: number, time: number) => void;
  renderLighting: (ctx: CanvasRenderingContext2D, width: number, height: number, phase: string) => void;
};

export const createArenaRenderer = (): ArenaLayer => {
  return {
    renderBackground: (ctx, width, height) => {
      // Clean dark gradient background
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, '#0a0a0f');
      gradient.addColorStop(0.5, '#0d0d14');
      gradient.addColorStop(1, '#0a0a0f');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // Subtle vignette
      const vignette = ctx.createRadialGradient(
        width / 2, height / 2, height * 0.3,
        width / 2, height / 2, width * 0.8
      );
      vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
      vignette.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, width, height);
    },

    renderTurf: (ctx, width, height) => {
      // Main field - dark grass with subtle stripes
      const fieldMargin = 40;
      const fieldX = fieldMargin;
      const fieldY = fieldMargin;
      const fieldW = width - fieldMargin * 2;
      const fieldH = height - fieldMargin * 2;

      // Field base
      ctx.fillStyle = '#1a2a1a';
      ctx.fillRect(fieldX, fieldY, fieldW, fieldH);

      // Subtle grass stripes
      const stripeCount = 12;
      const stripeWidth = fieldW / stripeCount;
      for (let i = 0; i < stripeCount; i++) {
        if (i % 2 === 0) {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
          ctx.fillRect(fieldX + i * stripeWidth, fieldY, stripeWidth, fieldH);
        }
      }

      // Field border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;
      ctx.strokeRect(fieldX, fieldY, fieldW, fieldH);

      // Center line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(width / 2, fieldY);
      ctx.lineTo(width / 2, fieldY + fieldH);
      ctx.stroke();

      // Center circle
      ctx.beginPath();
      ctx.arc(width / 2, height / 2, 50, 0, Math.PI * 2);
      ctx.stroke();

      // Team zones - subtle color washes
      // Men zone (left)
      const menGrad = ctx.createLinearGradient(fieldX, 0, fieldX + fieldW * 0.2, 0);
      menGrad.addColorStop(0, 'rgba(30, 144, 255, 0.08)');
      menGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = menGrad;
      ctx.fillRect(fieldX, fieldY, fieldW * 0.2, fieldH);

      // Women zone (right)
      const womenGrad = ctx.createLinearGradient(fieldX + fieldW, 0, fieldX + fieldW * 0.8, 0);
      womenGrad.addColorStop(0, 'rgba(236, 72, 153, 0.08)');
      womenGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = womenGrad;
      ctx.fillRect(fieldX + fieldW * 0.8, fieldY, fieldW * 0.2, fieldH);

      // Team labels - very subtle
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#1E90FF';
      ctx.font = 'bold 14px system-ui';
      ctx.textAlign = 'center';
      ctx.save();
      ctx.translate(fieldX + 20, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.fillText('MEN', 0, 0);
      ctx.restore();

      ctx.fillStyle = '#EC4899';
      ctx.save();
      ctx.translate(fieldX + fieldW - 20, height / 2);
      ctx.rotate(Math.PI / 2);
      ctx.fillText('WOMEN', 0, 0);
      ctx.restore();
      ctx.globalAlpha = 1;
    },

    renderCrowd: (_ctx, _width, _height, _time) => {
      // No crowd rendering - keep it clean
    },

    renderLighting: (ctx, width, height, phase) => {
      // Subtle phase-based lighting only
      if (phase === 'melee') {
        // Warm battle glow
        const battleGlow = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, width * 0.6
        );
        battleGlow.addColorStop(0, 'rgba(255, 100, 50, 0.03)');
        battleGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = battleGlow;
        ctx.fillRect(0, 0, width, height);
      } else if (phase === 'victory') {
        // Soft celebration glow
        const victoryGlow = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, width * 0.5
        );
        victoryGlow.addColorStop(0, 'rgba(255, 215, 0, 0.06)');
        victoryGlow.addColorStop(1, 'transparent');
        ctx.fillStyle = victoryGlow;
        ctx.fillRect(0, 0, width, height);
      }
    }
  };
};
