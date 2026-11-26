# TLC Gender Clash — app-ready checklist

## Implemented in Unreal source

### Battle correctness
- [x] Authoritative battle configuration/result API.
- [x] Hard combined 100-normal-fighter cap with explicit rejection.
- [x] Ready / Active / Paused / SuddenDeath / Stalemate / Final / Replaying state machine.
- [x] Legal phase-transition policy.
- [x] Boss-aware victory, simultaneous elimination, stalemate and sudden-death resolution.
- [x] Whole-world pause and explicit player-controlled resume.
- [x] Atomic reset hooks and stale cloud-request invalidation.
- [x] Continuous recent-casualty decay.
- [x] Capped live reinforcements.
- [x] Correct opposing-team elimination credit.

### Playable source-level vertical slice
- [x] Procedural battle arena that boots without a custom map asset.
- [x] Default 50 vs 50 battle.
- [x] Stylized full-body source-built fighters with readable team silhouettes.
- [x] Men taller/broader baseline.
- [x] Women blonde-hair baseline.
- [x] Furiosa larger/bald/muscular transformation that preserves current health.
- [x] RVO/local separation and bounded arena movement.
- [x] melee combat.
- [x] pooled ranged projectiles.
- [x] direct mixed Men loadout toggles: fists + guns + swords.
- [x] direct mixed Women loadout toggles: fists + lipstick gun + makeup bomb.
- [x] Men Strength slider affects live damage.
- [x] Women Speed slider affects live movement.
- [x] Rage affects live combat.
- [x] eight selectable formations with live behavioral modifiers.
- [x] Shield Wall frontal protection / flank vulnerability.
- [x] Ranks staged pressure.
- [x] Wedge penetration bias.
- [x] Circle wave/hold behavior.
- [x] Spread area-damage mitigation.
- [x] Rush movement/attack pressure.
- [x] Robot mini-boss.
- [x] Battle Unicorn mini-boss.
- [x] Robot/Unicorn mutual priority.
- [x] male giant and female giant; female giant includes visible hair.
- [x] UFO telegraph, lift, abduction and single-removal lifecycle.
- [x] all weighted special events have gameplay consequences.
- [x] deterministic event seed and force-event QA path.

### TLC Commander
- [x] source-built heroic full-body Commander actor.
- [x] keyboard/controller movement.
- [x] touch movement pad for Android/Fold.
- [x] health, damage, knockback, death and HUD health feedback.
- [x] enemy AttackHero behavior.
- [x] Nuke.
- [x] Water Cannon.
- [x] Lipstick Shot.
- [x] Shockwave Slam.
- [x] Rally Buff.
- [x] per-ability cooldowns.
- [x] visible ability disabled/cooldown feedback.
- [x] cooldown/reset/pause correctness.

### Battle presets
- [x] Broadcast Arena.
- [x] Narrow Pass / 300-inspired last-stand preset.
- [x] Narrow Pass physically narrows arena and uses 30 vs 70 premium-cap ratio.
- [x] Narrow Pass Shield Wall vs Rush.
- [x] Narrow Pass disallows modern firearms and uses spear/fist rules.
- [x] North vs South preset.
- [x] North vs South blue vs gray/butternut palette.
- [x] North vs South line formations and musket/fist rules.
- [x] preset weapon conflicts are visibly rejected by HUD.

### AI
- [x] local deterministic targeting.
- [x] boss, ranged-threat and hero priorities.
- [x] behavior commitment time.
- [x] 15% hysteresis margin.
- [x] target-loss handling.
- [x] feasibility/formation-risk constraints.
- [x] survival-critical override.
- [x] staggered close-combat decision clock.
- [x] staggered tactical decision clock.
- [x] staggered strategic decision clock.
- [x] StateTree-ready typed decision state.

### One-screen UX
- [x] compact score/timer/state header.
- [x] Men control panel.
- [x] Women control panel.
- [x] center battle console.
- [x] Start / Pause / Reset.
- [x] Camera Zoom.
- [x] Chaos Intensity.
- [x] Special Event.
- [x] Slow Motion.
- [x] Cinematic FX.
- [x] direct formations/weapons/rage/Furiosa controls.
- [x] Commander ability panel.
- [x] contextual blocked-action feedback.
- [x] announcer subtitle fallback.
- [x] live viewport reflow when a foldable opens/closes.
- [x] no primary Stats destination.

### Camera / broadcast / audio integration
- [x] broadcast spectator camera.
- [x] focus interest scoring.
- [x] camera hold/hysteresis to prevent thrashing.
- [x] major event/boss/Commander camera interests.
- [x] priority announcer queue.
- [x] duplicate event coalescing.
- [x] global/per-event announcer cooldowns.
- [x] offline subtitle fallback.
- [x] local WAV/USoundBase cue hook.
- [x] ElevenLabs voice/music/SFX generation manifests.
- [x] optional secured cloud commentary gateway.
- [x] match ID + generation stale-response protection.
- [x] HTTPS-only Shipping gateway rule.
- [x] timeout, rate limit, response size and output length limits.
- [x] cloud commentary never controls combat.

