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
enum class ETLCBattlePreset : uint8 { BroadcastArena, NarrowPass, NorthVsSouth };

UENUM(BlueprintType)
enum class ETLCBattlePhase : uint8 {
  Ready,
  Active,
  Paused,
  SuddenDeath,
  Stalemate,
  Final,
  Replaying
};

UENUM(BlueprintType)
enum class ETLCBattleConfigFailure : uint8 {
  None,
  NegativeCount,
  CountAbovePremiumCap,
  CombinedCountAbovePremiumCap,
  BattleNotReady
};

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
struct FTLCBattleConfiguration {
  GENERATED_BODY()
  UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 MenCount = 50;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 WomenCount = 50;
};

USTRUCT(BlueprintType)
struct FTLCBattleConfigurationResult {
  GENERATED_BODY()
  UPROPERTY(BlueprintReadOnly) bool bSuccess = false;
  UPROPERTY(BlueprintReadOnly) ETLCBattleConfigFailure Failure = ETLCBattleConfigFailure::None;
  UPROPERTY(BlueprintReadOnly) FString Reason;
  UPROPERTY(BlueprintReadOnly) int32 AcceptedMenCount = 0;
  UPROPERTY(BlueprintReadOnly) int32 AcceptedWomenCount = 0;
  UPROPERTY(BlueprintReadOnly) int32 TotalFighters = 0;
  UPROPERTY(BlueprintReadOnly) float MenShare = 0.0f;
  UPROPERTY(BlueprintReadOnly) float WomenShare = 0.0f;
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
  UPROPERTY(EditAnywhere, BlueprintReadWrite) ETLCBattlePhase Phase = ETLCBattlePhase::Ready;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) FString MatchId;
  UPROPERTY(EditAnywhere, BlueprintReadWrite) int32 BattleGeneration = 0;
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

USTRUCT(BlueprintType)
struct FTLCSpecialEventResult {
  GENERATED_BODY()
  UPROPERTY(BlueprintReadOnly) bool bTriggered = false;
  UPROPERTY(BlueprintReadOnly) ETLCSpecialEvent EventType = ETLCSpecialEvent::UFOAbduction;
  UPROPERTY(BlueprintReadOnly) int32 Seed = 0;
  UPROPERTY(BlueprintReadOnly) int32 Sequence = 0;
  UPROPERTY(BlueprintReadOnly) float TelegraphSeconds = 0.8f;
  UPROPERTY(BlueprintReadOnly) float ActiveSeconds = 3.0f;
  UPROPERTY(BlueprintReadOnly) float CooldownSeconds = 12.0f;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCBattlePhaseChanged, ETLCBattlePhase, Phase);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCBattleConfigurationChanged, const FTLCBattleConfiguration&, Configuration);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FTLCTeamCountChanged, ETLCTeam, Team, int32, Alive);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FTLCBattleFinished, ETLCTeam, Winner, FName, Reason);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCPauseChanged, bool, bPaused);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FTLCBattleResetRequested);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCSpecialEventTriggered, ETLCSpecialEvent, EventType);

UCLASS()
class TLCGENDERCLASH_API UTLCBattleRulesLibrary : public UBlueprintFunctionLibrary {
  GENERATED_BODY()
public:
  UFUNCTION(BlueprintPure, Category="TLC|Battle")
  static FTLCBattleConfigurationResult ValidateConfiguration(const FTLCBattleConfiguration& Config, int32 PremiumCap = 100);
  UFUNCTION(BlueprintPure, Category="TLC|Battle")
  static bool IsLegalPhaseTransition(ETLCBattlePhase From,ETLCBattlePhase To);
  UFUNCTION(BlueprintPure, Category="TLC|Battle")
  static int32 AcceptedReinforcementCount(int32 MenAlive,int32 WomenAlive,int32 Requested,int32 PremiumCap=100);
  UFUNCTION(BlueprintPure, Category="TLC|Battle")
  static ETLCTeam ResolveEliminationWinner(int32 MenAlive,bool bMenBossAlive,int32 WomenAlive,bool bWomenBossAlive);
};

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
  UPROPERTY(BlueprintAssignable) FTLCBattleConfigurationChanged OnConfigurationChanged;
  UPROPERTY(BlueprintAssignable) FTLCTeamCountChanged OnTeamCountChanged;
  UPROPERTY(BlueprintAssignable) FTLCBattleFinished OnBattleFinished;
  UPROPERTY(BlueprintAssignable) FTLCPauseChanged OnPauseChanged;
  UPROPERTY(BlueprintAssignable) FTLCBattleResetRequested OnResetRequested;

  UFUNCTION(BlueprintCallable) FTLCBattleConfigurationResult ConfigureBattle(const FTLCBattleConfiguration& Config);
  UFUNCTION(BlueprintCallable) bool StartBattle();
  UFUNCTION(BlueprintCallable) bool PauseBattle();
  UFUNCTION(BlueprintCallable) bool ResetBattle();
  UFUNCTION(BlueprintCallable) bool BeginReplay();
  UFUNCTION(BlueprintCallable) void ReportElimination(ETLCTeam EliminatedTeam);
  UFUNCTION(BlueprintCallable) int32 AddReinforcements(ETLCTeam Team,int32 RequestedCount);
  UFUNCTION(BlueprintCallable) void SetBossAlive(ETLCTeam Team,bool bAlive);
  UFUNCTION(BlueprintCallable) void SetHeroAlive(ETLCTeam Team,bool bAlive);
  UFUNCTION(BlueprintPure) FTLCTacticalSnapshot GetSnapshot() const;
  UFUNCTION(BlueprintCallable) void SetBattleIntensity(float Value);
  UFUNCTION(BlueprintPure) ETLCBattlePhase GetPhase() const { return Phase; }
  UFUNCTION(BlueprintPure) FString GetMatchId() const { return ActiveMatchId.ToString(EGuidFormats::DigitsWithHyphensLower); }
  UFUNCTION(BlueprintPure) int32 GetBattleGeneration() const { return BattleGeneration; }

