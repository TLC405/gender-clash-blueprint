#include "TLCBattleSimulation.h"
#include "TLCCommanderCharacter.h"
#include "TLCAIDecisionPolicy.h"
#include "Kismet/GameplayStatics.h"
#include "TLCProceduralArena.h"
#include "TLCVFXDirector.h"
#include "GameFramework/CharacterMovementComponent.h"

ATLCBattleSimulationDirector::ATLCBattleSimulationDirector(){PrimaryActorTick.bCanEverTick=true;}

void ATLCBattleSimulationDirector::BeginPlay(){
  Super::BeginPlay();
  WeaponDirector=GetWorld()->SpawnActor<ATLCWeaponDirector>();
  ProjectilePool=GetWorld()->SpawnActor<ATLCProjectilePool>();
  if(ProjectilePool)ProjectilePool->WarmPool();
  UFO=GetWorld()->SpawnActor<ATLCUFOActor>();
}

void ATLCBattleSimulationDirector::BindCameraDirector(ATLCCameraDirector* InDirector){CameraDirector=InDirector;}
void ATLCBattleSimulationDirector::BindPerformanceManager(ATLCPerformanceLODManager* InManager){PerformanceManager=InManager;}
void ATLCBattleSimulationDirector::BindVFXDirector(ATLCVFXDirector* InDirector){VFXDirector=InDirector;}

void ATLCBattleSimulationDirector::BindBattleDirector(ATLCBattleDirector* InDirector){
  if(BattleDirector){
    BattleDirector->OnResetRequested.RemoveDynamic(this,&ATLCBattleSimulationDirector::HandleBattleResetRequested);
    BattleDirector->OnPhaseChanged.RemoveDynamic(this,&ATLCBattleSimulationDirector::HandlePhaseChanged);
  }
  BattleDirector=InDirector;
  if(BattleDirector){
    BattleDirector->OnResetRequested.AddDynamic(this,&ATLCBattleSimulationDirector::HandleBattleResetRequested);
    BattleDirector->OnPhaseChanged.AddDynamic(this,&ATLCBattleSimulationDirector::HandlePhaseChanged);
  }
}

bool ATLCBattleSimulationDirector::BuildBattle(int32 MenCount,int32 WomenCount){
  FTLCBattleConfiguration Config;Config.MenCount=MenCount;Config.WomenCount=WomenCount;
  const FTLCBattleConfigurationResult Valid=UTLCBattleRulesLibrary::ValidateConfiguration(Config,100);
  if(!Valid.bSuccess||!GetWorld())return false;
  bSuppressAutoRebuild=true;
  ResetSimulation();
  BuiltMenCount=MenCount;BuiltWomenCount=WomenCount;

  if(BattleDirector){
    if(BattleDirector->GetPhase()!=ETLCBattlePhase::Ready)BattleDirector->ResetBattle();
    const auto Result=BattleDirector->ConfigureBattle(Config);
    if(!Result.bSuccess){bSuppressAutoRebuild=false;return false;}
  }
  bSuppressAutoRebuild=false;

  SpawnConfiguredFighters();
  return true;
}

void ATLCBattleSimulationDirector::StartSimulation(){bRunning=true;if(BattleDirector)BattleDirector->StartBattle();}
void ATLCBattleSimulationDirector::ResetSimulation(){
  bRunning=false;
  ClearEventTimers();
  if(VFXDirector)VFXDirector->ResetVFX();
  UGameplayStatics::SetGlobalTimeDilation(this,1.f);
  if(UFO)UFO->CancelAbduction();
  if(ProjectilePool)ProjectilePool->ResetPool();
  if(Commander){Commander->Destroy();Commander=nullptr;}
  for(ATLCFighterCharacter* F:Fighters)if(F)F->Destroy();
  Fighters.Reset();FighterStorage.Reset();NextAgentId=1;NextHitId=1;
}
void ATLCBattleSimulationDirector::HandleBattleResetRequested(){
  ResetSimulation();
  if(!bSuppressAutoRebuild&&GetWorld()){
    GetWorldTimerManager().SetTimerForNextTick(FTimerDelegate::CreateWeakLambda(this,[this](){SpawnConfiguredFighters();}));
  }
}
void ATLCBattleSimulationDirector::HandlePhaseChanged(ETLCBattlePhase Phase){bRunning=Phase==ETLCBattlePhase::Active||Phase==ETLCBattlePhase::SuddenDeath;}
void ATLCBattleSimulationDirector::Tick(float Dt){
  Super::Tick(Dt);if(Dt<=0.f)return;
  FrameSamples.Add(Dt*1000.f);if(FrameSamples.Num()>600)FrameSamples.RemoveAt(0,FrameSamples.Num()-600,false);
  PerformanceAccumulator+=Dt;if(PerformanceAccumulator<1.f)return;PerformanceAccumulator=0.f;
  if(FrameSamples.Num()>0){
    float Sum=0.f;TArray<float> Sorted=FrameSamples;for(float Ms:Sorted)Sum+=Ms;Sorted.Sort();AverageFrameMs=Sum/Sorted.Num();const int32 P99Index=FMath::Clamp(FMath::CeilToInt(Sorted.Num()*.99f)-1,0,Sorted.Num()-1);P99FrameMs=Sorted[P99Index];
    if(PerformanceManager){const float Pressure=PerformanceManager->ComputeQualityPressure(P99FrameMs,GetLivingNormalCount(ETLCTeam::Men)+GetLivingNormalCount(ETLCTeam::Women),GetActiveProjectileCount());PerformanceManager->ApplyScalabilityPressure(Pressure);if(VFXDirector)VFXDirector->SetQualityPressure(Pressure);if(ProjectilePool)ProjectilePool->SetActiveLimit(FMath::RoundToInt(FMath::Lerp(160.f,70.f,Pressure)));}
  }
}

