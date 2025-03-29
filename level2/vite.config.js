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
                    // Keep the original path for model files
                    if (assetInfo.name.endsWith('.glb')) {
                        return 'models/[name][extname]';
                    }
                    // Other assets go in the assets directory
                    return 'assets/[name].[hash][extname]';
                }
            }
        }
    },
    publicDir: 'public'
});
