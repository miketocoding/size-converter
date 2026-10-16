import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves this project from /size-converter/, not the domain
  // root. Without this, every asset URL would 404 on the deployed site.
  base: '/size-converter/',
  plugins: [react()],
})
