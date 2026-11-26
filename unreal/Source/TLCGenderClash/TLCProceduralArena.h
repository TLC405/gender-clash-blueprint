#pragma once

#include "CoreMinimal.h"
#include "GameFramework/Actor.h"
#include "TLCBattleSystems.h"
#include "TLCProceduralArena.generated.h"

class UStaticMeshComponent;
class UTextRenderComponent;

UCLASS()
class TLCGENDERCLASH_API ATLCProceduralArena : public AActor {
  GENERATED_BODY()
public:
  ATLCProceduralArena();

  UPROPERTY(EditAnywhere,BlueprintReadWrite) FVector2D ArenaSize=FVector2D(4200.f,2300.f);
  UFUNCTION(BlueprintCallable) void BuildArena();
  UFUNCTION(BlueprintCallable) void ApplyPreset(ETLCBattlePreset Preset);

private:
  UPROPERTY() TArray<TObjectPtr<UStaticMeshComponent>> GeneratedPieces;
  UPROPERTY(VisibleAnywhere) TObjectPtr<UTextRenderComponent> CenterMark;
  UStaticMeshComponent* AddBox(FName Name,const FVector& Location,const FVector& Scale);
};
