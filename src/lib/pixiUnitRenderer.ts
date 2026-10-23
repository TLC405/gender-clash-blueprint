/**
 * GPU unit renderer (PixiJS v8, MIT). Draws every unit as a batched sprite
 * from pre-baked textures, so thousands of units stay at 60 FPS.
 */
import { Application, Container, Sprite, Texture } from 'pixi.js';
import { FLAG_ALIVE, FLAG_LEADER, TEAM_MEN, type BattleSoA } from './battleSoA';

const TEX_SIZE = 32;

function bakeUnit(base: string, dark: string, light: string, leader: boolean): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = TEX_SIZE * 2;
  const g = c.getContext('2d')!;
  g.scale(2, 2);
  const r = TEX_SIZE / 2 - 4;
  const cx = TEX_SIZE / 2, cy = TEX_SIZE / 2;
  // ground shadow
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath(); g.ellipse(cx + 1, cy + r * 0.7, r * 0.9, r * 0.35, 0, 0, Math.PI * 2); g.fill();
  // body
  const grad = g.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  grad.addColorStop(0, light); grad.addColorStop(0.45, base); grad.addColorStop(1, dark);
  g.fillStyle = grad;
  g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
  g.lineWidth = 1.2; g.strokeStyle = leader ? '#FFD34D' : 'rgba(0,0,0,0.45)';
  g.stroke();
  // specular
  g.fillStyle = 'rgba(255,255,255,0.8)';
  g.beginPath(); g.arc(cx - r * 0.35, cy - r * 0.4, r * 0.18, 0, Math.PI * 2); g.fill();
  return Texture.from(c);
}

export interface PixiUnitLayer {
  app: Application;
  world: Container;
  sprites: Sprite[];
  tex: { men: Texture; women: Texture; menLead: Texture; womenLead: Texture };
  destroyed: boolean;
}

export async function createPixiUnitLayer(canvas: HTMLCanvasElement, w: number, h: number): Promise<PixiUnitLayer> {
  const app = new Application();
  await app.init({
    canvas, width: w, height: h, backgroundAlpha: 0, antialias: true,
    resolution: Math.min(window.devicePixelRatio || 1, 2), autoDensity: true,
    autoStart: false, preference: 'webgl',
  });
  const world = new Container();
  app.stage.addChild(world);
  return {
    app, world, sprites: [], destroyed: false,
    tex: {
      men: bakeUnit('#3B82F6', '#1E3A8A', '#BFDBFE', false),
      women: bakeUnit('#EC4899', '#831843', '#FBCFE8', false),
      menLead: bakeUnit('#3B82F6', '#1E3A8A', '#BFDBFE', true),
      womenLead: bakeUnit('#EC4899', '#831843', '#FBCFE8', true),
    },
  };
}

export function resizePixiLayer(layer: PixiUnitLayer, w: number, h: number) {
  if (!layer.destroyed) layer.app.renderer.resize(w, h);
}

export function renderPixiUnits(
  layer: PixiUnitLayer, soa: BattleSoA, phase: string,
  cam: { x: number; y: number; zoom: number; w: number; h: number }
) {
  if (layer.destroyed) return;
  const { world, sprites, tex } = layer;
  world.position.set(cam.w / 2 + cam.x, cam.h / 2 + cam.y);
  world.scale.set(cam.zoom);
  world.pivot.set(cam.w / 2, cam.h / 2);

  while (sprites.length < soa.unitCount) {
    const s = new Sprite(tex.men);
    s.anchor.set(0.5);
    world.addChild(s);
    sprites.push(s);
  }
  const breath = phase === 'stand' ? 1 + Math.sin(performance.now() * 0.006) * 0.05 : 1;
  for (let i = 0; i < sprites.length; i++) {
    const s = sprites[i];
    if (i >= soa.unitCount || (soa.stateFlags[i] & FLAG_ALIVE) === 0) { s.visible = false; continue; }
    const leader = (soa.stateFlags[i] & FLAG_LEADER) !== 0;
    const men = soa.teamID[i] === TEAM_MEN;
    s.texture = men ? (leader ? tex.menLead : tex.men) : (leader ? tex.womenLead : tex.women);
    s.visible = true;
    s.position.set(soa.posX[i], soa.posY[i]);
    const hp = Math.max(0.35, Math.min(1, soa.health[i] / 100));
    const size = (leader ? 22 : 15) * breath * (0.75 + 0.25 * hp) / TEX_SIZE;
    s.scale.set(size);
    s.alpha = 0.6 + 0.4 * hp;
  }
  layer.app.render();
}

export function destroyPixiLayer(layer: PixiUnitLayer) {
  if (layer.destroyed) return;
  layer.destroyed = true;
  layer.app.destroy(false, { children: true });
}
