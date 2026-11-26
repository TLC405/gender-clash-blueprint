#include "TLCBattleSimulation.h"
#include "TLCCommanderCharacter.h"
#include "TLCAIDecisionPolicy.h"
#include "Kismet/GameplayStatics.h"

ATLCBattleSimulationDirector::ATLCBattleSimulationDirector(){PrimaryActorTick.bCanEverTick=true;}

void ATLCBattleSimulationDirector::BeginPlay(){
  Super::BeginPlay();
  WeaponDirector=GetWorld()->SpawnActor<ATLCWeaponDirector>();
  ProjectilePool=GetWorld()->SpawnActor<ATLCProjectilePool>();
  if(ProjectilePool)ProjectilePool->WarmPool();
  UFO=GetWorld()->SpawnActor<ATLCUFOActor>();
}

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
  bSuppressAutoRebuild=false;
  BuiltMenCount=MenCount;BuiltWomenCount=WomenCount;

  if(BattleDirector){
    if(BattleDirector->GetPhase()!=ETLCBattlePhase::Ready)BattleDirector->ResetBattle();
    const auto Result=BattleDirector->ConfigureBattle(Config);
    if(!Result.bSuccess)return false;
  }

  SpawnConfiguredFighters();
  return true;
}

void ATLCBattleSimulationDirector::StartSimulation(){bRunning=true;if(BattleDirector)BattleDirector->StartBattle();}
void ATLCBattleSimulationDirector::ResetSimulation(){
  bRunning=false;
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
void ATLCBattleSimulationDirector::Tick(float Dt){Super::Tick(Dt);}

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
  F->InitializeFighter(Team,NextAgentId++,Kind,Formation,this);
  F->SetWeapon(Team==ETLCTeam::Men?MenWeapon:WomenWeapon);
  F->SetFormationGoal(Spawn);
  F->OnEliminated.AddDynamic(this,&ATLCBattleSimulationDirector::HandleFighterEliminated);
  FighterStorage.Add(F);Fighters.Add(F);return F;
}

void ATLCBattleSimulationDirector::RefreshFormationGoals(ETLCTeam Team){
  TArray<ATLCFighterCharacter*> TeamFighters;
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetTeam()==Team&&F->CountsTowardNormalTeam())TeamFighters.Add(F);
  const ETLCFormation Formation=Team==ETLCTeam::Men?MenFormation:WomenFormation;
  for(int32 I=0;I<TeamFighters.Num();++I)TeamFighters[I]->SetFormationGoal(SlotToWorld(Team,I,TeamFighters.Num(),Formation));
}
void ATLCBattleSimulationDirector::SetTeamWeapon(ETLCTeam Team,ETLCWeaponType Weapon){
  if(!WeaponDirector||!WeaponDirector->CanTeamUse(Team,Weapon))return;
  if(Team==ETLCTeam::Men)MenWeapon=Weapon;else if(Team==ETLCTeam::Women)WomenWeapon=Weapon;
  for(ATLCFighterCharacter* F:Fighters)if(F&&F->GetTeam()==Team&&F->CountsTowardNormalTeam())F->SetWeapon(Weapon);
}
void ATLCBattleSimulationDirector::SetTeamFormation(ETLCTeam Team,ETLCFormation Formation){
  if(Team==ETLCTeam::Men)MenFormation=Formation;else if(Team==ETLCTeam::Women)WomenFormation=Formation;
  RefreshFormationGoals(Team);
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

float ATLCBattleSimulationDirector::GetLocalDecisionInterval(int32 AgentId)const{return UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::LocalTactical,AgentId);}
float ATLCBattleSimulationDirector::GetStrategicDecisionInterval(int32 AgentId)const{return UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::Strategic,AgentId);}

float ATLCBattleSimulationDirector::ExecuteAttack(ATLCFighterCharacter* A,ATLCFighterCharacter* T){
  if(!A||!T||!A->IsBattleAlive()||!T->IsBattleAlive()||!WeaponDirector)return 0.f;
  FTLCWeaponTuning Tune=WeaponDirector->GetTuning(A->GetWeapon());
  if(A->GetKind()==ETLCFighterKind::Robot){Tune.Damage=48.f;Tune.Knockback=320.f;Tune.Cooldown=1.05f;Tune.Range=245.f;Tune.bRanged=false;}
  if(A->GetKind()==ETLCFighterKind::Unicorn){Tune.Damage=39.f;Tune.Knockback=370.f;Tune.Cooldown=.82f;Tune.Range=210.f;Tune.bRanged=false;}
  if(A->GetKind()==ETLCFighterKind::MaleGiant||A->GetKind()==ETLCFighterKind::FemaleGiant){Tune.Damage=62.f;Tune.Knockback=520.f;Tune.Cooldown=1.3f;Tune.Range=280.f;Tune.bRanged=false;}

  if(Tune.bRanged){
    const FVector Dir=(T->GetActorLocation()-A->GetActorLocation()).GetSafeNormal();
    FireProjectileFrom(A->GetActorLocation()+Dir*70.f+FVector(0,0,80),T->GetActorLocation()+FVector(0,0,60),A->GetTeam(),Tune.Damage,Tune.Knockback,1450.f,2.2f);
  }else{
    FTLCHitPayload Hit;Hit.HitId=NextHitId++;Hit.SourceTeam=A->GetTeam();Hit.Damage=Tune.Damage;Hit.Knockback=Tune.Knockback;Hit.Direction=(T->GetActorLocation()-A->GetActorLocation()).GetSafeNormal();
    T->ApplyBattleHit(Hit);
  }
  WeaponDirector->ReportWeaponFired(A->GetTeam(),A->GetWeapon());
  return Tune.Cooldown;
}

