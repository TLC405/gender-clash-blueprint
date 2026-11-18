# TLC Battlecast — Premium One-Screen Arena Sandbox

## Design contract
Replace Modes/Stats destinations with three direct groups below the live arena.

- BLUE / MEN: total count, strength, rage, fists/guns/swords/both, formation, Commander deployment.
- COMMAND: play, pause, reset, zoom, chaos, pace, meteor, cinematic FX, surface, Commander D-pad and abilities.
- PINK / WOMEN: count, speed, rage, fists/lipstick guns/makeup bombs/both, formation, Furiosa.
- Narrow Fold closed: center commands span the first full-width row beneath the arena; Men/Women panels sit side-by-side beneath. No Stats tab or required mode navigation.

## Character model
- Up to 100 simultaneously active fighters (UI cap); existing SoA physics engine capacity remains unchanged for compatibility.
- Real Three.js instanced human anatomy: solid torso, short-haired athletic men, blonde-haired women, boots, expressive eyes and equipped weapons. Furiosa women become visibly larger, bald, muscular and gain fictional game damage.
- The Canvas fallback has filled body geometry, shaded clothing, faces, blonde hair and team-specific equipment. The prior ?safe=1 low-resource recovery remains supported.
- TLC Commander is a complete original full-body, world-rendered athlete with articulated limbs, face, hair, boots, arm muscles and held weapon. No photo upload or paper portrait is used. Exact creator face likeness is NOT claimed without an available visual reference.

## Mechanics
- Independent team loadouts each drive real attacks, damage, stagger, knockback and contact FX, with cooldowns. Neither side needs an overall game 'mode'.
- Men strength and women's speed use the fixed-step engine parameters; Furiosa modifies women damage and visual anatomy; manual rage triggers existing speed/damage modifiers, while everyone gains rage after first clash.
- Commander movement: touch-friendly D-pad. Attacks: nuke, water cannon, lipstick shot, shockwave slam and rally. Rally boosts allied men for a limited interval even after automatic clash rage.
- Chaos changes melee tempo as well as periodic weapon timing. Zoom is the actual camera transform; pace and cinematic effects remain distinct.
- Combat field has no floating labels or health bars. Scoreboard and status are outside it. Ten original offline game sound effects are preserved.

## Outside technical references
- Three.js official InstancedMesh: https://threejs.org/docs/pages/InstancedMesh.html — reuse geometry/material and update instanceMatrix and instanceColor after batches.
- MDN Canvas optimization: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas — cached arena backgrounds and separate dynamic fighter layers.
- Craig Reynolds steering: https://www.red3d.com/cwr/steer/gdc99/ — local separation, cohesion and squad seeking.

## Release checks and limitations
- TypeScript, Vitest, Vite production build and verified ten WAV sound files; a browser smoke test launches on Fold closed/open, desktop and recovery Safe Mode, checks direct controls and starts the match.
- Release only after green CI and verified live Render deployment at both published sites.
- Exact face identity and real physical Galaxy Fold 5 FPS cannot be verified with source-only automated tests; this is a stylized procedural game and fictional arcade balance, not a photoreal scan or empirical sex comparison.
