#pragma once

#include "CoreMinimal.h"
#include "Kismet/BlueprintFunctionLibrary.h"
#include "TLCAIDecisionPolicy.generated.h"

class AActor;

UENUM(BlueprintType)
enum class ETLCDecisionCadence : uint8 {
  CloseCombat,
  LocalTactical,
  Strategic
};

USTRUCT(BlueprintType)
struct FTLCDecisionCandidate {
  GENERATED_BODY()

  UPROPERTY(EditAnywhere,BlueprintReadWrite) FName Action="Advance";
  UPROPERTY(EditAnywhere,BlueprintReadWrite) FName AlternateAction="Hold";
  UPROPERTY(EditAnywhere,BlueprintReadWrite) TObjectPtr<AActor> Target=nullptr;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) FVector Destination=FVector::ZeroVector;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Score=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float Cost=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float ValidForSeconds=0.75f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float ExpectedRange=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float FormationDisruptionRisk=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float StaminaCost=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float RageCost=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bNavigationFeasible=true;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bUnderRangedFire=false;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) bool bSurvivalCritical=false;
};

USTRUCT(BlueprintType)
struct FTLCAgentDecisionState {
  GENERATED_BODY()

  UPROPERTY(EditAnywhere,BlueprintReadWrite) FName CurrentAction="None";
  UPROPERTY(EditAnywhere,BlueprintReadWrite) TObjectPtr<AActor> CurrentTarget=nullptr;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float CurrentScore=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float BehaviorEntryTime=0.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float MinimumCommitmentSeconds=0.85f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float HysteresisRatio=0.15f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) float LastTargetLossTime=-1000.0f;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 NavigationRetryCount=0;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) int32 AgentId=0;
};

UCLASS()
class TLCGENDERCLASH_API UTLCAIDecisionPolicy : public UBlueprintFunctionLibrary {
  GENERATED_BODY()
public:
  UFUNCTION(BlueprintPure,Category="TLC|AI")
  static bool IsCandidateFeasible(const FTLCDecisionCandidate& Candidate);

  UFUNCTION(BlueprintPure,Category="TLC|AI")
  static bool ShouldSwitchBehavior(
    const FTLCAgentDecisionState& State,
    const FTLCDecisionCandidate& Candidate,
    float BattleTimeSeconds);

  UFUNCTION(BlueprintPure,Category="TLC|AI")
  static float GetDecisionIntervalSeconds(ETLCDecisionCadence Cadence,int32 AgentId);
};
