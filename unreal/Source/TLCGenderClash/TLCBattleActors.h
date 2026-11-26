#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Character.h"
#include "TLCBattleSystems.h"
#include "TLCArcadeRuntime.h"
#include "TLCAIDecisionPolicy.h"
#include "TLCBattleActors.generated.h"

class USphereComponent;
class UStaticMeshComponent;
class UTextRenderComponent;
class ATLCBattleSimulationDirector;
class ATLCFighterCharacter;

UENUM(BlueprintType)
enum class ETLCFighterKind : uint8 {
  Normal,
  Furiosa,
  Robot,
  Unicorn,
  MaleGiant,
  FemaleGiant
};

USTRUCT(BlueprintType)
struct FTLCHitPayload {
  GENERATED_BODY()

  UPROPERTY(EditAnywhere,BlueprintReadWrite) int64 HitId=0;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) ETLCTeam SourceTeam=ETLCTeam::Neutral;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Damage=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Knockback=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) FVector Direction=FVector::ForwardVector;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bAreaEffect=false;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCFighterEliminated,ATLCFighterCharacter*,Fighter);

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCFighterCharacter : public ACharacter {
  GENERATED_BODY()
public:
  ATLCFighterCharacter();
  virtual void BeginPlay() override;
  virtual void Tick(float DeltaSeconds) override;

  UPROPERTY(BlueprintAssignable) FTLCFighterEliminated OnEliminated;

  UFUNCTION(BlueprintCallable) void InitializeFighter(
    ETLCTeam InTeam,
    int32 InAgentId,
    ETLCFighterKind InKind,
    ETLCFormation InFormation,
    ATLCBattleSimulationDirector* InSimulation);

  UFUNCTION(BlueprintCallable) void SetFormationGoal(const FVector& Goal);
  UFUNCTION(BlueprintCallable) void SetFormationType(ETLCFormation NewFormation){Formation=NewFormation;}
  UFUNCTION(BlueprintCallable) void SetWeapon(ETLCWeaponType NewWeapon);
  UFUNCTION(BlueprintCallable) void SetRage(bool bEnabled);
  UFUNCTION(BlueprintCallable) void SetStrengthTuning(float Multiplier);
  UFUNCTION(BlueprintCallable) void SetSpeedTuning(float Multiplier);
  UFUNCTION(BlueprintCallable) void SetFuriosaState(bool bEnabled);
  UFUNCTION(BlueprintCallable) void ApplyRallyBuff(float Multiplier,float DurationSeconds);
  UFUNCTION(BlueprintCallable) void Heal(float Amount);
  UFUNCTION(BlueprintCallable) void SetVisualPalette(const FLinearColor& BodyColor,const FLinearColor& MarkerColor);
  UFUNCTION(BlueprintCallable) bool ApplyBattleHit(const FTLCHitPayload& Hit);
  UFUNCTION(BlueprintCallable) bool BeginAbduction(float LiftSeconds);
  UFUNCTION(BlueprintCallable) bool FinishAbduction();
  UFUNCTION(BlueprintCallable) void ResetForBattle();

  UFUNCTION(BlueprintPure) bool IsBattleAlive()const{return bAlive;}
  UFUNCTION(BlueprintPure) bool IsBeingAbducted()const{return bAbducting;}
  UFUNCTION(BlueprintPure) ETLCTeam GetTeam()const{return Team;}
  UFUNCTION(BlueprintPure) int32 GetAgentId()const{return AgentId;}
  UFUNCTION(BlueprintPure) ETLCFighterKind GetKind()const{return Kind;}
  UFUNCTION(BlueprintPure) float GetHealthNormalized()const{return MaxHealth>0.f?Health/MaxHealth:0.f;}
  UFUNCTION(BlueprintPure) ETLCWeaponType GetWeapon()const{return Weapon;}
  UFUNCTION(BlueprintPure) float GetDamageMultiplier()const{return DamageScale*TeamStrengthMultiplier*(bRage?1.16f:1.f)*RallyMultiplier*GetFormationDamageMultiplier();}
  UFUNCTION(BlueprintPure) bool CountsTowardNormalTeam()const{return bCountsTowardNormalTeam;}

  void SetCountsTowardNormalTeam(bool bValue){bCountsTowardNormalTeam=bValue;}
  void SetSimulation(ATLCBattleSimulationDirector* InSimulation){Simulation=InSimulation;}
  void SetMaxHealth(float NewMaxHealth);
  void SetMovementScale(float NewScale){MovementScale=NewScale;}
  void SetDamageScale(float NewScale){DamageScale=NewScale;}

protected:
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Torso;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Head;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> LeftArm;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> RightArm;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> LeftLeg;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> RightLeg;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> TeamMarker;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Hair;

private:
  UPROPERTY() TObjectPtr<ATLCBattleSimulationDirector> Simulation;
  UPROPERTY() TObjectPtr<ATLCFighterCharacter> CurrentTarget;

  ETLCTeam Team=ETLCTeam::Neutral;
  ETLCFighterKind Kind=ETLCFighterKind::Normal;
  ETLCFormation Formation=ETLCFormation::Ranks;
  ETLCWeaponType Weapon=ETLCWeaponType::Fists;
  int32 AgentId=0;
  FVector FormationGoal=FVector::ZeroVector;
  float MaxHealth=100.f;
  float Health=100.f;
  float DamageScale=1.f;
  float MovementScale=1.f;
  float TeamStrengthMultiplier=1.f;
  float TeamSpeedMultiplier=1.f;
  float RallyMultiplier=1.f;
  FLinearColor BodyTintOverride=FLinearColor::Transparent;
  FLinearColor MarkerTintOverride=FLinearColor::Transparent;
  float RallyEndsAt=-1.f;
  float NextCloseDecisionAt=0.f;
  float NextLocalDecisionAt=0.f;
  float NextStrategicDecisionAt=0.f;
  float NextAttackAt=0.f;
  bool bAlive=true;
  bool bRage=false;
  bool bAbducting=false;
  bool bCountsTowardNormalTeam=true;
  TSet<int64> RecentHitIds;
  FTLCAgentDecisionState DecisionState;

  void ConfigureKind();
  void ApplyTeamVisuals();
  void UpdateDecision(float Now);
  void UpdateMovement(float DeltaSeconds);
  void UpdateCombat(float Now);
  float GetDesiredMoveSpeed()const;
  float GetFormationDamageMultiplier()const;
  float GetFormationDamageTakenMultiplier(const FVector& IncomingDirection)const;
  bool ShouldHoldFormation(float Now)const;
  void Eliminate();
};

