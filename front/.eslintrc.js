module.exports = {
  root: true,
  env: {
    node: true,
    serviceworker: true,
  },
  globals: {
    // Service Worker globals
    clients: "readonly",
    self: "readonly",
    caches: "readonly",
    skipWaiting: "readonly",
    importScripts: "readonly",
  },
  extends: [
    "plugin:vue/vue3-essential",
    "eslint:recommended",
    "plugin:prettier/recommended",
  ],
  parserOptions: {
    parser: "@babel/eslint-parser",
    requireConfigFile: false,
  },
  rules: {
    "no-console": process.env.NODE_ENV === "production" ? "warn" : "off",
    "no-debugger": process.env.NODE_ENV === "production" ? "warn" : "off",
  },
};
