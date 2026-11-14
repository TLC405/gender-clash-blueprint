import { describe, expect, it } from 'vitest';
import {
  getStickFigureVariant, getStickMotion, STICK_FIGHTER_SEGMENTS,
  STICK_FIGHTER_PALETTES,
} from './stickFigureVariants';

describe('TLC articulated stick-fighter character models', () => {
  it('generates stable randomized figures without frame-to-frame appearance changes', () => {
    for (let i = 0; i < 400; i++) {
      expect(getStickFigureVariant(i, 0)).toEqual(getStickFigureVariant(i, 0));
      expect(getStickFigureVariant(i, 1)).toEqual(getStickFigureVariant(i, 1));
    }
    expect(getStickFigureVariant(0, 0)).not.toEqual(getStickFigureVariant(1, 0));
    expect(getStickFigureVariant(12, 0)).not.toEqual(getStickFigureVariant(12, 1));
  });

  it('varies individual anatomy while staying within known silhouette limits', () => {
    const set = new Set<string>();
    for (let i = 0; i < 1200; i++) {
      const v = getStickFigureVariant(i, i % 2);
      expect(v.height).toBeGreaterThanOrEqual(0.84);
      expect(v.height).toBeLessThan(1.16 + 0.001);
      expect(v.shoulders).toBeGreaterThanOrEqual(0.83);
      expect(v.shoulders).toBeLessThan(1.23 + 0.001);
      expect(v.shade).toBeGreaterThanOrEqual(0);
      expect(v.shade).toBeLessThan(5);
      set.add([v.height.toFixed(3), v.shoulders.toFixed(3), v.phase.toFixed(2)].join('|'));
    }
    expect(set.size).toBeGreaterThan(1100);
  });

  it('uses an articulated human silhouette: torso, both arms and both legs', () => {
    expect(STICK_FIGHTER_SEGMENTS).toHaveLength(9);
    expect(STICK_FIGHTER_SEGMENTS).toContain('torso');
    for (const side of ['left', 'right']) {
      expect(STICK_FIGHTER_SEGMENTS).toContain(side + 'UpperArm');
      expect(STICK_FIGHTER_SEGMENTS).toContain(side + 'Forearm');
      expect(STICK_FIGHTER_SEGMENTS).toContain(side + 'Thigh');
      expect(STICK_FIGHTER_SEGMENTS).toContain(side + 'Shin');
    }
  });

  it('produces animated individualized gait and obeys reduced-motion preference', () => {
    const v = getStickFigureVariant(17, 0);
    const still = getStickMotion(v, 0.5, 0, 0);
    expect(still.stride).toBe(0);
    const walking = getStickMotion(v, 0.5, 95, 0);
    const running = getStickMotion(v, 0.73, 95, 0);
    expect(walking.stride).not.toBe(running.stride);
    const staggered = getStickMotion(v, 0.5, 95, 0.35);
    expect(staggered.recoil).toBe(1);
    expect(staggered.lean).toBeLessThan(walking.lean);
    const reduced = getStickMotion(v, 1, 95, 0.35, true);
    expect(reduced).toEqual({ stride: 0, lean: 0, recoil: 0 });
  });

  it('keeps contrasting team uniforms and varied skin tones', () => {
    expect(STICK_FIGHTER_PALETTES.men).toHaveLength(5);
    expect(STICK_FIGHTER_PALETTES.women).toHaveLength(5);
    expect(STICK_FIGHTER_PALETTES.skin.length).toBeGreaterThanOrEqual(4);
    expect(STICK_FIGHTER_PALETTES.men[0]).not.toBe(STICK_FIGHTER_PALETTES.women[0]);
  });
});
