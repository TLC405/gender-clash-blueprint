#pragma once

#include "CoreMinimal.h"
#include "Engine/DataAsset.h"
#include "Sound/SoundBase.h"
#include "TLCBattleSystems.h"
#include "TLCArcadeRuntime.h"
#include "TLCDataAssets.generated.h"

USTRUCT(BlueprintType)
struct FTLCManifestMetadata {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 SchemaVersion=1;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 CompatibilityVersion=1;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FString LastUpdated="2026-11-25";
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FString Source="unreal/Data";
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FName LocalizationKey;
};

UCLASS(BlueprintType)
class TLCGENDERCLASH_API UTLCBattleBalanceDataAsset : public UPrimaryDataAsset {
  GENERATED_BODY()
public:
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FTLCManifestMetadata Metadata;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 MaxVisibleNormalFighters=100;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FTLCBattleConfiguration DefaultConfiguration;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) TMap<FName,float> CommanderCooldowns;
};

UCLASS(BlueprintType)
class TLCGENDERCLASH_API UTLCWeaponTuningDataAsset : public UPrimaryDataAsset {
  GENERATED_BODY()
public:
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FTLCManifestMetadata Metadata;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) TMap<ETLCWeaponType,FTLCWeaponTuning> Weapons;
};

UCLASS(BlueprintType)
class TLCGENDERCLASH_API UTLCPerformanceBudgetsDataAsset : public UPrimaryDataAsset {
  GENERATED_BODY()
public:
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FTLCManifestMetadata Metadata;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 DesktopTargetFPS=60;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 MobileTargetFPS=45;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 MaxNormalFighters=100;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 MaxRagdolls=12;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 MaxProjectiles=160;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) int32 MaxHighCostNiagara=12;
};

UCLASS(BlueprintType)
class TLCGENDERCLASH_API UTLCBattlePresetDataAsset : public UPrimaryDataAsset {
  GENERATED_BODY()
public:
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FTLCManifestMetadata Metadata;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FName PresetId="broadcastArena";
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FText DisplayName;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) bool bModernWeaponsAllowed=true;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) ETLCFormation MenFormation=ETLCFormation::Ranks;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) ETLCFormation WomenFormation=ETLCFormation::Ranks;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) TArray<FName> SpecialRules;
};

USTRUCT(BlueprintType)
struct FTLCCommentaryVariantSet {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FName LocalizationKey;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) TArray<FText> Variants;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) float CooldownSeconds=8.0f;
};

UCLASS(BlueprintType)
class TLCGENDERCLASH_API UTLCCommentaryBankDataAsset : public UPrimaryDataAsset {
  GENERATED_BODY()
public:
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FTLCManifestMetadata Metadata;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) TMap<FName,FTLCCommentaryVariantSet> Events;
};

USTRUCT(BlueprintType)
struct FTLCAudioAssetEntry {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FName AssetId;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FName LocalizationKey;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) TSoftObjectPtr<USoundBase> LocalSound;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FString GenerationId;
};

UCLASS(BlueprintType)
class TLCGENDERCLASH_API UTLCAudioManifestDataAsset : public UPrimaryDataAsset {
  GENERATED_BODY()
public:
  UPROPERTY(EditAnywhere,BlueprintReadOnly) FTLCManifestMetadata Metadata;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) bool bRuntimeCloudRequired=false;
  UPROPERTY(EditAnywhere,BlueprintReadOnly) TArray<FTLCAudioAssetEntry> Assets;
};
