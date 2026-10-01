import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import lessonManagerPlugin from './vite-plugin-lesson-manager'

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: true,  // Listen on all interfaces (0.0.0.0)
    port: 5173,
  },
  plugins: [
    react(),
    lessonManagerPlugin(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'PicoPico Lessons',
        short_name: 'PicoPico',
        description: 'Create and play interactive lessons',
        theme_color: '#8B5CF6',
        background_color: '#1a202c',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 15 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,ico,svg,woff,woff2,otf}'],
        runtimeCaching: [
          {
            // Dynamic lesson and menu data (NetworkFirst ensures fresh content online, immediate offline fallback)
            urlPattern: ({ url }) =>
              url.pathname.endsWith('/lessons-data.json') ||
              url.pathname.endsWith('/menu-settings.json') ||
              url.pathname.endsWith('/banners.json') ||
              url.pathname.endsWith('/manifest.webmanifest') ||
              url.pathname.endsWith('/manifest.json'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pico-data-cache',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Audio & Sound effects
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/sounds/') ||
              /\.(?:mp3|wav|ogg|m4a|aac)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pico-sounds-cache',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 * 60 * 24 * 60 // 60 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Images, illustrations, characters, stickers, backgrounds
            urlPattern: ({ url }) =>
              url.pathname.startsWith('/assets/') ||
              url.pathname.startsWith('/src/assets/') ||
              /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i.test(url.pathname),
            handler: 'CacheFirst',
            options: {
              cacheName: 'pico-assets-cache',
              expiration: {
                maxEntries: 1000,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 Days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Google Fonts stylesheets
            urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Google Fonts webfont files
            urlPattern: ({ url }) => url.origin === 'https://fonts.gstatic.com',
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 Year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      }
    })
  ],
})
