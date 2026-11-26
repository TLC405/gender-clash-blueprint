#include "TLCGenderClashPlayerController.h"
#include "TLCBattleHUDWidget.h"
#include "TLCVerticalSliceGameMode.h"
#include "TLCBattleSimulation.h"
#include "TLCCommanderCharacter.h"
#include "TLCSpectatorCameraActor.h"
#include "Kismet/GameplayStatics.h"

ATLCGenderClashPlayerController::ATLCGenderClashPlayerController(){bShowMouseCursor=true;bEnableClickEvents=true;bEnableTouchEvents=true;}

void ATLCGenderClashPlayerController::BeginPlay(){
  Super::BeginPlay();
  SpectatorCamera=GetWorld()->SpawnActor<ATLCSpectatorCameraActor>();
  if(SpectatorCamera)SetViewTarget(SpectatorCamera);

  if(ATLCVerticalSliceGameMode* GM=GetWorld()->GetAuthGameMode<ATLCVerticalSliceGameMode>()){
    if(SpectatorCamera)SpectatorCamera->BindDirector(Cast<ATLCCameraDirector>(UGameplayStatics::GetActorOfClass(this,ATLCCameraDirector::StaticClass())));
    BattleHUD=CreateWidget<UTLCBattleHUDWidget>(this,UTLCBattleHUDWidget::StaticClass());
    if(BattleHUD){
      BattleHUD->AddToViewport(10);
      BattleHUD->BindRuntime(GM->GetBattleDirector(),GM->GetSimulation(),GM->GetSpecialEventDirector(),SpectatorCamera);
      BattleHUD->BindAnnouncer(Cast<ATLCAnnouncerDirector>(UGameplayStatics::GetActorOfClass(this,ATLCAnnouncerDirector::StaticClass())));
    }
  }
}

void ATLCGenderClashPlayerController::SetupInputComponent(){
  Super::SetupInputComponent();
  InputComponent->BindKey(EKeys::Space,IE_Pressed,this,&ATLCGenderClashPlayerController::StartKey);
  FInputKeyBinding& PauseBinding=InputComponent->BindKey(EKeys::P,IE_Pressed,this,&ATLCGenderClashPlayerController::PauseKey);PauseBinding.bExecuteWhenPaused=true;
  FInputKeyBinding& ResetBinding=InputComponent->BindKey(EKeys::R,IE_Pressed,this,&ATLCGenderClashPlayerController::ResetKey);ResetBinding.bExecuteWhenPaused=true;
  InputComponent->BindAxis(TEXT("CommanderForward"),this,&ATLCGenderClashPlayerController::CommanderForward);
  InputComponent->BindAxis(TEXT("CommanderRight"),this,&ATLCGenderClashPlayerController::CommanderRight);
}
void ATLCGenderClashPlayerController::StartKey(){if(auto* GM=GetWorld()->GetAuthGameMode<ATLCVerticalSliceGameMode>())if(GM->GetSimulation())GM->GetSimulation()->StartSimulation();}
void ATLCGenderClashPlayerController::PauseKey(){if(auto* GM=GetWorld()->GetAuthGameMode<ATLCVerticalSliceGameMode>())if(GM->GetBattleDirector())GM->GetBattleDirector()->PauseBattle();}
void ATLCGenderClashPlayerController::ResetKey(){if(auto* GM=GetWorld()->GetAuthGameMode<ATLCVerticalSliceGameMode>())if(GM->GetBattleDirector())GM->GetBattleDirector()->ResetBattle();}
void ATLCGenderClashPlayerController::CommanderForward(float V){
  if(FMath::IsNearlyZero(V))return;if(auto* GM=GetWorld()->GetAuthGameMode<ATLCVerticalSliceGameMode>())if(auto* S=GM->GetSimulation())if(auto* C=S->SpawnCommander())C->AddMovementInput(FVector::ForwardVector,V);
}
void ATLCGenderClashPlayerController::CommanderRight(float V){
  if(FMath::IsNearlyZero(V))return;if(auto* GM=GetWorld()->GetAuthGameMode<ATLCVerticalSliceGameMode>())if(auto* S=GM->GetSimulation())if(auto* C=S->SpawnCommander())C->AddMovementInput(FVector::RightVector,V);
}
