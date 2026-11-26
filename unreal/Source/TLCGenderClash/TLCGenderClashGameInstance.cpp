#include "TLCGenderClashGameInstance.h"
#include "TLCBattleSystems.h"
#include "Kismet/GameplayStatics.h"
#include "Misc/CoreDelegates.h"

void UTLCGenderClashGameInstance::Init(){
  Super::Init();
  FCoreDelegates::ApplicationWillEnterBackgroundDelegate.AddUObject(this,&UTLCGenderClashGameInstance::HandleBackground);
  FCoreDelegates::ApplicationWillDeactivateDelegate.AddUObject(this,&UTLCGenderClashGameInstance::HandleBackground);
  FCoreDelegates::ApplicationHasEnteredForegroundDelegate.AddUObject(this,&UTLCGenderClashGameInstance::HandleForeground);
  FCoreDelegates::ApplicationHasReactivatedDelegate.AddUObject(this,&UTLCGenderClashGameInstance::HandleForeground);
}
void UTLCGenderClashGameInstance::Shutdown(){
  FCoreDelegates::ApplicationWillEnterBackgroundDelegate.RemoveAll(this);
  FCoreDelegates::ApplicationWillDeactivateDelegate.RemoveAll(this);
  FCoreDelegates::ApplicationHasEnteredForegroundDelegate.RemoveAll(this);
  FCoreDelegates::ApplicationHasReactivatedDelegate.RemoveAll(this);
  Super::Shutdown();
}
void UTLCGenderClashGameInstance::HandleBackground(){
  if(!GetWorld())return;
  ATLCBattleDirector* D=Cast<ATLCBattleDirector>(UGameplayStatics::GetActorOfClass(GetWorld(),ATLCBattleDirector::StaticClass()));
  if(D&&(D->GetPhase()==ETLCBattlePhase::Active||D->GetPhase()==ETLCBattlePhase::SuddenDeath)){bPausedByLifecycle=D->PauseBattle();}
}
void UTLCGenderClashGameInstance::HandleForeground(){
  // Deliberately do not auto-resume. The player sees PAUSED and explicitly resumes.
  bPausedByLifecycle=false;
}
