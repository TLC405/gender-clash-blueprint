#include "TLCBattleSystems.h"
#include "Kismet/GameplayStatics.h"

FTLCBattleConfigurationResult UTLCBattleRulesLibrary::ValidateConfiguration(const FTLCBattleConfiguration& Config, int32 PremiumCap) {
  FTLCBattleConfigurationResult R;
  R.AcceptedMenCount = Config.MenCount;
  R.AcceptedWomenCount = Config.WomenCount;

  if (Config.MenCount < 0 || Config.WomenCount < 0) {
    R.Failure = ETLCBattleConfigFailure::NegativeCount;
    R.Reason = TEXT("Fighter counts cannot be negative.");
    return R;
  }
  if (Config.MenCount > PremiumCap || Config.WomenCount > PremiumCap) {
    R.Failure = ETLCBattleConfigFailure::CountAbovePremiumCap;
    R.Reason = TEXT("A team count exceeds the premium fighter cap.");
    return R;
  }

  R.TotalFighters = Config.MenCount + Config.WomenCount;
  if (R.TotalFighters > PremiumCap) {
    R.Failure = ETLCBattleConfigFailure::CombinedCountAbovePremiumCap;
    R.Reason = TEXT("Combined fighter count exceeds the premium fighter cap.");
    return R;
  }

  const float Total = FMath::Max(1.0f, static_cast<float>(R.TotalFighters));
  R.MenShare = Config.MenCount / Total;
  R.WomenShare = Config.WomenCount / Total;
  R.bSuccess = true;
  R.Failure = ETLCBattleConfigFailure::None;
  return R;
}

