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
  virtual void Deinitialize() override;

  UPROPERTY(BlueprintAssignable) FTLCCommentaryReady OnCommentaryReady;
  UPROPERTY(BlueprintAssignable) FTLCGatewayError OnGatewayError;

  UFUNCTION(BlueprintCallable) void SetBattleContext(const FString& MatchId,int32 BattleGeneration);
  UFUNCTION(BlueprintCallable) void CancelPendingRequests();
  UFUNCTION(BlueprintCallable) bool RequestHighlightCommentary(const FTLCTacticalSnapshot& Snapshot,const FString& EventName);
  UFUNCTION(BlueprintPure) bool IsCloudEnhancementEnabled()const{return bCloudEnabled;}

private:
  FString BaseUrl;
  bool bCloudEnabled=false;
  float RequestTimeoutSeconds=3.0f;
  int32 MaxResponseBytes=16384;
  int32 MaxCommentaryCharacters=280;
  double MinimumRequestIntervalSeconds=2.0;
  double LastRequestAt=-1000.0;
  FString CurrentMatchId;
  int32 CurrentBattleGeneration=0;
  TMap<FString,FHttpRequestPtr> PendingRequests;

  bool IsShippingUrlAllowed()const;
  void HandleResponse(FHttpRequestPtr Request,FHttpResponsePtr Response,bool bSucceeded,FString RequestId,FString MatchId,int32 BattleGeneration,double CreatedAt);
};
