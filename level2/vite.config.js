import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    server: {
        port: 5174, 
        open: true
    },
    base: '/level2/', 
    build: {
        outDir: 'dist/level2',
        assetsDir: '.',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            }
        }
    },
    publicDir: 'public'
});
