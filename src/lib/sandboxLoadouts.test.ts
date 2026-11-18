import {describe,expect,it} from "vitest";
import {DEFAULT_TEAMS, MEN_WEAPONS, WOMEN_WEAPONS, TOTAL_CAP, setTeamCount, teamAttack, type SandboxTeams} from "./sandboxLoadouts";
import {createBattleSoA, initializeUnits, TEAM_MEN, TEAM_WOMEN, FLAG_ALIVE} from "./battleSoA";
import {applyArcadeBlast,updatePhysics,DEFAULT_CONFIG,resetChargeState,setInitialCounts} from "./battlePhysicsV4";
import {createSpatialHashGrid} from "./spatialHash";
import {createParticlePool} from "./particlePool";

describe("Direct-control TLC battle sandbox",()=>{
  it("keeps both independent team sliders under 100 combined without requiring modes",()=>{
    let teams={men:{...DEFAULT_TEAMS.men},women:{...DEFAULT_TEAMS.women}};
    for(let i=1;i<100;i++){
      teams=setTeamCount(teams,"men",i);
      expect(teams.men.count+teams.women.count).toBeLessThanOrEqual(TOTAL_CAP);
      expect(teams.men.count).toBeGreaterThanOrEqual(1);
      expect(teams.women.count).toBeGreaterThanOrEqual(1);
      teams=setTeamCount(teams,"women",100-i);
      expect(teams.men.count+teams.women.count).toBeLessThanOrEqual(TOTAL_CAP);
    }
  });
  it("provides independently selectable men and women gear with a real attack budget",()=>{
    expect(MEN_WEAPONS.map(w=>w.id)).toEqual(["fists","guns","swords","guns+swords"]);
    expect(WOMEN_WEAPONS.map(w=>w.id)).toEqual(["fists","lipstick","makeup","lipstick+makeup"]);
    const teams:SandboxTeams={
      men:{...DEFAULT_TEAMS.men,weapon:"swords",strength:1.5},
      women:{...DEFAULT_TEAMS.women,weapon:"makeup",speed:1.35,furiosa:false},
    };
    const a=teamAttack(teams,0,1,1),b=teamAttack(teams,1,1,1);
    expect(a?.kind).toBe("sword");
    expect(b?.kind).toBe("makeup");
    expect(a?.damage).toBeGreaterThan(37);
    expect(b?.radius).toBeGreaterThan(a?.radius??0);
    expect(teamAttack(DEFAULT_TEAMS,0,1,1)).toBe(null);
  });
  it("makes Furiosa an actual attack with power and no forced global mode selection",()=>{
    const teams:SandboxTeams={
      men:{...DEFAULT_TEAMS.men,weapon:"fists"},
      women:{...DEFAULT_TEAMS.women,weapon:"fists",furiosa:true},
    };
    expect(teamAttack(teams,1,0,1)?.kind).toBe("furiosa");
    expect(teamAttack(teams,1,0,1)?.damage).toBeGreaterThan(40);
    expect(teamAttack(teams,0,0,1)).toBe(null);
  });
  it("applies per-team women speed and power to actual fixed-step physics",()=>{
    const newBattle=()=>{
      const soa=createBattleSoA();
      initializeUnits(soa,1,500,300,1);
      soa.posX[0]=100;soa.posX[1]=107;soa.posY[0]=110;soa.posY[1]=110;
      const grid=createSpatialHashGrid(500,300,50);
      resetChargeState(soa);setInitialCounts(1,1,soa);
      return {soa,grid,pool:createParticlePool()};
    };
    const ordinary=newBattle(),boosted=newBattle();
    updatePhysics(ordinary.soa,ordinary.grid,ordinary.pool,DEFAULT_CONFIG,"melee",1/60,500,300,1,false,1,1,1);
    updatePhysics(boosted.soa,boosted.grid,boosted.pool,DEFAULT_CONFIG,"melee",1/60,500,300,1,false,1,1.4,1.8);
    expect(boosted.soa.health[0]).toBeLessThan(ordinary.soa.health[0]);
    expect(ordinary.soa.stateFlags[0]&FLAG_ALIVE).toBeTruthy();
    expect(boosted.soa.stateFlags[1]&FLAG_ALIVE).toBeTruthy();
  });
  it("special attacks only affect the targeted opposing team and never produce NaN knockback",()=>{
    const soa=createBattleSoA();
    initializeUnits(soa,2,500,300,2);
    soa.posX[0]=100;soa.posY[0]=110;
    soa.posX[1]=110;soa.posY[1]=110;
    soa.posX[2]=105;soa.posY[2]=110;
    soa.posX[3]=200;soa.posY[3]=110;
    const before=soa.health[0];
    expect(applyArcadeBlast(soa,105,110,50,30,180,TEAM_WOMEN)).toBeGreaterThanOrEqual(1);
    expect(soa.health[0]).toBe(before);
    expect(soa.health[2]).toBeLessThan(before);
    expect(Number.isFinite(soa.velX[2])).toBe(true);
    expect(soa.teamID[0]).toBe(TEAM_MEN);
  });
});
