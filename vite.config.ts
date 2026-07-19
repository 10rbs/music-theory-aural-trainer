import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// Deployed at https://10rbs.github.io/music-theory-aural-trainer/
// Single source of truth for the base path: the router (src/main.tsx) reads it
// via import.meta.env.BASE_URL, and the PWA scope (M1) will too. Self-hosted
// Docker builds override it with VITE_BASE=/.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/music-theory-aural-trainer/',
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
  ],
})
