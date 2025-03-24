import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        assetFileNames: 'assets/[name].[ext]'
      }
    }
  },
  publicDir: 'public',
  resolve: {
    alias: {
      '@': '/src',
      '@assets': '/src/assets'
    }
  }
});
