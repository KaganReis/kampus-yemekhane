// Extends app.json. EXPO_BASE_URL lets the web build live under a sub-path,
// e.g. GitHub Pages serves the demo at https://<user>.github.io/kampus-yemekhane/
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...config.experiments,
    ...(process.env.EXPO_BASE_URL ? { baseUrl: process.env.EXPO_BASE_URL } : {}),
  },
});
