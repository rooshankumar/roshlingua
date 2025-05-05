import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'react-router-dom', '@supabase/supabase-js'],
    exclude: [],
  },
  build: {
    sourcemap: true,
    // Improve build performance
    minify: 'esbuild',
    target: 'esnext',
  },
  server: {
    // Improve HMR performance
    hmr: {
      overlay: false,
    },
    // Increase timeout for slow connections
    hmrTimeout: 5000,
  },
})