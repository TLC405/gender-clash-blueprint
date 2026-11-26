#include "TLCVerticalSliceGameMode.h"
#include "TLCBattleSystems.h"
#include "TLCBattleSimulation.h"
#include "TLCArcadeRuntime.h"
#include "TLCProceduralArena.h"
#include "TLCGenderClashPlayerController.h"
#include "TLCVFXDirector.h"

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
  VFXDirector=GetWorld()->SpawnActor<ATLCVFXDirector>();
  RuntimeCoordinator=GetWorld()->SpawnActor<ATLCBattleRuntimeCoordinator>();

  if(Simulation){Simulation->BindBattleDirector(BattleDirector);Simulation->BindCameraDirector(CameraDirector);Simulation->BindPerformanceManager(PerformanceManager);Simulation->BindVFXDirector(VFXDirector);Simulation->BuildBattle(50,50);}
  if(SpecialEventDirector)SpecialEventDirector->OnEventTriggered.AddDynamic(this,&ATLCVerticalSliceGameMode::HandleSpecialEvent);
  if(BattleDirector){BattleDirector->OnPhaseChanged.AddDynamic(this,&ATLCVerticalSliceGameMode::HandlePhaseChanged);BattleDirector->OnBattleFinished.AddDynamic(this,&ATLCVerticalSliceGameMode::HandleBattleFinished);}
  if(AnnouncerDirector&&AudioDirector)AnnouncerDirector->OnLineReady.AddDynamic(AudioDirector,&ATLCAudioDirector::HandleAnnouncerLine);
  if(RuntimeCoordinator)RuntimeCoordinator->RebindRuntimeSystems();
}

void ATLCVerticalSliceGameMode::HandleSpecialEvent(ETLCSpecialEvent EventType){
  if(Simulation)Simulation->ExecuteSpecialEvent(EventType);
  FString Line=TEXT("Special event on the field.");int32 Priority=72;
  if(EventType==ETLCSpecialEvent::UFOAbduction){Line=TEXT("We have an unidentified object over the battlefield.");Priority=90;}
  else if(EventType==ETLCSpecialEvent::MaleGiant||EventType==ETLCSpecialEvent::FemaleGiant){Line=TEXT("That is not a normal-sized fighter.");Priority=88;}
  else if(EventType==ETLCSpecialEvent::Meteor){Line=TEXT("Meteor warning. The center of the field is not safe.");Priority=92;}
  QueueAnnouncer(FName(*UEnum::GetValueAsString(EventType)),Priority,Line,8.f);
}
void ATLCVerticalSliceGameMode::HandlePhaseChanged(ETLCBattlePhase Phase){
  if(Phase==ETLCBattlePhase::Active)QueueAnnouncer(FName(TEXT("battleStart")),65,TEXT("The field is set. Here we go."),10.f);
  if(Phase==ETLCBattlePhase::SuddenDeath)QueueAnnouncer(FName(TEXT("suddenDeath")),92,TEXT("Sudden death. The next exchange could decide it."),12.f);
}
void ATLCVerticalSliceGameMode::HandleBattleFinished(ETLCTeam Winner,FName){
  if(Winner==ETLCTeam::Men)QueueAnnouncer(FName(TEXT("victoryMen")),100,TEXT("The men close it out."),30.f);
  else if(Winner==ETLCTeam::Women)QueueAnnouncer(FName(TEXT("victoryWomen")),100,TEXT("The women take the field."),30.f);
  else QueueAnnouncer(FName(TEXT("draw")),100,TEXT("No winner. The field ends level."),30.f);
}
void ATLCVerticalSliceGameMode::QueueAnnouncer(FName EventName,int32 Priority,const FString& Line,float Cooldown){
  if(!AnnouncerDirector)return;FTLCAnnouncerEvent E;E.EventName=EventName;E.Priority=Priority;E.CachedLine=Line;E.MinimumCooldown=Cooldown;AnnouncerDirector->QueueAnnounce(E);
}
