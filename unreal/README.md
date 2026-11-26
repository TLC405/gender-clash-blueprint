# TLC Gender Clash — Unreal production runtime

The existing browser game remains the playable prototype. This folder is the authoritative next-generation Unreal runtime.

## Shipping engine
- UE 5.8 stable for production.
- UE 5.9 Preview only in an experimental copy for Unreal MCP, Canvas, scripted StateTree and Mass Characters research.

## Implemented source foundation
- 100-fighter premium cap and battle lifecycle.
- bounded eight-formation math.
- high-level tactical utility scoring.
- TLC Commander GAS-ready shell with five cooldown-gated abilities.
- weighted special-event director: UFO, male/female giants and additional chaos events.
- MetaSounds-oriented adaptive audio director.
- secured backend AI commentary gateway with offline fallback.
- automation tests.
- Android/Windows baseline settings.
- source-validation CI.

## Build
1. Install UE 5.8 and Android toolchain if needed.
2. Generate project files from TLCGenderClash.uproject.
3. Build TLCGenderClashEditor Development.
4. Open project.
5. Create/import assets listed in Content/README.md.
6. Run Automation tests under TLC.GenderClash.
7. Profile 100-fighter battle.
8. Package Windows and Android Development.
9. Only then package Shipping/sign.

## Delivery
- Windows native: primary desktop.
- Android ARM64 landscape: primary mobile/Fold.
- Browser: Pixel Streaming is the near-term Unreal path.
- Keep current React app for instant browser prototype.
- UE 5.9 WebAssembly/WebGPU remains experimental until Epic promotes it beyond Preview/experimental status.

No API/provider secrets belong in the client. Common voices, music and SFX ship locally.
