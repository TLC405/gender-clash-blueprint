#pragma once

#include "CoreMinimal.h"
#include "Blueprint/UserWidget.h"
#include "TLCBattleSystems.h"
#include "TLCArcadeRuntime.h"
#include "TLCBattleHUDWidget.generated.h"

class UCanvasPanel;
class UCanvasPanelSlot;
class UTextBlock;
class USlider;
class UComboBoxString;
class UCheckBox;
class UButton;
class UBorder;
class ATLCBattleDirector;
class ATLCBattleSimulationDirector;
class ATLCSpecialEventDirector;
class ATLCSpectatorCameraActor;
class ATLCAnnouncerDirector;

UCLASS()
class TLCGENDERCLASH_API UTLCBattleHUDWidget : public UUserWidget {
  GENERATED_BODY()
public:
  virtual void NativeConstruct() override;
  virtual void NativeTick(const FGeometry& MyGeometry,float InDeltaTime) override;

  UFUNCTION(BlueprintCallable) void BindAnnouncer(ATLCAnnouncerDirector* InAnnouncer);
  UFUNCTION(BlueprintCallable) void BindRuntime(
    ATLCBattleDirector* InBattleDirector,
    ATLCBattleSimulationDirector* InSimulation,
    ATLCSpecialEventDirector* InEventDirector,
    ATLCSpectatorCameraActor* InCamera);

private:
  UPROPERTY() TObjectPtr<ATLCBattleDirector> BattleDirector;
  UPROPERTY() TObjectPtr<ATLCBattleSimulationDirector> Simulation;
  UPROPERTY() TObjectPtr<ATLCSpecialEventDirector> EventDirector;
  UPROPERTY() TObjectPtr<ATLCSpectatorCameraActor> SpectatorCamera;
  UPROPERTY() TObjectPtr<ATLCAnnouncerDirector> AnnouncerDirector;

  UPROPERTY() TObjectPtr<UCanvasPanel> RootCanvas;
  UPROPERTY() TObjectPtr<UTextBlock> MenScore;
  UPROPERTY() TObjectPtr<UTextBlock> WomenScore;
  UPROPERTY() TObjectPtr<UTextBlock> TimerText;
  UPROPERTY() TObjectPtr<UTextBlock> StateText;
  UPROPERTY() TObjectPtr<UTextBlock> EventText;
  UPROPERTY() TObjectPtr<UTextBlock> MenCountText;
  UPROPERTY() TObjectPtr<UTextBlock> WomenCountText;
  UPROPERTY() TObjectPtr<UTextBlock> MenStrengthText;
  UPROPERTY() TObjectPtr<UTextBlock> WomenSpeedText;
  UPROPERTY() TObjectPtr<UTextBlock> MenWeaponText;
  UPROPERTY() TObjectPtr<UTextBlock> WomenWeaponText;
  UPROPERTY() TObjectPtr<UTextBlock> CommanderHealthText;
  UPROPERTY() TObjectPtr<USlider> MenCountSlider;
  UPROPERTY() TObjectPtr<USlider> WomenCountSlider;
  UPROPERTY() TObjectPtr<USlider> MenStrengthSlider;
  UPROPERTY() TObjectPtr<USlider> WomenSpeedSlider;
  UPROPERTY() TObjectPtr<USlider> CameraZoomSlider;
  UPROPERTY() TObjectPtr<USlider> ChaosSlider;
  UPROPERTY() TObjectPtr<UComboBoxString> PresetCombo;
  UPROPERTY() TObjectPtr<UComboBoxString> MenFormationCombo;
  UPROPERTY() TObjectPtr<UComboBoxString> WomenFormationCombo;
  UPROPERTY() TObjectPtr<UCheckBox> MenRageToggle;
  UPROPERTY() TObjectPtr<UCheckBox> MenGunsToggle;
  UPROPERTY() TObjectPtr<UCheckBox> MenSwordsToggle;
  UPROPERTY() TObjectPtr<UCheckBox> WomenRageToggle;
  UPROPERTY() TObjectPtr<UCheckBox> WomenLipstickToggle;
  UPROPERTY() TObjectPtr<UCheckBox> WomenBombToggle;
  UPROPERTY() TObjectPtr<UCheckBox> FuriosaToggle;
  UPROPERTY() TObjectPtr<UCheckBox> SlowMoToggle;
  UPROPERTY() TObjectPtr<UCheckBox> CinematicToggle;
  UPROPERTY() TObjectPtr<UBorder> MenPanel;
  UPROPERTY() TObjectPtr<UBorder> WomenPanel;
  UPROPERTY() TObjectPtr<UBorder> CenterPanel;
  UPROPERTY() TObjectPtr<UButton> NukeButton;
  UPROPERTY() TObjectPtr<UButton> WaterButton;
  UPROPERTY() TObjectPtr<UButton> LipstickShotButton;
  UPROPERTY() TObjectPtr<UButton> ShockwaveButton;
  UPROPERTY() TObjectPtr<UButton> RallyButton;
  UPROPERTY() TObjectPtr<UCanvasPanelSlot> MenPanelSlot;
  UPROPERTY() TObjectPtr<UCanvasPanelSlot> WomenPanelSlot;
  UPROPERTY() TObjectPtr<UCanvasPanelSlot> CenterPanelSlot;

