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
  const float Smooth=bCinematicFX?2.3f:4.5f;
  CurrentFocus=FMath::VInterpTo(CurrentFocus,DesiredFocus,Dt,Smooth);
  const float Distance=FMath::Lerp(5200.f,3100.f,ZoomNormalized);
  const float Height=FMath::Lerp(3400.f,2200.f,ZoomNormalized);
  FVector DesiredLocation=CurrentFocus+FVector(0,-Distance,Height);
  SetActorLocation(FMath::VInterpTo(GetActorLocation(),DesiredLocation,Dt,Smooth));
  SetActorRotation((CurrentFocus-GetActorLocation()).Rotation());
  GetCameraComponent()->SetFieldOfView(FMath::Lerp(62.f,46.f,ZoomNormalized));
}
