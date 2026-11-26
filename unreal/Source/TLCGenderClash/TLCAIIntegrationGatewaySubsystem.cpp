#include "TLCAIIntegrationGatewaySubsystem.h"
#include "HttpModule.h"
#include "Interfaces/IHttpResponse.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "Misc/ConfigCacheIni.h"
#include "HAL/PlatformTime.h"

void UTLCAIIntegrationGatewaySubsystem::Initialize(FSubsystemCollectionBase& C){
  Super::Initialize(C);
  GConfig->GetString(TEXT("/Script/TLCGenderClash.TLCAIIntegrationGateway"),TEXT("GatewayBaseUrl"),BaseUrl,GGameIni);
  GConfig->GetBool(TEXT("/Script/TLCGenderClash.TLCAIIntegrationGateway"),TEXT("bCloudEnhancementEnabled"),bCloudEnabled,GGameIni);
  GConfig->GetFloat(TEXT("/Script/TLCGenderClash.TLCAIIntegrationGateway"),TEXT("RequestTimeoutSeconds"),RequestTimeoutSeconds,GGameIni);
  if(!IsShippingUrlAllowed()) bCloudEnabled=false;
}
void UTLCAIIntegrationGatewaySubsystem::Deinitialize(){CancelPendingRequests();Super::Deinitialize();}
void UTLCAIIntegrationGatewaySubsystem::SetBattleContext(const FString& MatchId,int32 Generation){
  if(CurrentMatchId!=MatchId||CurrentBattleGeneration!=Generation)CancelPendingRequests();
  CurrentMatchId=MatchId;CurrentBattleGeneration=Generation;
}
void UTLCAIIntegrationGatewaySubsystem::CancelPendingRequests(){
  for(auto& Pair:PendingRequests){if(Pair.Value.IsValid())Pair.Value->CancelRequest();}
  PendingRequests.Reset();
}
bool UTLCAIIntegrationGatewaySubsystem::IsShippingUrlAllowed()const{
#if UE_BUILD_SHIPPING
  return BaseUrl.StartsWith(TEXT("https://"));
#else
  return BaseUrl.IsEmpty()||BaseUrl.StartsWith(TEXT("https://"))||BaseUrl.StartsWith(TEXT("http://localhost"))||BaseUrl.StartsWith(TEXT("http://127.0.0.1"));
#endif
}
bool UTLCAIIntegrationGatewaySubsystem::RequestHighlightCommentary(const FTLCTacticalSnapshot&S,const FString&E){
  if(!bCloudEnabled||BaseUrl.IsEmpty()||!IsShippingUrlAllowed()){OnGatewayError.Broadcast(TEXT("Cloud commentary disabled; use cached line."));return false;}
  if(S.MatchId!=CurrentMatchId||S.BattleGeneration!=CurrentBattleGeneration)return false;
  const double Now=FPlatformTime::Seconds();
  if(Now-LastRequestAt<MinimumRequestIntervalSeconds)return false;
  LastRequestAt=Now;

  const FString RequestId=FGuid::NewGuid().ToString(EGuidFormats::DigitsWithHyphensLower);
  auto P=MakeShared<FJsonObject>();
  P->SetStringField(TEXT("request_id"),RequestId);
  P->SetStringField(TEXT("match_id"),S.MatchId);
  P->SetNumberField(TEXT("battle_generation"),S.BattleGeneration);
  P->SetStringField(TEXT("event"),E.Left(64));
  P->SetNumberField(TEXT("elapsed_seconds"),S.ElapsedSeconds);
  P->SetNumberField(TEXT("men_alive"),S.Men.Alive);
  P->SetNumberField(TEXT("women_alive"),S.Women.Alive);
  P->SetNumberField(TEXT("intensity"),S.BattleIntensity);

  FString Body;auto W=TJsonWriterFactory<>::Create(&Body);FJsonSerializer::Serialize(P,W);
  auto R=FHttpModule::Get().CreateRequest();
  R->SetURL(BaseUrl/TEXT("commentary/highlight"));R->SetVerb(TEXT("POST"));R->SetTimeout(RequestTimeoutSeconds);
  R->SetHeader(TEXT("Content-Type"),TEXT("application/json"));R->SetHeader(TEXT("X-TLC-Request-ID"),RequestId);R->SetContentAsString(Body);
  R->OnProcessRequestComplete().BindUObject(this,&UTLCAIIntegrationGatewaySubsystem::HandleResponse,RequestId,S.MatchId,S.BattleGeneration,Now);
  PendingRequests.Add(RequestId,R);
  if(!R->ProcessRequest()){PendingRequests.Remove(RequestId);return false;}
  return true;
}
void UTLCAIIntegrationGatewaySubsystem::HandleResponse(FHttpRequestPtr Request,FHttpResponsePtr Response,bool Ok,FString RequestId,FString MatchId,int32 Generation,double CreatedAt){
  PendingRequests.Remove(RequestId);
  if(MatchId!=CurrentMatchId||Generation!=CurrentBattleGeneration)return;
  if(FPlatformTime::Seconds()-CreatedAt>RequestTimeoutSeconds+1.0)return;
  if(!Ok||!Response.IsValid()||!EHttpResponseCodes::IsOk(Response->GetResponseCode())){OnGatewayError.Broadcast(TEXT("Commentary service unavailable; use cached line."));return;}
  if(Response->GetContentLength()>MaxResponseBytes){OnGatewayError.Broadcast(TEXT("Commentary response exceeded size limit."));return;}
  TSharedPtr<FJsonObject>J;auto Reader=TJsonReaderFactory<>::Create(Response->GetContentAsString());
  if(!FJsonSerializer::Deserialize(Reader,J)||!J.IsValid()){OnGatewayError.Broadcast(TEXT("Invalid commentary response."));return;}
  FString ResponseMatch;int32 ResponseGeneration=-1;FString C;
  if(!J->TryGetStringField(TEXT("match_id"),ResponseMatch)||ResponseMatch!=CurrentMatchId)return;
  if(!J->TryGetNumberField(TEXT("battle_generation"),ResponseGeneration)||ResponseGeneration!=CurrentBattleGeneration)return;
  if(J->TryGetStringField(TEXT("commentary"),C)&&!C.IsEmpty())OnCommentaryReady.Broadcast(C.Left(MaxCommentaryCharacters));
}
