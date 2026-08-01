import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Lesson renderers/pagination shared with the student app. Everything in
      // `shared/` may import React and nothing else — Vercel runs `npm install`
      // only inside admin-app, so any other dependency would fail to resolve.
      '@shared': path.resolve(__dirname, '../shared'),
      // `shared/` sits above this project root, so Node resolution would walk up
      // from there and find the STUDENT app's node_modules/react — two React
      // copies in one bundle, i.e. "Invalid hook call" at runtime. Pin them.
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
    },
    dedupe: ['react', 'react-dom'],
  },
  server: {
    // Allow the dev server to serve files from ../shared
    fs: { allow: ['..'] },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js', '@supabase/ssr'],
          'icons': ['lucide-react'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    cssCodeSplit: true,
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@supabase/ssr',
    ],
  },
})
