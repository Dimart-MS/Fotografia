import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// ==============================|| VITE CONFIG - ESTUDIO FOTOGRÁFICO ||============================== //

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api/clientes': 'http://127.0.0.1:8011',
      '/api': 'http://127.0.0.1:8012'
    }
  }
});
