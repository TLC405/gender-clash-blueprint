#pragma once

#include "CoreMinimal.h"
#include "GameFramework/PlayerController.h"
#include "TLCGenderClashPlayerController.generated.h"

class UTLCBattleHUDWidget;
class ATLCSpectatorCameraActor;

UCLASS()
class TLCGENDERCLASH_API ATLCGenderClashPlayerController : public APlayerController {
  GENERATED_BODY()
public:
  ATLCGenderClashPlayerController();
  virtual void BeginPlay() override;
  virtual void SetupInputComponent() override;

private:
  UPROPERTY() TObjectPtr<UTLCBattleHUDWidget> BattleHUD;
  UPROPERTY() TObjectPtr<ATLCSpectatorCameraActor> SpectatorCamera;

  void StartKey();
  void PauseKey();
  void ResetKey();
  void CommanderForward(float Value);
  void CommanderRight(float Value);
};