void ATLCBattleSimulationDirector::SpawnConfiguredFighters(){
  for(int32 I=0;I<BuiltMenCount;++I)SpawnFighter(ETLCTeam::Men,ETLCFighterKind::Normal,I,BuiltMenCount);
  for(int32 I=0;I<BuiltWomenCount;++I)SpawnFighter(ETLCTeam::Women,ETLCFighterKind::Normal,I,BuiltWomenCount);
  RefreshFormationGoals(ETLCTeam::Men);RefreshFormationGoals(ETLCTeam::Women);
}

FVector ATLCBattleSimulationDirector::SlotToWorld(ETLCTeam Team,int32 TeamIndex,int32 TeamCount,ETLCFormation Formation)const{
  const FVector2D Slot=UTLCFormationLibrary::CalculateSlot(Formation,Team,TeamIndex,TeamCount,ArenaSize,140.f);
  return GetActorLocation()+FVector(Slot.X-ArenaSize.X*.5f,Slot.Y-ArenaSize.Y*.5f,95.f);
}

ATLCFighterCharacter* ATLCBattleSimulationDirector::SpawnFighter(ETLCTeam Team,ETLCFighterKind Kind,int32 TeamIndex,int32 TeamCount){
  const ETLCFormation Formation=Team==ETLCTeam::Men?MenFormation:WomenFormation;
  const FVector Spawn=SlotToWorld(Team,TeamIndex,TeamCount,Formation);
  ATLCFighterCharacter* F=GetWorld()->SpawnActor<ATLCFighterCharacter>(ATLCFighterCharacter::StaticClass(),Spawn,FRotator::ZeroRotator);
  if(!F)return nullptr;
  if(Team==ETLCTeam::Women&&Kind==ETLCFighterKind::Normal&&bFuriosaMode)Kind=ETLCFighterKind::Furiosa;
  F->InitializeFighter(Team,NextAgentId++,Kind,Formation,this);
  F->SetRage(Team==ETLCTeam::Men?bMenRage:bWomenRage);
  F->SetStrengthTuning(Team==ETLCTeam::Men?(.85f+MenStrengthValue*.04f):1.f);
  F->SetSpeedTuning(Team==ETLCTeam::Women?(.78f+WomenSpeedValue*.04f):1.f);
  F->SetWeapon(ChooseWeaponForFighter(F));
  F->SetFormationGoal(Spawn);
  ApplyPresetPalette(F);
  F->OnEliminated.AddDynamic(this,&ATLCBattleSimulationDirector::HandleFighterEliminated);
  FighterStorage.Add(F);Fighters.Add(F);return F;
}

void ATLCBattleSimulationDirector::RefreshFormationGoals(ETLCTeam Team){
  TArray<ATLCFighterCharacter*> TeamFighters;
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetTeam()==Team&&F->CountsTowardNormalTeam())TeamFighters.Add(F);
  const ETLCFormation Formation=Team==ETLCTeam::Men?MenFormation:WomenFormation;
  for(int32 I=0;I<TeamFighters.Num();++I){TeamFighters[I]->SetFormationType(Formation);TeamFighters[I]->SetFormationGoal(SlotToWorld(Team,I,TeamFighters.Num(),Formation));}
}
bool ATLCBattleSimulationDirector::SetTeamWeapon(ETLCTeam Team,ETLCWeaponType Weapon){
  if(!WeaponDirector||!WeaponDirector->CanTeamUse(Team,Weapon)||!IsWeaponAllowedByPreset(Weapon))return false;
  if(Team==ETLCTeam::Men){
    MenWeapon=Weapon;
    if(Weapon==ETLCWeaponType::Fists){bMenGunsEnabled=false;bMenSwordsEnabled=false;}
    else if(Weapon==ETLCWeaponType::Gun){bMenGunsEnabled=true;bMenSwordsEnabled=false;}
    else if(Weapon==ETLCWeaponType::Sword){bMenGunsEnabled=false;bMenSwordsEnabled=true;}
  }else if(Team==ETLCTeam::Women){
    WomenWeapon=Weapon;
    if(Weapon==ETLCWeaponType::Fists){bWomenLipstickEnabled=false;bWomenBombEnabled=false;}
    else if(Weapon==ETLCWeaponType::LipstickGun){bWomenLipstickEnabled=true;bWomenBombEnabled=false;}
    else if(Weapon==ETLCWeaponType::MakeupBomb){bWomenLipstickEnabled=false;bWomenBombEnabled=true;}
  }else return false;
  ApplyTeamLoadout(Team);return true;
}
bool ATLCBattleSimulationDirector::SetWeaponToggle(ETLCTeam Team,ETLCWeaponType Weapon,bool bEnabled){
  if(CurrentPreset!=ETLCBattlePreset::BroadcastArena)return false;
  if(Team==ETLCTeam::Men){
    if(Weapon==ETLCWeaponType::Gun)bMenGunsEnabled=bEnabled;
    else if(Weapon==ETLCWeaponType::Sword)bMenSwordsEnabled=bEnabled;
    else return false;
  }else if(Team==ETLCTeam::Women){
    if(Weapon==ETLCWeaponType::LipstickGun)bWomenLipstickEnabled=bEnabled;
    else if(Weapon==ETLCWeaponType::MakeupBomb)bWomenBombEnabled=bEnabled;
    else return false;
  }else return false;
  ApplyTeamLoadout(Team);return true;
}
void ATLCBattleSimulationDirector::SetTeamFormation(ETLCTeam Team,ETLCFormation Formation){
  if(Team==ETLCTeam::Men)MenFormation=Formation;else if(Team==ETLCTeam::Women)WomenFormation=Formation;
  RefreshFormationGoals(Team);
}
void ATLCBattleSimulationDirector::SetTeamRage(ETLCTeam Team,bool bEnabled){
  if(Team==ETLCTeam::Men)bMenRage=bEnabled;else if(Team==ETLCTeam::Women)bWomenRage=bEnabled;
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->GetTeam()==Team&&F->CountsTowardNormalTeam())F->SetRage(bEnabled);
}
void ATLCBattleSimulationDirector::SetMenStrength(float Value){
  MenStrengthValue=FMath::Clamp(Value,1.f,10.f);
  const float Multiplier=.85f+MenStrengthValue*.04f;
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->GetTeam()==ETLCTeam::Men&&F->CountsTowardNormalTeam())F->SetStrengthTuning(Multiplier);
}
void ATLCBattleSimulationDirector::SetWomenSpeed(float Value){
  WomenSpeedValue=FMath::Clamp(Value,1.f,10.f);
  const float Multiplier=.78f+WomenSpeedValue*.04f;
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->GetTeam()==ETLCTeam::Women&&F->CountsTowardNormalTeam())F->SetSpeedTuning(Multiplier);
}
void ATLCBattleSimulationDirector::SetFuriosaMode(bool bEnabled){
  bFuriosaMode=bEnabled;for(ATLCFighterCharacter* F:Fighters)if(F&&F->GetTeam()==ETLCTeam::Women&&F->CountsTowardNormalTeam())F->SetFuriosaState(bEnabled);
}

