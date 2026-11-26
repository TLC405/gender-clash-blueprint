# Audio import and adaptive mix runbook

Generated audio is indexed in unreal/Data/GeneratedAudioManifest.json. Generation IDs are permanent production references; signed download URLs are temporary and must not be committed.

## Review
For each generated asset:
1. audition in ElevenLabs workspace
2. reject clipping, pronunciation errors, weak transients or music that masks dialogue
3. export/download master
4. convert/normalize to Unreal-friendly WAV
5. keep source generation ID in asset metadata

## Initial voices
- Lead: Odom — Deep, Confident, Polished
- TLC Commander: Jerry B. — Heroic Action Protagonist
- Analyst: Vivian — Vibrant and Sophisticated

## Initial generated assets
- lead announcer intro
- Commander bark pack
- analyst line
- 45-second original battle cue
- melee hit
- lipstick shot
- makeup bomb
- UFO beam
- giant stomp

## Unreal content paths
Import to /Game/Audio/Generated/...
Build MetaSounds:
- MS_MusicDirector
- MS_BattleMix

Runtime music parameters:
- BattleIntensity
- MenAdvantage
- WomenAdvantage
- CommanderHealth
- BossActive
- FinalTen
- ChaosLevel
- CinematicFX

## Concurrency
Maximum recommended simultaneous layers:
- 8 close melee impacts
- 4 grouped footstep layers
- 3 close weapon shots
- 3 distant weapon layers
- 2 unit barks per team
- 1 announcer
- 1 Commander voice
- 1 priority boss/event transient

## Ducking
Announcer ducks music slightly.
Major ability ducks battle bed briefly.
Slow motion applies a designed filter/alternate impact path.
Do not stack 100 identical fighter sounds.

## Cloud policy
Common lines ship locally.
Runtime cloud speech is optional and asynchronous.
If cloud commentary times out, the AnnouncerDirector uses cached lines immediately.
Never package ElevenLabs keys in Unreal.
