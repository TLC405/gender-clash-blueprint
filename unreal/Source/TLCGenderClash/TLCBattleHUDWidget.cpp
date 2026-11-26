#include "TLCBattleHUDWidget.h"
#include "TLCBattleSimulation.h"
#include "TLCCommanderCharacter.h"
#include "TLCSpectatorCameraActor.h"
#include "Blueprint/WidgetTree.h"
#include "Components/CanvasPanel.h"
#include "Components/CanvasPanelSlot.h"
#include "Components/VerticalBox.h"
#include "Components/VerticalBoxSlot.h"
#include "Components/HorizontalBox.h"
#include "Components/HorizontalBoxSlot.h"
#include "Components/Border.h"
#include "Components/TextBlock.h"
#include "Components/Button.h"
#include "Components/Slider.h"
#include "Components/ComboBoxString.h"
#include "Components/CheckBox.h"
#include "Components/SizeBox.h"
#include "Kismet/GameplayStatics.h"
#include "Engine/Engine.h"
#include "Engine/GameViewportClient.h"

namespace {
  static const FLinearColor MenBlue(0.04f,.26f,.78f,1.f);
  static const FLinearColor WomenRed(.78f,.04f,.20f,1.f);
  static const FLinearColor Chalk(0.96f,.95f,.90f,1.f);
  static const FLinearColor Gold(1.f,.76f,.18f,1.f);
  static const FLinearColor PanelBlack(.025f,.03f,.045f,.96f);
}

void UTLCBattleHUDWidget::NativeConstruct(){
  Super::NativeConstruct();
  BuildUI();
}

void UTLCBattleHUDWidget::BindRuntime(ATLCBattleDirector* InBattleDirector,ATLCBattleSimulationDirector* InSimulation,ATLCSpecialEventDirector* InEventDirector,ATLCSpectatorCameraActor* InCamera){
  if(BattleDirector){
    BattleDirector->OnTeamCountChanged.RemoveDynamic(this,&UTLCBattleHUDWidget::HandleTeamCountChanged);
    BattleDirector->OnPhaseChanged.RemoveDynamic(this,&UTLCBattleHUDWidget::HandlePhaseChanged);
    BattleDirector->OnBattleFinished.RemoveDynamic(this,&UTLCBattleHUDWidget::HandleBattleFinished);
  }
  if(EventDirector)EventDirector->OnEventTriggered.RemoveDynamic(this,&UTLCBattleHUDWidget::HandleSpecialEvent);
  BattleDirector=InBattleDirector;Simulation=InSimulation;EventDirector=InEventDirector;SpectatorCamera=InCamera;
  if(BattleDirector){
    BattleDirector->OnTeamCountChanged.AddDynamic(this,&UTLCBattleHUDWidget::HandleTeamCountChanged);
    BattleDirector->OnPhaseChanged.AddDynamic(this,&UTLCBattleHUDWidget::HandlePhaseChanged);
    BattleDirector->OnBattleFinished.AddDynamic(this,&UTLCBattleHUDWidget::HandleBattleFinished);
    const auto S=BattleDirector->GetSnapshot();PendingMen=S.Men.Alive;PendingWomen=S.Women.Alive;
  }
  if(EventDirector)EventDirector->OnEventTriggered.AddDynamic(this,&UTLCBattleHUDWidget::HandleSpecialEvent);
  RefreshPendingCountLabels();RefreshRuntimeText();
}

