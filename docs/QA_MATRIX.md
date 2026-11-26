# TLC Gender Clash QA matrix

## Critical functional
- Start creates visible movement immediately.
- Pause halts battle simulation.
- Reset restores counts and positions.
- Combined normal fighter count never exceeds 100.
- Every formation remains inside arena bounds.
- Men can hunt ranged threats.
- Women can respond to Robot.
- Men can respond to Unicorn.
- Robot/Unicorn collide and damage each other.
- UFO abductees are removed from live counts.
- Male/Female Giant can be damaged and eliminated.
- Furiosa changes silhouette and gameplay values.
- Commander cooldowns are enforced.
- Weapon-off means no weapon attack.
- Match always terminates or exposes a detected-stalemate recovery.

## Visual
- readable silhouette at normal broadcast camera
- blonde hair visible on normal women
- Furiosa visually distinct
- Commander visually distinct but in same art language
- no panels cover arena combat
- score/timer remain readable at all supported aspect ratios
- VFX do not obscure targeting for longer than their telegraph design permits

## Audio
- offline match has full music/SFX/voice coverage
- concurrency limits prevent audio wall
- announcer never overlaps itself
- Commander has priority over noncritical unit barks
- pause/resume and Android audio interruptions recover correctly

## Performance
Desktop: target 60 FPS.
Modern Android/Fold: target stable 45+ FPS in premium 100-fighter battle unless device tier requires a documented 30 FPS fallback.
Test sustained match, not only first 30 seconds.

## Release
- source validation green
- UE compile green
- automation green
- packaging green
- device smoke tests green
- no secrets
- signed binaries
