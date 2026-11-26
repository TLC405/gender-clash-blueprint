#pragma once

#include "CoreMinimal.h"
#include "Engine/GameInstance.h"
#include "TLCGenderClashGameInstance.generated.h"

UCLASS()
class TLCGENDERCLASH_API UTLCGenderClashGameInstance : public UGameInstance {
  GENERATED_BODY()
public:
  virtual void Init() override;
  virtual void Shutdown() override;

private:
  bool bPausedByLifecycle=false;
  void HandleBackground();
  void HandleForeground();
};
