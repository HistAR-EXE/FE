import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  publicDir: command === 'build' ? '.r2-public-build' : 'public',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      strategies: 'generateSW',
      registerType: 'autoUpdate',
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
        globPatterns: ['**/*.{js,css,html,svg,woff2,wasm,task,tflite}'],
        // three.js / photo-sphere chunks are large.
        maximumFileSizeToCacheInBytes: 16 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        // SPA: any navigation falls back to the app shell, except APIs and standalone static pages.
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/ai\//,
          /^\/ar\//,
          // Workbox matches pathname + search (the frame includes ?artifact=...).
          /^\/ar\.html(?:\?|$)/,
          /^\/media\//,
          /^\/films\//,
          /^\/(audio|images|badges|brand|depth|huy|mascot|minigames)\//,
          /^\/artifacts\/cu-chi\//,
          /^\/assets\/ar-targets\//,
          /^\/assets\/artifacts\//,
          /^\/assets\/(cu-chi-targets|targets)\.mind$/,
          /^\/assets\/(hat|lamp|lamp-web)\.glb$/,
          /^\/vendor\//,
          /^\/ar\/cu-chi\//,
          /^\/assets\/target-(hat|lamp)\.png$/,
          /^\/(favicon\.svg|icons\.svg|mascot-2\.png)$/,
          /^\/__\/auth\//,
        ],
        runtimeCaching: [
          {
            // Same-origin media is proxied to R2; stream video without service-worker caching.
            urlPattern: ({ url }) => (
              /^\/(media|films|audio|images|badges|brand|depth|huy|mascot|minigames)\//.test(url.pathname)
              || url.pathname.startsWith('/artifacts/cu-chi/')
              || /^\/assets\/(ar-targets\/|artifacts\/[^/]+\.webp$|target-(hat|lamp)\.png$)/.test(url.pathname)
              || /^\/(favicon\.svg|icons\.svg|mascot-2\.png)$/.test(url.pathname)
            ) && !/\.(mp4|webm|mov|m3u8|ts|m4s)$/i.test(url.pathname),
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
      '/api': { target: process.env.HISTAR_LOCAL_API_TARGET || 'http://127.0.0.1:8080', changeOrigin: true },
      '/ai': { target: 'http://127.0.0.1:8100', changeOrigin: true },
      '/media': {
        target: 'https://media.timelens.asia',
        changeOrigin: true,
        secure: true,
      },
      '^/(films|audio|images|badges|brand|depth|huy|mascot|minigames)/': {
        target: 'https://media.timelens.asia', changeOrigin: true, secure: true,
      },
      '^/artifacts/cu-chi/': {
        target: 'https://media.timelens.asia', changeOrigin: true, secure: true,
      },
      '^/vendor/': {
        target: 'https://media.timelens.asia', changeOrigin: true, secure: true,
      },
      '^/ar/cu-chi/(posters|targets)/': {
        target: 'https://media.timelens.asia', changeOrigin: true, secure: true,
      },
      '^/assets/(artifacts/|cu-chi-targets\\.mind$|targets\\.mind$|hat\\.glb$|lamp(-web)?\\.glb$)': {
        target: 'https://media.timelens.asia', changeOrigin: true, secure: true,
      },
      '^/assets/(ar-targets/|artifacts/[^/]+\\.webp$|target-(hat|lamp)\\.png$)': {
        target: 'https://media.timelens.asia', changeOrigin: true, secure: true,
      },
      '^/(favicon\\.svg|icons\\.svg|mascot-2\\.png)$': {
        target: 'https://media.timelens.asia', changeOrigin: true, secure: true,
      },
      '/__/auth': {
        target: 'https://histar-a08c1.firebaseapp.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
}))
