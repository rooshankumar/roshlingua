import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: true,
      timeout: 2000,
      clientPort: 443
    },
    watch: {
      usePolling: true,
      interval: 1000,
    },
  },
  plugins: [
    react({
      devTarget: 'es2022',
      fastRefresh: true
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    force: true,
  }
}));
