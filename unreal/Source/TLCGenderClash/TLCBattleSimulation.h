#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TLCBattleSystems.h"
#include "TLCArcadeRuntime.h"
#include "TLCBattleActors.h"
#include "TLCBattleSimulation.generated.h"

class ATLCCommanderCharacter;

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCBattleSimulationDirector : public AActor {
  GENERATED_BODY()
public:
  ATLCBattleSimulationDirector();
  virtual void BeginPlay() override;
  virtual void Tick(float DeltaSeconds) override;

  UPROPERTY(EditAnywhere,BlueprintReadWrite) FVector2D ArenaSize=FVector2D(4200.f,2300.f);
  UPROPERTY(EditAnywhere,BlueprintReadWrite) ETLCFormation MenFormation=ETLCFormation::Ranks;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) ETLCFormation WomenFormation=ETLCFormation::Ranks;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) ETLCWeaponType MenWeapon=ETLCWeaponType::Fists;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) ETLCWeaponType WomenWeapon=ETLCWeaponType::Fists;

  UFUNCTION(BlueprintCallable) void BindBattleDirector(ATLCBattleDirector* InDirector);
  UFUNCTION(BlueprintCallable) bool BuildBattle(int32 MenCount=50,int32 WomenCount=50);
  UFUNCTION(BlueprintCallable) void StartSimulation();
  UFUNCTION(BlueprintCallable) void ResetSimulation();
  UFUNCTION(BlueprintCallable) void SetTeamWeapon(ETLCTeam Team,ETLCWeaponType Weapon);
  UFUNCTION(BlueprintCallable) void SetTeamFormation(ETLCTeam Team,ETLCFormation Formation);
  UFUNCTION(BlueprintCallable) ATLCCommanderCharacter* SpawnCommander();
  UFUNCTION(BlueprintCallable) ATLCFighterCharacter* SpawnRobot();
  UFUNCTION(BlueprintCallable) ATLCFighterCharacter* SpawnUnicorn();
  UFUNCTION(BlueprintCallable) ATLCFighterCharacter* SpawnGiant(ETLCTeam Team);
  UFUNCTION(BlueprintCallable) bool TriggerUFO(int32 TargetCount=4);
  UFUNCTION(BlueprintCallable) void HandleCommanderAbility(FName AbilityName);

  UFUNCTION(BlueprintPure) ATLCFighterCharacter* FindBestTarget(const ATLCFighterCharacter* Requester)const;
  UFUNCTION(BlueprintPure) float GetDesiredAttackRange(const ATLCFighterCharacter* Fighter)const;
  UFUNCTION(BlueprintPure) float GetLocalDecisionInterval(int32 AgentId)const;
  UFUNCTION(BlueprintPure) float GetStrategicDecisionInterval(int32 AgentId)const;
  UFUNCTION(BlueprintCallable) float ExecuteAttack(ATLCFighterCharacter* Attacker,ATLCFighterCharacter* Target);

  UFUNCTION(BlueprintPure) int32 GetLivingNormalCount(ETLCTeam Team)const;
  UFUNCTION(BlueprintPure) int32 GetActiveProjectileCount()const;
  UFUNCTION(BlueprintPure) const TArray<ATLCFighterCharacter*>& GetFighters()const{return Fighters;}

private:
  UPROPERTY() TObjectPtr<ATLCBattleDirector> BattleDirector;
  UPROPERTY() TObjectPtr<ATLCWeaponDirector> WeaponDirector;
  UPROPERTY() TObjectPtr<ATLCProjectilePool> ProjectilePool;
  UPROPERTY() TObjectPtr<ATLCCommanderCharacter> Commander;
  UPROPERTY() TObjectPtr<ATLCUFOActor> UFO;
  UPROPERTY() TArray<TObjectPtr<ATLCFighterCharacter>> FighterStorage;
  TArray<ATLCFighterCharacter*> Fighters;

  int64 NextHitId=1;
  int32 NextAgentId=1;
  bool bRunning=false;

  UFUNCTION() void HandleFighterEliminated(ATLCFighterCharacter* Fighter);
  UFUNCTION() void HandleBattleResetRequested();
  UFUNCTION() void HandlePhaseChanged(ETLCBattlePhase Phase);

  ATLCFighterCharacter* SpawnFighter(ETLCTeam Team,ETLCFighterKind Kind,int32 TeamIndex,int32 TeamCount);
  FVector SlotToWorld(ETLCTeam Team,int32 TeamIndex,int32 TeamCount,ETLCFormation Formation)const;
  void RefreshFormationGoals(ETLCTeam Team);
  void ApplyRadialHit(const FVector& Origin,float Radius,ETLCTeam SourceTeam,float Damage,float Knockback);
  void ApplyConeHit(const FVector& Origin,const FVector& Forward,float Range,float HalfAngleDegrees,ETLCTeam SourceTeam,float Damage,float Knockback);
  void FireProjectileFrom(const FVector& Origin,const FVector& Target,ETLCTeam Team,float Damage,float Knockback,float Speed,float Lifetime);
  TArray<ATLCFighterCharacter*> CollectLivingEnemies(ETLCTeam Team)const;
};
