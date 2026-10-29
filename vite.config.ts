import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { fileURLToPath, URL } from 'node:url'

const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.VITE_BASE ?? (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/')

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    // MediaPipe WASM is served from /mediapipe/wasm, copied from the package at build time.
    viteStaticCopy({
      targets: [{ src: 'node_modules/@mediapipe/tasks-vision/wasm/*', dest: 'mediapipe/wasm' }],
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/*.png'],
      manifest: {
        name: 'HLedger Guestbook',
        short_name: 'Guestbook',
        description: 'Digital event guestbook with photo booth',
        theme_color: '#1c1917',
        background_color: '#1c1917',
        display: 'fullscreen',
        orientation: 'any',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // App shell only. Supabase and the model are never cached by the SW.
        globPatterns: ['**/*.{js,css,html,svg,webp,woff2,json}'],
        globIgnores: ['**/mediapipe/**', '**/models/**'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          { urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i, handler: 'NetworkOnly' },
          {
            urlPattern: /\/mediapipe\/wasm\/.*/i,
            handler: 'CacheFirst',
            options: { cacheName: 'mediapipe-wasm', expiration: { maxEntries: 8 } },
          },
          {
            urlPattern: /\/models\/.*\.task$/i,
            handler: 'CacheFirst',
            options: { cacheName: 'mediapipe-models', expiration: { maxEntries: 2 } },
          },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: 3000, host: true },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          mediapipe: ['@mediapipe/tasks-vision'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
})
