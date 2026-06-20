import { defineConfig } from "vite";
import { resolve } from "node:path";
import { copyFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";

export default defineConfig({
  server: {
    port: 1420,
    strictPort: true
  },
  clearScreen: false,
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        dashboard: resolve(__dirname, "dashboard.html")
      }
    }
  },
  plugins: [{
    name: "copy-character-assets",
    writeBundle() {
      const src = resolve(__dirname, "public", "character");
      const dest = resolve(__dirname, "dist", "character");
      if (!existsSync(src)) return;
      mkdirSync(dest, { recursive: true });
      for (const entry of readdirSync(src, { withFileTypes: true })) {
        if (entry.isFile()) {
          copyFileSync(resolve(src, entry.name), resolve(dest, entry.name));
        }
      }
      console.log("  → 已复制角色资源到 dist/character/");
    }
  }]
});
