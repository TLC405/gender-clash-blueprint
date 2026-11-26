# ST_Fighter specification

## Context
Inputs:
- team
- formation
- morale
- rage
- target threat
- ranged threat
- hero state
- boss state
- formation integrity
- local ally density
- local enemy density

## Root states
1. Spawn/FormUp
2. Combat
3. Recovery
4. Victory/Defeat

## Combat selectors
- HoldLine
- Advance
- AttackMelee
- AttackRanged
- FlankLeft
- FlankRight
- ProtectRanged
- AttackRangedThreat
- AttackHero
- AttackSpecial
- Regroup
- Retreat
- Rage
- Panic

## Utility guidance
AttackRangedThreat rises when ranged casualties spike.
AttackSpecial rises when Robot/Unicorn/Giant threatens local squad.
Regroup rises when FormationIntegrity or Morale falls.
Flank rises against strong front defense and when a navigable side route exists.
ProtectRanged rises for nearby ranged allies being rushed.

## Anti-thrashing
- minimum behavior commitment: 0.65–1.5 seconds by state
- require new score to beat current score by a hysteresis margin
- do not recalculate expensive tactical choices every frame
- stagger decision ticks by agent ID

## Formation specifics
Circle: split into patches; release patches sequentially instead of whole-circle collapse.
Ranks: back rows fill front vacancies.
Shield Wall: strong frontal damage multiplier, weak flank multiplier.
Wedge: front penetrates, rear reinforces.
Spread: area-effect resistance, weaker melee density.

## Boss reactions
Robot: women capable of ranged/anti-armor behavior may reprioritize it.
Unicorn: nearby men surround; ranged men maintain standoff.
Archers/ranged: designated flankers can hunt them.

Cloud AI is never part of this loop.
