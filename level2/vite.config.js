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
        assetsDir: '',
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html')
            },
            output: {
                assetFileNames: (assetInfo) => {
                    // Keep models in their original paths
                    if (assetInfo.name.endsWith('.glb')) {
                        return assetInfo.name;
                    }
                    return 'assets/[name]-[hash][extname]';
                }
            }
        }
    },
    publicDir: 'public'
});
