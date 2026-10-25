// Signs release builds with the AgroTrack upload key when these environment variables are set
// (the GitHub workflow sets them from repository secrets):
//   ANDROID_KEYSTORE_PATH, ANDROID_KEYSTORE_PASSWORD, ANDROID_KEY_ALIAS, ANDROID_KEY_PASSWORD
// Without them (local builds), release builds keep Expo's default debug signing.
const { withAppBuildGradle } = require("expo/config-plugins");

const MARKER = "// agrotrack-release-signing";

const RELEASE_SIGNING = `
        ${MARKER}
        release {
            if (System.getenv("ANDROID_KEYSTORE_PATH")) {
                storeFile file(System.getenv("ANDROID_KEYSTORE_PATH"))
                storePassword System.getenv("ANDROID_KEYSTORE_PASSWORD")
                keyAlias System.getenv("ANDROID_KEY_ALIAS")
                keyPassword System.getenv("ANDROID_KEY_PASSWORD")
            }
        }`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;
    if (gradle.includes(MARKER)) return cfg;
    // 1. Add a release signing config next to the debug one.
    if (!/signingConfigs\s*\{/.test(gradle)) throw new Error("withReleaseSigning: signingConfigs block not found in app/build.gradle");
    gradle = gradle.replace(/signingConfigs\s*\{/, (m) => `${m}${RELEASE_SIGNING}`);
    // 2. Release build type uses it when the key is provided.
    const releaseType = /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/;
    if (!releaseType.test(gradle)) throw new Error("withReleaseSigning: release build type not found in app/build.gradle");
    gradle = gradle.replace(releaseType, (m, before) => `${before}signingConfig System.getenv("ANDROID_KEYSTORE_PATH") ? signingConfigs.release : signingConfigs.debug`);
    cfg.modResults.contents = gradle;
    return cfg;
  });
};