UTextBlock* UTLCBattleHUDWidget::MakeLabel(const FString& Text,int32 Size,const FLinearColor& Color){
  UTextBlock* T=WidgetTree->ConstructWidget<UTextBlock>();
  T->SetText(FText::FromString(Text));T->SetColorAndOpacity(FSlateColor(Color));
  FSlateFontInfo Font=T->GetFont();Font.Size=Size;T->SetFont(Font);
  return T;
}
void UTLCBattleHUDWidget::AddSectionLabel(UVerticalBox* Parent,const FString& Label,const FLinearColor& Color){
  if(!Parent)return;UTextBlock* T=MakeLabel(Label,15,Color);Parent->AddChildToVerticalBox(T);
}
UButton* UTLCBattleHUDWidget::MakeButton(UVerticalBox* Parent,const FString& Label,FName){
  USizeBox* Size=WidgetTree->ConstructWidget<USizeBox>();Size->SetMinDesiredHeight(46.f);
  UButton* B=WidgetTree->ConstructWidget<UButton>();UTextBlock* T=MakeLabel(Label,14,Chalk);T->SetJustification(ETextJustify::Center);B->AddChild(T);Size->AddChild(B);Parent->AddChildToVerticalBox(Size);return B;
}

void UTLCBattleHUDWidget::BuildUI(){
  RootCanvas=WidgetTree->ConstructWidget<UCanvasPanel>();WidgetTree->RootWidget=RootCanvas;

  UBorder* ScoreBorder=WidgetTree->ConstructWidget<UBorder>();ScoreBorder->SetBrushColor(FLinearColor(.015f,.018f,.025f,.96f));
  UHorizontalBox* ScoreRow=WidgetTree->ConstructWidget<UHorizontalBox>();ScoreBorder->SetContent(ScoreRow);
  MenScore=MakeLabel(TEXT("MEN 50"),24,FLinearColor(.22f,.55f,1.f,1));TimerText=MakeLabel(TEXT("00:00"),24,Gold);WomenScore=MakeLabel(TEXT("WOMEN 50"),24,FLinearColor(1.f,.30f,.48f,1));
  UHorizontalBoxSlot* MenScoreSlot=ScoreRow->AddChildToHorizontalBox(MenScore);
  UHorizontalBoxSlot* TimerSlot=ScoreRow->AddChildToHorizontalBox(TimerText);
  UHorizontalBoxSlot* WomenScoreSlot=ScoreRow->AddChildToHorizontalBox(WomenScore);
  if(MenScoreSlot){FSlateChildSize Fill;Fill.SizeRule=ESlateSizeRule::Fill;MenScoreSlot->SetSize(Fill);MenScoreSlot->SetHorizontalAlignment(HAlign_Left);}
  if(TimerSlot){FSlateChildSize Fill;Fill.SizeRule=ESlateSizeRule::Fill;TimerSlot->SetSize(Fill);TimerSlot->SetHorizontalAlignment(HAlign_Center);}
  if(WomenScoreSlot){FSlateChildSize Fill;Fill.SizeRule=ESlateSizeRule::Fill;WomenScoreSlot->SetSize(Fill);WomenScoreSlot->SetHorizontalAlignment(HAlign_Right);}
  UCanvasPanelSlot* ScoreSlot=RootCanvas->AddChildToCanvas(ScoreBorder);ScoreSlot->SetAnchors(FAnchors(.04f,.015f,.96f,.09f));ScoreSlot->SetOffsets(FMargin(0));

  StateText=MakeLabel(TEXT("READY"),15,Gold);StateText->SetJustification(ETextJustify::Center);
  UCanvasPanelSlot* StateSlot=RootCanvas->AddChildToCanvas(StateText);StateSlot->SetAnchors(FAnchors(.43f,.095f,.57f,.13f));StateSlot->SetOffsets(FMargin(0));
  EventText=MakeLabel(TEXT("FIELD CLEAR"),13,Chalk);EventText->SetJustification(ETextJustify::Center);
  UCanvasPanelSlot* EventSlot=RootCanvas->AddChildToCanvas(EventText);EventSlot->SetAnchors(FAnchors(.35f,.13f,.65f,.17f));EventSlot->SetOffsets(FMargin(0));

  MenPanel=WidgetTree->ConstructWidget<UBorder>();MenPanel->SetBrushColor(FLinearColor(.02f,.08f,.25f,.97f));
  WomenPanel=WidgetTree->ConstructWidget<UBorder>();WomenPanel->SetBrushColor(FLinearColor(.28f,.015f,.07f,.97f));
  CenterPanel=WidgetTree->ConstructWidget<UBorder>();CenterPanel->SetBrushColor(PanelBlack);
  MenPanelSlot=RootCanvas->AddChildToCanvas(MenPanel);WomenPanelSlot=RootCanvas->AddChildToCanvas(WomenPanel);CenterPanelSlot=RootCanvas->AddChildToCanvas(CenterPanel);

  UVerticalBox* Men=WidgetTree->ConstructWidget<UVerticalBox>();MenPanel->SetContent(Men);
  AddSectionLabel(Men,TEXT("MEN PANEL"),FLinearColor(.45f,.70f,1.f,1));
  MenCountText=MakeLabel(TEXT("FIGHTERS 50"),13,Chalk);Men->AddChildToVerticalBox(MenCountText);
  MenCountSlider=WidgetTree->ConstructWidget<USlider>();MenCountSlider->SetValue(.5f);MenCountSlider->OnValueChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnMenCountChanged);Men->AddChildToVerticalBox(MenCountSlider);
  MenRageToggle=WidgetTree->ConstructWidget<UCheckBox>();MenRageToggle->OnCheckStateChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnMenRageChanged);UHorizontalBox* MR=WidgetTree->ConstructWidget<UHorizontalBox>();MR->AddChildToHorizontalBox(MenRageToggle);MR->AddChildToHorizontalBox(MakeLabel(TEXT(" RAGE"),13,Chalk));Men->AddChildToVerticalBox(MR);
  MenFormationCombo=WidgetTree->ConstructWidget<UComboBoxString>();for(const TCHAR* F:{TEXT("Ranks"),TEXT("Line"),TEXT("Wedge"),TEXT("Shield Wall"),TEXT("Columns"),TEXT("Spread"),TEXT("Circle"),TEXT("Rush")})MenFormationCombo->AddOption(F);MenFormationCombo->SetSelectedOption(TEXT("Ranks"));MenFormationCombo->OnSelectionChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnMenFormationChanged);Men->AddChildToVerticalBox(MenFormationCombo);
  MenWeaponText=MakeLabel(TEXT("WEAPON: FISTS"),12,Gold);Men->AddChildToVerticalBox(MenWeaponText);
  UButton* MF=MakeButton(Men,TEXT("FISTS"),TEXT("MenFists"));MF->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnMenFists);
  UButton* MG=MakeButton(Men,TEXT("GUNS"),TEXT("MenGun"));MG->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnMenGun);
  UButton* MS=MakeButton(Men,TEXT("SWORDS"),TEXT("MenSword"));MS->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnMenSword);
  UButton* MC=MakeButton(Men,TEXT("SPAWN TLC COMMANDER"),TEXT("Commander"));MC->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnSpawnCommander);
  UButton* MRobo=MakeButton(Men,TEXT("DEPLOY ROBOT"),TEXT("Robot"));MRobo->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnSpawnRobot);

  UVerticalBox* Women=WidgetTree->ConstructWidget<UVerticalBox>();WomenPanel->SetContent(Women);
  AddSectionLabel(Women,TEXT("WOMEN PANEL"),FLinearColor(1.f,.48f,.63f,1));
  WomenCountText=MakeLabel(TEXT("FIGHTERS 50"),13,Chalk);Women->AddChildToVerticalBox(WomenCountText);
  WomenCountSlider=WidgetTree->ConstructWidget<USlider>();WomenCountSlider->SetValue(.5f);WomenCountSlider->OnValueChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnWomenCountChanged);Women->AddChildToVerticalBox(WomenCountSlider);
  WomenRageToggle=WidgetTree->ConstructWidget<UCheckBox>();WomenRageToggle->OnCheckStateChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnWomenRageChanged);UHorizontalBox* WR=WidgetTree->ConstructWidget<UHorizontalBox>();WR->AddChildToHorizontalBox(WomenRageToggle);WR->AddChildToHorizontalBox(MakeLabel(TEXT(" RAGE"),13,Chalk));Women->AddChildToVerticalBox(WR);
  FuriosaToggle=WidgetTree->ConstructWidget<UCheckBox>();FuriosaToggle->OnCheckStateChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnFuriosaChanged);UHorizontalBox* FR=WidgetTree->ConstructWidget<UHorizontalBox>();FR->AddChildToHorizontalBox(FuriosaToggle);FR->AddChildToHorizontalBox(MakeLabel(TEXT(" FURIOSA"),13,Chalk));Women->AddChildToVerticalBox(FR);
  WomenFormationCombo=WidgetTree->ConstructWidget<UComboBoxString>();for(const TCHAR* F:{TEXT("Ranks"),TEXT("Line"),TEXT("Wedge"),TEXT("Shield Wall"),TEXT("Columns"),TEXT("Spread"),TEXT("Circle"),TEXT("Rush")})WomenFormationCombo->AddOption(F);WomenFormationCombo->SetSelectedOption(TEXT("Ranks"));WomenFormationCombo->OnSelectionChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnWomenFormationChanged);Women->AddChildToVerticalBox(WomenFormationCombo);
  WomenWeaponText=MakeLabel(TEXT("WEAPON: FISTS"),12,Gold);Women->AddChildToVerticalBox(WomenWeaponText);
  UButton* WF=MakeButton(Women,TEXT("FISTS"),TEXT("WomenFists"));WF->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnWomenFists);
  UButton* WL=MakeButton(Women,TEXT("LIPSTICK GUN"),TEXT("Lipstick"));WL->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnWomenLipstick);
  UButton* WB=MakeButton(Women,TEXT("MAKEUP BOMB"),TEXT("Bomb"));WB->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnWomenBomb);
  UButton* WU=MakeButton(Women,TEXT("BATTLE UNICORN"),TEXT("Unicorn"));WU->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnSpawnUnicorn);

  UVerticalBox* Center=WidgetTree->ConstructWidget<UVerticalBox>();CenterPanel->SetContent(Center);
  AddSectionLabel(Center,TEXT("TLC GENDER CLASH"),Gold);
  PresetCombo=WidgetTree->ConstructWidget<UComboBoxString>();PresetCombo->AddOption(TEXT("Broadcast Arena"));PresetCombo->AddOption(TEXT("Narrow Pass"));PresetCombo->AddOption(TEXT("North vs South"));PresetCombo->SetSelectedOption(TEXT("Broadcast Arena"));PresetCombo->OnSelectionChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnPresetChanged);Center->AddChildToVerticalBox(PresetCombo);
  UButton* Start=MakeButton(Center,TEXT("START BATTLE"),TEXT("Start"));Start->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnStart);
  UButton* Pause=MakeButton(Center,TEXT("PAUSE / RESUME"),TEXT("Pause"));Pause->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnPause);
  UButton* Reset=MakeButton(Center,TEXT("RESET"),TEXT("Reset"));Reset->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnReset);
  UButton* Special=MakeButton(Center,TEXT("SPECIAL EVENT"),TEXT("Special"));Special->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnSpecialEvent);
  AddSectionLabel(Center,TEXT("CAMERA ZOOM"),Chalk);CameraZoomSlider=WidgetTree->ConstructWidget<USlider>();CameraZoomSlider->SetValue(.5f);CameraZoomSlider->OnValueChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnCameraZoomChanged);Center->AddChildToVerticalBox(CameraZoomSlider);
  AddSectionLabel(Center,TEXT("CHAOS INTENSITY"),Chalk);ChaosSlider=WidgetTree->ConstructWidget<USlider>();ChaosSlider->SetValue(.5f);ChaosSlider->OnValueChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnChaosChanged);Center->AddChildToVerticalBox(ChaosSlider);
  SlowMoToggle=WidgetTree->ConstructWidget<UCheckBox>();SlowMoToggle->OnCheckStateChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnSlowMoChanged);UHorizontalBox* SM=WidgetTree->ConstructWidget<UHorizontalBox>();SM->AddChildToHorizontalBox(SlowMoToggle);SM->AddChildToHorizontalBox(MakeLabel(TEXT(" SLOW MOTION"),12,Chalk));Center->AddChildToVerticalBox(SM);
  CinematicToggle=WidgetTree->ConstructWidget<UCheckBox>();CinematicToggle->OnCheckStateChanged.AddDynamic(this,&UTLCBattleHUDWidget::OnCinematicChanged);UHorizontalBox* CF=WidgetTree->ConstructWidget<UHorizontalBox>();CF->AddChildToHorizontalBox(CinematicToggle);CF->AddChildToHorizontalBox(MakeLabel(TEXT(" CINEMATIC FX"),12,Chalk));Center->AddChildToVerticalBox(CF);
  AddSectionLabel(Center,TEXT("TLC COMMANDER"),Gold);
  NukeButton=MakeButton(Center,TEXT("NUKE"),TEXT("Nuke"));NukeButton->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnNuke);
  WaterButton=MakeButton(Center,TEXT("WATER CANNON"),TEXT("Water"));WaterButton->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnWaterCannon);
  LipstickShotButton=MakeButton(Center,TEXT("LIPSTICK SHOT"),TEXT("LipstickShot"));LipstickShotButton->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnLipstickShot);
  ShockwaveButton=MakeButton(Center,TEXT("SHOCKWAVE"),TEXT("Shock"));ShockwaveButton->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnShockwave);
  RallyButton=MakeButton(Center,TEXT("RALLY"),TEXT("Rally"));RallyButton->OnClicked.AddDynamic(this,&UTLCBattleHUDWidget::OnRally);

  ApplyResponsiveLayout();
}

