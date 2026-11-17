/** TLC Battlecast arcade combat — fictional game attributes. */
export type CombatMode = "brawl" | "swords" | "blasters" | "beauty" | "furiosa" | "water" | "mayhem";
export type HeroWeapon = "nuke" | "water" | "lipstick" | "makeup";
export const MAX_MATCH_FIGHTERS = 100;
export const COMBAT_MODES: readonly {id:CombatMode; name:string; icon:string; detail:string; interval:number; radius:number; push:number}[] = [
 {id:"brawl",name:"RAGE CLASH",icon:"🥊",detail:"Everyone powers up on first impact; fists and grapples",interval:999,radius:0,push:0},
 {id:"swords",name:"BLADE STORM",icon:"⚔️",detail:"Close-range sword clashes and sweeping strikes",interval:1.8,radius:28,push:90},
 {id:"blasters",name:"BLASTER WAR",icon:"🔫",detail:"Cartoon energy blasters for the blue squad",interval:1.45,radius:25,push:180},
 {id:"beauty",name:"GLAM WAR",icon:"💄",detail:"Lipstick blasters and makeup bombs for the pink squad",interval:1.6,radius:34,push:230},
 {id:"furiosa",name:"FURIOSA",icon:"💪",detail:"Bald, muscular pink warriors grow larger and hit harder",interval:1.5,radius:31,push:260},
 {id:"water",name:"WATER FIGHT",icon:"💦",detail:"Both sides launch colorful water blasts",interval:1.25,radius:40,push:190},
 {id:"mayhem",name:"TOTAL MAYHEM",icon:"☄️",detail:"Swords, lipstick, water and blasts in one arena",interval:1.05,radius:38,push:240},
] as const;
export function combatMode(id:string): (typeof COMBAT_MODES)[number] {return COMBAT_MODES.find(m=>m.id===id)??COMBAT_MODES[0];}
export function clampMatch(men:number,women:number):{men:number;women:number}{
  const m=Math.max(1,Math.min(99,Math.floor(Number.isFinite(men)?men:40)));
  const w=Math.max(1,Math.min(100-m,Math.floor(Number.isFinite(women)?women:60)));
  return {men:m,women:w};
}
export function heroWeaponConfig(weapon:HeroWeapon) {
 switch(weapon){
 case "nuke":return {radius:145,strength:1050,damage:210};
 case "water":return {radius:48,strength:310,damage:10};
 case "lipstick":return {radius:60,strength:410,damage:48};
 case "makeup":return {radius:87,strength:520,damage:75};
 }
}
