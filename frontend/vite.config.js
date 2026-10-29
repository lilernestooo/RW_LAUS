import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    proxy: {
      // PHP runs on XAMPP's Apache, so forward API calls there in dev
      '/api': {
        target: 'http://localhost',
        changeOrigin: true,
        rewrite: (path) => '/RW_LAUS/frontend/public' + path,
      },
    },
  },
})