/**
 * Stable, game-only visual variety for TLC stick fighters.
 * The same unit always has the same anatomy, outfit palette and gait phase.
 * No health values enter the visual character model.
 */
export interface StickFigureVariant {
  height: number;
  shoulders: number;
  hips: number;
  stride: number;
  thickness: number;
  phase: number;
  depth: number;
  shade: number;
  lean: number;
}

function unitRandom(index: number, team: number, salt: number): number {
  let n = Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(team + 3, 0x85ebca6b) ^ Math.imul(salt + 5, 0xc2b2ae35);
  n ^= n >>> 16;
  n = Math.imul(n, 0x7feb352d);
  n ^= n >>> 15;
  n = Math.imul(n, 0x846ca68b);
  n ^= n >>> 16;
  return (n >>> 0) / 4294967296;
}

export function getStickFigureVariant(index: number, team: number): StickFigureVariant {
  return {
    height: 0.84 + unitRandom(index, team, 1) * 0.32,
    shoulders: 0.83 + unitRandom(index, team, 2) * 0.4,
    hips: 0.82 + unitRandom(index, team, 3) * 0.38,
    stride: 0.75 + unitRandom(index, team, 4) * 0.55,
    thickness: 0.83 + unitRandom(index, team, 5) * 0.35,
    phase: unitRandom(index, team, 6) * Math.PI * 2,
    depth: -2 + unitRandom(index, team, 7) * 4,
    shade: Math.floor(unitRandom(index, team, 8) * 5),
    lean: -0.3 + unitRandom(index, team, 9) * 0.6,
  };
}

export function getStickMotion(
  variant: StickFigureVariant, timeSeconds: number, speed: number,
  staggerSeconds: number, reducedMotion = false
): { stride: number; lean: number; recoil: number } {
  const velocity = Math.min(1, Math.max(0, speed / 65));
  const recoil = Math.min(1, Math.max(0, staggerSeconds / 0.35));
  if (reducedMotion) return { stride: 0, lean: 0, recoil: 0 };
  if (velocity === 0) return { stride: 0, lean: variant.lean - recoil * 1.4, recoil };
  return {
    stride: Math.sin(timeSeconds * (4.5 + velocity * 3.6) + variant.phase) * velocity * variant.stride,
    lean: variant.lean + velocity * 0.35 - recoil * 1.4,
    recoil,
  };
}

export const STICK_FIGHTER_SEGMENTS = [
  'torso',
  'leftUpperArm', 'leftForearm',
  'rightUpperArm', 'rightForearm',
  'leftThigh', 'leftShin',
  'rightThigh', 'rightShin',
] as const;

export const STICK_FIGHTER_PALETTES = {
  men: [0x449bfa, 0x3d8fee, 0x67b9ff, 0x2679dc, 0x5ba7e9],
  women: [0xf35b9e, 0xe875b5, 0xff83b3, 0xc74790, 0xff9ac8],
  skin: [0xf4cba1, 0xdca67b, 0xb87956, 0x8a5940, 0xf0d7bb],
} as const;
