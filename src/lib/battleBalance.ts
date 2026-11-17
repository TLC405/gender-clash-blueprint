/**
 * TLC Battle — fictional asymmetric arena profiles.
 *
 * MEN: fewer units, higher durability / per-fighter impact.
 * WOMEN: more units in every preset, lower individual impact, slightly quicker movement.
 *
 * These are deliberate game-design attributes, NOT estimates or claims
 * about real people and not data inferred from gorilla simulation videos.
 */
export const TEAM_BALANCE = {
  men: {
    maxHealth: 340,
    damageMultiplier: 1.35,
    impulseMultiplier: 1.25,
    mass: 1.4,
    moveMultiplier: 0.95,
  },
  women: {
    maxHealth: 245,
    damageMultiplier: 1,
    impulseMultiplier: 1,
    mass: 1,
    moveMultiplier: 1.05,
  },
} as const;

export type BattleTeam = 0 | 1;

export function teamBalance(team: number) {
  return team === 0 ? TEAM_BALANCE.men : TEAM_BALANCE.women;
}

export const CROWD_PRESETS = [
  { id:"classic", name:"RAGE CLASH", icon:"🥊", men:40, women:60, speed:0.5, tagline:"40 vs 60 — auto-rage when the teams collide" },
  { id:"chaos", name:"TOTAL MAYHEM", icon:"💥", men:35, women:65, speed:0.5, tagline:"All weapons, 100 fighters maximum" },
  { id:"upset", name:"THE UPSET", icon:"👀", men:25, women:75, speed:0.5, tagline:"25 powerful men vs 75 women" },
  { id:"last-stand", name:"LAST STAND", icon:"🔥", men:15, women:35, speed:0.5, tagline:"50 fighters, heavy impacts and endurance" },
  { id:"furiosa", name:"FURIOSA", icon:"💪", men:40, women:60, speed:0.5, tagline:"Bald powerhouse women vs men" },
  { id:"swords", name:"BLADE STORM", icon:"⚔️", men:40, women:60, speed:0.5, tagline:"Sword melee battle" },
  { id:"blasters", name:"BLASTER WAR", icon:"🔫", men:40, women:60, speed:0.5, tagline:"Energy blasters versus crowd" },
  { id:"beauty", name:"GLAM WAR", icon:"💄", men:40, women:60, speed:0.5, tagline:"Makeup bombs and lipstick launchers" },
  { id:"water", name:"WATER FIGHT", icon:"💦", men:40, women:60, speed:0.5, tagline:"Water blasters everywhere" },
] as const;
