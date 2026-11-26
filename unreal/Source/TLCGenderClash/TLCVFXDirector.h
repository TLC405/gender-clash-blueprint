#pragma once
#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TLCVFXDirector.generated.h"

class UNiagaraSystem;
class UNiagaraComponent;

UENUM(BlueprintType)
enum class ETLCVFXCue : uint8 {
  MeleeImpact, ProjectileImpact, NukeWarning, NukeBlast, WaterCannon,
  LipstickShot, Shockwave, Rally, RobotStomp, UnicornCharge, GiantStomp,
  UFOBeam, Lightning, Meteor, HealingZone
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCVFXDirector : public AActor {
  GENERATED_BODY()
public:
  ATLCVFXDirector();
  UPROPERTY(EditAnywhere,BlueprintReadWrite) TMap<ETLCVFXCue,TSoftObjectPtr<UNiagaraSystem>> Systems;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 MaxHighCostSystems=12;
  UFUNCTION(BlueprintCallable) bool PlayCue(ETLCVFXCue Cue,const FVector& Location,const FVector& Direction=FVector::UpVector,float Scale=1.f);
  UFUNCTION(BlueprintCallable) void ResetVFX();
  UFUNCTION(BlueprintCallable) void SetQualityPressure(float Pressure);
private:
  TArray<TWeakObjectPtr<UNiagaraComponent>> Active;
  int32 EffectiveLimit=12;
};
