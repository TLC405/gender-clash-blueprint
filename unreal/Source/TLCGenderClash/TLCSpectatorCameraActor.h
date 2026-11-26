#pragma once

#include "CoreMinimal.h"
#include "Camera/CameraActor.h"
#include "TLCArcadeRuntime.h"
#include "TLCSpectatorCameraActor.generated.h"

UENUM(BlueprintType)
enum class ETLCCameraViewMode : uint8 { Broadcast, Tactical, CloseCombat, HeroFollow, BossCam, Cinematic };

UCLASS()
class TLCGENDERCLASH_API ATLCSpectatorCameraActor : public ACameraActor {
  GENERATED_BODY()
public:
  ATLCSpectatorCameraActor();
  virtual void Tick(float DeltaSeconds) override;

  UFUNCTION(BlueprintCallable) void BindDirector(ATLCCameraDirector* InDirector);
  UFUNCTION(BlueprintCallable) void SetZoomNormalized(float Value);
  UFUNCTION(BlueprintCallable) void SetCinematicFX(bool bEnabled);
  UFUNCTION(BlueprintCallable) void SetViewMode(ETLCCameraViewMode NewMode){ViewMode=NewMode;}
  UFUNCTION(BlueprintPure) ETLCCameraViewMode GetViewMode()const{return ViewMode;}
  UFUNCTION(BlueprintCallable) void FocusArena();

private:
  UPROPERTY() TObjectPtr<ATLCCameraDirector> Director;
  FVector DesiredFocus=FVector::ZeroVector;
  FVector CurrentFocus=FVector::ZeroVector;
  float ZoomNormalized=.5f;
  bool bCinematicFX=false;
  ETLCCameraViewMode ViewMode=ETLCCameraViewMode::Broadcast;

  UFUNCTION() void HandleFocusChanged(const FTLCCameraInterest& Interest);
};
