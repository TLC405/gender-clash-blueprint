#include "TLCSpectatorCameraActor.h"
#include "Camera/CameraComponent.h"

ATLCSpectatorCameraActor::ATLCSpectatorCameraActor(){
  PrimaryActorTick.bCanEverTick=true;
  GetCameraComponent()->SetFieldOfView(55.f);
  SetActorLocation(FVector(0,-4200,2850));
  CurrentFocus=DesiredFocus=FVector::ZeroVector;
}
void ATLCSpectatorCameraActor::BindDirector(ATLCCameraDirector* InDirector){
  if(Director)Director->OnFocusChanged.RemoveDynamic(this,&ATLCSpectatorCameraActor::HandleFocusChanged);
  Director=InDirector;if(Director)Director->OnFocusChanged.AddDynamic(this,&ATLCSpectatorCameraActor::HandleFocusChanged);
}
void ATLCSpectatorCameraActor::HandleFocusChanged(const FTLCCameraInterest& I){DesiredFocus=I.Location;}
void ATLCSpectatorCameraActor::SetZoomNormalized(float V){ZoomNormalized=FMath::Clamp(V,0.f,1.f);}
void ATLCSpectatorCameraActor::SetCinematicFX(bool B){bCinematicFX=B;}
void ATLCSpectatorCameraActor::FocusArena(){DesiredFocus=FVector::ZeroVector;}
void ATLCSpectatorCameraActor::Tick(float Dt){
  Super::Tick(Dt);
  float BaseDistance=5200.f,NearDistance=3100.f,BaseHeight=3400.f,NearHeight=2200.f,BaseFov=62.f,NearFov=46.f,ModeSmooth=4.5f;
  switch(ViewMode){
    case ETLCCameraViewMode::Tactical: BaseDistance=6000.f;NearDistance=4400.f;BaseHeight=4300.f;NearHeight=3500.f;BaseFov=66.f;NearFov=56.f;ModeSmooth=5.5f;break;
    case ETLCCameraViewMode::CloseCombat: BaseDistance=2800.f;NearDistance=1800.f;BaseHeight=1600.f;NearHeight=1050.f;BaseFov=54.f;NearFov=42.f;ModeSmooth=6.5f;break;
    case ETLCCameraViewMode::HeroFollow: BaseDistance=2400.f;NearDistance=1500.f;BaseHeight=1500.f;NearHeight=950.f;BaseFov=56.f;NearFov=44.f;ModeSmooth=7.0f;break;
    case ETLCCameraViewMode::BossCam: BaseDistance=3000.f;NearDistance=1900.f;BaseHeight=1800.f;NearHeight=1150.f;BaseFov=58.f;NearFov=44.f;ModeSmooth=5.0f;break;
    case ETLCCameraViewMode::Cinematic: BaseDistance=3600.f;NearDistance=2200.f;BaseHeight=2100.f;NearHeight=1350.f;BaseFov=52.f;NearFov=38.f;ModeSmooth=2.0f;break;
    default: break;
  }
  const float Smooth=bCinematicFX?FMath::Min(ModeSmooth,2.3f):ModeSmooth;
  CurrentFocus=FMath::VInterpTo(CurrentFocus,DesiredFocus,Dt,Smooth);
  const float Distance=FMath::Lerp(BaseDistance,NearDistance,ZoomNormalized);
  const float Height=FMath::Lerp(BaseHeight,NearHeight,ZoomNormalized);
  FVector DesiredLocation=CurrentFocus+FVector(0,-Distance,Height);
  SetActorLocation(FMath::VInterpTo(GetActorLocation(),DesiredLocation,Dt,Smooth));
  SetActorRotation((CurrentFocus-GetActorLocation()).Rotation());
  GetCameraComponent()->SetFieldOfView(FMath::Lerp(BaseFov,NearFov,ZoomNormalized));
}
