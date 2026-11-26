using UnrealBuildTool;
public class TLCGenderClashTarget : TargetRules {
  public TLCGenderClashTarget(TargetInfo Target) : base(Target) {
    Type = TargetType.Game;
    DefaultBuildSettings = BuildSettingsVersion.V5;
    ExtraModuleNames.Add("TLCGenderClash");
  }
}