void UTLCBattleHUDWidget::ApplyResponsiveLayout(){
  FVector2D Size(1920,1080);if(GEngine&&GEngine->GameViewport)GEngine->GameViewport->GetViewportSize(Size);
  const float Aspect=Size.Y>0?Size.X/Size.Y:1.77f;
  const float Bottom=Aspect<1.45f?.54f:.60f;
  MenPanelSlot->SetAnchors(FAnchors(.015f,Bottom,.31f,.985f));MenPanelSlot->SetOffsets(FMargin(0));
  WomenPanelSlot->SetAnchors(FAnchors(.69f,Bottom,.985f,.985f));WomenPanelSlot->SetOffsets(FMargin(0));
  CenterPanelSlot->SetAnchors(FAnchors(.36f,Bottom,.64f,.985f));CenterPanelSlot->SetOffsets(FMargin(0));
}

void UTLCBattleHUDWidget::NativeTick(const FGeometry& G,float Dt){Super::NativeTick(G,Dt);RefreshRuntimeText();UpdateCommanderButtons();}

void UTLCBattleHUDWidget::RefreshRuntimeText(){
  if(!BattleDirector)return;const auto S=BattleDirector->GetSnapshot();
  if(MenScore)MenScore->SetText(FText::FromString(FString::Printf(TEXT("MEN %d"),S.Men.Alive)));
  if(WomenScore)WomenScore->SetText(FText::FromString(FString::Printf(TEXT("WOMEN %d"),S.Women.Alive)));
  const int32 Sec=FMath::FloorToInt(S.ElapsedSeconds);if(TimerText)TimerText->SetText(FText::FromString(FString::Printf(TEXT("%02d:%02d"),Sec/60,Sec%60)));
}
void UTLCBattleHUDWidget::RefreshPendingCountLabels(){if(MenCountText)MenCountText->SetText(FText::FromString(FString::Printf(TEXT("FIGHTERS %d"),PendingMen)));if(WomenCountText)WomenCountText->SetText(FText::FromString(FString::Printf(TEXT("FIGHTERS %d"),PendingWomen)));}
void UTLCBattleHUDWidget::ApplyPendingConfig(){if(!Simulation||!BattleDirector||BattleDirector->GetPhase()!=ETLCBattlePhase::Ready)return;Simulation->BuildBattle(PendingMen,PendingWomen);}

