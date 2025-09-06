import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  plugins: [
    react(),
    viteStaticCopy({
  targets: [
    { src: 'extension/public/*', dest: '.' },
    { src: 'extension/*.css', dest: '.' },
  ],
}),
  ],
  build: {
    outDir: 'dist-extension',
    rollupOptions: {
  input: {
    background: resolve(__dirname, 'extension/background.js'),
    content: resolve(__dirname, 'extension/content.tsx'),
  },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: 'assets/[name].[ext]',
      },
    },
    emptyOutDir: true,
  },
});
