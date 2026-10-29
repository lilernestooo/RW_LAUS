import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const live = mode === 'live'

  const proxy = live
    ? {
        // Dev server talks to the real site
        '/api':     { target: 'https://rw951.fm', changeOrigin: true, secure: true },
        '/uploads': { target: 'https://rw951.fm', changeOrigin: true, secure: true },
      }
    : {
        // Dev server talks to local XAMPP
        '/api': {
          target: 'http://localhost',
          changeOrigin: true,
          rewrite: (path) => '/RW_LAUS/frontend/public' + path,
        },
      }

  return {
    plugins: [react(), tailwindcss()],
    server: { proxy },
  }
})