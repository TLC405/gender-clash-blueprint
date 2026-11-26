#include "TLCBattleSystems.h"

FVector2D UTLCFormationLibrary::CalculateSlot(ETLCFormation Formation, ETLCTeam Team, int32 Index, int32 Count, FVector2D Arena, float Margin) {
  Count=FMath::Max(1,Count); Index=FMath::Clamp(Index,0,Count-1);
  const bool Men=Team==ETLCTeam::Men; const float Dir=Men?1.f:-1.f;
  const float FrontX=Men?Arena.X*.30f:Arena.X*.70f;
  const float MinY=Margin, MaxY=FMath::Max(MinY,Arena.Y-Margin), UsableY=FMath::Max(1.f,MaxY-MinY);
  const int32 PerRow=FMath::Max(1,FMath::CeilToInt(FMath::Sqrt((float)Count)));
  const int32 Row=Index/PerRow, Col=Index%PerRow;
  const int32 Rows=FMath::Max(1,FMath::CeilToInt((float)Count/PerRow));
  const float XGap=Rows>1?FMath::Min(80.f,Arena.X*.20f/(Rows-1)):0.f;
  const float YGap=PerRow>1?UsableY/(PerRow-1):0.f;
  FVector2D R(FrontX-Dir*Row*XGap,MinY+Col*YGap);

  switch(Formation){
    case ETLCFormation::Line:
      R=FVector2D(FrontX,MinY+(Count>1?UsableY*Index/(Count-1):UsableY*.5f)); break;
    case ETLCFormation::Wedge:{
      const int32 Ring=FMath::FloorToInt(FMath::Sqrt((float)Index));
      const int32 Pos=Index-Ring*Ring;
      R=FVector2D(FrontX-Dir*Ring*55.f,Arena.Y*.5f+(Pos-Ring)*48.f); break;}
    case ETLCFormation::ShieldWall: R.X=FrontX-Dir*(Row%3)*18.f; break;
    case ETLCFormation::Columns:{
      const int32 Lanes=FMath::Clamp(FMath::CeilToInt(FMath::Sqrt((float)Count)*.5f),2,6);
      const int32 Lane=Index%Lanes,Depth=Index/Lanes;
      R=FVector2D(FrontX-Dir*Depth*46.f,Arena.Y*.5f+(Lane-(Lanes-1)*.5f)*70.f); break;}
    case ETLCFormation::Circle:{
      const float A=2.f*PI*Index/Count;
      const float Radius=FMath::Min(Arena.Y*.24f,180.f+FMath::Sqrt((float)Count)*8.f);
      const float CX=Men?Arena.X*.24f:Arena.X*.76f;
      R=FVector2D(CX+FMath::Cos(A)*Radius,Arena.Y*.5f+FMath::Sin(A)*Radius); break;}
    case ETLCFormation::Spread:
      R.Y=MinY+FMath::Fmod(Index*97.f,UsableY);
      R.X+=Dir*(FMath::Fmod(Index*53.f,140.f)-70.f); break;
    case ETLCFormation::Rush: R.X=FrontX-Dir*Row*28.f; break;
    default: break;
  }
  R.X=FMath::Clamp(R.X,Margin,FMath::Max(Margin,Arena.X-Margin));
  R.Y=FMath::Clamp(R.Y,Margin,FMath::Max(Margin,Arena.Y-Margin));
  return R;
}

float UTLCFormationLibrary::FrontDefense(ETLCFormation F){
  if(F==ETLCFormation::ShieldWall) return .62f;
  if(F==ETLCFormation::Ranks) return .82f;
  if(F==ETLCFormation::Wedge) return .90f;
  return 1.f;
}
float UTLCFormationLibrary::FlankVulnerability(ETLCFormation F){
  if(F==ETLCFormation::ShieldWall) return 1.45f;
  if(F==ETLCFormation::Wedge) return 1.2f;
  if(F==ETLCFormation::Circle) return .72f;
  if(F==ETLCFormation::Spread) return .85f;
  return 1.f;
}

