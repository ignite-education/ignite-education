import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Lesson renderers, pagination and text normalisation shared with admin-app.
    // `shared/` is inside this project root, so no server.fs.allow is needed here.
    alias: { '@shared': path.resolve(__dirname, './shared') },
  },
  server: {
    // Pin to 5174 so the OAuth redirect URL matches Supabase's allowlist (http://localhost:5174/**)
    port: 5174,
    strictPort: true,
    watch: {
      // Sibling app build output lives under this project root, so without this
      // every admin-app or next-app build triggers a full reload of the SPA.
      ignored: ['**/admin-app/dist/**', '**/next-app/.next/**', '**/dist/**'],
    },
    proxy: {
      // Forward OAuth callback to local Next.js dev server (mirrors Vercel rewrite in production)
      '/auth/callback': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate large libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js', '@supabase/ssr'],
          'stripe-vendor': ['@stripe/stripe-js', 'stripe'],
          'ai-vendor': ['@anthropic-ai/sdk'],
          // Split ui-vendor for better lazy loading - lottie only needed for LoadingScreen
          'lottie': ['lottie-react'],
          'calendly': ['react-calendly'],
          'icons': ['lucide-react'],
          // Note: cors and express are server-side only, not bundled in frontend
        },
      },
    },
    // Increase chunk size warning limit since we're code splitting
    chunkSizeWarningLimit: 1000,
    // Enable CSS code splitting
    cssCodeSplit: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@supabase/supabase-js',
      '@supabase/ssr',
    ],
    exclude: [
      '@anthropic-ai/sdk',
      '@elevenlabs/elevenlabs-js',
    ],
  },
})
