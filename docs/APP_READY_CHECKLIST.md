# TLC Gender Clash — app-ready checklist

## Source correctness completed
- [x] Separate Unreal production subtree.
- [x] UE 5.8 stable shipping target.
- [x] UE 5.9 Preview isolated to experimentation.
- [x] Modular C++ runtime foundation.
- [x] Authoritative battle configuration result API with 100-fighter invariant.
- [x] Explicit battle phases: Ready, Active, Paused, SuddenDeath, Stalemate, Final, Replaying.
- [x] Legal phase-transition enforcement.
- [x] Whole-world pause hook plus audio pause event.
- [x] Atomic reset event with runtime cleanup coordinator hooks.
- [x] Commander cooldown reset support.
- [x] Fractional recent-casualty decay fix.
- [x] Deterministic seeded special-event selection and force-event QA entry point.
- [x] Match ID + battle generation stale-response protection for cloud commentary.
- [x] HTTPS-only Shipping gateway policy and response length/timeout/rate limits.
- [x] 100-fighter cap source test.
- [x] Aspect-safe formation-bound tests.
- [x] AI anti-thrashing policy with commitment time, hysteresis, feasibility, and staggered decision cadence.
- [x] Typed UPrimaryDataAsset classes for battle balance, weapons, performance budgets, presets, commentary, and audio manifests.
- [x] Version metadata enforced for JSON manifests.
- [x] Context-weighted special-event system.
- [x] MetaSounds-ready audio director.
- [x] ElevenLabs voice/generated-audio manifests.
- [x] Android/Windows baseline config.

## Security and CI completed
- [x] Source workflow renamed to Source & Manifest Validation; it explicitly does not claim Unreal compile readiness.
- [x] Gitleaks v3 history-aware secret scan.
- [x] Forbidden artifact policy for .env, signing material, APK/AAB/EXE, private certificates and keystores.
- [x] Root and Unreal .gitignore hardened.
- [x] Tracked .env removed from this branch.
- [x] Narrow Gitleaks allowlist only for validator marker literals.
- [x] UE 5.8 Engine Gates workflow exists and requires a real self-hosted Windows UE58 runner.
- [x] Engine-gate jobs remain skipped until that runner is explicitly enabled.

## First Unreal vertical slice
- [ ] Compile TLCGenderClashEditor Development in UE 5.8.
- [ ] Create /Game/Maps/L_BattleArena.
- [ ] Create one-screen UMG/Common UI HUD.
- [ ] Create premium male/female fighter skeletal meshes/materials/animations.
- [ ] Implement 50 vs 50 default battle.
- [ ] Implement one initial formation end-to-end.
- [ ] Implement melee + one ranged weapon per team.
- [ ] Implement one TLC Commander ability end-to-end.
- [ ] Implement complete Robot vs Unicorn encounter.
- [ ] Implement one complete UFO abduction lifecycle.
- [ ] Import one cached announcer line, battle music cue and core SFX.
- [ ] Verify Pause and Reset across the complete slice.
- [ ] Run TLC.GenderClash Automation on the actual UE build.

## Remaining production content
- [ ] Furiosa transformation assets.
- [ ] Remaining Commander abilities.
- [ ] Remaining formations/StateTrees.
- [ ] Remaining special events and giants.
- [ ] Niagara production systems.
- [ ] MetaSound production graphs.
- [ ] Data Assets authored/imported and wired in Editor.
- [ ] Replay/cinematic polish.
- [ ] Accessibility/localization pass.

## Performance/device proof
- [ ] Profile full-duration 100-fighter match with Unreal Insights.
- [ ] Record average and p99 frame time, game thread, render thread, RHI, AI decisions, particles, projectiles and ragdolls.
- [ ] Choose Actor/pooling/Mass representation based on measured cost.
- [ ] Verify physical Android/Fold closed landscape.
- [ ] Verify physical Android/Fold open landscape.
- [ ] Verify sustained thermal behavior.
- [ ] Verify Android suspend/resume and audio-device changes.

## Packaging/release
- [ ] Package Windows Development/Shipping on UE 5.8 machine.
- [ ] Package Android ARM64 Development/Shipping.
- [ ] Verify offline gameplay/audio with cloud disabled.
- [ ] Scan packaged output for secrets.
- [ ] Configure signing outside Git.
- [ ] Fresh-install smoke test.
- [ ] Upgrade-install smoke test.
- [ ] Privacy policy and permissions justification.
- [ ] Accessibility/content-rating review.
- [ ] Third-party audio/provider licensing review.
- [ ] Crash reporting and release monitoring.
- [ ] Rollback package and release notes.

The unchecked items require a real UE 5.8 Editor/toolchain, binary asset authoring, physical target hardware, or signing/release infrastructure. Source-only automation must not mark them complete.