protected:
  UPROPERTY(EditAnywhere, BlueprintReadOnly) int32 MaxVisibleFighters = 100;
  UPROPERTY(EditAnywhere, BlueprintReadOnly) float StalemateTimeoutSeconds = 20.0f;
  UPROPERTY(EditAnywhere, BlueprintReadOnly) bool bUseSuddenDeathOnTie = true;
  UPROPERTY(EditAnywhere, BlueprintReadOnly) float SuddenDeathTimeoutSeconds = 12.0f;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FTLCTeamRuntimeState MenState;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) FTLCTeamRuntimeState WomenState;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) ETLCBattlePhase Phase = ETLCBattlePhase::Ready;
  UPROPERTY(VisibleAnywhere, BlueprintReadOnly) float ElapsedSeconds = 0.f;

private:
  FTLCBattleConfiguration StartingConfig;
  float BattleIntensity = 0.f;
  float RecentCasualtyScore = 0.f;
  float SecondsSinceElimination = 0.f;
  float SuddenDeathElapsed = 0.f;
  ETLCBattlePhase ResumePhaseAfterPause = ETLCBattlePhase::Active;
  int32 BattleGeneration = 0;
  FGuid ActiveMatchId;

  bool IsLegalTransition(ETLCBattlePhase From, ETLCBattlePhase To) const;
  bool SetPhase(ETLCBattlePhase NewPhase, bool bForce = false);
  void CheckWinnerOrStalemate();
  void ResolveStalemate();
  void FinalizeMatch(ETLCTeam Winner, FName Reason);
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
  UPROPERTY(EditAnywhere, BlueprintReadWrite) float EventCooldownSeconds = 12.0f;
  UPROPERTY(BlueprintAssignable) FTLCSpecialEventTriggered OnEventTriggered;

  UFUNCTION(BlueprintCallable) void SetDeterministicSeed(int32 NewSeed);
  UFUNCTION(BlueprintCallable) void ResetEventState();
  UFUNCTION(BlueprintCallable) FTLCSpecialEventResult TriggerEvent(const FTLCTacticalSnapshot& Snapshot);
  UFUNCTION(BlueprintCallable) FTLCSpecialEventResult ForceEvent(ETLCSpecialEvent EventType, const FTLCTacticalSnapshot& Snapshot);
  UFUNCTION(BlueprintImplementableEvent) void ExecuteEvent(ETLCSpecialEvent EventType, const FTLCTacticalSnapshot& Snapshot, const FTLCSpecialEventResult& Metadata);
  UFUNCTION(BlueprintImplementableEvent) void CleanupAllEvents();

private:
  FRandomStream RandomStream;
  int32 Seed = 1337;
  int32 Sequence = 0;
  double LastEventAt = -1000.0;
  TSet<ETLCSpecialEvent> RecentlyUsed;
  FTLCSpecialEventResult BuildResult(ETLCSpecialEvent EventType) const;
};

UCLASS(Blueprintable)
class USoundBase;
class UAudioComponent;

class TLCGENDERCLASH_API ATLCAudioDirector : public AActor {
  GENERATED_BODY()
public:
  UFUNCTION(BlueprintCallable) void SetMusicState(ETLCMusicState State);
  UFUNCTION(BlueprintCallable) void UpdateMix(const FTLCTacticalSnapshot& Snapshot);
  UFUNCTION(BlueprintCallable) void ResetAudioState();
  UFUNCTION(BlueprintCallable) bool PlayLocalCue(FName CueId);
  UFUNCTION() void HandleAnnouncerLine(FName EventName,const FString& Line);
  UFUNCTION(BlueprintImplementableEvent) void SetBattlePaused(bool bPaused);
  UFUNCTION(BlueprintImplementableEvent) void ApplyMetaSoundParameters(float Intensity, float MenAdvantage, float WomenAdvantage, bool BossActive, bool FinalTen);
  UFUNCTION(BlueprintImplementableEvent) void TransitionMusicState(ETLCMusicState State);
  UFUNCTION(BlueprintImplementableEvent) void StopBattleAudio();
  UPROPERTY(EditAnywhere,BlueprintReadWrite,Category="TLC|Audio") TMap<FName,TSoftObjectPtr<USoundBase>> LocalCues;
  UPROPERTY(EditAnywhere,BlueprintReadWrite,Category="TLC|Audio") TSoftObjectPtr<USoundBase> BattleMusic;
private:
  UPROPERTY() TObjectPtr<UAudioComponent> MusicComponent;
  ETLCMusicState CurrentState = ETLCMusicState::PreBattle;
};
