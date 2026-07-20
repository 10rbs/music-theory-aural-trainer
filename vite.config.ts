import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Deployed at https://10rbs.github.io/music-theory-aural-trainer/
// Single source of truth for the base path: the router (src/main.tsx) reads it
// via import.meta.env.BASE_URL, and the PWA scope inherits it from `base`.
// Self-hosted Docker builds override it with VITE_BASE=/.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/music-theory-aural-trainer/',
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // zero runtime network calls → full precache = fully offline
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
      },
      manifest: {
        name: 'Aural Trainer',
        short_name: 'Aural',
        description: 'Music theory, aural skills, and daily practice drills',
        theme_color: '#f2f3f7',
        background_color: '#f2f3f7',
        display: 'standalone',
        icons: [
          { src: 'icons/pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
})
