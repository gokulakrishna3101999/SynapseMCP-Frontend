import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      // The backend's JwtAuthenticationFilter only skips /api/v1/auth/**; everything else under
      // /api/v1 and the SSE progress stream needs the same-origin proxy so the browser never has
      // to deal with CORS during local dev (CORS_ALLOWED_ORIGINS is still set for non-proxied use).
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
    },
  },
})
