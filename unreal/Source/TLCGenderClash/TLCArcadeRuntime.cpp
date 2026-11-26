#include "TLCArcadeRuntime.h"
#include "TLCCommanderCharacter.h"
#include "TLCAIIntegrationGatewaySubsystem.h"
#include "Kismet/GameplayStatics.h"

ATLCWeaponDirector::ATLCWeaponDirector(){
  PrimaryActorTick.bCanEverTick=false;
  WeaponTuning.Add(ETLCWeaponType::Fists,{ETLCWeaponType::Fists,18.f,145.f,.55f,80.f,false});
  WeaponTuning.Add(ETLCWeaponType::Gun,{ETLCWeaponType::Gun,26.f,1400.f,.75f,20.f,true});
  WeaponTuning.Add(ETLCWeaponType::Sword,{ETLCWeaponType::Sword,32.f,190.f,.72f,120.f,false});
  WeaponTuning.Add(ETLCWeaponType::LipstickGun,{ETLCWeaponType::LipstickGun,22.f,1200.f,.68f,25.f,true});
  WeaponTuning.Add(ETLCWeaponType::MakeupBomb,{ETLCWeaponType::MakeupBomb,28.f,900.f,2.4f,230.f,true});
}
FTLCWeaponTuning ATLCWeaponDirector::GetTuning(ETLCWeaponType T)const{
  if(const FTLCWeaponTuning*V=WeaponTuning.Find(T))return *V;return FTLCWeaponTuning();
}
bool ATLCWeaponDirector::CanTeamUse(ETLCTeam Team,ETLCWeaponType T)const{
  if(T==ETLCWeaponType::Fists)return true;
  if(Team==ETLCTeam::Men)return T==ETLCWeaponType::Gun||T==ETLCWeaponType::Sword;
  if(Team==ETLCTeam::Women)return T==ETLCWeaponType::LipstickGun||T==ETLCWeaponType::MakeupBomb;
  return false;
}
void ATLCWeaponDirector::ReportWeaponFired(ETLCTeam Team,ETLCWeaponType T){if(CanTeamUse(Team,T))OnWeaponFired.Broadcast(Team,T);}

ATLCCameraDirector::ATLCCameraDirector(){PrimaryActorTick.bCanEverTick=false;}
void ATLCCameraDirector::SubmitInterest(const FTLCCameraInterest&I){Interests.Add(I);}
void ATLCCameraDirector::ClearInterests(){Interests.Reset();}
FTLCCameraInterest ATLCCameraDirector::GetBestInterest()const{
  FTLCCameraInterest Best;for(const auto&I:Interests)if(I.Score>Best.Score)Best=I;return Best;
}
void ATLCCameraDirector::ResolveCameraFocus(){const auto Best=GetBestInterest();if(Best.Score>0)OnFocusChanged.Broadcast(Best);Interests.Reset();}

ATLCAnnouncerDirector::ATLCAnnouncerDirector(){PrimaryActorTick.bCanEverTick=false;}
bool ATLCAnnouncerDirector::TryAnnounce(const FTLCAnnouncerEvent&E){
  if(!GetWorld()||E.CachedLine.IsEmpty())return false;
  const double Now=GetWorld()->GetTimeSeconds();
  const double Last=LastSpokenAt.FindRef(E.EventName);
  if(GlobalLastSpoken>0&&Now-GlobalLastSpoken<GlobalCooldown)return false;
  if(Last>0&&Now-Last<E.MinimumCooldown)return false;
  LastSpokenAt.Add(E.EventName,Now);GlobalLastSpoken=Now;OnLineReady.Broadcast(E.EventName,E.CachedLine);return true;
}
void ATLCAnnouncerDirector::ResetAnnouncer(){LastSpokenAt.Reset();GlobalLastSpoken=0;}

ATLCPerformanceLODManager::ATLCPerformanceLODManager(){PrimaryActorTick.bCanEverTick=false;}
float ATLCPerformanceLODManager::ComputeQualityPressure(float Ms,int32 Fighters,int32 Projectiles)const{
  const float FramePressure=FMath::Clamp((Ms-16.67f)/16.67f,0.f,1.f);
  const float FighterPressure=FMath::Clamp((Fighters-75.f)/25.f,0.f,1.f);
  const float ProjectilePressure=FMath::Clamp((Projectiles-100.f)/60.f,0.f,1.f);
  return FMath::Clamp(FramePressure*.55f+FighterPressure*.25f+ProjectilePressure*.20f,0.f,1.f);
}


