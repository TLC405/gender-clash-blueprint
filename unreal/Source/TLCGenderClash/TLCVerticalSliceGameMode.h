#pragma once

#include "CoreMinimal.h"
#include "GameFramework/GameModeBase.h"
#include "TLCVerticalSliceGameMode.generated.h"

class ATLCBattleDirector;
class ATLCBattleSimulationDirector;
class ATLCBattleRuntimeCoordinator;
class ATLCSpecialEventDirector;
class ATLCAudioDirector;
class ATLCCameraDirector;
class ATLCAnnouncerDirector;
class ATLCPerformanceLODManager;
class ATLCProceduralArena;
enum class ETLCSpecialEvent : uint8;

UCLASS()
class TLCGENDERCLASH_API ATLCVerticalSliceGameMode : public AGameModeBase {
  GENERATED_BODY()
public:
  ATLCVerticalSliceGameMode();
  virtual void BeginPlay() override;

  UFUNCTION(BlueprintPure) ATLCBattleSimulationDirector* GetSimulation()const{return Simulation;}
  UFUNCTION(BlueprintPure) ATLCBattleDirector* GetBattleDirector()const{return BattleDirector;}
  UFUNCTION(BlueprintPure) ATLCSpecialEventDirector* GetSpecialEventDirector()const{return SpecialEventDirector;}

private:
  UPROPERTY() TObjectPtr<ATLCBattleDirector> BattleDirector;
  UPROPERTY() TObjectPtr<ATLCBattleSimulationDirector> Simulation;
  UPROPERTY() TObjectPtr<ATLCBattleRuntimeCoordinator> RuntimeCoordinator;
  UPROPERTY() TObjectPtr<ATLCSpecialEventDirector> SpecialEventDirector;
  UPROPERTY() TObjectPtr<ATLCAudioDirector> AudioDirector;
  UPROPERTY() TObjectPtr<ATLCCameraDirector> CameraDirector;
  UPROPERTY() TObjectPtr<ATLCAnnouncerDirector> AnnouncerDirector;
  UPROPERTY() TObjectPtr<ATLCPerformanceLODManager> PerformanceManager;
  UPROPERTY() TObjectPtr<ATLCProceduralArena> Arena;

  UFUNCTION() void HandleSpecialEvent(ETLCSpecialEvent EventType);
};
