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
                    // Keep the original path structure for model files
                    if (assetInfo.name.endsWith('.glb')) {
                        // Extract directory path from the full name
                        const parts = assetInfo.name.split('/');
                        const fileName = parts.pop();
                        const dirPath = parts.join('/');
                        return dirPath ? `${dirPath}/[name][extname]` : 'models/[name][extname]';
                    }
                    return 'assets/[name]-[hash][extname]';
                }
            }
        }
    },
    publicDir: 'public'
});
