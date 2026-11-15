# TLC Battlecast — Atomic Audio and Product Quality Audit

**Audit date:** 2026-11-15  
**Repository:** TLC405/gender-clash-blueprint  
**Live:** https://tlc-battle-atomic.onrender.com

## Verified findings in source

- Before this change, src/pages/Index.tsx rendered camera banners, spotlights, a pregame card and scrolling commentary directly over the battle canvas. BattleSimulationEnhanced.tsx additionally painted MEN and WOMEN across the field.
- src/lib/battleAudio.ts used a small stock Kenney CC0 OGG effects bank. The existing narrator attempted an ElevenLabs-backed Supabase service before falling back to device text-to-speech, creating inconsistent voice character.
- The Three.js renderer draws real instanced 3D stick figures with seeded variation, but combat motion is still governed by a 2D spatial-hash simulation—not physical 3D ragdolls.
- AtomicSweep.css already implements Fold viewport fitting, which still requires acceptance testing on actual Android browser chrome.

## Implemented in this branch

**Clean battlefield:** Game text has moved into a narrow commentary rail outside the field; scoreboard and dock stay outside the field. All MEN/WOMEN field lettering is removed, while colored end zones remain.

**ElevenLabs preparation:** One original audio flow has been assembled with 14 nodes:
https://elevenlabs.io/app/flows/m5RVMHr3XRsK2xcE8Zud

**Seven planned original SFX:** ui_click, arena_bell, light_hit, heavy_hit, crowd_clash, meteor, victory_sting.

**Seven planned broadcast voice clips:** opening, clash, men_surge, women_surge, overtime, men_win, women_win. Selected existing voice: "Odom – Deep, Confident, Polished."

**Important status:** The actual ElevenLabs generation returned "Free generations are busy right now: this take did not start. Nothing was charged." No generation was retried. No audio clips have been produced in this attempt. The manifest correctly says awaiting_generation and the game must never imply these clips are active until verified files are bundled and the manifest is set to ready. Original Kenney effects and existing narrator backend/browser fallback remain a temporary continuity measure.

**Safe integration architecture:** Typed original cue catalog; validated relative filenames; static audio downloaded once rather than paid TTS requests for each battle; event hooks for starting bell, first clash, heavy/light hits, meteor, final sting and UI clicks. No ElevenLabs API key in the browser. Voice commentary prioritizes the pre-rendered original clips when available, but retains existing fallback while the audio pack is pending.

## Recommended upgrades — prioritized and implementation-specific

### P0: finish custom audio identity without breaking the game
- When ElevenLabs accepts generation, run the prepared flow once; preview all 14 outputs. Check for clipping, unexpected voices, overly loud explosions, variation in timbre and incomplete speech. Adjust or regenerate only the unsatisfactory cues as needed.
- Export licensed MP3/OGG media in game-friendly compressed formats, include reviewed clips as part of the game build, fill out exact filenames in public/audio/elevenlabs/manifest.json, and mark the status ready only when all files are present.
- Verify use rights under the account's commercial-use terms; do not sell or present the clips as a standalone sound-effects library.
- After verifying the complete pack, phase out legacy stock impact files and default browser TTS so the original ElevenLabs sound identity is exclusive.
- Expose separate volume/mute controls for SFX, announcer dialogue, menu/UI, and future ambient music; include narrator mode Off / Minimal / Full Broadcast.
- Add audio ducking whenever the announcer speaks, a ceiling on simultaneous impact sounds, slight spatial panning of combat impacts, and sensible gain normalization.
- Keep all captions visible in the external commentary rail and add an option to review full play-by-play in Stats. Important information must not depend on sound alone.
- Prime Web Audio from the player's Start tap to comply with browser autoplay rules.

### P0: polish match readability and controls
- Keep playfield strictly visual: live figures, arena marks, and direct meteor interaction only. All wording belongs to top scoreboard, commentary rail, dock or modals outside the arena.
- Test every control on Fold closed/open, portrait/landscape and browser/taskbar visible. Provide a focus mode and compact accessible touch targets with responsive padding.
- Provide a lightweight first-play tutorial in an external panel explaining pace, how to trigger one meteor, boost toggles, the numbers gap and stronger male arcade units.
- Give immediate tactile response for Start/Pause, Reset, rage and meteor, backed by both a visual control state and short sound when audio is available.
- Keep scoreboard honest: fighters standing, KOs, battle phase, time and final draw. No invented viewers, odds, leagues or online multiplayer.

