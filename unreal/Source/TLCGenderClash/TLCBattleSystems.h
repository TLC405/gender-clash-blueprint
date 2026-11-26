#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "TLCBattleSystems.generated.h"

UENUM(BlueprintType)
enum class ETLCTeam : uint8 { Men, Women, Neutral };

UENUM(BlueprintType)
enum class ETLCFormation : uint8 { Ranks, Line, Wedge, ShieldWall, Columns, Spread, Circle, Rush };

UENUM(BlueprintType)
enum class ETLCBattlePhase : uint8 { Ready, Active, Paused, Final };

UENUM(BlueprintType)
enum class ETLCSpecialEvent : uint8 {
  UFOAbduction, MaleGiant, FemaleGiant, LightningStrike, SuddenFog, Meteor,
  LowGravity, ReinforcementDrop, Stampede, Tornado, RobotMalfunction,
  UnicornRage, GiantBeachBall, HealingZone, BattlefieldBlackout, MascotInvasion
};

UENUM(BlueprintType)
enum class ETLCMusicState : uint8 {
  PreBattle, OpeningClash, ActiveBattle, HeroMoment, BossEvent,
  UFOEvent, GiantEvent, FinalTen, LastFighter, Victory, Defeat
};

USTRUCT(BlueprintType)
struct FTLCTeamRuntimeState {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Alive = 0;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 Eliminations = 0;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) float Morale = 1.0f;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) float FormationIntegrity = 1.0f;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) float RangedThreat = 0.0f;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bHeroAlive = false;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) bool bBossAlive = false;
};

USTRUCT(BlueprintType)
struct FTLCTacticalSnapshot {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere, BlueprintReadWrite) FTLCTeamRuntimeState Men;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) FTLCTeamRuntimeState Women;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) float ElapsedSeconds = 0.0f;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) float BattleIntensity = 0.0f;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 RecentCasualties = 0;
};

USTRUCT(BlueprintType)
struct FTLCTacticalDecision {
  GENERATED_BODY()
  UPROPERTY(BlueprintReadOnly) FName Order = "Advance";
  UPROPERTY(BlueprintReadOnly) float Confidence = 0.5f;
  UPROPERTY(BlueprintReadOnly) FString Reason;
};

USTRUCT(BlueprintType)
struct FTLCSpecialEventWeight {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere, BlueprintReadWrite) ETLCSpecialEvent EventType = ETLCSpecialEvent::UFOAbduction;
  UPROPERTY(EditAnywhere, BlueprintReadWrite, meta=(ClampMin="0.0")) float Weight = 1.0f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCBattlePhaseChanged, ETLCBattlePhase, Phase);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FTLCTeamCountChanged, ETLCTeam, Team, int32, Alive);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCBattleFinished, ETLCTeam, Winner);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCSpecialEventTriggered, ETLCSpecialEvent, EventType);

UCLASS()
class TLCGENDERCLASH_API UTLCFormationLibrary : public UBlueprintFunctionLibrary {
  GENERATED_BODY()
public:
  UFUNCTION(BlueprintPure, Category="TLC|Formation")
  static FVector2D CalculateSlot(ETLCFormation Formation, ETLCTeam Team, int32 Index, int32 Count, FVector2D ArenaSize, float Margin=120.f);
  UFUNCTION(BlueprintPure, Category="TLC|Formation")
  static float FrontDefense(ETLCFormation Formation);
  UFUNCTION(BlueprintPure, Category="TLC|Formation")
  static float FlankVulnerability(ETLCFormation Formation);
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCBattleDirector : public AActor {
  GENERATED_BODY()
public:
  ATLCBattleDirector();
  virtual void Tick(float DeltaSeconds) override;
  UPROPERTY(BlueprintAssignable) FTLCBattlePhaseChanged OnPhaseChanged;
  UPROPERTY(BlueprintAssignable) FTLCTeamCountChanged OnTeamCountChanged;
  UPROPERTY(BlueprintAssignable) FTLCBattleFinished OnBattleFinished;
  UFUNCTION(BlueprintCallable) void ConfigureBattle(int32 MenCount, int32 WomenCount);
  UFUNCTION(BlueprintCallable) void StartBattle();
  UFUNCTION(BlueprintCallable) void PauseBattle();
  UFUNCTION(BlueprintCallable) void ResetBattle();
  UFUNCTION(BlueprintCallable) void ReportElimination(ETLCTeam EliminatedTeam);
  UFUNCTION(BlueprintPure) FTLCTacticalSnapshot GetSnapshot() const;
  UFUNCTION(BlueprintCallable) void SetBattleIntensity(float Value);
  UFUNCTION(BlueprintPure) ETLCBattlePhase GetPhase() const { return Phase; }
protected:
  UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 MaxVisibleFighters = 100;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FTLCTeamRuntimeState MenState;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FTLCTeamRuntimeState WomenState;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) ETLCBattlePhase Phase = ETLCBattlePhase::Ready;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) float ElapsedSeconds = 0.f;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) float BattleIntensity = 0.f;
private:
  int32 StartingMen = 50;
  int32 StartingWomen = 50;
  int32 RecentCasualties = 0;
  void SetPhase(ETLCBattlePhase NewPhase);
  void CheckWinner();
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCBattleIntelligenceDirector : public AActor {
  GENERATED_BODY()
public:
  UFUNCTION(BlueprintPure, Category="TLC|AI")
  FTLCTacticalDecision Evaluate(ETLCTeam Team, const FTLCTacticalSnapshot& Snapshot) const;
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCSpecialEventDirector : public AActor {
  GENERATED_BODY()
public:
  ATLCSpecialEventDirector();
  UPROPERTY(EditAnywhere, BlueprintReadWrite) TArray<FTLCSpecialEventWeight> EventWeights;
  UPROPERTY(BlueprintAssignable) FTLCSpecialEventTriggered OnEventTriggered;
  UFUNCTION(BlueprintCallable) ETLCSpecialEvent TriggerEvent(const FTLCTacticalSnapshot& Snapshot);
  UFUNCTION(BlueprintImplementableEvent) void ExecuteEvent(ETLCSpecialEvent EventType, const FTLCTacticalSnapshot& Snapshot);
private:
  TSet<ETLCSpecialEvent> RecentlyUsed;
};

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCAudioDirector : public AActor {
  GENERATED_BODY()
public:
  UFUNCTION(BlueprintCallable) void SetMusicState(ETLCMusicState State);
  UFUNCTION(BlueprintCallable) void UpdateMix(const FTLCTacticalSnapshot& Snapshot);
  UFUNCTION(BlueprintImplementableEvent) void ApplyMetaSoundParameters(float Intensity, float MenAdvantage, float WomenAdvantage, bool BossActive, bool FinalTen);
  UFUNCTION(BlueprintImplementableEvent) void TransitionMusicState(ETLCMusicState State);
private:
  ETLCMusicState CurrentState = ETLCMusicState::PreBattle;
};
