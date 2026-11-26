#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TLCBattleSystems.h"
#include "TLCArcadeRuntime.generated.h"

UENUM(BlueprintType)
enum class ETLCWeaponType : uint8 {
  Fists, Gun, Sword, LipstickGun, MakeupBomb
};

USTRUCT(BlueprintType)
struct FTLCWeaponTuning {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere,BlueprintReadWrite) ETLCWeaponType Type=ETLCWeaponType::Fists;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Damage=18.f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Range=150.f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Cooldown=0.6f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Knockback=0.f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bRanged=false;
};

USTRUCT(BlueprintType)
struct FTLCCameraInterest {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere,BlueprintReadWrite) FVector Location=FVector::ZeroVector;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Score=0.f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) FName Reason="Battle";
  UPROPERTY(EditAnywhere,BlueprintReadWrite) TObjectPtr<AActor> Subject=nullptr;
};

USTRUCT(BlueprintType)
struct FTLCAnnouncerEvent {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere,BlueprintReadWrite) FName EventName;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 Priority=0;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) FString CachedLine;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float MinimumCooldown=4.f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FTLCWeaponFired,ETLCTeam,Team,ETLCWeaponType,Weapon);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCCameraFocusChanged,const FTLCCameraInterest&,Interest);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FTLCAnnouncerLine,FName,EventName,const FString&,Line);

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCWeaponDirector : public AActor {
  GENERATED_BODY()
public:
  ATLCWeaponDirector();
  UPROPERTY(EditAnywhere,BlueprintReadWrite) TMap<ETLCWeaponType,FTLCWeaponTuning> WeaponTuning;
  UPROPERTY(BlueprintAssignable) FTLCWeaponFired OnWeaponFired;
  UFUNCTION(BlueprintPure) FTLCWeaponTuning GetTuning(ETLCWeaponType Type) const;
  UFUNCTION(BlueprintPure) bool CanTeamUse(ETLCTeam Team,ETLCWeaponType Type) const;
  UFUNCTION(BlueprintCallable) void ReportWeaponFired(ETLCTeam Team,ETLCWeaponType Type);
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCCameraDirector : public AActor {
  GENERATED_BODY()
public:
  ATLCCameraDirector();
  UPROPERTY(BlueprintAssignable) FTLCCameraFocusChanged OnFocusChanged;
  UFUNCTION(BlueprintCallable) void SubmitInterest(const FTLCCameraInterest& Interest);
  UFUNCTION(BlueprintCallable) void ClearInterests();
  UFUNCTION(BlueprintPure) FTLCCameraInterest GetBestInterest() const;
  UFUNCTION(BlueprintCallable) void ResolveCameraFocus();
private:
  TArray<FTLCCameraInterest> Interests;
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCAnnouncerDirector : public AActor {
  GENERATED_BODY()
public:
  ATLCAnnouncerDirector();
  UPROPERTY(BlueprintAssignable) FTLCAnnouncerLine OnLineReady;
  UFUNCTION(BlueprintCallable) bool TryAnnounce(const FTLCAnnouncerEvent& Event);
  UFUNCTION(BlueprintCallable) void ResetAnnouncer();
private:
  TMap<FName,double> LastSpokenAt;
  double GlobalLastSpoken=0.0;
  float GlobalCooldown=1.6f;
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCPerformanceLODManager : public AActor {
  GENERATED_BODY()
public:
  ATLCPerformanceLODManager();
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 TargetDesktopFPS=60;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 TargetMobileFPS=45;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 MaxNormalFighters=100;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 MaxSimultaneousRagdolls=12;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 MaxCloseImpactVoices=8;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 MaxProjectileActors=160;
  UFUNCTION(BlueprintPure) float ComputeQualityPressure(float FrameMilliseconds,int32 ActiveFighters,int32 ActiveProjectiles) const;
  UFUNCTION(BlueprintImplementableEvent) void ApplyScalabilityPressure(float Pressure);
};
