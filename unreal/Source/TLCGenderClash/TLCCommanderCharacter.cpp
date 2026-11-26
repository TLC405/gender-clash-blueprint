#include "TLCCommanderCharacter.h"
#include "AbilitySystemComponent.h"
#include "Kismet/GameplayStatics.h"

ATLCCommanderCharacter::ATLCCommanderCharacter(){
  PrimaryActorTick.bCanEverTick=true;AbilitySystem=CreateDefaultSubobject<UAbilitySystemComponent>(TEXT("AbilitySystem"));
  CooldownSeconds={{"Nuke",22.f},{"WaterCannon",7.f},{"LipstickShot",3.5f},{"ShockwaveSlam",8.f},{"RallyBuff",14.f}};
}
UAbilitySystemComponent* ATLCCommanderCharacter::GetAbilitySystemComponent()const{return AbilitySystem;}
bool ATLCCommanderCharacter::TriggerNuke(){return TryAbility("Nuke");}
bool ATLCCommanderCharacter::TriggerWaterCannon(){return TryAbility("WaterCannon");}
bool ATLCCommanderCharacter::TriggerLipstickShot(){return TryAbility("LipstickShot");}
bool ATLCCommanderCharacter::TriggerShockwaveSlam(){return TryAbility("ShockwaveSlam");}
bool ATLCCommanderCharacter::TriggerRallyBuff(){return TryAbility("RallyBuff");}
void ATLCCommanderCharacter::ResetAbilityCooldowns(){LastUsedAt.Reset();}
bool ATLCCommanderCharacter::TryAbility(FName N){
  if(!GetWorld()||UGameplayStatics::IsGamePaused(GetWorld()))return false;
  const double Now=GetWorld()->GetTimeSeconds(),Last=LastUsedAt.FindRef(N);
  const float CD=CooldownSeconds.FindRef(N);if(Last>0&&Now-Last<CD)return false;
  LastUsedAt.Add(N,Now);OnAbilityTriggered.Broadcast(N);ExecuteAbilityVisuals(N);return true;
}