ATLCFighterCharacter* ATLCBattleSimulationDirector::FindBestTarget(ATLCFighterCharacter* R)const{
  if(!R||!R->IsBattleAlive())return nullptr;
  ATLCFighterCharacter* Best=nullptr;float BestScore=MAX_flt;
  const bool bRequesterBoss=R->GetKind()==ETLCFighterKind::Robot||R->GetKind()==ETLCFighterKind::Unicorn;
  for(ATLCFighterCharacter* F:Fighters){
    if(!F||!F->IsBattleAlive()||F->GetTeam()==R->GetTeam()||F->IsBeingAbducted())continue;
    float Score=FVector::DistSquared2D(R->GetActorLocation(),F->GetActorLocation());
    if(bRequesterBoss){
      const bool Counter=(R->GetKind()==ETLCFighterKind::Robot&&F->GetKind()==ETLCFighterKind::Unicorn)||(R->GetKind()==ETLCFighterKind::Unicorn&&F->GetKind()==ETLCFighterKind::Robot);
      if(Counter)Score*=.05f;
    }else{
      if((R->GetTeam()==ETLCTeam::Women&&F->GetKind()==ETLCFighterKind::Robot)||(R->GetTeam()==ETLCTeam::Men&&F->GetKind()==ETLCFighterKind::Unicorn))Score*=.45f;
      if(F->GetKind()==ETLCFighterKind::MaleGiant||F->GetKind()==ETLCFighterKind::FemaleGiant)Score*=.6f;
    }
    if(Score<BestScore){BestScore=Score;Best=F;}
  }
  return Best;
}

float ATLCBattleSimulationDirector::GetDesiredAttackRange(ATLCFighterCharacter* F)const{
  if(!F||!WeaponDirector)return 145.f;
  if(F->GetKind()==ETLCFighterKind::Robot||F->GetKind()==ETLCFighterKind::MaleGiant||F->GetKind()==ETLCFighterKind::FemaleGiant)return 245.f;
  if(F->GetKind()==ETLCFighterKind::Unicorn)return 210.f;
  return WeaponDirector->GetTuning(F->GetWeapon()).Range;
}

float ATLCBattleSimulationDirector::GetCloseDecisionInterval(int32 AgentId)const{return UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::CloseCombat,AgentId);}
float ATLCBattleSimulationDirector::GetLocalDecisionInterval(int32 AgentId)const{return UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::LocalTactical,AgentId);}
float ATLCBattleSimulationDirector::GetStrategicDecisionInterval(int32 AgentId)const{return UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::Strategic,AgentId);}

