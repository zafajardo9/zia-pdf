import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import brand from './brand.config.json'

const htmlBrandTokens: Record<string, string> = {
  '%%BRAND_NAME%%': brand.name,
  '%%BRAND_TITLE%%': `${brand.name} — ${brand.tagline}`,
  '%%BRAND_DESCRIPTION%%': brand.description,
  '%%BRAND_THEME_COLOR%%': brand.themeColor,
  '%%BRAND_SITE_URL%%': brand.siteUrl,
  '%%BRAND_REPOSITORY_URL%%': brand.repositoryUrl,
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'brand-html',
      transformIndexHtml: (html) => Object.entries(htmlBrandTokens)
        .reduce((output, [token, value]) => output.replaceAll(token, value), html),
    },
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // OCR assets (Tesseract core + language data) exceed Workbox's 2 MiB
        // default, so raise the limit so they are precached and work offline.
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: brand.name,
        short_name: brand.shortName,
        description: brand.description,
        theme_color: brand.themeColor,
        background_color: brand.backgroundColor,
        display: 'standalone',
        icons: [
          { src: 'icons/logo.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
          { src: 'icons/logo.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: process.env.VITE_BASE || './',
  server: {
    host: true
  },
  build: {
    target: 'esnext',
    minify: 'esbuild', // Faster and more stable in resource-constrained environments
    rollupOptions: {
      output: {
        manualChunks: {
          'pdf-lib-core': ['pdf-lib'],
          'pdfjs-viewer': ['pdfjs-dist'],
          'tesseract-core': ['tesseract.js'],
          'vendor-ui': ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'sonner'],
          'vendor-utils': ['jszip', '@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities']
        }
      }
    }
  }
})
