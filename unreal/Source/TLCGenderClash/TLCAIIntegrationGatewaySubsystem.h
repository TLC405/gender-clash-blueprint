#pragma once
#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "HttpFwd.h"
#include "TLCBattleSystems.h"
#include "TLCAIIntegrationGatewaySubsystem.generated.h"
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCCommentaryReady,const FString&,Commentary);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FTLCGatewayError,const FString&,Message);

UCLASS(Config=Game)
class TLCGENDERCLASH_API UTLCAIIntegrationGatewaySubsystem : public UGameInstanceSubsystem {
  GENERATED_BODY()
public:
  virtual void Initialize(FSubsystemCollectionBase& Collection) override;
  UPROPERTY(BlueprintAssignable) FTLCCommentaryReady OnCommentaryReady;
  UPROPERTY(BlueprintAssignable) FTLCGatewayError OnGatewayError;
  UFUNCTION(BlueprintCallable) void RequestHighlightCommentary(const FTLCTacticalSnapshot& Snapshot,const FString& EventName);
  UFUNCTION(BlueprintPure) bool IsCloudEnhancementEnabled()const{return bCloudEnabled;}
private:
  FString BaseUrl;bool bCloudEnabled=false;
  void HandleResponse(FHttpRequestPtr Request,FHttpResponsePtr Response,bool bSucceeded);
};
