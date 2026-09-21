import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  // GitHub Pages serves the app under /<repo-name>/ – the deploy workflow sets this.
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [
    react(),
    // PWA: damit die App auf dem iPad zum Home-Bildschirm hinzugefuegt werden kann
    // und die App-Huelle offline laedt. Die Sounds liegen ohnehin in IndexedDB.
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-192.png', 'icon-512.png', 'apple-touch-icon.png', 'brand/vsg-logo-96.png'],
      manifest: {
        name: 'Volleyball DJ',
        short_name: 'VB DJ',
        description: 'Soundboard für Volleyball-Spiele',
        lang: 'de',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0d283a',
        theme_color: '#0d283a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,woff2}'],
      },
    }),
  ],
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
