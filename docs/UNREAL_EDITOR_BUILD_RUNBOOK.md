# Unreal Editor build runbook

This runbook is the exact handoff from source-ready to binary-ready.

## 1. Production environment
- Install Unreal Engine 5.8.
- Install Visual Studio 2022/Rider toolchain for UE.
- Install Android Studio/SDK/NDK versions supported by the UE 5.8 Android setup page.
- Never put Android keystore passwords, provider keys or service-role keys in Git.

## 2. Generate and compile
- Generate project files from unreal/TLCGenderClash.uproject.
- Build TLCGenderClashEditor Development.
- Treat any UHT/UAT/compiler warning tied to the TLC module as a release blocker until reviewed.
- Open the Editor only after the C++ module compiles.

## 3. Arena map
Create /Game/Maps/L_BattleArena.
Required zones:
- left Men deployment
- center combat/readability zone
- right Women deployment
- camera-safe margins
- spawn sockets for Commander, Robot, Unicorn, UFO and Giants
- no invisible geometry that can trap NavMesh agents

## 4. One-screen UI
Create WBP_ArcadeHUD with:
- top compact scoreboard + timer only
- Men panel left
- battle controls center
- Women panel right
- no stats page dependency
- no modal required for core weapons

Men panel:
count, strength, rage, guns, swords, formation, TLC Commander.

Women panel:
count, speed, rage, lipstick gun, makeup bomb, Furiosa, formation, tactical special.

Center:
start, pause, reset, zoom, chaos, special event, slow motion, cinematic FX.

## 5. Character assets
Premium default battle supports a maximum of 100 normal fighters.
- Male: taller/broader/heavier.
- Female: blonde default hair and readable agile silhouette.
- Furiosa: bald, muscular, larger, heavier hit reaction.
- Commander: same world/art style, clearly heroic.
Use animation blueprints with locomotion, anticipation, attack, stagger, knockback, recovery, defeat.

## 6. StateTree
Author ST_Fighter using docs/STATE_TREE_SPEC.md.
StateTree controls local behavior; the high-level Battle Intelligence Director provides priorities, not per-frame cloud AI.

## 7. Commander
Create BP_TLCCommander from ATLCCommanderCharacter.
Bind Enhanced Input for keyboard/controller/touch.
Implement Nuke, Water Cannon, Lipstick Shot, Shockwave Slam and Rally Buff using GAS/Blueprint execution and Niagara/Chaos feedback.

## 8. Special units
Robot and Unicorn:
- health
- collision
- stagger
- attack cooldowns
- mutual targeting
- normal-unit interference

UFO:
- target a small random living group
- beam telegraph
- lift with controlled physics/animation
- remove abducted units from battle counts

Giants:
- male standard giant silhouette
- female giant with visible hair/secondary motion
- targetable, killable, high-health, knockback attacks

## 9. Audio
Follow docs/AUDIO_IMPORT_RUNBOOK.md.
MetaSounds should consume deterministic parameters: BattleIntensity, MenAdvantage, WomenAdvantage, BossActive, FinalTen, ChaosLevel and CinematicFX.

## 10. QA
Run Automation: TLC.GenderClash.*
Test every formation at 0/1/50/100 relevant counts.
Test count rebalancing, pause/reset, boss deaths, special events, weapon toggles and match completion.
Profile 100-fighter battle before Shipping.

## 11. Android/Fold
Landscape only for first release.
Verify:
- closed Fold landscape
- open Fold landscape
- touch targets
- aspect-safe arena
- no panel clipping
- thermal stability
- audio interruptions
- app pause/resume

## 12. Shipping
Development builds first.
Then:
- package Windows Shipping
- package Android ARM64 Shipping
- sign outside source control
- scan packages for secrets
- test offline
- test cold start
- test fresh install
- test upgrade install
