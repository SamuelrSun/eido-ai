import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// This is a separate Vite configuration for building the Chrome extension.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  publicDir: 'extension/public',
  build: {
    outDir: "dist-extension",
    rollupOptions: {
      input: {
        // Correctly point to popup.html, which is now OUTSIDE the public directory.
        popup: path.resolve(__dirname, "extension/popup.html"),
        background: path.resolve(__dirname, "extension/background.js"),
        content: path.resolve(__dirname, "extension/content.js"),
      },
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: (assetInfo) => {
          // --- FIX START ---
          // This logic checks if the asset is the popup.html file.
          // If it is, it places it in the root of the output directory.
          // Otherwise, it proceeds with the original logic for images and other assets.
          if (assetInfo.name === 'popup.html') {
            return '[name].[ext]';
          }
          // --- FIX END ---
          if (assetInfo.name?.endsWith('.png') || assetInfo.name?.endsWith('.ico')) {
            return 'images/[name].[ext]';
          }
          return `assets/[name].[ext]`;
        },
      },
    },
  },
});