bool ATLCBattleSimulationDirector::ShouldPrioritizeCommander(ATLCFighterCharacter* Requester)const{
  if(!Requester||Requester->GetTeam()!=ETLCTeam::Women||!Commander||!Commander->IsHeroAlive())return false;
  const float Distance=FVector::Dist2D(Requester->GetActorLocation(),Commander->GetActorLocation());
  return Distance<=1050.f||GetLivingNormalCount(ETLCTeam::Men)<=12;
}
FVector ATLCBattleSimulationDirector::GetCommanderLocation()const{return Commander?Commander->GetActorLocation():GetActorLocation();}
float ATLCBattleSimulationDirector::ExecuteAttackOnCommander(ATLCFighterCharacter* A){
  if(!A||!Commander||!Commander->IsHeroAlive()||!WeaponDirector||A->GetTeam()!=ETLCTeam::Women)return 0.f;
  FTLCWeaponTuning Tune=WeaponDirector->GetTuning(A->GetWeapon());Tune.Damage*=A->GetDamageMultiplier();
  const FVector Dir=(Commander->GetActorLocation()-A->GetActorLocation()).GetSafeNormal();
  if(Tune.bRanged){
    if(!FireProjectileFrom(A->GetActorLocation()+Dir*70.f+FVector(0,0,80),Commander->GetActorLocation()+FVector(0,0,80),A->GetTeam(),Tune.Damage,Tune.Knockback,1450.f,2.2f))Commander->ApplyHeroDamage(Tune.Damage,Tune.Knockback,Dir);
  }else Commander->ApplyHeroDamage(Tune.Damage,Tune.Knockback,Dir);
  WeaponDirector->ReportWeaponFired(A->GetTeam(),A->GetWeapon());return Tune.Cooldown;
}
void ATLCBattleSimulationDirector::HandleCommanderEliminated(){if(BattleDirector)BattleDirector->SetHeroAlive(ETLCTeam::Men,false);}

void ATLCBattleSimulationDirector::NotifyImpactVFX(const FVector& Location,bool bProjectile){if(VFXDirector)VFXDirector->PlayCue(bProjectile?ETLCVFXCue::ProjectileImpact:ETLCVFXCue::MeleeImpact,Location);}

void ATLCBattleSimulationDirector::ExecuteBossSpecial(ATLCFighterCharacter* Boss){
  if(!Boss||!Boss->IsBattleAlive())return;
  const FVector Origin=Boss->GetActorLocation();
  if(Boss->GetKind()==ETLCFighterKind::Robot){
    ApplyRadialHit(Origin,340.f,ETLCTeam::Men,34.f,430.f);if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::RobotStomp,Origin);
    if(CameraDirector){FTLCCameraInterest I;I.Location=Origin;I.Score=.93f;I.Reason="RobotStomp";I.Subject=Boss;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}
  }else if(Boss->GetKind()==ETLCFighterKind::Unicorn){
    FVector Forward=Boss->GetActorForwardVector();
    ApplyConeHit(Origin,Forward,700.f,20.f,ETLCTeam::Women,28.f,500.f);if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::UnicornCharge,Origin,Forward);
    if(CameraDirector){FTLCCameraInterest I;I.Location=Origin+Forward*300.f;I.Score=.93f;I.Reason="UnicornCharge";I.Subject=Boss;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}
  }else if(Boss->GetKind()==ETLCFighterKind::MaleGiant||Boss->GetKind()==ETLCFighterKind::FemaleGiant){
    ApplyRadialHit(Origin,390.f,Boss->GetTeam(),38.f,610.f);if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::GiantStomp,Origin);
    if(CameraDirector){FTLCCameraInterest I;I.Location=Origin;I.Score=.91f;I.Reason="GiantStomp";I.Subject=Boss;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}
  }
}
float ATLCBattleSimulationDirector::GetRobotHealthNormalized()const{
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetKind()==ETLCFighterKind::Robot)return F->GetHealthNormalized();return -1.f;
}
float ATLCBattleSimulationDirector::GetUnicornHealthNormalized()const{
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetKind()==ETLCFighterKind::Unicorn)return F->GetHealthNormalized();return -1.f;
}

float ATLCBattleSimulationDirector::ExecuteAttack(ATLCFighterCharacter* A,ATLCFighterCharacter* T){
  if(!A||!T||!A->IsBattleAlive()||!T->IsBattleAlive()||!WeaponDirector)return 0.f;
  FTLCWeaponTuning Tune=WeaponDirector->GetTuning(A->GetWeapon());
  Tune.Damage*=A->GetDamageMultiplier();
  if(A->GetKind()==ETLCFighterKind::Robot){Tune.Damage=48.f;Tune.Knockback=320.f;Tune.Cooldown=1.05f;Tune.Range=245.f;Tune.bRanged=false;}
  if(A->GetKind()==ETLCFighterKind::Unicorn){Tune.Damage=39.f;Tune.Knockback=370.f;Tune.Cooldown=.82f;Tune.Range=210.f;Tune.bRanged=false;}
  if(A->GetKind()==ETLCFighterKind::MaleGiant||A->GetKind()==ETLCFighterKind::FemaleGiant){Tune.Damage=62.f;Tune.Knockback=520.f;Tune.Cooldown=1.3f;Tune.Range=280.f;Tune.bRanged=false;}

  if(Tune.bRanged){
    const FVector Dir=(T->GetActorLocation()-A->GetActorLocation()).GetSafeNormal();
    if(!FireProjectileFrom(A->GetActorLocation()+Dir*70.f+FVector(0,0,80),T->GetActorLocation()+FVector(0,0,60),A->GetTeam(),Tune.Damage,Tune.Knockback,1450.f,2.2f)){
      FTLCHitPayload Hit;Hit.HitId=NextHitId++;Hit.SourceTeam=A->GetTeam();Hit.Damage=Tune.Damage;Hit.Knockback=Tune.Knockback;Hit.Direction=Dir;T->ApplyBattleHit(Hit);
    }
  }else{
    FTLCHitPayload Hit;Hit.HitId=NextHitId++;Hit.SourceTeam=A->GetTeam();Hit.Damage=Tune.Damage;Hit.Knockback=Tune.Knockback;Hit.Direction=(T->GetActorLocation()-A->GetActorLocation()).GetSafeNormal();
    T->ApplyBattleHit(Hit);NotifyImpactVFX(T->GetActorLocation(),false);
  }
  WeaponDirector->ReportWeaponFired(A->GetTeam(),A->GetWeapon());
  return Tune.Cooldown;
}

