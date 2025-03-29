import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    base: '/level2/',
    server: {
        port: 5174,
        open: true
    },
    build: {
        outDir: 'dist',
        assetsDir: 'assets',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    },
    publicDir: 'public'
});
