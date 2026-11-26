using UnrealBuildTool;
public class TLCGenderClashEditorTarget : TargetRules {
  public TLCGenderClashEditorTarget(TargetInfo Target) : base(Target) {
    Type = TargetType.Editor;
    DefaultBuildSettings = BuildSettingsVersion.V5;
    ExtraModuleNames.Add("TLCGenderClash");
  }
}