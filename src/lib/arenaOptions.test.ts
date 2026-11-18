import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  FORMATIONS, ARENA_SURFACES, isArenaSurface, isFormationPattern,
  getTacticSpeed, getTacticLaneBias,
} from "./arenaOptions";
import { createBattleSoA, initializeUnits, TEAM_MEN, TEAM_WOMEN } from "./battleSoA";
import { formationSlot, getSquadCount } from "./combatChoreography";
import { CROWD_PRESETS } from "./battleBalance";

describe("Eight playable TLC tactical formations", () => {
  it("has eight unique patterns with real, nonempty tactical diagrams", () => {
    expect(FORMATIONS).toHaveLength(8);
    expect(new Set(FORMATIONS.map(f=>f.id)).size).toBe(8);
    for(const f of FORMATIONS){
      expect(f.preview.length).toBeGreaterThanOrEqual(7);
      expect(isFormationPattern(f.id)).toBe(true);
      expect(f.name.length).toBeGreaterThan(4);
      expect(f.tagline.length).toBeGreaterThan(15);
    }
    expect(isFormationPattern("../evil")).toBe(false);
    expect(isFormationPattern(undefined)).toBe(false);
  });

  it("changes actual spawn geometry, not just the menu label", () => {
    const variants=FORMATIONS.map(f=>{
      const soa=createBattleSoA();
      initializeUnits(soa,500,800,500,850,f.id);
      expect(soa.formationPattern).toBe(f.id);
      return [soa.posX[0],soa.posX[50],soa.posY[100],soa.posX[501],soa.posY[1000]].map(x=>x.toFixed(2)).join("|");
    });
    expect(new Set(variants).size).toBe(FORMATIONS.length);
  });

  it("supports independent opposing strategies in a single match",()=>{
    const soa=createBattleSoA();
    initializeUnits(soa,500,800,500,850,"thunder-wedge","shield-wall");
    expect(soa.formationPattern).toBe("thunder-wedge");
    expect(soa.womenFormationPattern).toBe("shield-wall");
    const mirrored=createBattleSoA();
    initializeUnits(mirrored,500,800,500,850,"battle-lines","battle-lines");
    // Compare the whole team: a wedge can share positions with baseline in
    // its outermost lanes, but its central apex must be different.
    expect(Array.from(soa.posX.slice(0,500)).some((x,i)=>Math.abs(x-mirrored.posX[i])>1)).toBe(true);
    expect(Array.from(soa.posX.slice(500,1350)).some((x,i)=>Math.abs(x-mirrored.posX[500+i])>1)).toBe(true);
    const index=readFileSync(new URL("../pages/PremiumSandbox.tsx",import.meta.url),"utf8");
    expect(index).toContain('aria-label="Men formation"');
    expect(index).toContain('aria-label="Women formation"');
  });

  it("keeps both armies in bounds, out of each other's spawn zone, for all match sizes", () => {
    for(const p of CROWD_PRESETS){
      for(const f of FORMATIONS){
        const soa=createBattleSoA();
        initializeUnits(soa,p.men,800,500,p.women,f.id);
        let leftMax=0,rightMin=800;
        for(let i=0;i<soa.unitCount;i++){
          const x=soa.posX[i],y=soa.posY[i];
          expect(x).toBeGreaterThanOrEqual(24);
          expect(x).toBeLessThanOrEqual(776);
          expect(y).toBeGreaterThanOrEqual(24);
          expect(y).toBeLessThanOrEqual(476);
          if(soa.teamID[i]===TEAM_MEN)leftMax=Math.max(leftMax,x);
          else if(soa.teamID[i]===TEAM_WOMEN)rightMin=Math.min(rightMin,x);
        }
        expect(rightMin-leftMax).toBeGreaterThan(45);
      }
    }
  });

  it("fits narrow phone field without spawning teams on top of each other", () => {
    for(const f of FORMATIONS){
      const slots=[formationSlot(40,500,850,0,340,310,f.id),formationSlot(40,850,850,1,340,310,f.id)];
      expect(slots[0].x).toBeLessThan(170);
      expect(slots[1].x).toBeGreaterThan(170);
    }
  });

  it("gives tactical modes different marching speeds or lane steering", () => {
    expect(getTacticSpeed("blitz",0,6)).toBeGreaterThan(getTacticSpeed("shield-wall",0,6));
    expect(getTacticSpeed("pincer",0,6)).toBeGreaterThan(getTacticSpeed("pincer",2,6));
    expect(getTacticSpeed("pincer",5,6)).toBeGreaterThan(getTacticSpeed("pincer",2,6));
    expect(getTacticLaneBias("thunder-wedge",0,6,500,0,0)).toBeGreaterThan(0);
    expect(getTacticLaneBias("storm-spiral",2,6,500,0,5)).not.toBe(
      getTacticLaneBias("storm-spiral",2,6,500,0,70)
    );
    expect(getSquadCount(850)).toBeGreaterThan(2);
  });
});

describe("High-definition TLC championship fields",()=>{
  it("provides four distinct surfaces and guards unknown surface keys",()=>{
    expect(ARENA_SURFACES).toHaveLength(4);
    expect(new Set(ARENA_SURFACES.map(x=>x.id)).size).toBe(4);
    expect(isArenaSurface("championship")).toBe(true);
    expect(isArenaSurface("bad")).toBe(false);
  });

  it("uses a scalable original logo with TLC lettering, not a copied OKC trademark",()=>{
    const svg=readFileSync(new URL("../../public/branding/tlc-championship-crest.svg",import.meta.url),"utf8");
    expect(svg).toContain('<svg');
    expect(svg).toContain("viewBox=");
    expect(svg).toContain('width="2400"');
    expect(svg).toMatch(/>TLC<\/text>/);
    // Source comments may mention OKC architecture; only rendered text is restricted.
    expect(svg).not.toMatch(/<text[^>]*>(?:THUNDER|OKC|NBA)<\/text>/);
  });

  it("wires formation selection and four field styles to the real battle component",()=>{
    const index=readFileSync(new URL("../pages/PremiumSandbox.tsx",import.meta.url),"utf8");
    const simulation=readFileSync(new URL("../components/BattleSimulationEnhanced.tsx",import.meta.url),"utf8");
    expect(index).toContain("formationPattern={teams.men.formation} womenFormationPattern={teams.women.formation}");
    expect(index).toContain("patchMen({formation:");
    expect(index).toContain("setArena(e.target.value as ArenaSurface)");
    expect(simulation).toContain("formationPattern");
    expect(simulation).toContain("renderPremiumArena(ctx, width, height, arenaSurface, centerCrestRef.current)");
    expect(simulation).toContain("arenaCacheRef.current = null;");
  });
});
