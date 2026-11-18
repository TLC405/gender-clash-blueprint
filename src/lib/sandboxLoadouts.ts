/** Direct, independent team controls; no global "mode" selection. */
import type { FormationPattern } from "./arenaOptions";
export const TOTAL_CAP = 100;
export type MenWeapon = "fists" | "guns" | "swords" | "guns+swords";
export type WomenWeapon = "fists" | "lipstick" | "makeup" | "lipstick+makeup";
export interface MenLoadout { count:number; strength:number; rage:boolean; weapon:MenWeapon; formation:FormationPattern; }
export interface WomenLoadout { count:number; speed:number; rage:boolean; weapon:WomenWeapon; furiosa:boolean; formation:FormationPattern; }
export interface SandboxTeams { men:MenLoadout; women:WomenLoadout; }
export const DEFAULT_TEAMS:SandboxTeams={
  men:{count:40,strength:1.0,rage:false,weapon:"fists",formation:"battle-lines"},
  women:{count:60,speed:1.0,rage:false,weapon:"fists",furiosa:false,formation:"battle-lines"},
};
export const MEN_WEAPONS:readonly {id:MenWeapon;label:string;icon:string}[]=[
  {id:"fists",label:"Fists",icon:"✊"},{id:"guns",label:"Guns",icon:"◉"},
  {id:"swords",label:"Swords",icon:"⚔"},{id:"guns+swords",label:"Both",icon:"✦"},
];
export const WOMEN_WEAPONS:readonly {id:WomenWeapon;label:string;icon:string}[]=[
  {id:"fists",label:"Fists",icon:"✊"},{id:"lipstick",label:"Lipstick",icon:"💄"},
  {id:"makeup",label:"Bombs",icon:"✹"},{id:"lipstick+makeup",label:"Both",icon:"✦"},
];
export function setTeamCount(current:SandboxTeams,side:"men"|"women",value:number):SandboxTeams{
  const wanted=Math.max(1,Math.min(99,Math.floor(Number.isFinite(value)?value:1)));
  if(side==="men") {
    const men=Math.min(wanted,TOTAL_CAP-1);
    return {men:{...current.men,count:men},women:{...current.women,count:Math.min(current.women.count,TOTAL_CAP-men)}};
  }
  const women=Math.min(wanted,TOTAL_CAP-1);
  return {men:{...current.men,count:Math.min(current.men.count,TOTAL_CAP-women)},women:{...current.women,count:women}};
}
export function teamAttack(teams:SandboxTeams,team:0|1,sequence:number,chaos:number){
  const man=team===0;
  const weapon=man?teams.men.weapon:teams.women.weapon;
  const eligible=man?weapon!=="fists":(weapon!=="fists"||teams.women.furiosa);
  if(!eligible)return null;
  const sword=weapon==="swords"||(weapon==="guns+swords"&&sequence%2===0);
  const gun=weapon==="guns"||(weapon==="guns+swords"&&sequence%2===1);
  const lipstick=weapon==="lipstick"||(weapon==="lipstick+makeup"&&sequence%2===0);
  const makeup=weapon==="makeup"||(weapon==="lipstick+makeup"&&sequence%2===1);
  const kind=sword?"sword":gun?"gun":lipstick?"lipstick":makeup?"makeup":"furiosa";
  const stats={
    sword:{radius:31,damage:37,push:135,delay:1.25},
    gun:{radius:26,damage:32,push:185,delay:1.15},
    lipstick:{radius:34,damage:27,push:170,delay:1.1},
    makeup:{radius:68,damage:41,push:260,delay:2.1},
    furiosa:{radius:34,damage:42,push:195,delay:1.4},
  }[kind];
  const boost=Math.max(.5,Math.min(2,chaos));
  return {kind,...stats,delay:stats.delay/boost,damage:stats.damage*(man?teams.men.strength:teams.women.furiosa?1.4:1)};
}
