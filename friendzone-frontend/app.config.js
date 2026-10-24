/* eslint-env node */
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const wantsAndroidPush =
    process.env.EAS_BUILD_PLATFORM === "android" || process.env.FZ_ANDROID_PUSH === "1";
  const googleServices = path.join(__dirname, "google-services.json");

  const plugins = [...(config.plugins || [])];
  const android = { ...(config.android || {}) };

  if (wantsAndroidPush) {
    plugins.push([
      "expo-notifications",
      { icon: "./assets/images/icon.png", color: "#ffffff" },
    ]);
    if (fs.existsSync(googleServices)) {
      android.googleServicesFile = "./google-services.json";
    }
  }

  return { ...config, plugins, android };
};
