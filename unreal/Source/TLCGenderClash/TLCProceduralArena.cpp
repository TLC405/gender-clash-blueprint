#include "TLCProceduralArena.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "UObject/ConstructorHelpers.h"

ATLCProceduralArena::ATLCProceduralArena(){
  PrimaryActorTick.bCanEverTick=false;
  USceneComponent* Root=CreateDefaultSubobject<USceneComponent>(TEXT("Root"));SetRootComponent(Root);
  CenterMark=CreateDefaultSubobject<UTextRenderComponent>(TEXT("CenterMark"));CenterMark->SetupAttachment(Root);CenterMark->SetText(FText::FromString(TEXT("TLC  •  TRUTH  LOVE  COMMUNITY")));CenterMark->SetWorldSize(62.f);CenterMark->SetHorizontalAlignment(EHTA_Center);CenterMark->SetTextRenderColor(FColor(240,205,80));CenterMark->SetRelativeLocation(FVector(0,0,8));CenterMark->SetRelativeRotation(FRotator(90,0,0));
}
UStaticMeshComponent* ATLCProceduralArena::AddBox(FName Name,const FVector& Location,const FVector& Scale){
  UStaticMeshComponent* C=NewObject<UStaticMeshComponent>(this,Name);
  if(!C)return nullptr;
  if(UStaticMesh* Cube=LoadObject<UStaticMesh>(nullptr,TEXT("/Engine/BasicShapes/Cube.Cube")))C->SetStaticMesh(Cube);
  C->SetupAttachment(GetRootComponent());C->RegisterComponent();C->SetRelativeLocation(Location);C->SetRelativeScale3D(Scale);GeneratedPieces.Add(C);return C;
}
void ATLCProceduralArena::BuildArena(){
  for(UStaticMeshComponent* C:GeneratedPieces)if(C)C->DestroyComponent();GeneratedPieces.Reset();
  AddBox(TEXT("Floor"),FVector(0,0,-55),FVector(ArenaSize.X/100.f,ArenaSize.Y/100.f,1.f));
  const float HX=ArenaSize.X*.5f,HY=ArenaSize.Y*.5f;
  AddBox(TEXT("NorthWall"),FVector(0,HY+35,90),FVector(ArenaSize.X/100.f,.7f,2.4f));
  AddBox(TEXT("SouthWall"),FVector(0,-HY-35,90),FVector(ArenaSize.X/100.f,.7f,2.4f));
  AddBox(TEXT("WestWall"),FVector(-HX-35,0,90),FVector(.7f,ArenaSize.Y/100.f,2.4f));
  AddBox(TEXT("EastWall"),FVector(HX+35,0,90),FVector(.7f,ArenaSize.Y/100.f,2.4f));
  AddBox(TEXT("CenterStripe"),FVector(0,0,-2),FVector(.10f,ArenaSize.Y/100.f,.03f));
}

void ATLCProceduralArena::ApplyPreset(ETLCBattlePreset Preset){
  if(Preset==ETLCBattlePreset::NarrowPass){
    ArenaSize=FVector2D(4200.f,1150.f);
    CenterMark->SetText(FText::FromString(TEXT("NARROW PASS  •  HOLD THE LINE  •  NO FIREARMS")));
    CenterMark->SetTextRenderColor(FColor(230,155,45));
  }else if(Preset==ETLCBattlePreset::NorthVsSouth){
    ArenaSize=FVector2D(4200.f,2300.f);
    CenterMark->SetText(FText::FromString(TEXT("NORTH VS SOUTH  •  VOLLEY FIELD")));
    CenterMark->SetTextRenderColor(FColor(220,195,150));
  }else{
    ArenaSize=FVector2D(4200.f,2300.f);
    CenterMark->SetText(FText::FromString(TEXT("TLC  •  TRUTH  LOVE  COMMUNITY")));
    CenterMark->SetTextRenderColor(FColor(240,205,80));
  }
  BuildArena();
}