ATLCBattleRuntimeCoordinator::ATLCBattleRuntimeCoordinator(){
  PrimaryActorTick.bCanEverTick=false;
}

void ATLCBattleRuntimeCoordinator::BeginPlay(){
  Super::BeginPlay();
  RebindRuntimeSystems();
}

void ATLCBattleRuntimeCoordinator::RebindRuntimeSystems(){
  if(BattleDirector){
    BattleDirector->OnResetRequested.RemoveDynamic(this,&ATLCBattleRuntimeCoordinator::HandleResetRequested);
    BattleDirector->OnPauseChanged.RemoveDynamic(this,&ATLCBattleRuntimeCoordinator::HandlePauseChanged);
    BattleDirector->OnPhaseChanged.RemoveDynamic(this,&ATLCBattleRuntimeCoordinator::HandlePhaseChanged);
  }

  BattleDirector=Cast<ATLCBattleDirector>(UGameplayStatics::GetActorOfClass(GetWorld(),ATLCBattleDirector::StaticClass()));
  SpecialEventDirector=Cast<ATLCSpecialEventDirector>(UGameplayStatics::GetActorOfClass(GetWorld(),ATLCSpecialEventDirector::StaticClass()));
  AudioDirector=Cast<ATLCAudioDirector>(UGameplayStatics::GetActorOfClass(GetWorld(),ATLCAudioDirector::StaticClass()));
  CameraDirector=Cast<ATLCCameraDirector>(UGameplayStatics::GetActorOfClass(GetWorld(),ATLCCameraDirector::StaticClass()));
  AnnouncerDirector=Cast<ATLCAnnouncerDirector>(UGameplayStatics::GetActorOfClass(GetWorld(),ATLCAnnouncerDirector::StaticClass()));
  Commander=Cast<ATLCCommanderCharacter>(UGameplayStatics::GetActorOfClass(GetWorld(),ATLCCommanderCharacter::StaticClass()));
  Gateway=GetGameInstance()?GetGameInstance()->GetSubsystem<UTLCAIIntegrationGatewaySubsystem>():nullptr;

  if(BattleDirector){
    BattleDirector->OnResetRequested.AddDynamic(this,&ATLCBattleRuntimeCoordinator::HandleResetRequested);
    BattleDirector->OnPauseChanged.AddDynamic(this,&ATLCBattleRuntimeCoordinator::HandlePauseChanged);
    BattleDirector->OnPhaseChanged.AddDynamic(this,&ATLCBattleRuntimeCoordinator::HandlePhaseChanged);
    if(Gateway)Gateway->SetBattleContext(BattleDirector->GetMatchId(),BattleDirector->GetBattleGeneration());
  }
}

void ATLCBattleRuntimeCoordinator::HandleResetRequested(){
  if(SpecialEventDirector)SpecialEventDirector->ResetEventState();
  if(AudioDirector)AudioDirector->ResetAudioState();
  if(CameraDirector)CameraDirector->ClearInterests();
  if(AnnouncerDirector)AnnouncerDirector->ResetAnnouncer();
  if(Commander)Commander->ResetAbilityCooldowns();
  if(Gateway)Gateway->CancelPendingRequests();
  ResetPoolsAndPresentation();
}

void ATLCBattleRuntimeCoordinator::HandlePauseChanged(bool bPaused){
  if(AudioDirector)AudioDirector->SetBattlePaused(bPaused);
}

void ATLCBattleRuntimeCoordinator::HandlePhaseChanged(ETLCBattlePhase NewPhase){
  if(!BattleDirector||!Gateway)return;
  if(NewPhase==ETLCBattlePhase::Active||NewPhase==ETLCBattlePhase::SuddenDeath||NewPhase==ETLCBattlePhase::Ready){
    Gateway->SetBattleContext(BattleDirector->GetMatchId(),BattleDirector->GetBattleGeneration());
  }
}
