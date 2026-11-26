#pragma once
#include "CoreMinimal.h"
#include "AbilitySystemInterface.h"
#include "GameFramework/Character.h"
#include "TLCCommanderCharacter.generated.h"
class UAbilitySystemComponent;
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCCommanderAbility,FName,AbilityName);

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCCommanderCharacter : public ACharacter, public IAbilitySystemInterface {
  GENERATED_BODY()
public:
  ATLCCommanderCharacter();
  virtual UAbilitySystemComponent* GetAbilitySystemComponent() const override;
  UPROPERTY(BlueprintAssignable) FTLCCommanderAbility OnAbilityTriggered;
  UFUNCTION(BlueprintCallable) bool TriggerNuke();
  UFUNCTION(BlueprintCallable) bool TriggerWaterCannon();
  UFUNCTION(BlueprintCallable) bool TriggerLipstickShot();
  UFUNCTION(BlueprintCallable) bool TriggerShockwaveSlam();
  UFUNCTION(BlueprintCallable) bool TriggerRallyBuff();
  UFUNCTION(BlueprintCallable) void ResetAbilityCooldowns();
  UFUNCTION(BlueprintImplementableEvent) void ExecuteAbilityVisuals(FName AbilityName);
protected:
  UPROPERTY(VisibleAnywhere,BlueprintReadOnly) TObjectPtr<UAbilitySystemComponent> AbilitySystem;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) TMap<FName,float> CooldownSeconds;
private:
  TMap<FName,double> LastUsedAt;
  bool TryAbility(FName AbilityName);
};
