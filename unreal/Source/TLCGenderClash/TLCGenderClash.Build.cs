using UnrealBuildTool;
public class TLCGenderClash : ModuleRules {
  public TLCGenderClash(ReadOnlyTargetRules Target) : base(Target) {
    PCHUsage = PCHUsageMode.UseExplicitOrSharedPCHs;
    PublicDependencyModuleNames.AddRange(new string[] {
      "Core","CoreUObject","Engine","InputCore","EnhancedInput",
      "GameplayAbilities","GameplayTags","GameplayTasks","AIModule","NavigationSystem",
      "StateTreeModule","GameplayStateTreeModule",
      "MassEntity","MassCommon","MassActors","MassMovement","MassRepresentation",
      "Niagara","UMG","CommonUI","AudioMixer","AudioModulation",
      "HTTP","Json","JsonUtilities"
    });
    PrivateDependencyModuleNames.AddRange(new string[] {"Slate","SlateCore"});
  }
}