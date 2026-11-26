#!/usr/bin/env python3
import json,pathlib,re,sys
ROOT=pathlib.Path(__file__).resolve().parents[1]
required=[
"TLCGenderClash.uproject","Source/TLCGenderClash/TLCGenderClash.Build.cs","Source/TLCGenderClash/TLCBattleSystems.cpp",
"Source/TLCGenderClash/TLCCommanderCharacter.cpp","Source/TLCGenderClash/TLCAIIntegrationGatewaySubsystem.cpp",
"Data/BattleBalance.json","Data/AudioVoiceManifest.json"]
missing=[p for p in required if not (ROOT/p).exists()]
if missing: raise SystemExit("Missing required files: "+", ".join(missing))
project=json.loads((ROOT/"TLCGenderClash.uproject").read_text())
if project.get("EngineAssociation")!="5.8": raise SystemExit("Production target must remain UE 5.8 stable.")
balance=json.loads((ROOT/"Data/BattleBalance.json").read_text())
if balance.get("maxVisibleNormalFighters")!=100: raise SystemExit("Premium battle cap must be 100.")
patterns=[re.compile(r"(?i)(api[_-]?key|secret|token)\s*[:=]\s*['\"][A-Za-z0-9_\-]{20,}"),re.compile(r"sk-[A-Za-z0-9]{20,}")]
for p in ROOT.rglob("*"):
  if p.is_file() and p.suffix.lower() in {".h",".cpp",".cs",".ini",".json",".md",".py"}:
    t=p.read_text(errors="ignore")
    if any(x.search(t) for x in patterns): raise SystemExit(f"Possible secret in {p.relative_to(ROOT)}")
print("TLC Gender Clash Unreal validation: PASS")
