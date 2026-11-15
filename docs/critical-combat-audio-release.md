# TLC Battlecast — Critical Upgrade Release: Animated Combat & Battalion Formation

**Source of truth:** \`TLC405/gender-clash-blueprint\`  
**Scope requested:** complete the critical fixes from the 2026-11-15 review: original ElevenLabs audio, readable 3D fighting, smarter mass-army formations, and clear one-screen Fold controls.

## Delivered in code

### 1. A fighter visibly attacks, braces, and recovers

The live physics now records \`attackTimer\`, \`attackKind\`, \`guardTimer\` and \`stagger\` in preallocated per-unit Structure-of-Arrays buffers.

- On a true collision/impulse, the source physics sets a short authored **jab** or **two-arm shove** and a 0.58–0.70s impact cooldown.
- A reusable sine-based \`attackEnvelope\` drives reach, torso lean and arm positions while the actual contact system applies knockback and damage. No random attacks are invented by the renderer.
- A distinct **guard/brace** period fills the gap after an attack until the next contact. Existing recoil and slight collapse remain.
- The Three.js main renderer uses articulated 3D cylinders for arms and legs; the Canvas fallback gets matching arm poses. Both still have **no visible health bars**.
- KOs remain simultaneous per physics step and the fictional power-vs-numbers difference remains intact.

**Technical files:** \`src/lib/combatChoreography.ts\`, \`src/lib/battleSoA.ts\`, \`src/lib/battlePhysicsV4.ts\`, \`src/lib/stickFigure3DRenderer.ts\`, \`src/lib/spriteRenderer.ts\`.

### 2. Both armies visibly form battalions and advance on a front line

The old spawn used one dense rectangular grid on each side. Long-distance pursuit previously aimed at global team center or whichever opponent happened to be in search range, resulting in detached clusters.

- Define **one shared number of tactical lanes** (1–8 depending on fight size) for both teams, despite unequal army counts.
- Arrange each army in distinct depth rows within each vertical lane, spreading units across the arena rather than cramming them at the center.
- Keep lanes and small deterministic soldier variation at the opening bell, with restrained sideways charge drift.
- At range, pursue the opponent's **corresponding squad lane centroid**; at contact, break formation and choose individual targets.
- Lane centroids are computed with six fixed-size typed arrays and an O(N) pass; no unconstrained O(N²) crowd search is introduced.
- Preserve local Reynolds-inspired cohesion, alignment, separation, two-phase attack fairness, and bounded spatial enemy search.

**Limits:** This is a 2D crowd-steering system with a true 3D visual layer. It is not UEBS2, full 3D ragdoll physics, or an ORCA solver. Frame rate on a Galaxy Fold 5 must be measured separately.

### 3. Audio event synchronization and independently controlled mix

- Real impact pulses now emit \`PhysicsResult.impacts\`; the sound director can play a **rate-limited contact sound** every 185ms. KO audio retains priority.
- UI now has independent **Impact / Announcer / Button** level sliders; values are clamped and saved on the device.
- Announcer playback automatically ducks battle impacts while speech is active.
- Start bell, first clash, meteor, victory, and interface action hooks remain supported by the existing audio cue registry.

**Important external blocker:** The original ElevenLabs \`TLC BATTLECAST — ATOMIC AUDIO PACK\` flow exists with seven custom sound effects and seven broadcast voice lines: https://elevenlabs.io/app/flows/m5RVMHr3XRsK2xcE8Zud. The provider again returned **Free generations are busy right now: the take did not start; nothing was charged.** No actual ElevenLabs clips were generated. This is a provider limitation, not a completed custom audio launch. The game keeps temporary CC0 impact sounds and older narrator fallback rather than lying about custom sounds being active. \`public/audio/elevenlabs/manifest.json\` is explicitly \`awaiting_generation\` and requires review and a full 14-file local bundle before activating the ElevenLabs-original bank.

**Security/cost model:** Use generated-once approved static clips; no ElevenLabs API keys or per-fighter generation requests in the browser.

### 4. Arena and Fold layout preserved

- The combat field remains free of on-field text and health bars.
- A compact status rail occupies its own space below the battlefield.
- Scoreboard and controls remain outside the field.
- Prior dynamic visual viewport measurements protect the bottom dock when Android browser/taskbar chrome is visible.

## External primary engineering sources used

- [Craig Reynolds, Steering Behaviors for Autonomous Characters](https://www.red3d.com/cwr/steer/gdc99/): local separation, cohesion, alignment and seeking in game crowds. TLC adds authored lane grouping; no claim this paper designed our specific formations.
- [Craig Reynolds, Boids](https://www.red3d.com/cwr/boids/): locally coordinated behavior for dynamic groups.
- [Three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html): efficient sharing of geometry/material across thousands of independently transformed body segments, and mandatory per-instance matrix updates.
- [MDN Web Audio GainNode](https://developer.mozilla.org/en-US/docs/Web/API/GainNode): individually controllable gain and smooth volume changes.
- [MDN Web Audio API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API): audio mixing, dynamic compression, and sound effects in browsers.
- [ElevenLabs Sound Effects](https://elevenlabs.io/docs/eleven-creative/playground/sound-effects) and [ElevenCreative commercial terms](https://elevenlabs.io/creative-terms): generating original licensed sounds and restricting distribution to game use.

## Regression and acceptance

- Existing physics, team-balance, viewport, 3D style and audio-pack regression tests must remain green.
- Added automated tests for lane counts, stable spawn, symmetric advancing teams, breaking formation when engaged, authoritative animation triggers, 2D/3D animation parity and separate audio gains.
- GitHub TypeScript checks, Vitest regression suite and Vite production build are release gates. A passing CI build is NOT a substitute for observing fight quality on the actual Fold.
- **Device test after deployment:** Fold open/closed, landscape/portrait, Start/Pause/Reset/Stats/Settings fully visible; both armies advance in coherent lines; visible two-arm shove and one-hand jab, discrete guard and recoil; SFX not a cacophony; clean scoreboard and text-free arena.
- Final ElevenLabs completion remains blocked until provider generation successfully runs and media files are bundled/reviewed.
