/**
 * Battle sound effects via Howler.js (MIT) using Kenney CC0 impact sounds (public/sfx).
 * Rate-limited so big battles don't turn into noise.
 */
import { Howl, Howler } from 'howler';

let clashes: Howl[] = [];
let punches: Howl[] = [];
let bell: Howl | null = null;
let lastPlay = 0;

function load() {
  if (clashes.length) return;
  clashes = ['000', '001', '002'].map(n => new Howl({ src: [`/sfx/impactMetal_light_${n}.ogg`], volume: 0.25 }));
  punches = ['000', '001'].map(n => new Howl({ src: [`/sfx/impactPunch_medium_${n}.ogg`], volume: 0.35 }));
  bell = new Howl({ src: ['/sfx/impactBell_heavy_000.ogg'], volume: 0.5 });
}

export function setSoundEnabled(on: boolean) { Howler.mute(!on); }

export function playKills(count: number) {
  if (count <= 0) return;
  load();
  const now = performance.now();
  if (now - lastPlay < 70) return;
  lastPlay = now;
  const pool = Math.random() < 0.5 ? clashes : punches;
  const s = pool[Math.floor(Math.random() * pool.length)];
  const id = s.play();
  s.rate(0.85 + Math.random() * 0.3, id);
}

export function playBell() { load(); bell?.play(); }