### P1: make a thousand-figure fight look like a fight
- Upgrade animations beyond walking/stagger to show distinguishable jab, shove, sidestep and bracing poses. Keep limb joints aligned during every pose.
- Synchronize the recoil pose, registered hit event, particle burst and impact audio with a common event timestamp.
- Organize pre-contact spawn positions into readable opposing formations, then have local squads move toward fronts, break apart and reform.
- Create pressure from crowd density and unit mass without tunneling or instant pileups; benchmark survival duration and scene readability by preset.
- Offer an optional automatically framed cinematic camera that follows heavy clashes while maintaining a no-pan static view for spectators.
- Compare several deterministic seeded simulations per preset; tune win probability using the fictional power-vs-numbers design targets, not as a claim about biological capabilities.

### P1: performance and stability
- Instrument FPS, frame-time p95, long-task hitches, simulation step budget, WebGL context losses, audio polyphony and memory pressure.
- Introduce Auto / Crisp / Battery Saver quality modes. Reduce rig animation update frequency, devicePixelRatio and particles according to observed frame-time, not speculative device names.
- Three.js InstancedMesh reduces draw calls but still requires per-unit limb matrix work: cache styles and joints, avoid new arrays each frame and consider low-detail rigs for small on-screen fighters.
- Restore WebGL after context loss, provide the existing 2D stick fallback, and pause both physics and voices with the Page Visibility API when the app backgrounds.
- Validate the full battle on physical Samsung Fold 5 before claiming stable 60 fps, battery performance or all-screen-fit behavior.

### P1: replay, statistics and retention without gamification
- Record a lightweight match seed plus user actions and physics version so a round can be replayed consistently across supported viewports; current per-step deterministic randomization is not yet a full deterministic match replay.
- Give final stats: initial units, survivors, KOs, meteor eliminations, total duration, and normalized survival percentages.
- Add a "Run It Back — Same Setup" flow, a mirrored matchup comparison, and locally saved match archive without XP, badges or leveling.
- Build actual event-driven commentary using measurable momentum shifts, flank collapses and final survival thresholds, replacing flavor-only announcements that exaggerate what happened.
- Improve 9:16 match cards and optional short replay exports using real match data; never imply the match was multiplayer when it ran locally.

### P2: game discovery, offline and social
- Package as an installable PWA with versioned offline shell and audio caching where supported, without relying on a login.
- Share deterministic preset links to let a friend run the same 500 vs 850 or 800 vs 1400 scenario.
- Consider a crowd-simulation sandbox separate from the primary one-screen match, to change only unit counts, impact strength, mobility and formations without introducing clutter in normal play.
- Optionally expose an advanced diagnostics overlay under Settings instead of putting engineering metrics on the arena.

## External technical references

- ElevenLabs Sound Effects: https://elevenlabs.io/docs/eleven-creative/playground/sound-effects
- ElevenCreative Terms: https://elevenlabs.io/creative-terms
- MDN Audio for Web Games (autoplay): https://developer.mozilla.org/en-US/docs/Games/Techniques/Audio_for_Web_Games
- MDN AudioBufferSourceNode: https://developer.mozilla.org/en-US/docs/Web/API/AudioBufferSourceNode
- Three.js InstancedMesh: https://threejs.org/docs/pages/InstancedMesh.html
- MDN Page Visibility API: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API
- IGDA Game Accessibility SIG: https://igda-gasig.org/get-involved/sig-initiatives/resources-for-game-developers/sig-guidelines/
- Separate audio controls: https://gameaccessibilityguidelines.com/provide-separate-volume-controls-or-mutes-for-effects-speech-and-background-music/
- Google Interaction to Next Paint: https://web.dev/articles/optimize-inp/

**Validation rule:** GitHub CI and verified Render deployments establish build/deployment status; they do not prove subjective sound quality, frame rate or physical Fold behavior. ElevenLabs generation remains pending after the provider returned a busy error.
