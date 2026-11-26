#include "TLCGenderClash.h"
#include "Modules/ModuleManager.h"
#include "HAL/IConsoleManager.h"
#include "Kismet/GameplayStatics.h"
#include "TLCBattleSystems.h"
#include "TLCBattleSimulation.h"

namespace TLCConsole
{
  static ATLCBattleDirector* FindBattle(UWorld* World)
  {
    return World ? Cast<ATLCBattleDirector>(UGameplayStatics::GetActorOfClass(World, ATLCBattleDirector::StaticClass())) : nullptr;
  }

  static ATLCBattleSimulationDirector* FindSimulation(UWorld* World)
  {
    return World ? Cast<ATLCBattleSimulationDirector>(UGameplayStatics::GetActorOfClass(World, ATLCBattleSimulationDirector::StaticClass())) : nullptr;
  }

  static ATLCSpecialEventDirector* FindEvents(UWorld* World)
  {
    return World ? Cast<ATLCSpecialEventDirector>(UGameplayStatics::GetActorOfClass(World, ATLCSpecialEventDirector::StaticClass())) : nullptr;
  }

  static bool ParseEvent(const FString& Raw, ETLCSpecialEvent& Out)
  {
    const FString S=Raw.ToLower();
    if(S=="ufo")Out=ETLCSpecialEvent::UFOAbduction;
    else if(S=="malegiant"||S=="giantmen")Out=ETLCSpecialEvent::MaleGiant;
    else if(S=="femalegiant"||S=="giantwomen")Out=ETLCSpecialEvent::FemaleGiant;
    else if(S=="lightning")Out=ETLCSpecialEvent::LightningStrike;
    else if(S=="fog")Out=ETLCSpecialEvent::SuddenFog;
    else if(S=="meteor")Out=ETLCSpecialEvent::Meteor;
    else if(S=="lowgravity")Out=ETLCSpecialEvent::LowGravity;
    else if(S=="reinforcements")Out=ETLCSpecialEvent::ReinforcementDrop;
    else if(S=="stampede")Out=ETLCSpecialEvent::Stampede;
    else if(S=="tornado")Out=ETLCSpecialEvent::Tornado;
    else if(S=="robotmalfunction")Out=ETLCSpecialEvent::RobotMalfunction;
    else if(S=="unicornrage")Out=ETLCSpecialEvent::UnicornRage;
    else if(S=="beachball")Out=ETLCSpecialEvent::GiantBeachBall;
    else if(S=="healing")Out=ETLCSpecialEvent::HealingZone;
    else if(S=="blackout")Out=ETLCSpecialEvent::BattlefieldBlackout;
    else if(S=="mascot")Out=ETLCSpecialEvent::MascotInvasion;
    else return false;
    return true;
  }

  static void ForceEvent(const TArray<FString>& Args,UWorld* World)
  {
    if(!World||Args.Num()==0)return;
    ETLCSpecialEvent Event;
    if(!ParseEvent(Args[0],Event))return;
    ATLCBattleDirector* Battle=FindBattle(World);
    ATLCSpecialEventDirector* Director=FindEvents(World);
    if(Battle&&Director)Director->ForceEvent(Event,Battle->GetSnapshot());
  }

  static void Reset(const TArray<FString>&,UWorld* World)
  {
    if(ATLCBattleDirector* Battle=FindBattle(World))Battle->ResetBattle();
  }

  static void Preset(const TArray<FString>& Args,UWorld* World)
  {
    if(Args.Num()==0)return;
    ATLCBattleSimulationDirector* Simulation=FindSimulation(World);
    ATLCBattleDirector* Battle=FindBattle(World);
    if(!Simulation||!Battle||Battle->GetPhase()!=ETLCBattlePhase::Ready)return;

    const FString S=Args[0].ToLower();
    if(S=="narrowpass"||S=="300"){
      Simulation->ApplyPreset(ETLCBattlePreset::NarrowPass);
      Simulation->BuildBattle(30,70);
    }else if(S=="northvssouth"||S=="civilwar"){
      Simulation->ApplyPreset(ETLCBattlePreset::NorthVsSouth);
      Simulation->BuildBattle(50,50);
    }else if(S=="broadcast"||S=="arena"){
      Simulation->ApplyPreset(ETLCBattlePreset::BroadcastArena);
      Simulation->BuildBattle(50,50);
    }
  }

  static void Boss(const TArray<FString>& Args,UWorld* World)
  {
    if(Args.Num()==0)return;
    if(ATLCBattleSimulationDirector* Simulation=FindSimulation(World)){
      const FString S=Args[0].ToLower();
      if(S=="robot")Simulation->SpawnRobot();
      else if(S=="unicorn")Simulation->SpawnUnicorn();
      else if(S=="malegiant")Simulation->SpawnGiant(ETLCTeam::Men);
      else if(S=="femalegiant")Simulation->SpawnGiant(ETLCTeam::Women);
    }
  }

  static void Seed(const TArray<FString>& Args,UWorld* World)
  {
    if(Args.Num()==0)return;
    if(ATLCSpecialEventDirector* Director=FindEvents(World))Director->SetDeterministicSeed(FCString::Atoi(*Args[0]));
  }

  static FAutoConsoleCommandWithWorldAndArgs CmdEvent(
    TEXT("TLC.SpecialEvent"),
    TEXT("Force a TLC event. Example: TLC.SpecialEvent UFO"),
    FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&ForceEvent));

  static FAutoConsoleCommandWithWorldAndArgs CmdReset(
    TEXT("TLC.Reset"),
    TEXT("Atomically reset the current battle."),
    FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Reset));

  static FAutoConsoleCommandWithWorldAndArgs CmdPreset(
    TEXT("TLC.Preset"),
    TEXT("Set Broadcast, NarrowPass/300, or NorthVsSouth/CivilWar while Ready."),
    FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Preset));

  static FAutoConsoleCommandWithWorldAndArgs CmdBoss(
    TEXT("TLC.SpawnBoss"),
    TEXT("Spawn Robot, Unicorn, MaleGiant, or FemaleGiant."),
    FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Boss));

  static FAutoConsoleCommandWithWorldAndArgs CmdSeed(
    TEXT("TLC.EventSeed"),
    TEXT("Set deterministic special-event seed. Example: TLC.EventSeed 4242"),
    FConsoleCommandWithWorldAndArgsDelegate::CreateStatic(&Seed));
}

IMPLEMENT_PRIMARY_GAME_MODULE(FDefaultGameModuleImpl, TLCGenderClash, "TLCGenderClash");
