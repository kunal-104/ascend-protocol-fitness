// Extends app.json. Test APKs (built with ALLOW_HTTP=1) may talk to a plain-http server on your Wi-Fi,
// which Android blocks by default. Store builds never set this.
module.exports = ({ config }) => {
  if (process.env.ALLOW_HTTP !== '1') return config;
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['expo-build-properties', { android: { usesCleartextTraffic: true } }]],
  };
};