void ATLCBattleSimulationDirector::FireProjectileFrom(const FVector& Origin,const FVector& Target,ETLCTeam Team,float Damage,float Knockback,float Speed,float Lifetime){
  if(!ProjectilePool)return;ATLCPooledProjectile* P=ProjectilePool->Acquire();if(!P)return;
  const FVector Vel=(Target-Origin).GetSafeNormal()*Speed;
  P->ActivateProjectile(Origin,Vel,Team,Damage,Knockback,Lifetime,NextHitId++,this);
}

void ATLCBattleSimulationDirector::HandleFighterEliminated(ATLCFighterCharacter* F){
  if(!F)return;
  if(F->CountsTowardNormalTeam()&&BattleDirector)BattleDirector->ReportElimination(F->GetTeam());
}

int32 ATLCBattleSimulationDirector::GetLivingNormalCount(ETLCTeam Team)const{
  int32 N=0;for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetTeam()==Team&&F->CountsTowardNormalTeam())++N;return N;
}
int32 ATLCBattleSimulationDirector::GetActiveProjectileCount()const{return ProjectilePool?ProjectilePool->ActiveCount():0;}

ATLCCommanderCharacter* ATLCBattleSimulationDirector::SpawnCommander(){
  if(Commander||!GetWorld())return Commander;
  const FVector Loc=GetActorLocation()+FVector(-ArenaSize.X*.38f,0,110.f);
  Commander=GetWorld()->SpawnActor<ATLCCommanderCharacter>(ATLCCommanderCharacter::StaticClass(),Loc,FRotator::ZeroRotator);
  if(Commander)Commander->OnAbilityTriggered.AddDynamic(this,&ATLCBattleSimulationDirector::HandleCommanderAbility);
  return Commander;
}

ATLCFighterCharacter* ATLCBattleSimulationDirector::SpawnRobot(){
  ATLCFighterCharacter* F=SpawnFighter(ETLCTeam::Men,ETLCFighterKind::Robot,0,1);if(F){F->SetCountsTowardNormalTeam(false);F->SetWeapon(ETLCWeaponType::Fists);}return F;
}
ATLCFighterCharacter* ATLCBattleSimulationDirector::SpawnUnicorn(){
  ATLCFighterCharacter* F=SpawnFighter(ETLCTeam::Women,ETLCFighterKind::Unicorn,0,1);if(F){F->SetCountsTowardNormalTeam(false);F->SetWeapon(ETLCWeaponType::Fists);}return F;
}
ATLCFighterCharacter* ATLCBattleSimulationDirector::SpawnGiant(ETLCTeam Team){
  const ETLCFighterKind K=Team==ETLCTeam::Women?ETLCFighterKind::FemaleGiant:ETLCFighterKind::MaleGiant;
  ATLCFighterCharacter* F=SpawnFighter(Team,K,0,1);if(F){F->SetCountsTowardNormalTeam(false);F->SetWeapon(ETLCWeaponType::Fists);}return F;
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
  UFO->StartAbduction(Targets,this);return true;
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
    FTimerHandle Handle;GetWorldTimerManager().SetTimer(Handle,[this,Origin](){ApplyRadialHit(Origin+FVector(650,0,0),720.f,ETLCTeam::Men,72.f,620.f);},1.5f,false);
  }else if(AbilityName==FName(TEXT("WaterCannon"))){
    ApplyConeHit(Origin,Forward,1100.f,28.f,ETLCTeam::Men,16.f,520.f);
  }else if(AbilityName==FName(TEXT("LipstickShot"))){
    TArray<ATLCFighterCharacter*> Enemies=CollectLivingEnemies(ETLCTeam::Men);if(Enemies.Num()){ATLCFighterCharacter* T=Enemies[0];float Best=MAX_flt;for(ATLCFighterCharacter* E:Enemies){const float D=FVector::DistSquared2D(Origin,E->GetActorLocation());if(D<Best){Best=D;T=E;}}FireProjectileFrom(Origin+FVector(0,0,90),T->GetActorLocation()+FVector(0,0,70),ETLCTeam::Men,46.f,140.f,2200.f,2.f);}
  }else if(AbilityName==FName(TEXT("ShockwaveSlam"))){
    ApplyRadialHit(Origin,460.f,ETLCTeam::Men,34.f,560.f);
  }else if(AbilityName==FName(TEXT("RallyBuff"))){
    for(ATLCFighterCharacter* F:Fighters)if(F&&F->IsBattleAlive()&&F->GetTeam()==ETLCTeam::Men&&FVector::Dist2D(Origin,F->GetActorLocation())<=900.f)F->ApplyRallyBuff(1.18f,8.f);
  }
}
