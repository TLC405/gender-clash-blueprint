#include "TLCCommanderCharacter.h"
#include "AbilitySystemComponent.h"
#include "Kismet/GameplayStatics.h"
#include "Components/StaticMeshComponent.h"
#include "Components/TextRenderComponent.h"
#include "GameFramework/CharacterMovementComponent.h"
#include "UObject/ConstructorHelpers.h"
#include "Materials/MaterialInstanceDynamic.h"

ATLCCommanderCharacter::ATLCCommanderCharacter(){
  PrimaryActorTick.bCanEverTick=true;
  AbilitySystem=CreateDefaultSubobject<UAbilitySystemComponent>(TEXT("AbilitySystem"));
  GetCharacterMovement()->MaxWalkSpeed=520.f;
  SetActorScale3D(FVector(1.22f,1.24f,1.28f));

  static ConstructorHelpers::FObjectFinder<UStaticMesh> Cube(TEXT("/Engine/BasicShapes/Cube.Cube"));
  static ConstructorHelpers::FObjectFinder<UStaticMesh> Sphere(TEXT("/Engine/BasicShapes/Sphere.Sphere"));
  HeroTorso=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("HeroTorso"));HeroTorso->SetupAttachment(GetRootComponent());if(Cube.Succeeded())HeroTorso->SetStaticMesh(Cube.Object);HeroTorso->SetRelativeLocation(FVector(0,0,62));HeroTorso->SetRelativeScale3D(FVector(.58f,.42f,.76f));HeroTorso->SetCollisionEnabled(ECollisionEnabled::NoCollision);
  HeroHead=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("HeroHead"));HeroHead->SetupAttachment(GetRootComponent());if(Sphere.Succeeded())HeroHead->SetStaticMesh(Sphere.Object);HeroHead->SetRelativeLocation(FVector(0,0,154));HeroHead->SetRelativeScale3D(FVector(.31f));HeroHead->SetCollisionEnabled(ECollisionEnabled::NoCollision);
  LeftShoulder=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("LeftShoulder"));LeftShoulder->SetupAttachment(GetRootComponent());if(Sphere.Succeeded())LeftShoulder->SetStaticMesh(Sphere.Object);LeftShoulder->SetRelativeLocation(FVector(0,-44,82));LeftShoulder->SetRelativeScale3D(FVector(.22f));LeftShoulder->SetCollisionEnabled(ECollisionEnabled::NoCollision);
  RightShoulder=CreateDefaultSubobject<UStaticMeshComponent>(TEXT("RightShoulder"));RightShoulder->SetupAttachment(GetRootComponent());if(Sphere.Succeeded())RightShoulder->SetStaticMesh(Sphere.Object);RightShoulder->SetRelativeLocation(FVector(0,44,82));RightShoulder->SetRelativeScale3D(FVector(.22f));RightShoulder->SetCollisionEnabled(ECollisionEnabled::NoCollision);
  HeroMarker=CreateDefaultSubobject<UTextRenderComponent>(TEXT("HeroMarker"));HeroMarker->SetupAttachment(GetRootComponent());HeroMarker->SetRelativeLocation(FVector(0,0,205));HeroMarker->SetHorizontalAlignment(EHTA_Center);HeroMarker->SetWorldSize(34.f);HeroMarker->SetText(FText::FromString(TEXT("TLC COMMANDER")));HeroMarker->SetTextRenderColor(FColor(255,205,55));

  CooldownSeconds={{"Nuke",22.f},{"WaterCannon",7.f},{"LipstickShot",3.5f},{"ShockwaveSlam",8.f},{"RallyBuff",14.f}};
}
UAbilitySystemComponent* ATLCCommanderCharacter::GetAbilitySystemComponent()const{return AbilitySystem;}
bool ATLCCommanderCharacter::TriggerNuke(){return TryAbility("Nuke");}
bool ATLCCommanderCharacter::TriggerWaterCannon(){return TryAbility("WaterCannon");}
bool ATLCCommanderCharacter::TriggerLipstickShot(){return TryAbility("LipstickShot");}
bool ATLCCommanderCharacter::TriggerShockwaveSlam(){return TryAbility("ShockwaveSlam");}
bool ATLCCommanderCharacter::TriggerRallyBuff(){return TryAbility("RallyBuff");}
void ATLCCommanderCharacter::ResetAbilityCooldowns(){LastUsedAt.Reset();}
void ATLCCommanderCharacter::ResetHeroHealth(){HeroHealth=MaxHeroHealth;bHeroAlive=true;SetActorHiddenInGame(false);SetActorEnableCollision(true);GetCharacterMovement()->SetMovementMode(MOVE_Walking);}
bool ATLCCommanderCharacter::ApplyHeroDamage(float Damage,float Knockback,const FVector& Direction){
  if(!bHeroAlive)return false;HeroHealth-=FMath::Max(0.f,Damage);
  if(Knockback>0.f){FVector Launch=Direction.GetSafeNormal()*FMath::Min(Knockback,720.f);Launch.Z=FMath::Min(220.f,Knockback*.18f);LaunchCharacter(Launch,true,true);}
  if(HeroHealth<=0.f){HeroHealth=0.f;bHeroAlive=false;GetCharacterMovement()->StopMovementImmediately();SetActorEnableCollision(false);OnCommanderEliminated.Broadcast();return true;}return false;
}
float ATLCCommanderCharacter::GetCooldownRemaining(FName N)const{
  if(!GetWorld())return 0.f;const double Last=LastUsedAt.FindRef(N);const float CD=CooldownSeconds.FindRef(N);if(Last<=0||CD<=0)return 0.f;return FMath::Max(0.f,CD-(float)(GetWorld()->GetTimeSeconds()-Last));
}
bool ATLCCommanderCharacter::TryAbility(FName N){
  if(!bHeroAlive||!GetWorld()||UGameplayStatics::IsGamePaused(GetWorld()))return false;
  const double Now=GetWorld()->GetTimeSeconds(),Last=LastUsedAt.FindRef(N);
  const float CD=CooldownSeconds.FindRef(N);if(Last>0&&Now-Last<CD)return false;
  LastUsedAt.Add(N,Now);OnAbilityTriggered.Broadcast(N);ExecuteAbilityVisuals(N);return true;
}
