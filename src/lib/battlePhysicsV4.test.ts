import { describe, expect, it } from 'vitest';
import { createBattleSoA, initializeUnits, MAX_UNITS, TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE } from './battleSoA';
import { createSpatialHashGrid, findNearestEnemy, rebuildGrid, resizeGrid } from './spatialHash';
import { createParticlePool } from './particlePool';
import {
  applyMeteorImpact, DEFAULT_CONFIG, resetChargeState,
  setInitialCounts, updatePhysics
} from './battlePhysicsV4';

const newBattle = (men = 1, women = 1) => {
  const soa = createBattleSoA();
  initializeUnits(soa, men, 500, 300, women);
  resetChargeState(soa);
  setInitialCounts(men, women, soa);
  const grid = createSpatialHashGrid(500, 300, 50);
  const pool = createParticlePool();
  return { soa, grid, pool };
};

describe('Atomic V4 engine and spatial indexing', () => {
  it('does not damage either formation during the stand phase', () => {
    const { soa, grid, pool } = newBattle();
    soa.posX[0] = 100;
    soa.posX[1] = 105;
    for (let t = 0; t < 20; t++) {
      updatePhysics(soa, grid, pool, DEFAULT_CONFIG, 'stand', 1 / 60, 500, 300, 0.5);
    }
    expect(soa.health[0]).toBe(100);
    expect(soa.health[1]).toBe(100);
    expect(soa.menCount).toBe(1);
    expect(soa.womenCount).toBe(1);
  });

  it('resolves reciprocal lethal attacks in one fixed step, without index-order bias', () => {
    const { soa, grid, pool } = newBattle();
    soa.posX[0] = 100; soa.posY[0] = 120;
    soa.posX[1] = 107; soa.posY[1] = 120;
    soa.health[0] = 0.05;
    soa.health[1] = 0.05;
    const result = updatePhysics(soa, grid, pool, DEFAULT_CONFIG, 'melee', 1 / 60, 500, 300, 1);
    expect(result.stats.menAlive).toBe(0);
    expect(result.stats.womenAlive).toBe(0);
    expect(result.stats.menKills).toBe(1);
    expect(result.stats.womenKills).toBe(1);
    expect(result.kills).toHaveLength(2);
  });

  it('keeps KO attribution correct if a fighter starts at index 1', () => {
    const { soa, grid, pool } = newBattle();
    soa.posX[0] = 100; soa.posY[0] = 120;
    soa.posX[1] = 105; soa.posY[1] = 120;
    soa.health[0] = 0.05;
    const result = updatePhysics(soa, grid, pool, DEFAULT_CONFIG, 'melee', 1 / 60, 500, 300, 1);
    expect(result.stats.menAlive).toBe(0);
    expect(result.stats.womenAlive).toBe(1);
    expect(result.stats.menKills).toBe(0);
    expect(result.stats.womenKills).toBe(1);
  });

  it('reports environmental meteor casualties without awarding team KOs', () => {
    const { soa, grid } = newBattle(1, 1);
    soa.posX[0] = 100; soa.posY[0] = 100;
    soa.posX[1] = 106; soa.posY[1] = 100;
    soa.health[0] = 10; soa.health[1] = 10;
    const strike = applyMeteorImpact(soa, grid, 103, 100, 25, 100);
    expect(strike).toMatchObject({ menLost: 1, womenLost: 1, totalLost: 2, hits: 2 });
    expect(soa.menCount).toBe(0);
    expect(soa.womenCount).toBe(0);
    expect(soa.stateFlags[0] & FLAG_ALIVE).toBe(0);
    expect(soa.stateFlags[1] & FLAG_ALIVE).toBe(0);
    expect(applyMeteorImpact(soa, grid, 103, 100, 25, 100).totalLost).toBe(0);
  });

  it('handles a meteor directly on a unit without non-finite knockback', () => {
    const { soa, grid } = newBattle();
    const x = soa.posX[0], y = soa.posY[0];
    applyMeteorImpact(soa, grid, x, y, 100, 500);
    expect(Number.isFinite(soa.velX[0])).toBe(true);
    expect(Number.isFinite(soa.velY[0])).toBe(true);
  });

  it('shrinks spatial grid counts correctly on Fold-size and portrait resizes', () => {
    const grid = createSpatialHashGrid(500, 300, 50);
    expect(grid.cellCount).toBe(60);
    resizeGrid(grid, 100, 100);
    expect(grid.cellCount).toBe(4);
    resizeGrid(grid, 500, 300);
    expect(grid.cellCount).toBe(60);
  });

  it('finds the nearest enemy locally and respects a finite perception budget', () => {
    const { soa, grid } = newBattle(1, 2);
    soa.posX[0] = 100; soa.posY[0] = 100;
    soa.posX[1] = 120; soa.posY[1] = 100;
    soa.posX[2] = 125; soa.posY[2] = 100;
    rebuildGrid(grid, soa.posX, soa.posY, soa.stateFlags, soa.unitCount, FLAG_ALIVE);
    const nearby = findNearestEnemy(grid, 100, 100, TEAM_MEN, soa.posX, soa.posY, soa.teamID, soa.stateFlags, FLAG_ALIVE, 1);
    expect(nearby.index).toBe(1);
    const farAway = findNearestEnemy(grid, 475, 260, TEAM_MEN, soa.posX, soa.posY, soa.teamID, soa.stateFlags, FLAG_ALIVE, 1);
    expect(farAway.index).toBe(-1);
  });

  it('is replayable with the same initial state and fixed timestep', () => {
    const a = newBattle(6, 6);
    const b = newBattle(6, 6);
    for (let step = 0; step < 60; step++) {
      updatePhysics(a.soa, a.grid, a.pool, DEFAULT_CONFIG, 'melee', 1 / 60, 500, 300, 0.75);
      updatePhysics(b.soa, b.grid, b.pool, DEFAULT_CONFIG, 'melee', 1 / 60, 500, 300, 0.75);
    }
    expect(Array.from(a.soa.posX.slice(0, 12))).toEqual(Array.from(b.soa.posX.slice(0, 12)));
    expect(Array.from(a.soa.posY.slice(0, 12))).toEqual(Array.from(b.soa.posY.slice(0, 12)));
    expect(a.soa.menCount).toBe(b.soa.menCount);
    expect(a.soa.womenCount).toBe(b.soa.womenCount);
  });

  it('bounds velocities and positions while conserving elimination counts', () => {
    const { soa, grid, pool } = newBattle(40, 40);
    let totalMenKills = 0, totalWomenKills = 0;
    for (let t = 0; t < 80; t++) {
      const result = updatePhysics(soa, grid, pool, DEFAULT_CONFIG, 'melee', 1 / 60, 500, 300, 1);
      totalMenKills += result.stats.menKills;
      totalWomenKills += result.stats.womenKills;
    }
    expect(soa.menCount).toBe(40 - totalWomenKills);
    expect(soa.womenCount).toBe(40 - totalMenKills);
    for (let i = 0; i < soa.unitCount; i++) {
      expect(Number.isFinite(soa.posX[i])).toBe(true);
      expect(Number.isFinite(soa.posY[i])).toBe(true);
      expect(soa.posX[i]).toBeGreaterThanOrEqual(25);
      expect(soa.posX[i]).toBeLessThanOrEqual(475);
      expect(soa.posY[i]).toBeGreaterThanOrEqual(25);
      expect(soa.posY[i]).toBeLessThanOrEqual(275);
    }
  });

  it('does not exceed the preallocated 20,000-agent capacity', () => {
    const soa = createBattleSoA();
    initializeUnits(soa, MAX_UNITS / 2, 800, 500, MAX_UNITS / 2);
    expect(soa.unitCount).toBe(MAX_UNITS);
    expect(soa.menCount).toBe(MAX_UNITS / 2);
    expect(soa.womenCount).toBe(MAX_UNITS / 2);
  });
});