  int32 PendingMen=50;
  int32 PendingWomen=50;
  bool bMenGun=false;
  bool bMenSword=false;
  bool bWomenLipstick=false;
  bool bWomenBomb=false;
  bool bTouchForward=false;
  bool bTouchBack=false;
  bool bTouchLeft=false;
  bool bTouchRight=false;

  void BuildUI();
  UTextBlock* MakeLabel(const FString& Text,int32 Size,const FLinearColor& Color);
  UButton* MakeButton(class UVerticalBox* Parent,const FString& Label,FName Action);
  void AddSectionLabel(class UVerticalBox* Parent,const FString& Label,const FLinearColor& Color);
  ETLCFormation ParseFormation(const FString& Value)const;
  void RefreshPendingCountLabels();
  void ApplyPendingConfig();
  void RefreshRuntimeText();
  void ApplyResponsiveLayout();
  void UpdateCommanderButtons();
  void SetButtonText(UButton* Button,const FString& Text);
  void ApplyTouchCommanderMovement();

  UFUNCTION() void HandleTeamCountChanged(ETLCTeam Team,int32 Alive);
  UFUNCTION() void HandlePhaseChanged(ETLCBattlePhase Phase);
  UFUNCTION() void HandleBattleFinished(ETLCTeam Winner,FName Reason);
  UFUNCTION() void HandleSpecialEvent(ETLCSpecialEvent EventType);
  UFUNCTION() void HandleAnnouncerLine(FName EventName,const FString& Line);

  UFUNCTION() void OnStart();
  UFUNCTION() void OnPause();
  UFUNCTION() void OnReset();
  UFUNCTION() void OnSpawnCommander();
  UFUNCTION() void OnSpawnRobot();
  UFUNCTION() void OnSpawnUnicorn();
  UFUNCTION() void OnSpecialEvent();
  UFUNCTION() void OnMenGun();
  UFUNCTION() void OnMenSword();
  UFUNCTION() void OnMenGunsToggleChanged(bool bChecked);
  UFUNCTION() void OnMenSwordsToggleChanged(bool bChecked);
  UFUNCTION() void OnMenFists();
  UFUNCTION() void OnWomenLipstick();
  UFUNCTION() void OnWomenBomb();
  UFUNCTION() void OnWomenLipstickToggleChanged(bool bChecked);
  UFUNCTION() void OnWomenBombToggleChanged(bool bChecked);
  UFUNCTION() void OnWomenFists();
  UFUNCTION() void OnNuke();
  UFUNCTION() void OnWaterCannon();
  UFUNCTION() void OnLipstickShot();
  UFUNCTION() void OnShockwave();
  UFUNCTION() void OnRally();
  UFUNCTION() void OnTouchForwardPressed();
  UFUNCTION() void OnTouchForwardReleased();
  UFUNCTION() void OnTouchBackPressed();
  UFUNCTION() void OnTouchBackReleased();
  UFUNCTION() void OnTouchLeftPressed();
  UFUNCTION() void OnTouchLeftReleased();
  UFUNCTION() void OnTouchRightPressed();
  UFUNCTION() void OnTouchRightReleased();

  UFUNCTION() void OnMenCountChanged(float Value);
  UFUNCTION() void OnWomenCountChanged(float Value);
  UFUNCTION() void OnMenStrengthChanged(float Value);
  UFUNCTION() void OnWomenSpeedChanged(float Value);
  UFUNCTION() void OnCameraZoomChanged(float Value);
  UFUNCTION() void OnChaosChanged(float Value);
  UFUNCTION() void OnMenRageChanged(bool bChecked);
  UFUNCTION() void OnWomenRageChanged(bool bChecked);
  UFUNCTION() void OnFuriosaChanged(bool bChecked);
  UFUNCTION() void OnSlowMoChanged(bool bChecked);
  UFUNCTION() void OnCinematicChanged(bool bChecked);
  UFUNCTION() void OnPresetChanged(FString Selected,ESelectInfo::Type Type);
  UFUNCTION() void OnMenFormationChanged(FString Selected,ESelectInfo::Type Type);
  UFUNCTION() void OnWomenFormationChanged(FString Selected,ESelectInfo::Type Type);
};