bool ATLCBattleSimulationDirector::FireProjectileFrom(const FVector& Origin,const FVector& Target,ETLCTeam Team,float Damage,float Knockback,float Speed,float Lifetime){
  if(!ProjectilePool)return false;ATLCPooledProjectile* P=ProjectilePool->Acquire();if(!P)return false;
  const FVector Vel=(Target-Origin).GetSafeNormal()*Speed;
  P->ActivateProjectile(Origin,Vel,Team,Damage,Knockback,Lifetime,NextHitId++,this);return true;
}

void ATLCBattleSimulationDirector::HandleFighterEliminated(ATLCFighterCharacter* F){
  if(!F)return;
  if(F->CountsTowardNormalTeam()&&BattleDirector)BattleDirector->ReportElimination(F->GetTeam());
  if(BattleDirector&&F->GetKind()==ETLCFighterKind::Robot)BattleDirector->SetBossAlive(ETLCTeam::Men,false);
  if(BattleDirector&&F->GetKind()==ETLCFighterKind::Unicorn)BattleDirector->SetBossAlive(ETLCTeam::Women,false);
}

int32 ATLCBattleSimulationDirector::GetLivingNormalCount(ETLCTeam Team)const{
  int32 N=0;for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetTeam()==Team&&F->CountsTowardNormalTeam())++N;return N;
}
int32 ATLCBattleSimulationDirector::GetActiveProjectileCount()const{return ProjectilePool?ProjectilePool->ActiveCount():0;}

ATLCCommanderCharacter* ATLCBattleSimulationDirector::SpawnCommander(){
  if(Commander||!GetWorld())return Commander;
  const FVector Loc=GetActorLocation()+FVector(-ArenaSize.X*.38f,0,110.f);
  Commander=GetWorld()->SpawnActor<ATLCCommanderCharacter>(ATLCCommanderCharacter::StaticClass(),Loc,FRotator::ZeroRotator);
  if(Commander){Commander->OnAbilityTriggered.AddDynamic(this,&ATLCBattleSimulationDirector::HandleCommanderAbility);Commander->OnCommanderEliminated.AddDynamic(this,&ATLCBattleSimulationDirector::HandleCommanderEliminated);if(BattleDirector)BattleDirector->SetHeroAlive(ETLCTeam::Men,true);}
  return Commander;
}

ATLCFighterCharacter* ATLCBattleSimulationDirector::SpawnRobot(){
  ATLCFighterCharacter* F=SpawnFighter(ETLCTeam::Men,ETLCFighterKind::Robot,0,1);if(F){F->SetCountsTowardNormalTeam(false);F->SetWeapon(ETLCWeaponType::Fists);if(BattleDirector)BattleDirector->SetBossAlive(ETLCTeam::Men,true);if(CameraDirector){FTLCCameraInterest I;I.Location=F->GetActorLocation();I.Score=.82f;I.Reason="RobotSpawn";I.Subject=F;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}}return F;
}
ATLCFighterCharacter* ATLCBattleSimulationDirector::SpawnUnicorn(){
  ATLCFighterCharacter* F=SpawnFighter(ETLCTeam::Women,ETLCFighterKind::Unicorn,0,1);if(F){F->SetCountsTowardNormalTeam(false);F->SetWeapon(ETLCWeaponType::Fists);if(BattleDirector)BattleDirector->SetBossAlive(ETLCTeam::Women,true);if(CameraDirector){FTLCCameraInterest I;I.Location=F->GetActorLocation();I.Score=.84f;I.Reason="UnicornSpawn";I.Subject=F;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}}return F;
}
ATLCFighterCharacter* ATLCBattleSimulationDirector::SpawnGiant(ETLCTeam Team){
  const ETLCFighterKind K=Team==ETLCTeam::Women?ETLCFighterKind::FemaleGiant:ETLCFighterKind::MaleGiant;
  ATLCFighterCharacter* F=SpawnFighter(Team,K,0,1);if(F){F->SetCountsTowardNormalTeam(false);F->SetWeapon(ETLCWeaponType::Fists);if(CameraDirector){FTLCCameraInterest I;I.Location=F->GetActorLocation();I.Score=.9f;I.Reason="GiantSpawn";I.Subject=F;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}}return F;
}

TArray<ATLCFighterCharacter*> ATLCBattleSimulationDirector::CollectLivingEnemies(ETLCTeam Team)const{
  TArray<ATLCFighterCharacter*> R;for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetTeam()!=Team&&!F->IsBeingAbducted())R.Add(F);return R;
}
bool ATLCBattleSimulationDirector::TriggerUFO(int32 TargetCount){
  if(!UFO)return false;
  TArray<ATLCFighterCharacter*> Pool;
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->CountsTowardNormalTeam()&&!F->IsBeingAbducted())Pool.Add(F);
  if(Pool.Num()==0)return false;
  Pool.Sort([](const ATLCFighterCharacter& A,const ATLCFighterCharacter& B){return A.GetAgentId()<B.GetAgentId();});
  TArray<ATLCFighterCharacter*> Targets;
  const int32 Count=FMath::Min(TargetCount,Pool.Num());
  const int32 Step=FMath::Max(1,Pool.Num()/Count);
  for(int32 I=0;I<Count;++I)Targets.Add(Pool[(I*Step+7)%Pool.Num()]);
  UFO->StartAbduction(Targets,this);if(CameraDirector){FTLCCameraInterest I;I.Location=UFO->GetActorLocation();I.Score=.96f;I.Reason="UFO";I.Subject=UFO;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}return true;
}

