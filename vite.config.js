import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: {
    port: 5173,
    open: '/',
    fs: {
      // Allow serving files from one level up to access level2
      allow: ['..']
    }
  },
  build: {
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: './index.html',
        level2: './level2/index.html'
      },
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
