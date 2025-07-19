import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';

  return {
    // --- FIX: Conditionally apply server config only in development ---
    server: isDevelopment ? {
      host: "::",
      port: 8080,
    } : undefined,
    plugins: [
      react(),
      // --- FIX: Conditionally apply componentTagger only in development ---
      isDevelopment && componentTagger(),
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // --- FIX: Add build configuration to remove console logs in production ---
    build: {
      sourcemap: false, // Optional: disable sourcemaps for production
      terserOptions: {
        compress: {
          drop_console: !isDevelopment, // Remove console.log in production
        },
      },
    },
  };
});
