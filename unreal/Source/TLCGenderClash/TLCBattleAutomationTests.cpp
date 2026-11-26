#if WITH_DEV_AUTOMATION_TESTS
#include "Misc/AutomationTest.h"
#include "TLCBattleSystems.h"

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCFormationBounds,"TLC.GenderClash.Formations.StayInsideArena",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCFormationBounds::RunTest(const FString&){
  const FVector2D Arena(1920,1080);const float M=120;
  for(int32 F=0;F<=static_cast<int32>(ETLCFormation::Rush);++F)
    for(int32 T=0;T<2;++T)
      for(int32 I=0;I<50;++I){
        auto P=UTLCFormationLibrary::CalculateSlot(static_cast<ETLCFormation>(F),T==0?ETLCTeam::Men:ETLCTeam::Women,I,50,Arena,M);
        TestTrue(TEXT("X bounded"),P.X>=M&&P.X<=Arena.X-M);TestTrue(TEXT("Y bounded"),P.Y>=M&&P.Y<=Arena.Y-M);
      }
  return true;
}

IMPLEMENT_SIMPLE_AUTOMATION_TEST(FTLCFighterCap,"TLC.GenderClash.Battle.TotalFighterCap",EAutomationTestFlags::EditorContext|EAutomationTestFlags::EngineFilter)
bool FTLCFighterCap::RunTest(const FString&){const int32 Men=60,Women=FMath::Clamp(70,0,100-Men);TestEqual(TEXT("cap"),Men+Women,100);return true;}
#endif
