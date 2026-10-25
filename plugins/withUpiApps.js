// Lets Cashfree's in-app checkout find and open installed UPI apps (GPay, PhonePe, Paytm, BHIM…).
// Android 11+ hides other apps unless the manifest declares what it wants to see; iOS needs the URL schemes listed.
const { withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

const IOS_UPI_SCHEMES = ["phonepe", "tez", "paytmmp", "bhim", "credpay", "upi"];

function withUpiQueries(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    manifest.queries = manifest.queries || [];
    const hasUpi = manifest.queries.some((q) => (q.intent || []).some((i) => (i.data || []).some((d) => d.$?.["android:scheme"] === "upi")));
    if (!hasUpi) {
      manifest.queries.push({
        intent: [{ action: [{ $: { "android:name": "android.intent.action.VIEW" } }], data: [{ $: { "android:scheme": "upi", "android:host": "pay" } }] }],
      });
    }
    return cfg;
  });
}

function withUpiSchemes(config) {
  return withInfoPlist(config, (cfg) => {
    const current = cfg.modResults.LSApplicationQueriesSchemes || [];
    cfg.modResults.LSApplicationQueriesSchemes = [...new Set([...current, ...IOS_UPI_SCHEMES])];
    return cfg;
  });
}

module.exports = function withUpiApps(config) {
  return withUpiSchemes(withUpiQueries(config));
};
