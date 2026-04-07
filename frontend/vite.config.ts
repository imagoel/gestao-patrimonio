import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    hmr: {
      host: process.env.VITE_HMR_HOST ?? 'localhost',
      clientPort: Number(process.env.VITE_HMR_CLIENT_PORT ?? 8080),
      protocol: 'ws',
    },
  },
})