ETLCFormation UTLCBattleHUDWidget::ParseFormation(const FString& V)const{
  if(V==TEXT("Line"))return ETLCFormation::Line;if(V==TEXT("Wedge"))return ETLCFormation::Wedge;if(V==TEXT("Shield Wall"))return ETLCFormation::ShieldWall;if(V==TEXT("Columns"))return ETLCFormation::Columns;if(V==TEXT("Spread"))return ETLCFormation::Spread;if(V==TEXT("Circle"))return ETLCFormation::Circle;if(V==TEXT("Rush"))return ETLCFormation::Rush;return ETLCFormation::Ranks;
}
void UTLCBattleHUDWidget::HandleTeamCountChanged(ETLCTeam,int32){RefreshRuntimeText();}
void UTLCBattleHUDWidget::HandlePhaseChanged(ETLCBattlePhase P){if(StateText)StateText->SetText(FText::FromString(UEnum::GetValueAsString(P).Replace(TEXT("ETLCBattlePhase::"),TEXT(""))));}
void UTLCBattleHUDWidget::HandleBattleFinished(ETLCTeam W,FName Reason){if(EventText)EventText->SetText(FText::FromString(FString::Printf(TEXT("FINAL • %s • %s"),*UEnum::GetValueAsString(W),*Reason.ToString())));}
void UTLCBattleHUDWidget::HandleSpecialEvent(ETLCSpecialEvent E){if(EventText)EventText->SetText(FText::FromString(FString::Printf(TEXT("EVENT • %s"),*UEnum::GetValueAsString(E).Replace(TEXT("ETLCSpecialEvent::"),TEXT("")))));}