void ATLCBattleSimulationDirector::ApplyRadialHit(const FVector& Origin,float Radius,ETLCTeam SourceTeam,float Damage,float Knockback){
  const int64 Hit=NextHitId++;
  for(ATLCFighterCharacter* F:Fighters){
    if(!F||!F->IsBattleAlive()||F->GetTeam()==SourceTeam)continue;
    const FVector Delta=F->GetActorLocation()-Origin;if(Delta.Size2D()>Radius)continue;
    FTLCHitPayload H;H.HitId=Hit;H.SourceTeam=SourceTeam;H.Damage=Damage;H.Knockback=Knockback;H.Direction=Delta.GetSafeNormal();H.bAreaEffect=true;F->ApplyBattleHit(H);
  }
}
void ATLCBattleSimulationDirector::ApplyConeHit(const FVector& Origin,const FVector& Forward,float Range,float HalfAngle,ETLCTeam SourceTeam,float Damage,float Knockback){
  const int64 Hit=NextHitId++;const FVector Fwd=Forward.GetSafeNormal2D();const float MinDot=FMath::Cos(FMath::DegreesToRadians(HalfAngle));
  for(ATLCFighterCharacter* F:Fighters){
    if(!F||!F->IsBattleAlive()||F->GetTeam()==SourceTeam)continue;
    const FVector Delta=F->GetActorLocation()-Origin;if(Delta.Size2D()>Range)continue;
    if(FVector::DotProduct(Fwd,Delta.GetSafeNormal2D())<MinDot)continue;
    FTLCHitPayload H;H.HitId=Hit;H.SourceTeam=SourceTeam;H.Damage=Damage;H.Knockback=Knockback;H.Direction=Delta.GetSafeNormal();H.bAreaEffect=true;F->ApplyBattleHit(H);
  }
}

void ATLCBattleSimulationDirector::HandleCommanderAbility(FName AbilityName){
  if(!Commander)return;
  const FVector Origin=Commander->GetActorLocation();const FVector Forward=Commander->GetActorForwardVector();
  if(AbilityName==FName(TEXT("Nuke"))){
    const FVector Blast=Origin+FVector(650,0,0);if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::NukeWarning,Blast);
    FTimerHandle Handle;GetWorldTimerManager().SetTimer(Handle,[this,Blast](){ApplyRadialHit(Blast,720.f,ETLCTeam::Men,72.f,620.f);if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::NukeBlast,Blast);},1.5f,false);ActiveEventTimers.Add(Handle);if(CameraDirector){FTLCCameraInterest I;I.Location=Origin+FVector(650,0,0);I.Score=.98f;I.Reason="NukeTelegraph";I.Subject=Commander;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}
  }else if(AbilityName==FName(TEXT("WaterCannon"))){
    ApplyConeHit(Origin,Forward,1100.f,28.f,ETLCTeam::Men,16.f,520.f);if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::WaterCannon,Origin,Forward);
  }else if(AbilityName==FName(TEXT("LipstickShot"))){
    TArray<ATLCFighterCharacter*> Enemies=CollectLivingEnemies(ETLCTeam::Men);if(Enemies.Num()){ATLCFighterCharacter* T=Enemies[0];float Best=MAX_flt;for(ATLCFighterCharacter* E:Enemies){const float D=FVector::DistSquared2D(Origin,E->GetActorLocation());if(D<Best){Best=D;T=E;}}FireProjectileFrom(Origin+FVector(0,0,90),T->GetActorLocation()+FVector(0,0,70),ETLCTeam::Men,46.f,140.f,2200.f,2.f);}
  }else if(AbilityName==FName(TEXT("ShockwaveSlam"))){
    ApplyRadialHit(Origin,460.f,ETLCTeam::Men,34.f,560.f);if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::Shockwave,Origin);
  }else if(AbilityName==FName(TEXT("RallyBuff"))){
    if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::Rally,Origin);for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetTeam()==ETLCTeam::Men&&FVector::Dist2D(Origin,F->GetActorLocation())<=900.f)F->ApplyRallyBuff(1.18f,8.f);
  }
}


void ATLCBattleSimulationDirector::ClearEventTimers(){
  if(!GetWorld())return;
  for(FTimerHandle& H:ActiveEventTimers)GetWorldTimerManager().ClearTimer(H);
  ActiveEventTimers.Reset();
}

