import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  // استقرار GitHub Pages زیر مسیر مخزن قرار می‌گیرد؛ فقط CI مقدار DEPLOY_BASE را می‌دهد
  // (روی dev/test محلی '/' می‌ماند تا رفتار موجود دست نخورد)
  base: process.env.DEPLOY_BASE ?? '/',
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        // وندور در chunk جدا و پایدار — هشِ ثابت بین انتشارها = کش بلندمدتِ
        // مرورگر برای react/react-dom/router؛ کد اپ در chunk خودش کوچک می‌ماند
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['tests/e2e/**', 'node_modules/**', 'dist/**'],
  },
})