void UTLCBattleHUDWidget::OnStart(){ApplyPendingConfig();if(Simulation)Simulation->StartSimulation();}
void UTLCBattleHUDWidget::OnPause(){if(BattleDirector)BattleDirector->PauseBattle();}
void UTLCBattleHUDWidget::OnReset(){
  UGameplayStatics::SetGlobalTimeDilation(this,1.f);
  if(SlowMoToggle)SlowMoToggle->SetIsChecked(false);if(MenRageToggle)MenRageToggle->SetIsChecked(false);if(WomenRageToggle)WomenRageToggle->SetIsChecked(false);if(FuriosaToggle)FuriosaToggle->SetIsChecked(false);
  bMenGun=bMenSword=bWomenLipstick=bWomenBomb=false;if(MenWeaponText)MenWeaponText->SetText(FText::FromString(TEXT("WEAPON: FISTS")));if(WomenWeaponText)WomenWeaponText->SetText(FText::FromString(TEXT("WEAPON: FISTS")));if(EventText)EventText->SetText(FText::FromString(TEXT("FIELD CLEAR")));
  if(BattleDirector)BattleDirector->ResetBattle();
}
void UTLCBattleHUDWidget::OnSpawnCommander(){if(Simulation)Simulation->SpawnCommander();}
void UTLCBattleHUDWidget::OnSpawnRobot(){if(Simulation)Simulation->SpawnRobot();}
void UTLCBattleHUDWidget::OnSpawnUnicorn(){if(Simulation)Simulation->SpawnUnicorn();}
void UTLCBattleHUDWidget::OnSpecialEvent(){if(EventDirector&&BattleDirector)EventDirector->TriggerEvent(BattleDirector->GetSnapshot());}
void UTLCBattleHUDWidget::OnMenFists(){bMenGun=bMenSword=false;if(Simulation)Simulation->SetTeamWeapon(ETLCTeam::Men,ETLCWeaponType::Fists);MenWeaponText->SetText(FText::FromString(TEXT("WEAPON: FISTS")));}
void UTLCBattleHUDWidget::OnMenGun(){if(Simulation&&Simulation->SetTeamWeapon(ETLCTeam::Men,ETLCWeaponType::Gun)){bMenGun=true;bMenSword=false;MenWeaponText->SetText(FText::FromString(TEXT("WEAPON: GUNS")));}else if(EventText)EventText->SetText(FText::FromString(TEXT("GUNS BLOCKED BY BATTLE PRESET")));}
void UTLCBattleHUDWidget::OnMenSword(){if(Simulation&&Simulation->SetTeamWeapon(ETLCTeam::Men,ETLCWeaponType::Sword)){bMenSword=true;bMenGun=false;MenWeaponText->SetText(FText::FromString(TEXT("WEAPON: SWORDS")));}else if(EventText)EventText->SetText(FText::FromString(TEXT("SWORDS BLOCKED BY BATTLE PRESET")));}
void UTLCBattleHUDWidget::OnWomenFists(){bWomenLipstick=bWomenBomb=false;if(Simulation)Simulation->SetTeamWeapon(ETLCTeam::Women,ETLCWeaponType::Fists);WomenWeaponText->SetText(FText::FromString(TEXT("WEAPON: FISTS")));}
void UTLCBattleHUDWidget::OnWomenLipstick(){if(Simulation&&Simulation->SetTeamWeapon(ETLCTeam::Women,ETLCWeaponType::LipstickGun)){bWomenLipstick=true;bWomenBomb=false;WomenWeaponText->SetText(FText::FromString(TEXT("WEAPON: LIPSTICK GUN")));}else if(EventText)EventText->SetText(FText::FromString(TEXT("LIPSTICK GUN BLOCKED BY BATTLE PRESET")));}
void UTLCBattleHUDWidget::OnWomenBomb(){if(Simulation&&Simulation->SetTeamWeapon(ETLCTeam::Women,ETLCWeaponType::MakeupBomb)){bWomenBomb=true;bWomenLipstick=false;WomenWeaponText->SetText(FText::FromString(TEXT("WEAPON: MAKEUP BOMB")));}else if(EventText)EventText->SetText(FText::FromString(TEXT("MAKEUP BOMB BLOCKED BY BATTLE PRESET")));}
void UTLCBattleHUDWidget::OnNuke(){if(Simulation&&Simulation->GetCommander())Simulation->GetCommander()->TriggerNuke();else if(EventText)EventText->SetText(FText::FromString(TEXT("SPAWN TLC COMMANDER FIRST")));}
void UTLCBattleHUDWidget::OnWaterCannon(){if(Simulation&&Simulation->GetCommander())Simulation->GetCommander()->TriggerWaterCannon();else if(EventText)EventText->SetText(FText::FromString(TEXT("SPAWN TLC COMMANDER FIRST")));}
void UTLCBattleHUDWidget::OnLipstickShot(){if(Simulation&&Simulation->GetCommander())Simulation->GetCommander()->TriggerLipstickShot();else if(EventText)EventText->SetText(FText::FromString(TEXT("SPAWN TLC COMMANDER FIRST")));}
void UTLCBattleHUDWidget::OnShockwave(){if(Simulation&&Simulation->GetCommander())Simulation->GetCommander()->TriggerShockwaveSlam();else if(EventText)EventText->SetText(FText::FromString(TEXT("SPAWN TLC COMMANDER FIRST")));}
void UTLCBattleHUDWidget::OnRally(){if(Simulation&&Simulation->GetCommander())Simulation->GetCommander()->TriggerRallyBuff();else if(EventText)EventText->SetText(FText::FromString(TEXT("SPAWN TLC COMMANDER FIRST")));}

