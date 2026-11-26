# TLC Gender Clash — Unreal A-to-Z production blueprint

## Product
Premium one-screen arcade battle sandbox. Men controls left, large battlefield center, Women controls right, compact scoreboard above. No stats-page dependency. No mode-first UX.

## Runtime systems
- BattleDirector: authoritative match lifecycle and counts.
- BattleIntelligenceDirector: high-level tactical priorities only; never chooses winners.
- FormationLibrary: bounded slot calculation and formation strengths/weaknesses.
- StateTree assets: Form Up, Advance, Hold, Attack, Block, Flank, Protect Ranged, Attack Ranged, Attack Hero, Attack Special, Retreat, Regroup, Rage, Panic, Victory.
- TLC Commander: Enhanced Input + GAS-ready hero with Nuke, Water Cannon, Lipstick Shot, Shockwave Slam and Rally Buff.
- SpecialEventDirector: context-weighted UFO, giants, weather/physics chaos, boss malfunctions and playful events.
- AudioDirector: MetaSound parameters for intensity, advantage, bosses and Final Ten.
- AIIntegrationGateway: secured backend-only optional commentary. Offline gameplay remains complete.

## Character quality
Default battle is capped at 100 premium visible fighters.
Men: taller, broader, heavier shoulders.
Women: blonde hair by default, agile silhouette.
Furiosa: bald, muscular, larger, heavier reactions.
TLC Commander: premium hero version of male art language, never a pasted photo.

## Formations
Ranks replace front losses from rear rows. Shield Wall has strongest frontal defense and flank weakness. Wedge penetrates center. Circle attacks in staggered patches. Spread resists area attacks. Every slot remains in bounds.

## Weapons
Direct toggles, not mode gates.
Men: fists, guns, swords.
Women: fists, lipstick gun, makeup bomb.
Ranged actors seek firing positions; melee actors close distance.

## Bosses
Robot and battle unicorn are full targetable mini-bosses with health, collision, stagger, attacks and cooldowns. They fight each other when both are active. Normal fighters may interfere.

## Special events
UFO removes abducted fighters from live counts. Giants are targetable and killable; female giant has hair, male giant uses the regular male silhouette. Events use context and cooldowns rather than pure random spam.

## Smart AI workflow
Production remains UE 5.8. A separate UE 5.9 Preview workspace may connect external agents through Unreal MCP and use Canvas/scripted StateTree tooling. Agents inspect first, propose patches, generate tests and validate assets; they never auto-ship, store secrets, delete without approval or silently rebalance production.

## Audio
Shipping build works offline. Cache lead announcer, analyst, Commander barks, unit barks, music and SFX as local WAV/MetaSound assets. Optional cloud generation is production-time or rare highlight commentary only.

Selected voice IDs are recorded in unreal/Data/AudioVoiceManifest.json.

Music states: PreBattle, OpeningClash, ActiveBattle, HeroMoment, BossEvent, UFOEvent, GiantEvent, FinalTen, LastFighter, Victory, Defeat.

## Performance
60 FPS capable desktop target. Stable modern Android/Fold target. Pool projectiles/VFX, use animation LOD, spatial queries, fixed AI budgets, Niagara scalability and grouped audio. Future large battles use MassEntity/representation LOD rather than thousands of full actors.

## Presets
Narrow Pass: ancient-inspired, no modern guns, bronze/crimson, choke point and shield wall.
North vs South: Civil War-inspired, blue vs gray/butternut, muskets, volleys, smoke, fences and period terrain.
These are optional presets, not the main navigation.

## Release gate
Compile C++; validate Blueprints/Data Assets; run TLC automation tests; run accelerated simulations; check balance; profile 100 fighters; validate asset references and cached audio; package Windows/Android Development; smoke test; scan for secrets; produce signed Shipping builds.

## Browser strategy
Keep current web prototype. Use Pixel Streaming for near-term Unreal web access. Treat UE 5.9 WebAssembly/WebGPU as experimental research while 5.9 remains Preview.
