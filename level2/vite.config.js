import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        port: 5174, 
        open: true
    },
    base: '/level2/', 
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        },
        copyPublicDir: true
    },
    publicDir: 'public',
    assetsInclude: ['**/*.glb'] // Include .glb files as assets
});
