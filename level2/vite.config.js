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
            },
            output: {
                assetFileNames: (assetInfo) => {
                    // Keep model files in their original structure
                    if (assetInfo.name.endsWith('.glb')) {
                        // Remove 'public/' from the path if it exists
                        const path = assetInfo.name.replace('public/', '');
                        return path;
                    }
                    return 'assets/[name]-[hash][extname]';
                }
            }
        }
    },
    publicDir: 'public'
});
