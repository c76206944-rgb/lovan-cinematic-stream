// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { VitePWA } from "vite-plugin-pwa";
import { offlineShellPlugin } from "./offline-build";

export default defineConfig({
  vite: {
    plugins: [offlineShellPlugin(), VitePWA({
      strategies: "generateSW",
      filename: "sw.js",
      outDir: "dist/client",
      injectRegister: null,
      registerType: "autoUpdate",
      manifest: false,
      devOptions: { enabled: false },
      // Generate after the client files have been written, not during SSR.
      integration: { closeBundleOrder: "post" },
      workbox: {
        globDirectory: "dist/client",
        globPatterns: ["**/*.{js,css,html}", "icon-*.png", "favicon.png"],
        globIgnores: ["**/sw.js", "**/upload-background.js"],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        importScripts: ["/upload-background.js"],
        runtimeCaching: [
          {
            urlPattern: ({ request, url }) => request.mode === "navigate" && !url.pathname.startsWith("/~oauth"),
            handler: "NetworkFirst",
            options: {
              cacheName: "lovan-navigation",
              networkTimeoutSeconds: 4,
              // SSR pages can contain account data. Only cache the public static shell.
              cacheableResponse: { statuses: [200], headers: { "X-LOVAN-Offline-Shell": "1" } },
              precacheFallback: { fallbackURL: "/offline.html" },
            },
          },
          {
            urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/[^/]+-[\w-]+\.(?:js|css)$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "lovan-hashed-assets", expiration: { maxEntries: 200 } },
          },
        ],
      },
    })],
  },
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
});
