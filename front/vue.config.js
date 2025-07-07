const { defineConfig } = require("@vue/cli-service");
const path = require("path");

module.exports = defineConfig({
  transpileDependencies: true,

  // Configure development server to serve our custom service worker
  devServer: {
    static: {
      directory: path.join(__dirname, "src"),
      publicPath: "/",
      watch: true,
    },
  },

  pwa: {
    name: "Inventario",
    short_name: "Inventario",
    themeColor: "#4DBA87",
    msTileColor: "#000000",
    appleMobileWebAppCapable: "yes",
    appleMobileWebAppStatusBarStyle: "black",

    // Use our custom service worker instead of workbox
    workboxPluginMode: "InjectManifest",
    workboxOptions: {
      swSrc: "./src/sw.js", // Our custom service worker source (relative path)
      swDest: "sw.js", // Output name in dist
      exclude: [/\.map$/, /manifest\.json$/],
    },

    manifestOptions: {
      name: "Inventario",
      short_name: "Inventario",
      description: "Sistema de gestión de inventario",
      theme_color: "#4DBA87",
      background_color: "#000000",
      display: "standalone",
      orientation: "portrait",
      scope: "./",
      start_url: "./",
    },
  },
});
