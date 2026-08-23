import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@shared': path.resolve(__dirname, '../../packages/shared/src')
        }
    },
    server: {
        port: 5173,
        host: true
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                // Code-splitting seguro: bibliotecas estables a chunks cacheados.
                // Reduce el chunk crítico (elimina el warning >500 kB) sin cambiar comportamiento.
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-supabase': ['@supabase/supabase-js']
                }
            }
        }
    }
});