void ATLCBattleSimulationDirector::ApplyPresetPalette(ATLCFighterCharacter* F)const{
  if(!F)return;
  if(CurrentPreset==ETLCBattlePreset::NarrowPass){
    if(F->GetTeam()==ETLCTeam::Men)F->SetVisualPalette(FLinearColor(.58f,.32f,.10f,1.f),FLinearColor(1.f,.70f,.20f,1.f));
    else if(F->GetTeam()==ETLCTeam::Women)F->SetVisualPalette(FLinearColor(.42f,.02f,.04f,1.f),FLinearColor(.95f,.18f,.12f,1.f));
  }else if(CurrentPreset==ETLCBattlePreset::NorthVsSouth){
    if(F->GetTeam()==ETLCTeam::Men)F->SetVisualPalette(FLinearColor(.08f,.22f,.52f,1.f),FLinearColor(.25f,.55f,1.f,1.f));
    else if(F->GetTeam()==ETLCTeam::Women)F->SetVisualPalette(FLinearColor(.33f,.31f,.27f,1.f),FLinearColor(.78f,.58f,.32f,1.f));
  }else{
    if(F->GetTeam()==ETLCTeam::Men)F->SetVisualPalette(FLinearColor(.05f,.24f,.82f,1.f),FLinearColor(.20f,.55f,1.f,1.f));
    else if(F->GetTeam()==ETLCTeam::Women)F->SetVisualPalette(FLinearColor(.82f,.04f,.24f,1.f),FLinearColor(1.f,.30f,.48f,1.f));
  }
}

ETLCWeaponType ATLCBattleSimulationDirector::ChooseWeaponForFighter(const ATLCFighterCharacter* Fighter)const{
  if(!Fighter)return ETLCWeaponType::Fists;
  if(CurrentPreset!=ETLCBattlePreset::BroadcastArena)return Fighter->GetTeam()==ETLCTeam::Men?MenWeapon:WomenWeapon;
  TArray<ETLCWeaponType> Choices;Choices.Add(ETLCWeaponType::Fists);
  if(Fighter->GetTeam()==ETLCTeam::Men){
    if(bMenGunsEnabled)Choices.Add(ETLCWeaponType::Gun);
    if(bMenSwordsEnabled)Choices.Add(ETLCWeaponType::Sword);
  }else if(Fighter->GetTeam()==ETLCTeam::Women){
    if(bWomenLipstickEnabled)Choices.Add(ETLCWeaponType::LipstickGun);
    if(bWomenBombEnabled)Choices.Add(ETLCWeaponType::MakeupBomb);
  }
  return Choices[FMath::Abs(Fighter->GetAgentId())%Choices.Num()];
}
void ATLCBattleSimulationDirector::ApplyTeamLoadout(ETLCTeam Team){
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetTeam()==Team&&F->CountsTowardNormalTeam())F->SetWeapon(ChooseWeaponForFighter(F));
}

bool ATLCBattleSimulationDirector::IsWeaponAllowedByPreset(ETLCWeaponType Weapon)const{
  if(CurrentPreset==ETLCBattlePreset::NarrowPass)return Weapon==ETLCWeaponType::Fists||Weapon==ETLCWeaponType::Sword||Weapon==ETLCWeaponType::Spear;
  if(CurrentPreset==ETLCBattlePreset::NorthVsSouth)return Weapon==ETLCWeaponType::Fists||Weapon==ETLCWeaponType::Musket;
  return Weapon!=ETLCWeaponType::Musket&&Weapon!=ETLCWeaponType::Spear;
}

void ATLCBattleSimulationDirector::ApplyPreset(ETLCBattlePreset Preset){
  if(BattleDirector&&(BattleDirector->GetPhase()!=ETLCBattlePhase::Ready))return;
  CurrentPreset=Preset;
  if(Preset==ETLCBattlePreset::NarrowPass){
    bMenGunsEnabled=bMenSwordsEnabled=bWomenLipstickEnabled=bWomenBombEnabled=false;
    ArenaSize=FVector2D(4200.f,1150.f);MenFormation=ETLCFormation::ShieldWall;WomenFormation=ETLCFormation::Rush;MenWeapon=ETLCWeaponType::Spear;WomenWeapon=ETLCWeaponType::Spear;
  }else if(Preset==ETLCBattlePreset::NorthVsSouth){
    bMenGunsEnabled=bMenSwordsEnabled=bWomenLipstickEnabled=bWomenBombEnabled=false;
    ArenaSize=FVector2D(4200.f,2300.f);MenFormation=ETLCFormation::Line;WomenFormation=ETLCFormation::Line;MenWeapon=ETLCWeaponType::Musket;WomenWeapon=ETLCWeaponType::Musket;
  }else{
    ArenaSize=FVector2D(4200.f,2300.f);MenFormation=ETLCFormation::Ranks;WomenFormation=ETLCFormation::Ranks;MenWeapon=ETLCWeaponType::Fists;WomenWeapon=ETLCWeaponType::Fists;
  }
  if(ATLCProceduralArena* A=Cast<ATLCProceduralArena>(UGameplayStatics::GetActorOfClass(this,ATLCProceduralArena::StaticClass())))A->ApplyPreset(Preset);
  for(ATLCFighterCharacter* F:Fighters){if(F){ApplyPresetPalette(F);F->SetWeapon(F->GetTeam()==ETLCTeam::Men?MenWeapon:WomenWeapon);}}
  RefreshFormationGoals(ETLCTeam::Men);RefreshFormationGoals(ETLCTeam::Women);
}

int32 ATLCBattleSimulationDirector::SpawnReinforcements(ETLCTeam Team,int32 RequestedCount){
  if(!BattleDirector)return 0;
  const int32 Accepted=BattleDirector->AddReinforcements(Team,RequestedCount);
  if(Accepted<=0)return 0;
  const int32 Existing=GetLivingNormalCount(Team);
  const int32 NewTotal=Existing+Accepted;
  for(int32 I=0;I<Accepted;++I)SpawnFighter(Team,ETLCFighterKind::Normal,Existing+I,NewTotal);
  RefreshFormationGoals(Team);return Accepted;
}

