#pragma once
#include "CoreMinimal.h"
#include "AbilitySystemInterface.h"
#include "GameFramework/Character.h"
#include "TLCCommanderCharacter.generated.h"
class UAbilitySystemComponent;
class UStaticMeshComponent;
class UTextRenderComponent;
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCCommanderAbility,FName,AbilityName);
DECLARE_DYNAMIC_MULTICAST_DELEGATE(FTLCCommanderEliminated);

UCLASS(Blueprintable)
class TLCGENDERCLASH_API ATLCCommanderCharacter : public ACharacter, public IAbilitySystemInterface {
  GENERATED_BODY()
public:
  ATLCCommanderCharacter();
  virtual UAbilitySystemComponent* GetAbilitySystemComponent() const override;
  UPROPERTY(BlueprintAssignable) FTLCCommanderAbility OnAbilityTriggered;
  UPROPERTY(BlueprintAssignable) FTLCCommanderEliminated OnCommanderEliminated;
  UFUNCTION(BlueprintCallable) bool TriggerNuke();
  UFUNCTION(BlueprintCallable) bool TriggerWaterCannon();
  UFUNCTION(BlueprintCallable) bool TriggerLipstickShot();
  UFUNCTION(BlueprintCallable) bool TriggerShockwaveSlam();
  UFUNCTION(BlueprintCallable) bool TriggerRallyBuff();
  UFUNCTION(BlueprintCallable) void ResetAbilityCooldowns();
  UFUNCTION(BlueprintCallable) bool ApplyHeroDamage(float Damage,float Knockback,const FVector& Direction);
  UFUNCTION(BlueprintCallable) void ResetHeroHealth();
  UFUNCTION(BlueprintPure) bool IsHeroAlive()const{return bHeroAlive;}
  UFUNCTION(BlueprintPure) float GetHeroHealthNormalized()const{return MaxHeroHealth>0.f?HeroHealth/MaxHeroHealth:0.f;}
  UFUNCTION(BlueprintPure) float GetCooldownRemaining(FName AbilityName) const;
  UFUNCTION(BlueprintImplementableEvent) void ExecuteAbilityVisuals(FName AbilityName);
protected:
  UPROPERTY(VisibleAnywhere,BlueprintReadOnly) TObjectPtr<UAbilitySystemComponent> AbilitySystem;
  UPROPERTY(EditAnywhere,BlueprintReadWrite) TMap<FName,float> CooldownSeconds;
  UPROPERTY(VisibleAnywhere,BlueprintReadOnly) TObjectPtr<UStaticMeshComponent> HeroTorso;
  UPROPERTY(VisibleAnywhere,BlueprintReadOnly) TObjectPtr<UStaticMeshComponent> HeroHead;
  UPROPERTY(VisibleAnywhere,BlueprintReadOnly) TObjectPtr<UStaticMeshComponent> LeftShoulder;
  UPROPERTY(VisibleAnywhere,BlueprintReadOnly) TObjectPtr<UStaticMeshComponent> RightShoulder;
  UPROPERTY(VisibleAnywhere,BlueprintReadOnly) TObjectPtr<UTextRenderComponent> HeroMarker;
private:
  float MaxHeroHealth=550.f;
  float HeroHealth=550.f;
  bool bHeroAlive=true;
  TMap<FName,double> LastUsedAt;
  bool TryAbility(FName AbilityName);
};
