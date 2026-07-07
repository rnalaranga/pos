import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// We intentionally do NOT include vite-plugin-electron here.
// The React web app runs in the browser via `npm run dev`.
// Electron is only used for production packaging via `npm run build:electron`.
export default defineConfig({
  plugins: [
    react(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 3000,
  }
})
