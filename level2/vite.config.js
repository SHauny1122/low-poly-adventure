import { defineConfig } from 'vite';
import { resolve } from 'path';
import fs from 'fs-extra';

// Copy models to dist during build
const copyModels = () => ({
    name: 'copy-models',
    closeBundle: async () => {
        await fs.copy('static/models', 'dist/models');
    }
});

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
    plugins: [copyModels()],
    publicDir: 'public'
});
