#include "TLCVerticalSliceGameMode.h"
#include "TLCBattleSystems.h"
#include "TLCBattleSimulation.h"
#include "TLCArcadeRuntime.h"
#include "TLCProceduralArena.h"
#include "TLCGenderClashPlayerController.h"

ATLCVerticalSliceGameMode::ATLCVerticalSliceGameMode(){PrimaryActorTick.bCanEverTick=false;PlayerControllerClass=ATLCGenderClashPlayerController::StaticClass();}

void ATLCVerticalSliceGameMode::BeginPlay(){
  Super::BeginPlay();
  Arena=GetWorld()->SpawnActor<ATLCProceduralArena>();if(Arena)Arena->BuildArena();
  BattleDirector=GetWorld()->SpawnActor<ATLCBattleDirector>();
  Simulation=GetWorld()->SpawnActor<ATLCBattleSimulationDirector>();
  SpecialEventDirector=GetWorld()->SpawnActor<ATLCSpecialEventDirector>();
  AudioDirector=GetWorld()->SpawnActor<ATLCAudioDirector>();
  CameraDirector=GetWorld()->SpawnActor<ATLCCameraDirector>();
  AnnouncerDirector=GetWorld()->SpawnActor<ATLCAnnouncerDirector>();
  PerformanceManager=GetWorld()->SpawnActor<ATLCPerformanceLODManager>();
  RuntimeCoordinator=GetWorld()->SpawnActor<ATLCBattleRuntimeCoordinator>();

  if(Simulation){Simulation->BindBattleDirector(BattleDirector);Simulation->BuildBattle(50,50);}
  if(SpecialEventDirector)SpecialEventDirector->OnEventTriggered.AddDynamic(this,&ATLCVerticalSliceGameMode::HandleSpecialEvent);
  if(RuntimeCoordinator)RuntimeCoordinator->RebindRuntimeSystems();
}

void ATLCVerticalSliceGameMode::HandleSpecialEvent(ETLCSpecialEvent EventType){
  if(!Simulation)return;
  switch(EventType){
    case ETLCSpecialEvent::UFOAbduction: Simulation->TriggerUFO(4); break;
    case ETLCSpecialEvent::MaleGiant: Simulation->SpawnGiant(ETLCTeam::Men); break;
    case ETLCSpecialEvent::FemaleGiant: Simulation->SpawnGiant(ETLCTeam::Women); break;
    case ETLCSpecialEvent::RobotMalfunction: break;
    case ETLCSpecialEvent::UnicornRage: break;
    default: break;
  }
}