ATLCBattleDirector::ATLCBattleDirector(){ PrimaryActorTick.bCanEverTick=true; }
void ATLCBattleDirector::Tick(float Dt){ Super::Tick(Dt); if(Phase==ETLCBattlePhase::Active){ElapsedSeconds+=Dt;RecentCasualties=FMath::Max(0,RecentCasualties-FMath::FloorToInt(Dt*2.f));}}
void ATLCBattleDirector::ConfigureBattle(int32 M,int32 W){
  M=FMath::Clamp(M,0,MaxVisibleFighters); W=FMath::Clamp(W,0,MaxVisibleFighters-M);
  StartingMen=M;StartingWomen=W;MenState=FTLCTeamRuntimeState();WomenState=FTLCTeamRuntimeState();
  MenState.Alive=M;WomenState.Alive=W;ElapsedSeconds=0;BattleIntensity=0;RecentCasualties=0;SetPhase(ETLCBattlePhase::Ready);
  OnTeamCountChanged.Broadcast(ETLCTeam::Men,M);OnTeamCountChanged.Broadcast(ETLCTeam::Women,W);
}
void ATLCBattleDirector::StartBattle(){ if(Phase==ETLCBattlePhase::Final) ResetBattle(); SetPhase(ETLCBattlePhase::Active); }
void ATLCBattleDirector::PauseBattle(){ if(Phase==ETLCBattlePhase::Active)SetPhase(ETLCBattlePhase::Paused);else if(Phase==ETLCBattlePhase::Paused)SetPhase(ETLCBattlePhase::Active); }
void ATLCBattleDirector::ResetBattle(){ ConfigureBattle(StartingMen,StartingWomen); }
void ATLCBattleDirector::ReportElimination(ETLCTeam T){
  FTLCTeamRuntimeState* S=T==ETLCTeam::Men?&MenState:T==ETLCTeam::Women?&WomenState:nullptr;
  if(!S||S->Alive<=0)return;S->Alive--;RecentCasualties++;OnTeamCountChanged.Broadcast(T,S->Alive);CheckWinner();
}
FTLCTacticalSnapshot ATLCBattleDirector::GetSnapshot()const{FTLCTacticalSnapshot S;S.Men=MenState;S.Women=WomenState;S.ElapsedSeconds=ElapsedSeconds;S.BattleIntensity=BattleIntensity;S.RecentCasualties=RecentCasualties;return S;}
void ATLCBattleDirector::SetBattleIntensity(float V){BattleIntensity=FMath::Clamp(V,0.f,1.f);}
void ATLCBattleDirector::SetPhase(ETLCBattlePhase P){if(Phase==P)return;Phase=P;OnPhaseChanged.Broadcast(P);}
void ATLCBattleDirector::CheckWinner(){
  if(Phase!=ETLCBattlePhase::Active)return;
  if(MenState.Alive<=0||WomenState.Alive<=0){
    const ETLCTeam W=MenState.Alive>0?ETLCTeam::Men:WomenState.Alive>0?ETLCTeam::Women:ETLCTeam::Neutral;
    SetPhase(ETLCBattlePhase::Final);OnBattleFinished.Broadcast(W);
  }
}

FTLCTacticalDecision ATLCBattleIntelligenceDirector::Evaluate(ETLCTeam Team,const FTLCTacticalSnapshot& S)const{
  const auto& O=Team==ETLCTeam::Men?S.Men:S.Women;const auto& E=Team==ETLCTeam::Men?S.Women:S.Men;
  const float Ranged=FMath::Clamp(E.RangedThreat*.85f+S.BattleIntensity*.15f,0.f,1.f);
  const float Regroup=FMath::Clamp((1.f-O.FormationIntegrity)*.65f+(1.f-O.Morale)*.35f,0.f,1.f);
  const float Boss=E.bBossAlive?.78f:0.f;
  const float Flank=FMath::Clamp((E.FormationIntegrity-O.FormationIntegrity)*.5f+.45f,0.f,1.f);
  const float Advance=FMath::Clamp(O.Morale*.55f+(O.Alive>=E.Alive?.25f:.05f),0.f,1.f);
  FTLCTacticalDecision D;D.Order="Advance";D.Confidence=Advance;D.Reason="Default pressure";
  auto C=[&D](FName N,float Score,const TCHAR* Why){if(Score>D.Confidence){D.Order=N;D.Confidence=Score;D.Reason=Why;}};
  C("AttackRanged",Ranged,TEXT("Enemy ranged pressure is high"));
  C("Regroup",Regroup,TEXT("Formation integrity or morale is failing"));
  C("AttackBoss",Boss,TEXT("Enemy special is a priority threat"));
  C("Flank",Flank,TEXT("Flanking opportunity detected"));
  return D;
}

