#include "TLCAIDecisionPolicy.h"

bool UTLCAIDecisionPolicy::IsCandidateFeasible(const FTLCDecisionCandidate& C){
  if(!C.bNavigationFeasible)return false;
  if(C.Score<=0.0f)return false;
  if(C.Cost<0.0f||C.StaminaCost<0.0f||C.RageCost<0.0f)return false;
  if(C.FormationDisruptionRisk>0.85f&&!C.bSurvivalCritical)return false;
  if(C.Action=="Flank"&&C.bUnderRangedFire&&!C.bSurvivalCritical)return false;
  return true;
}

bool UTLCAIDecisionPolicy::ShouldSwitchBehavior(
  const FTLCAgentDecisionState& S,
  const FTLCDecisionCandidate& C,
  float Now){
  if(!IsCandidateFeasible(C))return false;
  if(C.bSurvivalCritical)return true;
  if(S.CurrentAction.IsNone()||S.CurrentAction=="None")return true;

  const float TimeInBehavior=FMath::Max(0.0f,Now-S.BehaviorEntryTime);
  if(TimeInBehavior<S.MinimumCommitmentSeconds)return false;

  const float RequiredScore=S.CurrentScore*FMath::Max(1.0f,1.0f+S.HysteresisRatio);
  const bool bTargetLostLongEnough=(Now-S.LastTargetLossTime)>=0.75f && S.LastTargetLossTime>-999.0f;
  return C.Score>=RequiredScore||bTargetLostLongEnough;
}

float UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence Cadence,int32 AgentId){
  const float Jitter=(FMath::Abs(AgentId)%7)*0.006f;
  switch(Cadence){
    case ETLCDecisionCadence::CloseCombat: return 0.085f+Jitter;      // ~8-12 Hz
    case ETLCDecisionCadence::LocalTactical: return 0.36f+Jitter*2;  // ~2-3 Hz
    case ETLCDecisionCadence::Strategic: return 1.2f+Jitter*8;       // ~0.5-1 Hz
    default: return 0.5f;
  }
}
