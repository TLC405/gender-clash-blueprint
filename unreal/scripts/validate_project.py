#!/usr/bin/env python3
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
REPO = ROOT.parent
required = [
    "TLCGenderClash.uproject",
    "Source/TLCGenderClash/TLCGenderClash.Build.cs",
    "Source/TLCGenderClash/TLCBattleSystems.cpp",
    "Source/TLCGenderClash/TLCCommanderCharacter.cpp",
    "Source/TLCGenderClash/TLCAIIntegrationGatewaySubsystem.cpp",
    "Source/TLCGenderClash/TLCArcadeRuntime.cpp",
    "Data/BattleBalance.json",
    "Data/AudioVoiceManifest.json",
    "Data/GeneratedAudioManifest.json",
    "Data/WeaponTuning.json",
    "Data/PerformanceBudgets.json",
    "Data/CommentaryBank.json",
    "Data/BattlePresets.json",
]
missing = [p for p in required if not (ROOT / p).exists()]
if missing:
    raise SystemExit("Missing required files: " + ", ".join(missing))

parsed = {}
for path in sorted((ROOT / "Data").glob("*.json")):
    try:
        parsed[path.name] = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON {path.relative_to(ROOT)}: {exc}")

project = json.loads((ROOT / "TLCGenderClash.uproject").read_text())
if project.get("EngineAssociation") != "5.8":
    raise SystemExit("Production target must remain UE 5.8 stable.")

if parsed["BattleBalance.json"].get("maxVisibleNormalFighters") != 100:
    raise SystemExit("Premium battle cap must be 100.")
if parsed["PerformanceBudgets.json"].get("targets", {}).get("maxNormalFighters") != 100:
    raise SystemExit("Performance budget and gameplay fighter cap disagree.")

weapons = parsed["WeaponTuning.json"]
if not {"fists","gun","sword"} <= set(weapons.get("rules",{}).get("men",[])):
    raise SystemExit("Men weapon manifest is incomplete.")
if not {"fists","lipstickGun","makeupBomb"} <= set(weapons.get("rules",{}).get("women",[])):
    raise SystemExit("Women weapon manifest is incomplete.")

audio = parsed["GeneratedAudioManifest.json"]
if len(audio.get("assets",{})) < 9:
    raise SystemExit("Starter generated-audio set is incomplete.")
if audio.get("policy",{}).get("runtimeCloudDependency") is not False:
    raise SystemExit("Shipping audio must not depend on cloud availability.")

presets = parsed["BattlePresets.json"].get("presets",{})
if presets.get("narrowPass",{}).get("modernWeaponsAllowed") is not False:
    raise SystemExit("Narrow Pass must disallow modern guns.")
if "northVsSouth" not in presets:
    raise SystemExit("North vs South preset is missing.")

forbidden_suffixes={".p12",".pfx",".pem",".keystore",".jks",".aab",".apk",".exe"}
for path in REPO.rglob("*"):
    if not path.is_file():
        continue
    if path.suffix.lower() in forbidden_suffixes:
        raise SystemExit(f"Forbidden binary/signing artifact tracked in source tree: {path.relative_to(REPO)}")
    if path.name.startswith(".env") and path.name not in {".env.example",".env.sample"}:
        raise SystemExit(f"Environment file must not be committed: {path.relative_to(REPO)}")

private_key_markers=("-----BEGIN PRIVATE KEY-----","-----BEGIN RSA PRIVATE KEY-----","-----BEGIN EC PRIVATE KEY-----","-----BEGIN OPENSSH PRIVATE KEY-----")
credential_url=re.compile(r"https?://[^\s/:]+:[^\s/@]+@")
azure_key=re.compile(r"(?i)(AccountKey|SharedAccessKey)=[A-Za-z0-9+/]{32,}={0,2}")
simple_secret=re.compile(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{20,}")
for path in REPO.rglob("*"):
    if not path.is_file() or ".git" in path.parts:
        continue
    if path.stat().st_size > 2_000_000:
        continue
    try: text=path.read_text(errors="ignore")
    except OSError: continue
    if any(marker in text for marker in private_key_markers) or credential_url.search(text) or azure_key.search(text) or simple_secret.search(text):
        raise SystemExit(f"Possible credential material detected in {path.relative_to(REPO)}")

print("TLC Gender Clash source & manifest validation: PASS")
print("This job validates repository policy only. It does NOT prove Unreal compile, UHT, Automation, cook, package, device, or signing success.")
