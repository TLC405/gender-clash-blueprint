import {describe,expect,it} from "vitest";
import {readFileSync} from "node:fs";
import {
  attackEnvelope, formationSlot, getSquadCount, guardEnvelope,
  laneTargetY, MAX_SQUADS, STRIKE_DURATION, STRIKE_JAB, STRIKE_SHOVE
} from "./combatChoreography";
import {
  createBattleSoA, initializeUnits, TEAM_MEN, TEAM_WOMEN,
  FORMATION_CHARGING, FORMATION_BROKEN
} from "./battleSoA";
import {DEFAULT_CONFIG, resetChargeState, setInitialCounts, updatePhysics} from "./battlePhysicsV4";
import {createSpatialHashGrid} from "./spatialHash";
import {createParticlePool} from "./particlePool";
import {CROWD_PRESETS} from "./battleBalance";

describe("TLC battle critical battalion choreography",()=>{
  it("assigns corresponding squad lanes even for asymmetric armies",()=>{
    for(const preset of CROWD_PRESETS){
      const soa=createBattleSoA();
      initializeUnits(soa,preset.men,800,500,preset.women);
      const lanes=getSquadCount(Math.max(preset.men,preset.women));
      const men=new Set<number>(),women=new Set<number>();
      for(let i=0;i<soa.unitCount;i++){
        const lane=soa.squadLane[i];
        expect(lane).toBeGreaterThanOrEqual(0);
        expect(lane).toBeLessThan(lanes);
        expect(soa.posX[i]).toBeGreaterThanOrEqual(24);
        expect(soa.posX[i]).toBeLessThanOrEqual(776);
        expect(soa.posY[i]).toBeGreaterThanOrEqual(24);
        expect(soa.posY[i]).toBeLessThanOrEqual(476);
        if(soa.teamID[i]===TEAM_MEN) men.add(lane);
        else women.add(lane);
      }
      expect(men.size).toBe(lanes);
      expect(women.size).toBe(lanes);
    }
  });

  it("spawns stable layered slots, with squads spread down the field",()=>{
    expect(getSquadCount(1400)).toBeLessThanOrEqual(MAX_SQUADS);
    const a=formationSlot(44,500,850,TEAM_MEN,800,500);
    const b=formationSlot(44,500,850,TEAM_MEN,800,500);
    expect(a).toEqual(b);
    const top=formationSlot(0,500,850,TEAM_MEN,800,500);
    const bottom=formationSlot(499,500,850,TEAM_MEN,800,500);
    expect(bottom.y-top.y).toBeGreaterThan(200);
    expect(top.x).toBeLessThan(400);
    const opposite=formationSlot(0,850,850,TEAM_WOMEN,800,500);
    expect(opposite.x).toBeGreaterThan(400);
    expect(laneTargetY(0,getSquadCount(850),500)).toBeLessThan(laneTargetY(3,getSquadCount(850),500));
  });

  it("keeps fighters in formation during their opening advance, then breaks when enemy is near",()=>{
    const soa=createBattleSoA();
    initializeUnits(soa,12,500,300,18);
    const grid=createSpatialHashGrid(500,300,50);
    const pool=createParticlePool();
    resetChargeState(soa);setInitialCounts(12,18,soa);
    updatePhysics(soa,grid,pool,DEFAULT_CONFIG,"melee",1/60,500,300,1);
    expect(soa.velX[0]).toBeGreaterThan(0);
    expect(soa.velX[12]).toBeLessThan(0);
    expect(soa.formationState[0]).toBe(FORMATION_CHARGING);
    soa.posX[0]=200;soa.posY[0]=120;soa.posX[12]=206;soa.posY[12]=120;
    updatePhysics(soa,grid,pool,DEFAULT_CONFIG,"melee",1/60,500,300,1);
    expect(soa.formationState[0]).toBe(FORMATION_BROKEN);
    expect(soa.formationState[12]).toBe(FORMATION_BROKEN);
  });

  it("fires synchronized combat and impact animation state on an actual hit",()=>{
    const soa=createBattleSoA();
    initializeUnits(soa,1,500,300,1);
    const grid=createSpatialHashGrid(500,300,50);
    const pool=createParticlePool();
    resetChargeState(soa);setInitialCounts(1,1,soa);
    soa.posX[0]=120;soa.posX[1]=127;soa.posY[0]=140;soa.posY[1]=140;
    updatePhysics(soa,grid,pool,DEFAULT_CONFIG,"melee",1/60,500,300,1);
    expect(soa.attackTimer[0]).toBeCloseTo(STRIKE_DURATION,5);
    expect(soa.attackTimer[1]).toBeCloseTo(STRIKE_DURATION,5);
    expect([STRIKE_JAB,STRIKE_SHOVE]).toContain(soa.attackKind[0]);
    expect(soa.stagger[0]).toBeGreaterThan(0);
    expect(soa.stagger[1]).toBeGreaterThan(0);
    expect(soa.guardTimer[0]).toBe(0);
  });

  it("produces smooth attack/recovery, guarded rest and reduced animation after impact",()=>{
    expect(attackEnvelope(STRIKE_DURATION)).toBeCloseTo(0,6);
    expect(attackEnvelope(STRIKE_DURATION/2)).toBeCloseTo(1,6);
    expect(attackEnvelope(0)).toBe(0);
    expect(attackEnvelope(-1)).toBe(0);
    expect(attackEnvelope(Number.NaN)).toBe(0);
    expect(guardEnvelope(.25,0)).toBe(1);
    expect(guardEnvelope(.25,.1)).toBe(0);
    expect(guardEnvelope(0,0)).toBe(0);
  });

  it("connects both 3D and Canvas human figures to the same contact envelopes",()=>{
    const three=readFileSync(new URL("./stickFigure3DRenderer.ts",import.meta.url),"utf8");
    const canvas=readFileSync(new URL("./spriteRenderer.ts",import.meta.url),"utf8");
    expect(three).toContain("attackEnvelope(soa.attackTimer[i])");
    expect(three).toContain("guardEnvelope(soa.guardTimer[i], soa.attackTimer[i])");
    expect(canvas).toContain("attackEnvelope(soa.attackTimer[i])");
    expect(canvas).toContain("guardEnvelope(soa.guardTimer[i], soa.attackTimer[i])");
  });
});
