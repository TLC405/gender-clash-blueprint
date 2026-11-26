#!/usr/bin/env python3
import pathlib

ROOT = pathlib.Path(__file__).resolve().parents[2]
artifacts = ROOT / "artifacts"
if not artifacts.exists(): raise SystemExit("No artifacts directory. Run the Unreal package scripts first.")
windows = artifacts / "windows"
android = artifacts / "android"
win_files = [p for p in windows.rglob("*") if p.is_file()] if windows.exists() else []
android_packages = [p for p in android.rglob("*") if p.is_file() and p.suffix.lower() in {".apk",".aab"}] if android.exists() else []
if not win_files: raise SystemExit("Windows package output is missing.")
if not android_packages: raise SystemExit("Android APK/AAB output is missing.")
print("Release artifact presence: PASS")
print(f"Windows files: {len(win_files)}")
for package in android_packages: print("Android:", package.relative_to(ROOT))
print("NOTE: artifact presence is not signing, performance, device, or gameplay verification.")
