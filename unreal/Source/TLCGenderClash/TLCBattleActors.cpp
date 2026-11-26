#include "TLCBattleActors.h"
#include "TLCBattleSimulation.h"
#include "Components/SphereComponent.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "UObject/ConstructorHelpers.h"
#include "Materials/MaterialInstanceDynamic.h"

namespace {
  static UStaticMesh* LoadCube(){
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Mesh(TEXT("/Engine/BasicShapes/Cube.Cube"));
    return Mesh.Succeeded()?Mesh.Object:nullptr;
  }
  static UStaticMesh* LoadSphere(){
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Mesh(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
    return Mesh.Succeeded()?Mesh.Object:nullptr;
  }
  static UStaticMesh* LoadCylinder(){
    static ConstructorHelpers::FObjectFinder<UStaticMesh> Mesh(TEXT("/Engine/BasicShapes/Cylinder.Cylinder"));
    return Mesh.Succeeded()?Mesh.Object:nullptr;
  }
}

ATLCFighterCharacter::ATLCFighterCharacter(){
  PrimaryActorTick.bCanEverTick=true;
  GetCharacterMovement()->bUseRVOAvoidance=true;
  GetCharacterMovement()->AvoidanceConsiderationRadius=150.f;
  GetCharacterMovement()->MaxWalkSpeed=420.f;
  GetCharacterMovement()->BrakingDecelerationWalking=1600.f;

  Torso=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Torso"));
  Torso->SetupAttachment(GetRootComponent());
  Torso->SetStaticMesh(LoadCube());
  Torso->SetRelativeLocation(FVector(0,0,55));
  Torso->SetRelativeScale3D(FVector(.42f,.28f,.65f));
  Torso->SetCollisionEnabled(ECollisionEnabled::NoCollision);

  Head=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Head"));
  Head->SetupAttachment(GetRootComponent());
  Head->SetStaticMesh(LoadSphere());
  Head->SetRelativeLocation(FVector(0,0,132));
  Head->SetRelativeScale3D(FVector(.28f));
  Head->SetCollisionEnabled(ECollisionEnabled::NoCollision);

  LeftArm=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftArm"));
  LeftArm->SetupAttachment(GetRootComponent());
  LeftArm->SetStaticMesh(LoadCylinder());
  LeftArm->SetRelativeLocation(FVector(0,-34,58));
  LeftArm->SetRelativeRotation(FRotator(0,0,10));
  LeftArm->SetRelativeScale3D(FVector(.12f,.12f,.55f));
  LeftArm->SetCollisionEnabled(ECollisionEnabled::NoCollision);

  RightArm=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightArm"));
  RightArm->SetupAttachment(GetRootComponent());
  RightArm->SetStaticMesh(LoadCylinder());
  RightArm->SetRelativeLocation(FVector(0,34,58));
  RightArm->SetRelativeRotation(FRotator(0,0,-10));
  RightArm->SetRelativeScale3D(FVector(.12f,.12f,.55f));
  RightArm->SetCollisionEnabled(ECollisionEnabled::NoCollision);

  LeftLeg=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftLeg"));
  LeftLeg->SetupAttachment(GetRootComponent());
  LeftLeg->SetStaticMesh(LoadCylinder());
  LeftLeg->SetRelativeLocation(FVector(0,-16,-18));
  LeftLeg->SetRelativeScale3D(FVector(.14f,.14f,.65f));
  LeftLeg->SetCollisionEnabled(ECollisionEnabled::NoCollision);

  RightLeg=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightLeg"));
  RightLeg->SetupAttachment(GetRootComponent());
  RightLeg->SetStaticMesh(LoadCylinder());
  RightLeg->SetRelativeLocation(FVector(0,16,-18));
  RightLeg->SetRelativeScale3D(FVector(.14f,.14f,.65f));
  RightLeg->SetCollisionEnabled(ECollisionEnabled::NoCollision);

  Hair=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Hair"));
  Hair->SetupAttachment(GetRootComponent());Hair->SetStaticMesh(LoadSphere());Hair->SetRelativeLocation(FVector(0,0,150));Hair->SetRelativeScale3D(FVector(.31f,.31f,.16f));Hair->SetCollisionEnabled(ECollisionEnabled::NoCollision);

  TeamMarker=CreateDefaultSubobject<UTextRenderComponent>(TEXT("TeamMarker"));
  TeamMarker->SetupAttachment(GetRootComponent());
  TeamMarker->SetRelativeLocation(FVector(0,0,178));
  TeamMarker->SetHorizontalAlignment(EHTA_Center);
  TeamMarker->SetWorldSize(28.f);
  TeamMarker->SetCollisionEnabled(ECollisionEnabled::NoCollision);
}

void ATLCFighterCharacter::BeginPlay(){Super::BeginPlay();ApplyTeamVisuals();}

void ATLCFighterCharacter::InitializeFighter(ETLCTeam InTeam,int32 InAgentId,ETLCFighterKind InKind,ETLCFormation InFormation,ATLCBattleSimulationDirector* InSimulation){
  Team=InTeam;AgentId=InAgentId;Kind=InKind;Formation=InFormation;Simulation=InSimulation;
  bCountsTowardNormalTeam=(Kind==ETLCFighterKind::Normal||Kind==ETLCFighterKind::Furiosa);
  ConfigureKind();ResetForBattle();ApplyTeamVisuals();
  const float Offset=(AgentId%11)*.013f;
  NextCloseDecisionAt=Offset;
  NextLocalDecisionAt=Offset;
  NextStrategicDecisionAt=Offset*4.f;
  DecisionState=FTLCAgentDecisionState();DecisionState.AgentId=AgentId;DecisionState.MinimumCommitmentSeconds=.85f;DecisionState.HysteresisRatio=.15f;
}

void ATLCFighterCharacter::ConfigureKind(){
  MaxHealth=100.f;DamageScale=1.f;MovementScale=1.f;SetActorScale3D(FVector::OneVector);
  if(Team==ETLCTeam::Men&&Kind==ETLCFighterKind::Normal)SetActorScale3D(FVector(1.06f,1.08f,1.12f));
  if(Team==ETLCTeam::Women&&Kind==ETLCFighterKind::Normal)SetActorScale3D(FVector(.98f,.96f,1.0f));
  if(Kind==ETLCFighterKind::Furiosa){MaxHealth=145.f;DamageScale=1.18f;MovementScale=1.04f;SetActorScale3D(FVector(1.12f));}
  if(Kind==ETLCFighterKind::Robot){MaxHealth=720.f;DamageScale=2.0f;MovementScale=.72f;SetActorScale3D(FVector(1.75f));}
  if(Kind==ETLCFighterKind::Unicorn){MaxHealth=560.f;DamageScale=1.65f;MovementScale=1.30f;SetActorScale3D(FVector(1.55f));}
  if(Kind==ETLCFighterKind::MaleGiant||Kind==ETLCFighterKind::FemaleGiant){MaxHealth=980.f;DamageScale=2.45f;MovementScale=.68f;SetActorScale3D(FVector(2.2f));}
  Health=MaxHealth;
}

void ATLCFighterCharacter::ApplyTeamVisuals(){
  const FLinearColor DefaultBody=Team==ETLCTeam::Men?FLinearColor(.05f,.24f,.82f,1.f):Team==ETLCTeam::Women?FLinearColor(.82f,.04f,.24f,1.f):FLinearColor(.75f,.70f,.22f,1.f);
  const FLinearColor DefaultMarker=Team==ETLCTeam::Men?FLinearColor(.20f,.55f,1.f,1.f):Team==ETLCTeam::Women?FLinearColor(1.f,.30f,.48f,1.f):FLinearColor(1.f,.82f,.18f,1.f);
  const FLinearColor Tint=BodyTintOverride.A>0.f?BodyTintOverride:DefaultBody;
  const FLinearColor Marker=MarkerTintOverride.A>0.f?MarkerTintOverride:DefaultMarker;
  TeamMarker->SetText(Team==ETLCTeam::Men?FText::FromString(TEXT("M")):Team==ETLCTeam::Women?FText::FromString(TEXT("W")):FText::FromString(TEXT("!")));
  TeamMarker->SetTextRenderColor(Marker.ToFColor(true));

  TArray<UStaticMeshComponent*> Parts={Torso,Head,LeftArm,RightArm,LeftLeg,RightLeg};
  for(UStaticMeshComponent* Part:Parts){
    if(!Part)continue;
    for(int32 I=0;I<Part->GetNumMaterials();++I){
      if(UMaterialInterface* Base=Part->GetMaterial(I)){
        UMaterialInstanceDynamic* Dyn=UMaterialInstanceDynamic::Create(Base,this);
        Dyn->SetVectorParameterValue(TEXT("Color"),Tint);
        Part->SetMaterial(I,Dyn);
      }
    }
  }
  if(Hair){
    const bool bFemaleHair=(Team==ETLCTeam::Women&&Kind!=ETLCFighterKind::Furiosa);
    Hair->SetVisibility(bFemaleHair);
    if(bFemaleHair){
      for(int32 I=0;I<Hair->GetNumMaterials();++I)if(UMaterialInterface* Base=Hair->GetMaterial(I)){UMaterialInstanceDynamic* Dyn=UMaterialInstanceDynamic::Create(Base,this);Dyn->SetVectorParameterValue(TEXT("Color"),FLinearColor(1.f,.72f,.16f,1.f));Hair->SetMaterial(I,Dyn);}
      Hair->SetRelativeScale3D(Kind==ETLCFighterKind::FemaleGiant?FVector(.38f,.38f,.22f):FVector(.31f,.31f,.16f));
    }
  }
  if(Kind==ETLCFighterKind::FemaleGiant||Kind==ETLCFighterKind::Furiosa)Head->SetRelativeScale3D(FVector(.34f,.34f,.30f));
}

void ATLCFighterCharacter::ResetForBattle(){
  Health=MaxHealth;bAlive=true;bAbducting=false;bRage=false;RallyMultiplier=1.f;RallyEndsAt=-1.f;
  RecentHitIds.Reset();CurrentTarget=nullptr;SetActorHiddenInGame(false);SetActorEnableCollision(true);
  GetCharacterMovement()->SetMovementMode(MOVE_Walking);
}

void ATLCFighterCharacter::SetFormationGoal(const FVector& Goal){FormationGoal=Goal;}
void ATLCFighterCharacter::SetWeapon(ETLCWeaponType NewWeapon){Weapon=NewWeapon;}
void ATLCFighterCharacter::SetRage(bool bEnabled){bRage=bEnabled;}
void ATLCFighterCharacter::SetFuriosaState(bool bEnabled){
  if(Team!=ETLCTeam::Women||(Kind!=ETLCFighterKind::Normal&&Kind!=ETLCFighterKind::Furiosa))return;
  const float HealthRatio=MaxHealth>0.f?FMath::Clamp(Health/MaxHealth,0.f,1.f):1.f;
  Kind=bEnabled?ETLCFighterKind::Furiosa:ETLCFighterKind::Normal;ConfigureKind();Health=MaxHealth*HealthRatio;ApplyTeamVisuals();
}
void ATLCFighterCharacter::SetMaxHealth(float NewMaxHealth){MaxHealth=FMath::Max(1.f,NewMaxHealth);Health=FMath::Min(Health,MaxHealth);}
void ATLCFighterCharacter::Heal(float Amount){if(bAlive&&!bAbducting)Health=FMath::Clamp(Health+FMath::Max(0.f,Amount),0.f,MaxHealth);}
void ATLCFighterCharacter::SetVisualPalette(const FLinearColor& BodyColor,const FLinearColor& MarkerColor){BodyTintOverride=BodyColor;MarkerTintOverride=MarkerColor;ApplyTeamVisuals();}
void ATLCFighterCharacter::ApplyRallyBuff(float Multiplier,float DurationSeconds){
  RallyMultiplier=FMath::Max(1.f,Multiplier);
  RallyEndsAt=(GetWorld()?GetWorld()->GetTimeSeconds():0.f)+FMath::Max(0.f,DurationSeconds);
}

float ATLCFighterCharacter::GetDesiredMoveSpeed()const{
  const float Rage=bRage?1.18f:1.f;
  return 420.f*MovementScale*Rage*RallyMultiplier;
}

void ATLCFighterCharacter::Tick(float Dt){
  Super::Tick(Dt);
  if(!bAlive||bAbducting||!Simulation||!Simulation->IsSimulationRunning())return;
  const float Now=GetWorld()?GetWorld()->GetTimeSeconds():0.f;
  if(RallyEndsAt>0.f&&Now>=RallyEndsAt){RallyEndsAt=-1.f;RallyMultiplier=1.f;}
  const bool bClose=CurrentTarget&&CurrentTarget->IsBattleAlive()&&FVector::DistSquared2D(GetActorLocation(),CurrentTarget->GetActorLocation())<FMath::Square(520.f);
  if((bClose&&Now>=NextCloseDecisionAt)||(!bClose&&Now>=NextLocalDecisionAt)){
    UpdateDecision(Now);
    if(bClose)NextCloseDecisionAt=Now+Simulation->GetCloseDecisionInterval(AgentId);
    else NextLocalDecisionAt=Now+Simulation->GetLocalDecisionInterval(AgentId);
  }
  UpdateMovement(Dt);
  UpdateCombat(Now);
}

void ATLCFighterCharacter::UpdateDecision(float Now){
  if(!Simulation)return;
  if(CurrentTarget&&!CurrentTarget->IsBattleAlive()){
    CurrentTarget=nullptr;DecisionState.CurrentTarget=nullptr;DecisionState.CurrentAction=NAME_None;DecisionState.LastTargetLossTime=Now;
  }

  ATLCFighterCharacter* CandidateTarget=Simulation->FindBestTarget(this);
  if(CandidateTarget){
    const float Distance=FVector::Dist2D(GetActorLocation(),CandidateTarget->GetActorLocation());
    FTLCDecisionCandidate Candidate;
    Candidate.Target=CandidateTarget;
    Candidate.Destination=CandidateTarget->GetActorLocation();
    Candidate.ExpectedRange=Simulation->GetDesiredAttackRange(this);
    Candidate.Score=FMath::Clamp(1.f/(1.f+Distance/1200.f),.05f,1.f);
    Candidate.FormationDisruptionRisk=FMath::Clamp(FVector::Dist2D(FormationGoal,Candidate.Destination)/4200.f,0.f,1.f);
    Candidate.bNavigationFeasible=true;
    Candidate.ValidForSeconds=Distance<Candidate.ExpectedRange*2.f?.20f:.65f;
    const bool bBoss=CandidateTarget->GetKind()==ETLCFighterKind::Robot||CandidateTarget->GetKind()==ETLCFighterKind::Unicorn||CandidateTarget->GetKind()==ETLCFighterKind::MaleGiant||CandidateTarget->GetKind()==ETLCFighterKind::FemaleGiant;
    Candidate.Action=bBoss?FName(TEXT("AttackBoss")):(Simulation->GetDesiredAttackRange(CandidateTarget)>500.f?FName(TEXT("AttackRanged")):FName(TEXT("Advance")));
    Candidate.AlternateAction=FName(TEXT("HoldFormation"));
    Candidate.bSurvivalCritical=GetHealthNormalized()<.18f;

    if(!CurrentTarget||UTLCAIDecisionPolicy::ShouldSwitchBehavior(DecisionState,Candidate,Now)){
      CurrentTarget=CandidateTarget;
      DecisionState.CurrentTarget=CurrentTarget;
      DecisionState.CurrentAction=Candidate.Action;
      DecisionState.CurrentScore=Candidate.Score;
      DecisionState.BehaviorEntryTime=Now;
    }
  }

  if(!CurrentTarget&&Now>=NextStrategicDecisionAt){
    DecisionState.CurrentAction=FName(TEXT("FormUp"));DecisionState.CurrentScore=.25f;DecisionState.BehaviorEntryTime=Now;
    NextStrategicDecisionAt=Now+Simulation->GetStrategicDecisionInterval(AgentId);
  }
}

void ATLCFighterCharacter::UpdateMovement(float Dt){
  FVector Destination=FormationGoal;
  if(CurrentTarget&&CurrentTarget->IsBattleAlive())Destination=CurrentTarget->GetActorLocation();
  FVector Dir=Destination-GetActorLocation();Dir.Z=0.f;
  const float Dist=Dir.Size();
  const float StopDistance=Simulation?Simulation->GetDesiredAttackRange(this):130.f;
  if(Dist>StopDistance*.82f){
    GetCharacterMovement()->MaxWalkSpeed=GetDesiredMoveSpeed();
    AddMovementInput(Dir.GetSafeNormal(),1.f);
    if(!Dir.IsNearlyZero())SetActorRotation(Dir.Rotation());
  }
}

void ATLCFighterCharacter::UpdateCombat(float Now){
  if(!CurrentTarget||!CurrentTarget->IsBattleAlive()||Now<NextAttackAt||!Simulation)return;
  const float Range=Simulation->GetDesiredAttackRange(this);
  const float Dist=FVector::Dist2D(GetActorLocation(),CurrentTarget->GetActorLocation());
  if(Dist>Range)return;
  const float Cooldown=Simulation->ExecuteAttack(this,CurrentTarget);
  if(Cooldown>0.f)NextAttackAt=Now+Cooldown;
}

bool ATLCFighterCharacter::ApplyBattleHit(const FTLCHitPayload& Hit){
  if(!bAlive||bAbducting||Hit.SourceTeam==Team)return false;
  if(Hit.HitId!=0&&RecentHitIds.Contains(Hit.HitId))return false;
  if(Hit.HitId!=0){
    RecentHitIds.Add(Hit.HitId);
    if(RecentHitIds.Num()>32)RecentHitIds.Reset();
  }
  Health-=FMath::Max(0.f,Hit.Damage);
  if(Hit.Knockback>0.f){
    FVector Launch=Hit.Direction.GetSafeNormal()*FMath::Min(Hit.Knockback,Kind==ETLCFighterKind::Robot?540.f:980.f);
    Launch.Z=FMath::Min(260.f,Hit.Knockback*.22f);
    LaunchCharacter(Launch,true,true);
  }
  if(Health<=0.f){Eliminate();return true;}
  return false;
}

void ATLCFighterCharacter::Eliminate(){
  if(!bAlive)return;
  bAlive=false;
  GetCharacterMovement()->StopMovementImmediately();
  SetActorEnableCollision(false);
  OnEliminated.Broadcast(this);
  SetLifeSpan(2.0f);
}

bool ATLCFighterCharacter::BeginAbduction(float LiftSeconds){
  if(!bAlive||bAbducting)return false;
  bAbducting=true;GetCharacterMovement()->DisableMovement();
  return true;
}

bool ATLCFighterCharacter::FinishAbduction(){
  if(!bAlive||!bAbducting)return false;
  bAbducting=false;Eliminate();return true;
}

ATLCPooledProjectile::ATLCPooledProjectile(){
  PrimaryActorTick.bCanEverTick=true;
  Collision=CreateDefaultSubobject<USphereComponent>(TEXT("Collision"));
  SetRootComponent(Collision);Collision->SetSphereRadius(12.f);Collision->SetGenerateOverlapEvents(true);
  Collision->SetCollisionProfileName(TEXT("OverlapAllDynamic"));
  Collision->OnComponentBeginOverlap.AddDynamic(this,&ATLCPooledProjectile::HandleOverlap);
  Visual=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Visual"));
  Visual->SetupAttachment(Collision);Visual->SetStaticMesh(LoadSphere());Visual->SetRelativeScale3D(FVector(.12f));
  Visual->SetCollisionEnabled(ECollisionEnabled::NoCollision);
  DeactivateProjectile();
}

void ATLCPooledProjectile::ActivateProjectile(const FVector& Origin,const FVector& InVelocity,ETLCTeam InTeam,float InDamage,float InKnockback,float LifetimeSeconds,int64 InHitId,ATLCBattleSimulationDirector* InSimulation){
  SetActorLocation(Origin);Velocity=InVelocity;Team=InTeam;Damage=InDamage;Knockback=InKnockback;LifeRemaining=LifetimeSeconds;HitId=InHitId;Simulation=InSimulation;
  bActiveProjectile=true;SetActorHiddenInGame(false);SetActorEnableCollision(true);SetActorTickEnabled(true);
}

void ATLCPooledProjectile::DeactivateProjectile(){
  bActiveProjectile=false;SetActorHiddenInGame(true);SetActorEnableCollision(false);SetActorTickEnabled(false);Velocity=FVector::ZeroVector;LifeRemaining=0.f;
}

void ATLCPooledProjectile::Tick(float Dt){
  Super::Tick(Dt);if(!bActiveProjectile)return;
  SetActorLocation(GetActorLocation()+Velocity*Dt,true);
  LifeRemaining-=Dt;if(LifeRemaining<=0.f)DeactivateProjectile();
}

void ATLCPooledProjectile::HandleOverlap(UPrimitiveComponent*,AActor* Other,UPrimitiveComponent*,int32,bool,const FHitResult&){
  if(!bActiveProjectile||!Other)return;
  if(ATLCFighterCharacter* Fighter=Cast<ATLCFighterCharacter>(Other)){
    if(Fighter->GetTeam()==Team)return;
    FTLCHitPayload Hit;Hit.HitId=HitId;Hit.SourceTeam=Team;Hit.Damage=Damage;Hit.Knockback=Knockback;Hit.Direction=Velocity.GetSafeNormal();
    Fighter->ApplyBattleHit(Hit);DeactivateProjectile();
  }
}

ATLCProjectilePool::ATLCProjectilePool(){PrimaryActorTick.bCanEverTick=false;}
void ATLCProjectilePool::WarmPool(){
  if(!GetWorld()||Projectiles.Num()>0)return;
  for(int32 I=0;I<PoolSize;++I){
    ATLCPooledProjectile* P=GetWorld()->SpawnActor<ATLCPooledProjectile>(ATLCPooledProjectile::StaticClass(),FVector::ZeroVector,FRotator::ZeroRotator);
    if(P){P->DeactivateProjectile();Projectiles.Add(P);}
  }
}
ATLCPooledProjectile* ATLCProjectilePool::Acquire(){
  if(ActiveCount()>=ActiveLimit)return nullptr;
  for(ATLCPooledProjectile* P:Projectiles)if(P&&!P->IsActiveProjectile())return P;
  return nullptr;
}
void ATLCProjectilePool::ResetPool(){for(ATLCPooledProjectile* P:Projectiles)if(P)P->DeactivateProjectile();}
void ATLCProjectilePool::SetActiveLimit(int32 NewLimit){ActiveLimit=FMath::Clamp(NewLimit,1,PoolSize);}
int32 ATLCProjectilePool::ActiveCount()const{int32 N=0;for(const ATLCPooledProjectile* P:Projectiles)if(P&&P->IsActiveProjectile())++N;return N;}

ATLCUFOActor::ATLCUFOActor(){
  PrimaryActorTick.bCanEverTick=true;
  Saucer=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Saucer"));SetRootComponent(Saucer);Saucer->SetStaticMesh(LoadCylinder());Saucer->SetRelativeScale3D(FVector(2.6f,2.6f,.28f));Saucer->SetCollisionEnabled(ECollisionEnabled::NoCollision);
  Beam=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("Beam"));Beam->SetupAttachment(Saucer);Beam->SetStaticMesh(LoadCylinder());Beam->SetRelativeLocation(FVector(0,0,-260));Beam->SetRelativeScale3D(FVector(.55f,.55f,5.f));Beam->SetCollisionEnabled(ECollisionEnabled::NoCollision);Beam->SetVisibility(false);
  SetActorHiddenInGame(true);
}
void ATLCUFOActor::StartAbduction(const TArray<ATLCFighterCharacter*>& InTargets,ATLCBattleSimulationDirector* InSimulation,float TelegraphSeconds,float LiftSeconds){
  CancelAbduction();Simulation=InSimulation;
  for(ATLCFighterCharacter* F:InTargets)if(F&&F->IsBattleAlive()&&!F->IsBeingAbducted())Targets.Add(F);
  if(Targets.Num()==0)return;
  FVector Center=FVector::ZeroVector;for(ATLCFighterCharacter* F:Targets)Center+=F->GetActorLocation();Center/=Targets.Num();Center.Z=650.f;SetActorLocation(Center);
  TelegraphRemaining=TelegraphSeconds;LiftRemaining=LiftSeconds;bActive=true;bLiftStarted=false;SetActorHiddenInGame(false);SetActorTickEnabled(true);
}
void ATLCUFOActor::CancelAbduction(){Targets.Reset();bActive=false;bLiftStarted=false;TelegraphRemaining=0.f;LiftRemaining=0.f;Beam->SetVisibility(false);SetActorHiddenInGame(true);}
void ATLCUFOActor::Tick(float Dt){
  Super::Tick(Dt);if(!bActive)return;
  if(!bLiftStarted){
    TelegraphRemaining-=Dt;
    if(TelegraphRemaining<=0.f){
      bLiftStarted=true;Beam->SetVisibility(true);
      for(ATLCFighterCharacter* F:Targets)if(F)F->BeginAbduction(LiftRemaining);
    }
    return;
  }
  LiftRemaining-=Dt;
  for(ATLCFighterCharacter* F:Targets){
    if(F&&F->IsBattleAlive()&&F->IsBeingAbducted()){
      FVector L=F->GetActorLocation();L.Z=FMath::FInterpTo(L.Z,GetActorLocation().Z-80.f,Dt,2.8f);F->SetActorLocation(L);
    }
  }
  if(LiftRemaining<=0.f){
    for(ATLCFighterCharacter* F:Targets)if(F)F->FinishAbduction();
    CancelAbduction();
  }
}
