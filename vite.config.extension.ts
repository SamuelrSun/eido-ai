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
        popup: path.resolve(__dirname, "extension/popup.html"),
        background: path.resolve(__dirname, "extension/background.js"),
        content: path.resolve(__dirname, "extension/content.js"),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // Place background and content scripts in the root
          if (chunkInfo.name === 'background' || chunkInfo.name === 'content') {
            return '[name].js';
          }
          // Place other JS assets in the assets folder
          return 'assets/[name].js';
        },
        chunkFileNames: `assets/[name].js`,
        assetFileNames: (assetInfo) => {
          // Place popup.html in a subdirectory to avoid naming conflicts
          if (assetInfo.name === 'popup.html') {
            return 'extension/popup.html';
          }
          if (assetInfo.name?.endsWith('.png') || assetInfo.name?.endsWith('.ico')) {
            return 'images/[name].[ext]';
          }
          return `assets/[name].[ext]`;
        },
      },
    },
  },
});