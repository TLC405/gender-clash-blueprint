#include "TLCAIIntegrationGatewaySubsystem.h"
#include "HttpModule.h"
#include "Interfaces/IHttpResponse.h"
#include "Dom/JsonObject.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "Misc/ConfigCacheIni.h"

void UTLCAIIntegrationGatewaySubsystem::Initialize(FSubsystemCollectionBase& C){
  Super::Initialize(C);
  GConfig->GetString(TEXT("/Script/TLCGenderClash.TLCAIIntegrationGateway"),TEXT("GatewayBaseUrl"),BaseUrl,GGameIni);
  GConfig->GetBool(TEXT("/Script/TLCGenderClash.TLCAIIntegrationGateway"),TEXT("bCloudEnhancementEnabled"),bCloudEnabled,GGameIni);
}
void UTLCAIIntegrationGatewaySubsystem::RequestHighlightCommentary(const FTLCTacticalSnapshot&S,const FString&E){
  if(!bCloudEnabled||BaseUrl.IsEmpty()){OnGatewayError.Broadcast(TEXT("Cloud commentary disabled; use cached line."));return;}
  auto P=MakeShared<FJsonObject>();P->SetStringField(TEXT("event"),E);P->SetNumberField(TEXT("elapsed_seconds"),S.ElapsedSeconds);
  P->SetNumberField(TEXT("men_alive"),S.Men.Alive);P->SetNumberField(TEXT("women_alive"),S.Women.Alive);P->SetNumberField(TEXT("intensity"),S.BattleIntensity);
  FString Body;auto W=TJsonWriterFactory<>::Create(&Body);FJsonSerializer::Serialize(P,W);
  auto R=FHttpModule::Get().CreateRequest();R->SetURL(BaseUrl/TEXT("commentary/highlight"));R->SetVerb(TEXT("POST"));
  R->SetHeader(TEXT("Content-Type"),TEXT("application/json"));R->SetContentAsString(Body);
  R->OnProcessRequestComplete().BindUObject(this,&UTLCAIIntegrationGatewaySubsystem::HandleResponse);R->ProcessRequest();
}
void UTLCAIIntegrationGatewaySubsystem::HandleResponse(FHttpRequestPtr Request,FHttpResponsePtr Response,bool Ok){
  if(!Ok||!Response.IsValid()||!EHttpResponseCodes::IsOk(Response->GetResponseCode())){OnGatewayError.Broadcast(TEXT("Commentary service unavailable; use cached line."));return;}
  TSharedPtr<FJsonObject>J;auto Reader=TJsonReaderFactory<>::Create(Response->GetContentAsString());
  if(!FJsonSerializer::Deserialize(Reader,J)||!J.IsValid()){OnGatewayError.Broadcast(TEXT("Invalid commentary response."));return;}
  FString C;if(J->TryGetStringField(TEXT("commentary"),C)&&!C.IsEmpty())OnCommentaryReady.Broadcast(C);
}
