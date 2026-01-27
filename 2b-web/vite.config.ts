import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'https://nicerouter.com',
        changeOrigin: true,
        secure: false,
      },
      '/u': {
        target: 'https://nicerouter.com',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
