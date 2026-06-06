const { defineConfig } = require("vite");
const react = require("@vitejs/plugin-react");
const path = require("path");

module.exports = defineConfig({
  plugins: [react()],
  root: process.cwd(),
  base: "./",
  build: {
    outDir: path.resolve(__dirname, "apps/desktop/dist"),
    emptyOutDir: true
  },
  server: {
    host: "127.0.0.1",
    port: 5173
  }
});
