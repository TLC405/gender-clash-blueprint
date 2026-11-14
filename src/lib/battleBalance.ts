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
  { id: "classic", name: "THE CLASSIC", icon: "⚔️", men: 500, women: 850, speed: 0.5, tagline: "500 power fighters vs 850 swarm fighters" },
  { id: "chaos", name: "TOTAL CHAOS", icon: "💥", men: 800, women: 1400, speed: 0.5, tagline: "2,200 fighters, one enormous moving frontline" },
  { id: "upset", name: "THE UPSET", icon: "👀", men: 350, women: 950, speed: 0.5, tagline: "A brutal numbers gap against heavier hitters" },
  { id: "last-stand", name: "LAST STAND", icon: "🔥", men: 100, women: 165, speed: 0.5, tagline: "Small teams, long duels and decisive impacts" },
] as const;
