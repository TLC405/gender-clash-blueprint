# Gorilla crowd-battle reference → TLC Atomic Fight Physics

Date researched: 2026-11-14. Source selection and engineering notes are maintained alongside the game.

## What the referenced viral video actually shows

The widely-circulated matchup is **1,000,000 men vs 10,000 gorillas**, **not 100,000 gorillas**.

Source links:
- Video copy on YouTube, titled *10,000 Gorillas Vs 1,000,000 men*: https://www.youtube.com/watch?v=fRRMAfLxMxI
- Viral creator/account coverage, Epic Warz: https://urlebird.com/user/epicwarzyt/
- 2025 Reddit discussion linking the 10,000 vs 1,000,000 video and two 100-men-versus-1-gorilla variants: https://www.reddit.com/r/PowerfulJRE/comments/1kc4bb7
- Independent contemporary podcast transcript describing large formations running together and bodies flying on collision: https://podscripts.co/podcasts/the-daily-zeitgeist/1-gorilla-vs-100-trends-430-gorilla-vs-man-maga-malfoy-character-ai-ben-affleck-criterion-closet-rothko-trump-pope
- Steam developer description of *Ultimate Epic Battle Simulator 2* crowd rendering and AI technology: https://store.steampowered.com/app/1468720/Ultimate_Epic_Battle_Simulator_2/
- UEBS2 news describing GPU crowd technology and the planned future GPU ragdoll physics approach (not a claim about the viral video's specific engine): https://steamcommunity.com/app/1468720

**Evidence limitations:** Public indexed video descriptions and contemporary coverage were reviewed. There is no verified frame-by-frame motion capture or authoritative engine/source-code disclosure for the viral video in these sources. The specific video engine, collision constants, numbers of simultaneous simulated ragdolls and exact AI behaviors are **unknown**. It would be inaccurate to claim this app reproduces a known proprietary model.

## Design translation into a portable browser game

The **TLC Battlecast** game currently uses a mobile-friendly 2D Structure-of-Arrays crowd simulation, not 3D skinned meshes or rigid-body ragdolls. The target is the visual *feel* of formations charging, colliding, shoving, recoiling and surviving multiple contacts—not an exact UEBS2 remake.

V5 adds:
1. **Power versus numbers** for every playable preset, specified centrally in \`src/lib/battleBalance.ts\`:
   - Classic: 500 men versus 850 women;
   - Total Chaos: 800 men versus 1,400 women;
   - Upset: 350 men versus 950 women;
   - Last Stand: 100 men versus 165 women.
2. **Fictional asymmetric fighter attributes** (no biological claims): men have 340 HP, 1.35× base strike damage, 1.4 mass and 1.25× impact impulse; women have 245 HP, 1× base strike damage, 1 mass and a slightly higher move-speed multiplier. These are GAME attributes chosen for the requested match dynamic, NOT scientifically validated measurements of real-world sex differences.
3. **Long-form survival:** base damage reduced from 18 to 10 per simulated second; incoming damage saturation reduced from 65 to 28; maximum fighter HP increased from 100 to 245/340. Battles should now contain longer exchanges instead of immediate elimination. Outcome still depends on relative local crowd density, meteor actions, rage and user speed controls.
4. **Rhythmic contact:** a per-fighter impact cooldown creates discrete push pulses independent of continuous health attrition. Mass-aware impulses throw lighter agents farther. All attacks still resolve in the same two-phase fixed-step simulation to avoid team update-order bias.
5. **Wave pressure:** local density slows and steers the crowd instead of letting thousands accelerate at full speed through each other. Original spatial-hash range limiting remains in effect.
6. **Readable movement:** Pixi sprites briefly tilt/tint and compress on stagger, with a slightly larger male character silhouette. A bounded set of temporary fallen-fighter decals drifts and fades on the FX canvas—**not true ragdoll animation**.
7. **One-screen UI preserved:** modes and the power-versus-numbers explanation remain accessible inside the compact match controls.

## Scientific/engineering background still in use

- Fiedler, *Fix Your Timestep!* — https://www.gafferongames.com/post/fix_your_timestep/
- Reynolds, *Steering Behaviors For Autonomous Characters* — https://www.red3d.com/cwr/steer/gdc99/
- van den Berg et al., *Optimal Reciprocal Collision Avoidance* — https://gamma-web.iacs.umd.edu/ORCA/

TLC's algorithm is **Reynolds-inspired only**, not a full ORCA solver, not rigid-body physics and not a scientifically calibrated model of human combat. Tests validate discrete invariants and a modest endurance interval. They do **not** establish a particular frame rate on a Samsung Fold device or predict real-world outcomes.

## Ongoing source policy for TLC

Before making future physics or graphics changes, inspect the actual current GitHub source, consult outside primary references and relevant demonstrations, log source links plus limitations, write regression tests and ensure CI passes before merging to the live Render deployment. Do not represent imagined mechanics as details extracted from the original video.