FVector2D UTLCFormationLibrary::CalculateSlot(ETLCFormation Formation, ETLCTeam Team, int32 Index, int32 Count, FVector2D Arena, float Margin) {
  Count=FMath::Max(1,Count); Index=FMath::Clamp(Index,0,Count-1);
  Margin = FMath::Clamp(Margin, 0.f, FMath::Min(Arena.X, Arena.Y) * .45f);
  const bool Men=Team==ETLCTeam::Men; const float Dir=Men?1.f:-1.f;
  const float FrontX=Men?Arena.X*.30f:Arena.X*.70f;
  const float MinY=Margin, MaxY=FMath::Max(MinY,Arena.Y-Margin), UsableY=FMath::Max(1.f,MaxY-MinY);
  const int32 PerRow=FMath::Max(1,FMath::CeilToInt(FMath::Sqrt((float)Count)));
  const int32 Row=Index/PerRow, Col=Index%PerRow;
  const int32 Rows=FMath::Max(1,FMath::CeilToInt((float)Count/PerRow));
  const float XGap=Rows>1?FMath::Min(Arena.X*.042f,Arena.X*.20f/(Rows-1)):0.f;
  const float YGap=PerRow>1?UsableY/(PerRow-1):0.f;
  FVector2D R(FrontX-Dir*Row*XGap,MinY+Col*YGap);

  switch(Formation){
    case ETLCFormation::Line:
      R=FVector2D(FrontX,MinY+(Count>1?UsableY*Index/(Count-1):UsableY*.5f)); break;
    case ETLCFormation::Wedge:{
      const int32 Ring=FMath::FloorToInt(FMath::Sqrt((float)Index));
      const int32 Pos=Index-Ring*Ring;
      R=FVector2D(FrontX-Dir*Ring*Arena.X*.028f,Arena.Y*.5f+(Pos-Ring)*Arena.Y*.045f); break;}
    case ETLCFormation::ShieldWall: R.X=FrontX-Dir*(Row%3)*Arena.X*.009f; break;
    case ETLCFormation::Columns:{
      const int32 Lanes=FMath::Clamp(FMath::CeilToInt(FMath::Sqrt((float)Count)*.5f),2,6);
      const int32 Lane=Index%Lanes,Depth=Index/Lanes;
      R=FVector2D(FrontX-Dir*Depth*Arena.X*.024f,Arena.Y*.5f+(Lane-(Lanes-1)*.5f)*Arena.Y*.065f); break;}
    case ETLCFormation::Circle:{
      const float A=2.f*PI*Index/Count;
      const float Radius=FMath::Min(Arena.Y*.24f,Arena.X*.12f);
      const float CX=Men?Arena.X*.24f:Arena.X*.76f;
      R=FVector2D(CX+FMath::Cos(A)*Radius,Arena.Y*.5f+FMath::Sin(A)*Radius); break;}
    case ETLCFormation::Spread:
      R.Y=MinY+FMath::Fmod(Index*97.f,UsableY);
      R.X+=Dir*(FMath::Fmod(Index*53.f,FMath::Max(40.f,Arena.X*.075f))-Arena.X*.0375f); break;
    case ETLCFormation::Rush: R.X=FrontX-Dir*Row*Arena.X*.014f; break;
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

ATLCBattleDirector::ATLCBattleDirector(){
  PrimaryActorTick.bCanEverTick=true;
  PrimaryActorTick.bTickEvenWhenPaused=true;
  StartingConfig.MenCount=50;
  StartingConfig.WomenCount=50;
  ActiveMatchId=FGuid::NewGuid();
}

void ATLCBattleDirector::Tick(float Dt){
  Super::Tick(Dt);
  if(Phase!=ETLCBattlePhase::Active && Phase!=ETLCBattlePhase::SuddenDeath) return;

  ElapsedSeconds += Dt;
  SecondsSinceElimination += Dt;
  RecentCasualtyScore = FMath::Max(0.f, RecentCasualtyScore - Dt * 2.f);
  if(Phase==ETLCBattlePhase::SuddenDeath) SuddenDeathElapsed += Dt;
  CheckWinnerOrStalemate();
}

FTLCBattleConfigurationResult ATLCBattleDirector::ConfigureBattle(const FTLCBattleConfiguration& Config){
  if(Phase!=ETLCBattlePhase::Ready){
    FTLCBattleConfigurationResult Rejected;
    Rejected.Failure=ETLCBattleConfigFailure::BattleNotReady;
    Rejected.Reason=TEXT("Reset the current battle before changing team configuration.");
    return Rejected;
  }

  FTLCBattleConfigurationResult R=UTLCBattleRulesLibrary::ValidateConfiguration(Config,MaxVisibleFighters);
  if(!R.bSuccess) return R;

  StartingConfig=Config;
  MenState=FTLCTeamRuntimeState();
  WomenState=FTLCTeamRuntimeState();
  MenState.Alive=Config.MenCount;
  WomenState.Alive=Config.WomenCount;
  ElapsedSeconds=0.f;
  BattleIntensity=0.f;
  RecentCasualtyScore=0.f;
  SecondsSinceElimination=0.f;
  SuddenDeathElapsed=0.f;

  OnConfigurationChanged.Broadcast(StartingConfig);
  OnTeamCountChanged.Broadcast(ETLCTeam::Men,MenState.Alive);
  OnTeamCountChanged.Broadcast(ETLCTeam::Women,WomenState.Alive);
  return R;
}

bool ATLCBattleDirector::StartBattle(){
  if(Phase!=ETLCBattlePhase::Ready) return false;
  ActiveMatchId=FGuid::NewGuid();
  SecondsSinceElimination=0.f;
  SuddenDeathElapsed=0.f;
  return SetPhase(ETLCBattlePhase::Active);
}

bool ATLCBattleDirector::PauseBattle(){
  if(Phase==ETLCBattlePhase::Active || Phase==ETLCBattlePhase::SuddenDeath){
    ResumePhaseAfterPause=Phase;
    if(!SetPhase(ETLCBattlePhase::Paused)) return false;
    if(GetWorld()) UGameplayStatics::SetGamePaused(GetWorld(),true);
    OnPauseChanged.Broadcast(true);
    return true;
  }
  if(Phase==ETLCBattlePhase::Paused){
    if(GetWorld()) UGameplayStatics::SetGamePaused(GetWorld(),false);
    if(!SetPhase(ResumePhaseAfterPause)) return false;
    OnPauseChanged.Broadcast(false);
    return true;
  }
  return false;
}

bool ATLCBattleDirector::ResetBattle(){
  if(GetWorld()) UGameplayStatics::SetGamePaused(GetWorld(),false);
  OnResetRequested.Broadcast();
  ++BattleGeneration;
  ActiveMatchId=FGuid::NewGuid();

  MenState=FTLCTeamRuntimeState();
  WomenState=FTLCTeamRuntimeState();
  MenState.Alive=StartingConfig.MenCount;
  WomenState.Alive=StartingConfig.WomenCount;
  ElapsedSeconds=0.f;
  BattleIntensity=0.f;
  RecentCasualtyScore=0.f;
  SecondsSinceElimination=0.f;
  SuddenDeathElapsed=0.f;
  ResumePhaseAfterPause=ETLCBattlePhase::Active;

  SetPhase(ETLCBattlePhase::Ready,true);
  OnPauseChanged.Broadcast(false);
  OnTeamCountChanged.Broadcast(ETLCTeam::Men,MenState.Alive);
  OnTeamCountChanged.Broadcast(ETLCTeam::Women,WomenState.Alive);
  return true;
}

bool ATLCBattleDirector::BeginReplay(){
  if(Phase!=ETLCBattlePhase::Final) return false;
  return SetPhase(ETLCBattlePhase::Replaying);
}

void ATLCBattleDirector::ReportElimination(ETLCTeam T){
  if(Phase!=ETLCBattlePhase::Active && Phase!=ETLCBattlePhase::SuddenDeath) return;
  FTLCTeamRuntimeState* S=T==ETLCTeam::Men?&MenState:T==ETLCTeam::Women?&WomenState:nullptr;
  if(!S||S->Alive<=0)return;
  S->Alive--;
  FTLCTeamRuntimeState* Opponent=T==ETLCTeam::Men?&WomenState:T==ETLCTeam::Women?&MenState:nullptr;
  if(Opponent)Opponent->Eliminations++;
  RecentCasualtyScore += 1.f;
  SecondsSinceElimination=0.f;
  OnTeamCountChanged.Broadcast(T,S->Alive);
  CheckWinnerOrStalemate();
}

int32 ATLCBattleDirector::AddReinforcements(ETLCTeam Team,int32 RequestedCount){
  if((Phase!=ETLCBattlePhase::Active&&Phase!=ETLCBattlePhase::SuddenDeath)||RequestedCount<=0)return 0;
  const int32 Total=MenState.Alive+WomenState.Alive;
  const int32 Accepted=FMath::Clamp(RequestedCount,0,FMath::Max(0,MaxVisibleFighters-Total));
  if(Accepted<=0)return 0;
  FTLCTeamRuntimeState* S=Team==ETLCTeam::Men?&MenState:Team==ETLCTeam::Women?&WomenState:nullptr;
  if(!S)return 0;
  S->Alive+=Accepted;OnTeamCountChanged.Broadcast(Team,S->Alive);return Accepted;
}

void ATLCBattleDirector::SetBossAlive(ETLCTeam Team,bool bAlive){
  if(Team==ETLCTeam::Men)MenState.bBossAlive=bAlive;else if(Team==ETLCTeam::Women)WomenState.bBossAlive=bAlive;
}
void ATLCBattleDirector::SetHeroAlive(ETLCTeam Team,bool bAlive){
  if(Team==ETLCTeam::Men)MenState.bHeroAlive=bAlive;else if(Team==ETLCTeam::Women)WomenState.bHeroAlive=bAlive;
}

FTLCTacticalSnapshot ATLCBattleDirector::GetSnapshot()const{
  FTLCTacticalSnapshot S;
  S.Men=MenState;S.Women=WomenState;S.ElapsedSeconds=ElapsedSeconds;S.BattleIntensity=BattleIntensity;
  S.RecentCasualties=FMath::RoundToInt(RecentCasualtyScore);S.Phase=Phase;
  S.MatchId=ActiveMatchId.ToString(EGuidFormats::DigitsWithHyphensLower);S.BattleGeneration=BattleGeneration;
  return S;
}

void ATLCBattleDirector::SetBattleIntensity(float V){BattleIntensity=FMath::Clamp(V,0.f,1.f);}

bool ATLCBattleDirector::IsLegalTransition(ETLCBattlePhase From,ETLCBattlePhase To)const{
  switch(From){
    case ETLCBattlePhase::Ready: return To==ETLCBattlePhase::Active;
    case ETLCBattlePhase::Active: return To==ETLCBattlePhase::Paused||To==ETLCBattlePhase::SuddenDeath||To==ETLCBattlePhase::Stalemate||To==ETLCBattlePhase::Final;
    case ETLCBattlePhase::Paused: return To==ETLCBattlePhase::Active||To==ETLCBattlePhase::SuddenDeath;
    case ETLCBattlePhase::SuddenDeath: return To==ETLCBattlePhase::Paused||To==ETLCBattlePhase::Stalemate||To==ETLCBattlePhase::Final;
    case ETLCBattlePhase::Stalemate: return To==ETLCBattlePhase::SuddenDeath||To==ETLCBattlePhase::Final;
    case ETLCBattlePhase::Final: return To==ETLCBattlePhase::Replaying;
    case ETLCBattlePhase::Replaying: return To==ETLCBattlePhase::Final;
    default: return false;
  }
}

bool ATLCBattleDirector::SetPhase(ETLCBattlePhase P,bool bForce){
  if(Phase==P) return true;
  if(!bForce && !IsLegalTransition(Phase,P)) return false;
  Phase=P;
  OnPhaseChanged.Broadcast(P);
  return true;
}

void ATLCBattleDirector::CheckWinnerOrStalemate(){
  if(MenState.Alive<=0 || WomenState.Alive<=0){
    if(MenState.Alive<=0 && WomenState.Alive<=0) FinalizeMatch(ETLCTeam::Neutral,TEXT("DoubleElimination"));
    else FinalizeMatch(MenState.Alive>0?ETLCTeam::Men:ETLCTeam::Women,TEXT("Elimination"));
    return;
  }

  if(Phase==ETLCBattlePhase::SuddenDeath && SuddenDeathElapsed>=SuddenDeathTimeoutSeconds){
    FinalizeMatch(MenState.Alive>WomenState.Alive?ETLCTeam::Men:WomenState.Alive>MenState.Alive?ETLCTeam::Women:ETLCTeam::Neutral,TEXT("SuddenDeathTimeout"));
    return;
  }

  if(Phase==ETLCBattlePhase::Active && SecondsSinceElimination>=StalemateTimeoutSeconds){
    SetPhase(ETLCBattlePhase::Stalemate);
    ResolveStalemate();
  }
}

void ATLCBattleDirector::ResolveStalemate(){
  if(MenState.Alive!=WomenState.Alive){
    FinalizeMatch(MenState.Alive>WomenState.Alive?ETLCTeam::Men:ETLCTeam::Women,TEXT("StalemateCountTiebreak"));
    return;
  }
  if(bUseSuddenDeathOnTie){
    SuddenDeathElapsed=0.f;
    SecondsSinceElimination=0.f;
    SetPhase(ETLCBattlePhase::SuddenDeath);
    return;
  }
  FinalizeMatch(ETLCTeam::Neutral,TEXT("StalemateDraw"));
}

void ATLCBattleDirector::FinalizeMatch(ETLCTeam Winner,FName Reason){
  if(Phase==ETLCBattlePhase::Final) return;
  SetPhase(ETLCBattlePhase::Final,true);
  OnBattleFinished.Broadcast(Winner,Reason);
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
  RandomStream.Initialize(Seed);
  EventWeights={{ETLCSpecialEvent::UFOAbduction,1.f},{ETLCSpecialEvent::MaleGiant,.75f},{ETLCSpecialEvent::FemaleGiant,.75f},
  {ETLCSpecialEvent::LightningStrike,.65f},{ETLCSpecialEvent::SuddenFog,.45f},{ETLCSpecialEvent::Meteor,.35f},
  {ETLCSpecialEvent::LowGravity,.3f},{ETLCSpecialEvent::ReinforcementDrop,.55f},{ETLCSpecialEvent::Stampede,.3f},
  {ETLCSpecialEvent::Tornado,.25f},{ETLCSpecialEvent::RobotMalfunction,.3f},{ETLCSpecialEvent::UnicornRage,.3f},
  {ETLCSpecialEvent::GiantBeachBall,.35f},{ETLCSpecialEvent::HealingZone,.45f},{ETLCSpecialEvent::BattlefieldBlackout,.25f},
  {ETLCSpecialEvent::MascotInvasion,.2f}};
}

void ATLCSpecialEventDirector::SetDeterministicSeed(int32 NewSeed){
  Seed=NewSeed;RandomStream.Initialize(Seed);Sequence=0;RecentlyUsed.Reset();LastEventAt=-1000.0;
}

void ATLCSpecialEventDirector::ResetEventState(){
  RecentlyUsed.Reset();Sequence=0;LastEventAt=-1000.0;RandomStream.Initialize(Seed);CleanupAllEvents();
}

FTLCSpecialEventResult ATLCSpecialEventDirector::BuildResult(ETLCSpecialEvent Type)const{
  FTLCSpecialEventResult R;R.EventType=Type;R.Seed=Seed;R.Sequence=Sequence;R.CooldownSeconds=EventCooldownSeconds;
  if(Type==ETLCSpecialEvent::UFOAbduction){R.TelegraphSeconds=1.2f;R.ActiveSeconds=4.0f;}
  else if(Type==ETLCSpecialEvent::MaleGiant||Type==ETLCSpecialEvent::FemaleGiant){R.TelegraphSeconds=1.0f;R.ActiveSeconds=12.0f;}
  else if(Type==ETLCSpecialEvent::Meteor){R.TelegraphSeconds=1.5f;R.ActiveSeconds=2.5f;}
  return R;
}

FTLCSpecialEventResult ATLCSpecialEventDirector::TriggerEvent(const FTLCTacticalSnapshot& S){
  if(S.Phase!=ETLCBattlePhase::Active&&S.Phase!=ETLCBattlePhase::SuddenDeath)return FTLCSpecialEventResult();
  const double Now=GetWorld()?GetWorld()->GetTimeSeconds():0.0;
  if(Now-LastEventAt<EventCooldownSeconds) return FTLCSpecialEventResult();

  TArray<FTLCSpecialEventWeight>C;float Total=0;
  for(auto I:EventWeights){
    if(RecentlyUsed.Contains(I.EventType))I.Weight*=.2f;
    if(I.EventType==ETLCSpecialEvent::UFOAbduction&&S.ElapsedSeconds>75)I.Weight*=1.65f;
    if((I.EventType==ETLCSpecialEvent::MaleGiant||I.EventType==ETLCSpecialEvent::FemaleGiant)&&FMath::Abs(S.Men.Alive-S.Women.Alive)>=20)I.Weight*=1.45f;
    if(I.EventType==ETLCSpecialEvent::RobotMalfunction&&!S.Men.bBossAlive)I.Weight=0;
    if(I.EventType==ETLCSpecialEvent::UnicornRage&&!S.Women.bBossAlive)I.Weight=0;
    if(S.Men.Alive+S.Women.Alive<=0)I.Weight=0;
    if(I.Weight>0){C.Add(I);Total+=I.Weight;}
  }
  if(C.Num()==0||Total<=0) return FTLCSpecialEventResult();

  float Roll=RandomStream.FRandRange(0,Total);ETLCSpecialEvent Chosen=C[0].EventType;
  for(const auto& I:C){Roll-=I.Weight;if(Roll<=0){Chosen=I.EventType;break;}}
  return ForceEvent(Chosen,S);
}

FTLCSpecialEventResult ATLCSpecialEventDirector::ForceEvent(ETLCSpecialEvent Type,const FTLCTacticalSnapshot& S){
  ++Sequence;
  LastEventAt=GetWorld()?GetWorld()->GetTimeSeconds():LastEventAt;
  RecentlyUsed.Add(Type);
  if(RecentlyUsed.Num()>4){RecentlyUsed.Reset();RecentlyUsed.Add(Type);}
  FTLCSpecialEventResult R=BuildResult(Type);R.bTriggered=true;R.Sequence=Sequence;
  OnEventTriggered.Broadcast(Type);ExecuteEvent(Type,S,R);return R;
}

void ATLCAudioDirector::SetMusicState(ETLCMusicState S){if(CurrentState==S)return;CurrentState=S;TransitionMusicState(S);}
void ATLCAudioDirector::UpdateMix(const FTLCTacticalSnapshot& S){
  const int32 Alive=S.Men.Alive+S.Women.Alive;const float Total=FMath::Max(1.f,(float)Alive);
  const float M=(S.Men.Alive-S.Women.Alive)/Total;ApplyMetaSoundParameters(FMath::Clamp(S.BattleIntensity,0.f,1.f),FMath::Clamp(M,-1.f,1.f),FMath::Clamp(-M,-1.f,1.f),S.Men.bBossAlive||S.Women.bBossAlive,Alive<=10);
}
void ATLCAudioDirector::ResetAudioState(){CurrentState=ETLCMusicState::PreBattle;StopBattleAudio();}
