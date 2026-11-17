import {describe,it,expect} from "vitest";
import { CROWD_PRESETS } from "./battleBalance";
import { COMBAT_MODES,MAX_MATCH_FIGHTERS,clampMatch,combatMode,heroWeaponConfig } from "./combatModes";

describe("TLC Battlecast 100-fighter arcade modes",()=>{
 it("every publicly selectable preset stays at or under 100 total fighters",()=>{
  expect(CROWD_PRESETS.length).toBeGreaterThanOrEqual(8);
  for(const preset of CROWD_PRESETS){
   expect(preset.men+preset.women).toBeLessThanOrEqual(MAX_MATCH_FIGHTERS);
   expect(preset.men).toBeGreaterThan(0);
   expect(preset.women).toBeGreaterThan(0);
  }
 });
 it("caps arbitrary input without empty teams",()=>{
  for(const [men,women] of [[800,1400],[99,2000],[0,0],[35,65]]){
   const result=clampMatch(men,women);
   expect(result.men+result.women).toBeLessThanOrEqual(100);
   expect(result.men).toBeGreaterThan(0);
   expect(result.women).toBeGreaterThan(0);
  }
 });
 it("exposes functional mode intervals and a Furiosa transformation",()=>{
  expect(COMBAT_MODES.map(m=>m.id)).toContain("furiosa");
  expect(COMBAT_MODES.map(m=>m.id)).toContain("beauty");
  expect(combatMode("furiosa").interval).toBeLessThan(3);
 });
 it("nukes have the largest blast",()=>{
  expect(heroWeaponConfig("nuke").radius).toBeGreaterThan(heroWeaponConfig("water").radius);
  expect(heroWeaponConfig("nuke").damage).toBeGreaterThan(heroWeaponConfig("makeup").damage);
 });
});