void ATLCBattleSimulationDirector::ExecuteSpecialEvent(ETLCSpecialEvent E){
  if(!GetWorld()||!BattleDirector)return;
  const FVector Center=GetActorLocation()+FVector(0,0,95.f);
  if(E==ETLCSpecialEvent::UFOAbduction){TriggerUFO(4);if(VFXDirector&&UFO)VFXDirector->PlayCue(ETLCVFXCue::UFOBeam,UFO->GetActorLocation());return;}
  if(E==ETLCSpecialEvent::MaleGiant){SpawnGiant(ETLCTeam::Men);return;}
  if(E==ETLCSpecialEvent::FemaleGiant){SpawnGiant(ETLCTeam::Women);return;}

  if(E==ETLCSpecialEvent::LightningStrike){
    TArray<ATLCFighterCharacter*> Living;for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->CountsTowardNormalTeam())Living.Add(F);
    if(Living.Num()){ATLCFighterCharacter* T=Living[(NextHitId*7)%Living.Num()];if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::Lightning,T->GetActorLocation());FTLCHitPayload H;H.HitId=NextHitId++;H.SourceTeam=ETLCTeam::Neutral;H.Damage=54.f;H.Knockback=260.f;H.Direction=FVector::UpVector;T->ApplyBattleHit(H);if(CameraDirector){FTLCCameraInterest I;I.Location=T->GetActorLocation();I.Score=.9f;I.Reason="Lightning";I.Subject=T;CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}}
    return;
  }

  if(E==ETLCSpecialEvent::Meteor){
    if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::Meteor,Center);
    FTimerHandle H;GetWorldTimerManager().SetTimer(H,[this,Center](){ApplyRadialHit(Center,620.f,ETLCTeam::Neutral,42.f,620.f);},1.5f,false);ActiveEventTimers.Add(H);
    if(CameraDirector){FTLCCameraInterest I;I.Location=Center;I.Score=.94f;I.Reason="Meteor";CameraDirector->SubmitInterest(I);CameraDirector->ResolveCameraFocus();}return;
  }

  if(E==ETLCSpecialEvent::LowGravity){
    for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive())F->GetCharacterMovement()->GravityScale=.28f;
    FTimerHandle H;GetWorldTimerManager().SetTimer(H,[this](){for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive())F->GetCharacterMovement()->GravityScale=1.f;},6.f,false);ActiveEventTimers.Add(H);return;
  }

  if(E==ETLCSpecialEvent::ReinforcementDrop){
    const auto S=BattleDirector->GetSnapshot();const ETLCTeam Trailing=S.Men.Alive<=S.Women.Alive?ETLCTeam::Men:ETLCTeam::Women;SpawnReinforcements(Trailing,5);return;
  }

  if(E==ETLCSpecialEvent::Stampede){
    ApplyConeHit(Center+FVector(-ArenaSize.X*.48f,0,0),FVector::ForwardVector,ArenaSize.X*.95f,18.f,ETLCTeam::Neutral,14.f,440.f);return;
  }

  if(E==ETLCSpecialEvent::Tornado){
    ApplyRadialHit(Center,850.f,ETLCTeam::Neutral,8.f,760.f);return;
  }

  if(E==ETLCSpecialEvent::RobotMalfunction){
    for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetKind()==ETLCFighterKind::Robot){FTLCHitPayload H;H.HitId=NextHitId++;H.SourceTeam=ETLCTeam::Neutral;H.Damage=135.f;H.Knockback=180.f;H.Direction=FVector::RightVector;F->ApplyBattleHit(H);break;}return;
  }

  if(E==ETLCSpecialEvent::UnicornRage){
    for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetKind()==ETLCFighterKind::Unicorn){F->SetRage(true);FTimerHandle H;TWeakObjectPtr<ATLCFighterCharacter> W=F;GetWorldTimerManager().SetTimer(H,[W](){if(W.IsValid())W->SetRage(false);},7.f,false);ActiveEventTimers.Add(H);break;}return;
  }

  if(E==ETLCSpecialEvent::GiantBeachBall){ApplyRadialHit(Center,760.f,ETLCTeam::Neutral,0.f,520.f);return;}

  if(E==ETLCSpecialEvent::HealingZone){
    if(VFXDirector)VFXDirector->PlayCue(ETLCVFXCue::HealingZone,Center);
    for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&FVector::Dist2D(Center,F->GetActorLocation())<=850.f)F->Heal(28.f);return;
  }

  if(E==ETLCSpecialEvent::SuddenFog){
    BattleDirector->SetBattleIntensity(.22f);FTimerHandle H;GetWorldTimerManager().SetTimer(H,[this](){if(BattleDirector)BattleDirector->SetBattleIntensity(.55f);},6.f,false);ActiveEventTimers.Add(H);return;
  }

  if(E==ETLCSpecialEvent::BattlefieldBlackout){
    UGameplayStatics::SetGlobalTimeDilation(this,.82f);FTimerHandle H;GetWorldTimerManager().SetTimer(H,[this](){UGameplayStatics::SetGlobalTimeDilation(this,1.f);},4.f,false);ActiveEventTimers.Add(H);return;
  }

  if(E==ETLCSpecialEvent::MascotInvasion){
    ATLCFighterCharacter* M=SpawnFighter(ETLCTeam::Neutral,ETLCFighterKind::MaleGiant,0,1);if(M){M->SetCountsTowardNormalTeam(false);M->SetMaxHealth(420.f);}return;
  }
}