void UTLCBattleHUDWidget::OnMenCountChanged(float V){PendingMen=FMath::Clamp(FMath::RoundToInt(V*100.f),0,100-PendingWomen);MenCountSlider->SetValue(PendingMen/100.f);RefreshPendingCountLabels();}
void UTLCBattleHUDWidget::OnWomenCountChanged(float V){PendingWomen=FMath::Clamp(FMath::RoundToInt(V*100.f),0,100-PendingMen);WomenCountSlider->SetValue(PendingWomen/100.f);RefreshPendingCountLabels();}
void UTLCBattleHUDWidget::OnCameraZoomChanged(float V){if(SpectatorCamera)SpectatorCamera->SetZoomNormalized(V);}
void UTLCBattleHUDWidget::OnChaosChanged(float V){if(BattleDirector)BattleDirector->SetBattleIntensity(V);}
void UTLCBattleHUDWidget::OnMenRageChanged(bool B){if(Simulation)Simulation->SetTeamRage(ETLCTeam::Men,B);}
void UTLCBattleHUDWidget::OnWomenRageChanged(bool B){if(Simulation)Simulation->SetTeamRage(ETLCTeam::Women,B);}
void UTLCBattleHUDWidget::OnFuriosaChanged(bool B){if(Simulation)Simulation->SetFuriosaMode(B);}
void UTLCBattleHUDWidget::OnSlowMoChanged(bool B){UGameplayStatics::SetGlobalTimeDilation(this,B?.35f:1.f);}
void UTLCBattleHUDWidget::OnCinematicChanged(bool B){if(SpectatorCamera)SpectatorCamera->SetCinematicFX(B);}
void UTLCBattleHUDWidget::OnMenFormationChanged(FString S,ESelectInfo::Type){if(Simulation)Simulation->SetTeamFormation(ETLCTeam::Men,ParseFormation(S));}
void UTLCBattleHUDWidget::OnWomenFormationChanged(FString S,ESelectInfo::Type){if(Simulation)Simulation->SetTeamFormation(ETLCTeam::Women,ParseFormation(S));}

