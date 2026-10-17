/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Connect, type Plugin } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

// Backend for the dev/preview proxy. Override with API_TARGET=http://localhost:8001
const API_TARGET = process.env.API_TARGET ?? 'http://localhost:8000';

// Tunnels for testing on a real phone over HTTPS (ngrok). Leading dot = any subdomain.
const TUNNEL_HOSTS = ['.ngrok-free.app', '.ngrok.app', '.ngrok.io'];

/** The operator zone has its own HTML (admin.html): its manifest installs the operator app. */
const isAdminPage = (url = '') => /^\/admin(\/|\?|$)/.test(url) && !/\.\w+(\?|$)/.test(url.split('?')[0]!);

/** Dev and preview: serve admin.html for /admin routes, like the Vercel rewrites do. */
function adminEntry(): Plugin {
  const rewrite: Connect.NextHandleFunction = (req, _res, next) => {
    if (req.method === 'GET' && isAdminPage(req.url)) req.url = '/admin.html';
    next();
  };
  return {
    name: 'admin-entry',
    configureServer: (server) => void server.middlewares.use(rewrite),
    configurePreviewServer: (server) => void server.middlewares.use(rewrite),
  };
}

export default defineConfig({
  plugins: [
    adminEntry(),
    react(),
    tailwindcss(),
    VitePWA({
      // 'prompt' = a new version waits instead of taking over the open app;
      // src/lib/swUpdate.ts applies it silently while the app is hidden.
      registerType: 'prompt',
      injectRegister: false,
      manifest: false, // own manifests in /public (client and operator)
      workbox: {
        navigateFallback: '/index.html',
        // /admin pages come from the network (admin.html, with the operator manifest).
        navigateFallbackDenylist: [/^\/api\//, /^\/admin(\/|$)/],
        // Precache only the client shell: customers never download operator code.
        // Other font subsets load on demand through unicode-range.
        globPatterns: [
          '**/*.{js,css,html}',
          'assets/*-latin-{wght,soft}-normal-*.woff2',
          'icons/icon-192.png',
        ],
        globIgnores: ['assets/admin-*'],
        // Never cache /api/*. Hashed assets and brand images are immutable.
        runtimeCaching: [
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/assets/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'assets',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            // Product photos keep their file name when replaced: shown from cache, refreshed behind.
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/products/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'product-images',
              expiration: { maxEntries: 60, maxAgeSeconds: 60 * 60 * 24 * 30 },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/brand/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'brand-images',
              expiration: { maxEntries: 40, maxAgeSeconds: 60 * 60 * 24 * 60 },
            },
          },
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    allowedHosts: TUNNEL_HOSTS,
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
  preview: {
    allowedHosts: TUNNEL_HOSTS,
    proxy: { '/api': { target: API_TARGET, changeOrigin: false } },
  },
  build: {
    target: ['es2022', 'safari16', 'chrome111', 'firefox115'],
    cssTarget: ['safari16', 'chrome111', 'firefox115'],
    rolldownOptions: {
      input: {
        index: fileURLToPath(new URL('./index.html', import.meta.url)),
        admin: fileURLToPath(new URL('./admin.html', import.meta.url)),
      },
      output: {
        // Zone prefix lets the service worker precache only the client zone.
        chunkFileNames: (chunk) => {
          const id = chunk.facadeModuleId ?? '';
          const operatorOnly =
            id.includes('/src/features/operator/') ||
            chunk.moduleIds.every((m) => /\/node_modules\/(qrcode|dijkstrajs|pngjs)\//.test(m));
          if (operatorOnly) return 'assets/admin-[name]-[hash].js';
          if (id.includes('/src/features/customer/')) return 'assets/client-[name]-[hash].js';
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
});
