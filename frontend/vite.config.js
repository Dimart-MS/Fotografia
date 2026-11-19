import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ==============================|| VITE CONFIG - LUZ & MEMORIA ||============================== //

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true
      }
    }
  }
});
