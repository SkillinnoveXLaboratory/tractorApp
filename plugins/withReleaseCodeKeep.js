// Keeps release builds from stripping code that is only reached by name at runtime.
// Expo SDK 58 turned on R8 (android.enableMinifyInReleaseBuilds=true) for release builds. R8 renamed/removed parts of
// Cashfree's payment SDK (its content provider starts before the app does), so the APK crashed on launch.
// Release builds stay unshrunk, as they were up to SDK 57, and keep rules are added in case shrinking is turned back on.
const fs = require("fs");
const path = require("path");
const { withDangerousMod, withGradleProperties } = require("expo/config-plugins");

const PROPERTIES = {
  "android.enableMinifyInReleaseBuilds": "false",
  "android.enableShrinkResourcesInReleaseBuilds": "false",
};

const MARKER = "# AgroTrack keep rules";
const KEEP_RULES = `
${MARKER}
# Cashfree payment SDK (native checkout, UPI intent, React Native bridge)
-keep class com.cashfree.** { *; }
-keep interface com.cashfree.** { *; }
-dontwarn com.cashfree.**
-keep class com.reactnativecashfreepgsdk.** { *; }
-keepattributes *Annotation*, Signature, InnerClasses, EnclosingMethod
`;

function withMinifyOff(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(PROPERTIES)) {
      const existing = cfg.modResults.find((item) => item.type === "property" && item.key === key);
      if (existing) existing.value = value;
      else cfg.modResults.push({ type: "property", key, value });
    }
    return cfg;
  });
}

function withKeepRules(config) {
  return withDangerousMod(config, [
    "android",
    (cfg) => {
      const file = path.join(cfg.modRequest.platformProjectRoot, "app", "proguard-rules.pro");
      const current = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
      if (!current.includes(MARKER)) fs.writeFileSync(file, `${current.trimEnd()}\n${KEEP_RULES}`);
      return cfg;
    },
  ]);
}

module.exports = function withReleaseCodeKeep(config) {
  return withKeepRules(withMinifyOff(config));
};
