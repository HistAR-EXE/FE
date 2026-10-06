import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons.svg'],
      manifest: {
        name: 'HistAR TimeLens',
        short_name: 'HistAR',
        description: 'Khám phá di sản Việt bằng AR & Tour 360 — hỗ trợ offline.',
        lang: 'vi',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#0B1120',
        theme_color: '#0B1120',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        // three.js / photo-sphere chunks are large.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // SPA: any navigation falls back to the app shell, except APIs and standalone static pages.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/ai\//,
          /^\/ar\//,
          /^\/ar\.html$/,
          /^\/media\//,
          /^\/__\/auth\//,
        ],
        runtimeCaching: [
          {
            // Same-origin /media only (Vercel/Vite proxy → R2). Do not intercept media.timelens.asia (CORS).
            // FE must load /media on the app origin (Vercel/Vite proxy). Do not set VITE_MEDIA_BASE_URL to media.*.
            urlPattern: ({ url }) => url.pathname.startsWith('/media/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'histar-media-v2',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true },
      '/ai': { target: 'http://localhost:8100', changeOrigin: true },
      '/media': {
        target: 'https://media.timelens.asia',
        changeOrigin: true,
        secure: true,
        bypass(req) {
          if (req.url?.startsWith('/media/mascot/')) return req.url
        },
      },
      '/__/auth': {
        target: 'https://histar-a08c1.firebaseapp.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
})