void UTLCBattleHUDWidget::OnPresetChanged(FString S,ESelectInfo::Type){
  if(!Simulation||!BattleDirector||BattleDirector->GetPhase()!=ETLCBattlePhase::Ready)return;
  ETLCBattlePreset P=ETLCBattlePreset::BroadcastArena;
  if(S==TEXT("Narrow Pass")){P=ETLCBattlePreset::NarrowPass;PendingMen=30;PendingWomen=70;}
  else if(S==TEXT("North vs South")){P=ETLCBattlePreset::NorthVsSouth;PendingMen=50;PendingWomen=50;}
  else {PendingMen=50;PendingWomen=50;}
  Simulation->ApplyPreset(P);
  if(MenCountSlider)MenCountSlider->SetValue(PendingMen/100.f);
  if(WomenCountSlider)WomenCountSlider->SetValue(PendingWomen/100.f);
  RefreshPendingCountLabels();
  Simulation->BuildBattle(PendingMen,PendingWomen);
}

void UTLCBattleHUDWidget::SetButtonText(UButton* Button,const FString& Text){
  if(!Button)return;if(UTextBlock* T=Cast<UTextBlock>(Button->GetContent()))T->SetText(FText::FromString(Text));
}
void UTLCBattleHUDWidget::UpdateCommanderButtons(){
  if(!Simulation)return;ATLCCommanderCharacter* C=Simulation->GetCommander();
  TArray<TPair<UButton*,FName>> Buttons={{NukeButton,"Nuke"},{WaterButton,"WaterCannon"},{LipstickShotButton,"LipstickShot"},{ShockwaveButton,"ShockwaveSlam"},{RallyButton,"RallyBuff"}};
  for(const auto& Pair:Buttons){
    if(!Pair.Key)continue;
    if(!C){Pair.Key->SetIsEnabled(false);SetButtonText(Pair.Key,Pair.Value.ToString()+TEXT(" • SPAWN HERO"));continue;}
    const float Remaining=C->GetCooldownRemaining(Pair.Value);Pair.Key->SetIsEnabled(Remaining<=.01f);
    SetButtonText(Pair.Key,Remaining>.01f?FString::Printf(TEXT("%s • %.1fs"),*Pair.Value.ToString(),Remaining):Pair.Value.ToString());
  }
}
