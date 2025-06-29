import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  esbuild: {
    target: 'es2022',
    tsconfigRaw: {
      compilerOptions: {
        experimentalDecorators: true,
        emitDecoratorMetadata: true,
        useDefineForClassFields: false
      }
    }
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    target: 'es2022',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-progress', '@radix-ui/react-toast', '@radix-ui/react-tooltip'],
          charts: ['recharts'],
          utils: ['date-fns', 'clsx', 'tailwind-merge', 'zod'],
          motion: ['framer-motion'],
          icons: ['lucide-react'],
          router: ['react-router-dom'],
          state: ['zustand'],
          query: ['@tanstack/react-query'],
          supabase: ['@supabase/supabase-js'],
          dropzone: ['react-dropzone'],
          ml: ['ml-regression-simple-linear']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  },
  server: {
    port: 5173,
    host: true
  },
  preview: {
    port: 4173,
    host: true
  }
});