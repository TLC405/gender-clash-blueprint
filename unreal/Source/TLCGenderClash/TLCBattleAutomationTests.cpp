#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "TLCBattleSystems.h"
#include "TLCAIDecisionPolicy.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCBattleConfigValidation,"TLC.GenderClash.Battle.ConfigurationValidation",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCBattleConfigValidation::RunTest(const FString&){
  struct FCase{int32 M;int32 W;bool Ok;};
  const FCase Cases[]={{0,0,true},{0,100,true},{100,0,true},{50,50,true},{60,40,true},{40,60,true},{-1,50,false},{50,-1,false},{101,0,false},{60,70,false}};
  for(const auto&C:Cases){
    FTLCBattleConfiguration Config;Config.MenCount=C.M;Config.WomenCount=C.W;
    const auto R=UTLCBattleRulesLibrary::ValidateConfiguration(Config,100);
    TestEqual(FString::Printf(TEXT("config %d/%d"),C.M,C.W),R.bSuccess,C.Ok);
    if(R.bSuccess)TestTrue(TEXT("accepted total <= 100"),R.TotalFighters<=100);
  }
  return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCFormationBounds,"TLC.GenderClash.Formations.AspectSafeBounds",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCFormationBounds::RunTest(const FString&){
  const FVector2D Arenas[]={{1920,1080},{2560,1080},{1080,1920},{2316,904},{2208,1840},{1840,2208},{1280,720}};
  const int32 Counts[]={1,2,10,50,100};
  for(const FVector2D&Arena:Arenas){
    const float Margin=FMath::Min(120.f,FMath::Min(Arena.X,Arena.Y)*.10f);
    for(int32 F=0;F<=static_cast<int32>(ETLCFormation::Rush);++F)
      for(int32 T=0;T<2;++T)
        for(int32 Count:Counts)
          for(int32 I=0;I<Count;++I){
            const auto P=UTLCFormationLibrary::CalculateSlot(static_cast<ETLCFormation>(F),T==0?ETLCTeam::Men:ETLCTeam::Women,I,Count,Arena,Margin);
            TestTrue(TEXT("X bounded"),P.X>=Margin&&P.X<=Arena.X-Margin);
            TestTrue(TEXT("Y bounded"),P.Y>=Margin&&P.Y<=Arena.Y-Margin);
          }
  }
  return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCEventSeedDeterminism,"TLC.GenderClash.SpecialEvents.SeedMetadata",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCEventSeedDeterminism::RunTest(const FString&){
  FTLCSpecialEventResult R;R.Seed=4242;R.Sequence=1;R.EventType=ETLCSpecialEvent::UFOAbduction;R.bTriggered=true;
  TestEqual(TEXT("seed recorded"),R.Seed,4242);
  TestTrue(TEXT("trigger metadata survives"),R.bTriggered);
  return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCAIHysteresis,"TLC.GenderClash.AI.HysteresisAndCadence",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCAIHysteresis::RunTest(const FString&){
  FTLCAgentDecisionState S;
  S.CurrentAction="Advance";S.CurrentScore=.70f;S.BehaviorEntryTime=10.f;S.MinimumCommitmentSeconds=1.f;S.HysteresisRatio=.15f;

  FTLCDecisionCandidate Weak;
  Weak.Action="Flank";Weak.Score=.75f;Weak.bNavigationFeasible=true;
  TestFalse(TEXT("small score increase does not thrash behavior"),UTLCAIDecisionPolicy::ShouldSwitchBehavior(S,Weak,11.2f));

  FTLCDecisionCandidate Strong=Weak;
  Strong.Score=.86f;
  TestTrue(TEXT("strong feasible improvement can switch"),UTLCAIDecisionPolicy::ShouldSwitchBehavior(S,Strong,11.2f));

  FTLCDecisionCandidate Blocked=Strong;
  Blocked.bNavigationFeasible=false;
  TestFalse(TEXT("unreachable action is rejected"),UTLCAIDecisionPolicy::ShouldSwitchBehavior(S,Blocked,11.2f));

  FTLCDecisionCandidate Critical=Blocked;
  Critical.bNavigationFeasible=true;Critical.bSurvivalCritical=true;Critical.Score=.1f;
  TestTrue(TEXT("survival critical override can break commitment"),UTLCAIDecisionPolicy::ShouldSwitchBehavior(S,Critical,10.1f));

  TestTrue(TEXT("close combat tick faster than tactical"),UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::CloseCombat,3)<UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::LocalTactical,3));
  TestTrue(TEXT("tactical tick faster than strategic"),UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::LocalTactical,3)<UTLCAIDecisionPolicy::GetDecisionIntervalSeconds(ETLCDecisionCadence::Strategic,3));
  return true;
}


IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCPhaseTransitionRules,"TLC.GenderClash.Battle.PhaseTransitions",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCPhaseTransitionRules::RunTest(const FString&){
  TestTrue(TEXT("Ready -> Active"),UTLCBattleRulesLibrary::IsLegalPhaseTransition(ETLCBattlePhase::Ready,ETLCBattlePhase::Active));
  TestFalse(TEXT("Ready cannot jump to Final"),UTLCBattleRulesLibrary::IsLegalPhaseTransition(ETLCBattlePhase::Ready,ETLCBattlePhase::Final));
  TestTrue(TEXT("Active -> Paused"),UTLCBattleRulesLibrary::IsLegalPhaseTransition(ETLCBattlePhase::Active,ETLCBattlePhase::Paused));
  TestTrue(TEXT("Paused -> Active"),UTLCBattleRulesLibrary::IsLegalPhaseTransition(ETLCBattlePhase::Paused,ETLCBattlePhase::Active));
  TestFalse(TEXT("Paused cannot jump to Final"),UTLCBattleRulesLibrary::IsLegalPhaseTransition(ETLCBattlePhase::Paused,ETLCBattlePhase::Final));
  TestTrue(TEXT("Final -> Replaying"),UTLCBattleRulesLibrary::IsLegalPhaseTransition(ETLCBattlePhase::Final,ETLCBattlePhase::Replaying));
  TestFalse(TEXT("Final cannot silently restart"),UTLCBattleRulesLibrary::IsLegalPhaseTransition(ETLCBattlePhase::Final,ETLCBattlePhase::Active));
  return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCReinforcementCapRules,"TLC.GenderClash.Battle.ReinforcementCap",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCReinforcementCapRules::RunTest(const FString&){
  TestEqual(TEXT("90 alive accepts only 10"),UTLCBattleRulesLibrary::AcceptedReinforcementCount(45,45,20,100),10);
  TestEqual(TEXT("100 alive accepts none"),UTLCBattleRulesLibrary::AcceptedReinforcementCount(60,40,5,100),0);
  TestEqual(TEXT("negative request rejected"),UTLCBattleRulesLibrary::AcceptedReinforcementCount(50,40,-2,100),0);
  TestEqual(TEXT("available capacity preserved"),UTLCBattleRulesLibrary::AcceptedReinforcementCount(20,30,5,100),5);
  return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCBossAwareOutcomeRules,"TLC.GenderClash.Battle.BossAwareOutcome",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCBossAwareOutcomeRules::RunTest(const FString&){
  TestEqual(TEXT("both zero is draw"),UTLCBattleRulesLibrary::ResolveEliminationWinner(0,false,0,false),ETLCTeam::Neutral);
  TestEqual(TEXT("robot keeps men alive"),UTLCBattleRulesLibrary::ResolveEliminationWinner(0,true,5,false),ETLCTeam::Neutral);
  TestEqual(TEXT("unicorn keeps women alive"),UTLCBattleRulesLibrary::ResolveEliminationWinner(5,false,0,true),ETLCTeam::Neutral);
  TestEqual(TEXT("women win after robot is gone"),UTLCBattleRulesLibrary::ResolveEliminationWinner(0,false,5,false),ETLCTeam::Women);
  TestEqual(TEXT("men win after unicorn is gone"),UTLCBattleRulesLibrary::ResolveEliminationWinner(5,false,0,false),ETLCTeam::Men);
  return true;
}

#endif
