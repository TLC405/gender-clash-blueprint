#!/usr/bin/env python3
import json, pathlib, re

ROOT = pathlib.Path(__file__).resolve().parents[1]

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

# Every Unreal JSON manifest must parse, not merely the first two someone happened to remember.
parsed = {}
for path in sorted((ROOT / "Data").glob("*.json")):
    try:
        parsed[path.name] = json.loads(path.read_text())
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Invalid JSON {path.relative_to(ROOT)}: {exc}")

project = json.loads((ROOT / "TLCGenderClash.uproject").read_text())
if project.get("EngineAssociation") != "5.8":
    raise SystemExit("Production target must remain UE 5.8 stable.")

balance = parsed["BattleBalance.json"]
if balance.get("maxVisibleNormalFighters") != 100:
    raise SystemExit("Premium battle cap must be 100.")

budgets = parsed["PerformanceBudgets.json"]
if budgets.get("targets", {}).get("maxNormalFighters") != 100:
    raise SystemExit("Performance budget and gameplay fighter cap disagree.")

weapons = parsed["WeaponTuning.json"]
men_weapons = set(weapons.get("rules", {}).get("men", []))
women_weapons = set(weapons.get("rules", {}).get("women", []))
if not {"fists", "gun", "sword"} <= men_weapons:
    raise SystemExit("Men weapon manifest is incomplete.")
if not {"fists", "lipstickGun", "makeupBomb"} <= women_weapons:
    raise SystemExit("Women weapon manifest is incomplete.")

audio = parsed["GeneratedAudioManifest.json"]
if len(audio.get("assets", {})) < 9:
    raise SystemExit("Starter generated-audio set is incomplete.")
if audio.get("policy", {}).get("runtimeCloudDependency") is not False:
    raise SystemExit("Shipping audio must not depend on cloud availability.")

presets = parsed["BattlePresets.json"].get("presets", {})
if presets.get("narrowPass", {}).get("modernWeaponsAllowed") is not False:
    raise SystemExit("Narrow Pass must disallow modern guns.")
if "northVsSouth" not in presets:
    raise SystemExit("North vs South preset is missing.")

secret_patterns = [
    re.compile(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{20,}"),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
]
for path in ROOT.rglob("*"):
    if path.is_file() and path.suffix.lower() in {".h", ".cpp", ".cs", ".ini", ".json", ".md", ".py"}:
        text = path.read_text(errors="ignore")
        for pattern in secret_patterns:
            if pattern.search(text):
                raise SystemExit(f"Possible secret in {path.relative_to(ROOT)}")

print("TLC Gender Clash Unreal validation: PASS")
print(f"Validated {len(required)} required files and {len(parsed)} JSON manifests.")
print("Verified UE 5.8 production target, 100-fighter cap, weapon rules, audio fallback policy, presets, and secret hygiene.")
