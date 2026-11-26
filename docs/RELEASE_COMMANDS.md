# TLC Gender Clash — reproducible release commands

The Unreal subtree includes PowerShell wrappers around Unreal Automation Tool. They fail loudly when the engine, Android SDK, tests, or package output are missing.

## Prerequisites

Set UE_ROOT to the Unreal Engine 5.8 installation root. Set ANDROID_HOME to the UE-5.8-supported Android SDK path. Follow the installed UE 5.8 Android documentation for exact SDK/NDK versions.

## Source validation

    python unreal\\scripts\\validate_project.py

## Automation tests

    powershell -ExecutionPolicy Bypass -File unreal\\scripts\\run_automation.ps1

## Windows Shipping package

    powershell -ExecutionPolicy Bypass -File unreal\\scripts\\build_windows.ps1

Output: artifacts/windows

## Android Shipping package

    powershell -ExecutionPolicy Bypass -File unreal\\scripts\\build_android.ps1

Output: artifacts/android

## Full release candidate

    powershell -ExecutionPolicy Bypass -File unreal\\scripts\\build_release_candidate.ps1
    python unreal\\scripts\\verify_release_artifacts.py

## Mandatory post-build work

- physical Fold closed/open UI checks
- sustained 100-fighter performance and thermal checks
- touch input and Android lifecycle
- offline audio verification
- package secret scan
- Windows signing and Android keystore signing
- fresh-install and upgrade-install smoke tests

Signing credentials stay outside Git.
