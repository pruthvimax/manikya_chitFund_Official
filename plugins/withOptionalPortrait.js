const { withAndroidManifest } = require("expo/config-plugins");

/* Google Play: the app is portrait-only (orientation: "portrait"), and Android then treats
   "android.hardware.screen.portrait" as a REQUIRED device feature, which hides the app from
   devices without it. This marks that feature as optional, so the app stays portrait-only but
   every device can install it. Nothing else in the manifest is changed. */
module.exports = function withOptionalPortrait(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    const list = manifest["uses-feature"] || (manifest["uses-feature"] = []);
    const found = list.find((f) => f.$ && f.$["android:name"] === "android.hardware.screen.portrait");
    if (found) found.$["android:required"] = "false";
    else list.push({ $: { "android:name": "android.hardware.screen.portrait", "android:required": "false" } });
    return cfg;
  });
};
