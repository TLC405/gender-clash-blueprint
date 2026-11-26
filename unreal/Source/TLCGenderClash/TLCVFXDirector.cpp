#include "TLCVFXDirector.h"
#include "NiagaraFunctionLibrary.h"
#include "NiagaraComponent.h"
#include "NiagaraSystem.h"

ATLCVFXDirector::ATLCVFXDirector(){PrimaryActorTick.bCanEverTick=false;EffectiveLimit=MaxHighCostSystems;}
bool ATLCVFXDirector::PlayCue(ETLCVFXCue Cue,const FVector& Location,const FVector& Direction,float Scale){
  Active.RemoveAll([](const TWeakObjectPtr<UNiagaraComponent>& P){return !P.IsValid();});
  if(Active.Num()>=EffectiveLimit)return false;
  TSoftObjectPtr<UNiagaraSystem>* Ref=Systems.Find(Cue);if(!Ref)return false;
  UNiagaraSystem* System=Ref->LoadSynchronous();if(!System)return false;
  const FRotator Rot=Direction.IsNearlyZero()?FRotator::ZeroRotator:Direction.Rotation();
  UNiagaraComponent* C=UNiagaraFunctionLibrary::SpawnSystemAtLocation(this,System,Location,Rot,FVector(Scale),true,true,ENCPoolMethod::AutoRelease,true);
  if(!C)return false;Active.Add(C);return true;
}
void ATLCVFXDirector::ResetVFX(){for(auto& P:Active)if(P.IsValid())P->DeactivateImmediate();Active.Reset();}
void ATLCVFXDirector::SetQualityPressure(float Pressure){EffectiveLimit=FMath::Clamp(FMath::RoundToInt(FMath::Lerp((float)MaxHighCostSystems,4.f,FMath::Clamp(Pressure,0.f,1.f))),4,MaxHighCostSystems);}