ATLCSpecialEventDirector::ATLCSpecialEventDirector(){
  PrimaryActorTick.bCanEverTick=false;
  EventWeights={{ETLCSpecialEvent::UFOAbduction,1.f},{ETLCSpecialEvent::MaleGiant,.75f},{ETLCSpecialEvent::FemaleGiant,.75f},
  {ETLCSpecialEvent::LightningStrike,.65f},{ETLCSpecialEvent::SuddenFog,.45f},{ETLCSpecialEvent::Meteor,.35f},
  {ETLCSpecialEvent::LowGravity,.3f},{ETLCSpecialEvent::ReinforcementDrop,.55f},{ETLCSpecialEvent::Stampede,.3f},
  {ETLCSpecialEvent::Tornado,.25f},{ETLCSpecialEvent::RobotMalfunction,.3f},{ETLCSpecialEvent::UnicornRage,.3f},
  {ETLCSpecialEvent::GiantBeachBall,.35f},{ETLCSpecialEvent::HealingZone,.45f},{ETLCSpecialEvent::BattlefieldBlackout,.25f},
  {ETLCSpecialEvent::MascotInvasion,.2f}};
}
ETLCSpecialEvent ATLCSpecialEventDirector::TriggerEvent(const FTLCTacticalSnapshot& S){
  TArray<FTLCSpecialEventWeight>C;float Total=0;
  for(auto I:EventWeights){
    if(RecentlyUsed.Contains(I.EventType))I.Weight*=.2f;
    if(I.EventType==ETLCSpecialEvent::UFOAbduction&&S.ElapsedSeconds>75)I.Weight*=1.65f;
    if((I.EventType==ETLCSpecialEvent::MaleGiant||I.EventType==ETLCSpecialEvent::FemaleGiant)&&FMath::Abs(S.Men.Alive-S.Women.Alive)>=20)I.Weight*=1.45f;
    if(I.EventType==ETLCSpecialEvent::RobotMalfunction&&!S.Men.bBossAlive)I.Weight=0;
    if(I.EventType==ETLCSpecialEvent::UnicornRage&&!S.Women.bBossAlive)I.Weight=0;
    if(I.Weight>0){C.Add(I);Total+=I.Weight;}
  }
  if(C.Num()==0)return ETLCSpecialEvent::UFOAbduction;
  float Roll=FMath::FRandRange(0,Total);ETLCSpecialEvent Chosen=C[0].EventType;
  for(const auto& I:C){Roll-=I.Weight;if(Roll<=0){Chosen=I.EventType;break;}}
  RecentlyUsed.Add(Chosen);if(RecentlyUsed.Num()>4){RecentlyUsed.Reset();RecentlyUsed.Add(Chosen);}
  OnEventTriggered.Broadcast(Chosen);ExecuteEvent(Chosen,S);return Chosen;
}

void ATLCAudioDirector::SetMusicState(ETLCMusicState S){if(CurrentState==S)return;CurrentState=S;TransitionMusicState(S);}
void ATLCAudioDirector::UpdateMix(const FTLCTacticalSnapshot& S){
  const int32 Alive=S.Men.Alive+S.Women.Alive;const float Total=FMath::Max(1.f,(float)Alive);
  const float M=(S.Men.Alive-S.Women.Alive)/Total;ApplyMetaSoundParameters(FMath::Clamp(S.BattleIntensity,0.f,1.f),FMath::Clamp(M,-1.f,1.f),FMath::Clamp(-M,-1.f,1.f),S.Men.bBossAlive||S.Women.bBossAlive,Alive<=10);
}