### Performance
- [x] fixed normal-fighter premium cap.
- [x] pooled projectile actors.
- [x] rolling average frame-time sampling.
- [x] rolling p99 frame-time sampling.
- [x] operational quality-pressure calculation.
- [x] dynamic projectile visual budget.
- [x] gameplay-preserving direct-hit fallback when projectile visuals saturate.
- [x] performance-budget Data Asset contract.
- [x] source architecture supports later Actor/pooling/Mass comparison instead of requiring Mass prematurely.

### Data / security / CI
- [x] typed UPrimaryDataAsset contracts.
- [x] versioned JSON source manifests.
- [x] Gitleaks v3 history scan.
- [x] tracked .env removed from rebuild branch.
- [x] package/signing/private-key artifact blocking.
- [x] source/manifest validation separated from engine proof.
- [x] UE 5.8 compile/Automation/package workflow defined for a real UE58 Windows runner.
- [x] deterministic QA console commands:
  - TLC.SpecialEvent <event>
  - TLC.EventSeed <seed>
  - TLC.Preset Broadcast|NarrowPass|300|NorthVsSouth|CivilWar
  - TLC.SpawnBoss Robot|Unicorn|MaleGiant|FemaleGiant
  - TLC.Reset

## Automated source tests present
- [x] battle count validity: 0/0, 0/100, 100/0, 50/50, 60/40, 40/60 and invalid values.
- [x] formation bounds for 1, 2, 10, 50 and 100 fighters.
- [x] 16:9, ultrawide, portrait and Fold-like arena dimensions.
- [x] phase-transition rules.
- [x] reinforcement capacity.
- [x] boss-aware outcomes.
- [x] AI hysteresis and decision cadence.
- [x] deterministic event metadata.

## Still requires a real UE 5.8 toolchain / binary content

These are intentionally not marked complete by source-only CI.

### Engine proof
- [ ] Run UnrealHeaderTool successfully on this exact branch.
- [ ] Compile TLCGenderClashEditor Development with UE 5.8.
- [ ] Resolve every compiler/UHT warning and error.
- [ ] Execute TLC.GenderClash Automation inside UE 5.8.
- [ ] Launch the procedural 50-vs-50 vertical slice in Unreal.
- [ ] Run Start → Pause → Resume → Final → Reset smoke sequence.
- [ ] Force UFO, Robot, Unicorn, both Giants and Meteor through QA console.

### Production binary art
- [ ] replace source-built Engine-shape fighters with reviewed premium skeletal character assets while preserving the same gameplay interfaces.
- [ ] production Furiosa skeletal mesh / animation set.
- [ ] production TLC Commander skeletal mesh / animation set.
- [ ] production Robot and Battle Unicorn assets.
- [ ] production UFO / giant assets.
- [ ] production Niagara systems.
- [ ] production MetaSound graphs.
- [ ] reviewed imported ElevenLabs WAV assets assigned to local cue IDs.
- [ ] production materials/lighting pass.
- [ ] optional authored L_BattleArena if it improves on the procedural fallback.

### Profiling / device proof
- [ ] full-duration Unreal Insights desktop capture.
- [ ] average and p99 game/render/RHI timings.
- [ ] animation/collision/AI/draw-call/particle/projectile/ragdoll measurements.
- [ ] decide Actor vs pooled vs Mass representation from measured target-hardware cost.
- [ ] physical Galaxy Fold closed-landscape test.
- [ ] physical Galaxy Fold open-landscape test.
- [ ] Android thermal sustained-match test.
- [ ] Android suspend/resume/audio-route test.

### Packages / release
- [ ] cook/package Windows.
- [ ] cook/package Android ARM64.
- [ ] verify fresh install.
- [ ] verify upgrade install.
- [ ] verify fully offline battle/audio fallback.
- [ ] package-level secret scan.
- [ ] signing outside Git.
- [ ] privacy policy.
- [ ] permissions justification.
- [ ] accessibility review.
- [ ] content/rating review.
- [ ] store screenshots/listing.
- [ ] third-party/provider licensing review.
- [ ] crash reporting/release monitoring.
- [ ] rollback package and release notes.

## Merge rule

PR #19 remains draft until a real UE 5.8 machine passes UHT, compile, Automation, launch, Pause/Reset, package smoke checks, and the first playable vertical slice is reviewed. Source validation is evidence of repository correctness only; it is not a substitute for Unreal engine proof.