UCLASS()
class TLCGENDERCLASH_API ATLCPooledProjectile : public AActor {
  GENERATED_BODY()
public:
  ATLCPooledProjectile();
  virtual void Tick(float DeltaSeconds) override;

  UFUNCTION(BlueprintCallable) void ActivateProjectile(
    const FVector& Origin,
    const FVector& Velocity,
    ETLCTeam InTeam,
    float InDamage,
    float InKnockback,
    float LifetimeSeconds,
    int64 InHitId,
    ATLCBattleSimulationDirector* InSimulation);
  UFUNCTION(BlueprintCallable) void DeactivateProjectile();
  UFUNCTION(BlueprintPure) bool IsActiveProjectile()const{return bActiveProjectile;}

private:
  UPROPERTY(VisibleAnywhere) TObjectPtr<USphereComponent> Collision;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Visual;
  UPROPERTY() TObjectPtr<ATLCBattleSimulationDirector> Simulation;

  FVector Velocity=FVector::ZeroVector;
  ETLCTeam Team=ETLCTeam::Neutral;
  float Damage=0.f;
  float Knockback=0.f;
  float LifeRemaining=0.f;
  int64 HitId=0;
  bool bActiveProjectile=false;

  UFUNCTION() void HandleOverlap(UPrimitiveComponent* Overlapped,AActor* Other,UPrimitiveComponent* OtherComp,int32 BodyIndex,bool bFromSweep,const FHitResult& Sweep);
};

UCLASS()
class TLCGENDERCLASH_API ATLCProjectilePool : public AActor {
  GENERATED_BODY()
public:
  ATLCProjectilePool();

  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 PoolSize=160;
  UFUNCTION(BlueprintCallable) void WarmPool();
  UFUNCTION(BlueprintCallable) ATLCPooledProjectile* Acquire();
  UFUNCTION(BlueprintCallable) void ResetPool();
  UFUNCTION(BlueprintCallable) void SetActiveLimit(int32 NewLimit);
  UFUNCTION(BlueprintPure) int32 ActiveCount()const;

private:
  UPROPERTY() TArray<TObjectPtr<ATLCPooledProjectile>> Projectiles;
  int32 ActiveLimit=160;
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCUFOActor : public AActor {
  GENERATED_BODY()
public:
  ATLCUFOActor();
  virtual void Tick(float DeltaSeconds) override;

  UFUNCTION(BlueprintCallable) void StartAbduction(
    const TArray<ATLCFighterCharacter*>& Targets,
    ATLCBattleSimulationDirector* InSimulation,
    float TelegraphSeconds=1.2f,
    float LiftSeconds=2.4f);
  UFUNCTION(BlueprintCallable) void CancelAbduction();
  UFUNCTION(BlueprintPure) bool IsActiveAbduction()const{return bActive;}

private:
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Saucer;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UStaticMeshComponent> Beam;
  UPROPERTY() TObjectPtr<ATLCBattleSimulationDirector> Simulation;
  UPROPERTY() TArray<TObjectPtr<ATLCFighterCharacter>> Targets;
  float TelegraphRemaining=0.f;
  float LiftRemaining=0.f;
  bool bActive=false;
  bool bLiftStarted=false;
};
