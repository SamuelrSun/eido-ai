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
    content: resolve(__dirname, 'extension', 'content.tsx'),
        background: resolve(__dirname, 'extension', 'background.js'),
        'content-loader': resolve(__dirname, 'extension', 'content-loader.js'),
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
