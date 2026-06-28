import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Forward OAuth callback to local Next.js dev server (mirrors Vercel rewrite in production)
      // NOTE: temporarily 3002 for local testing (3000 in use by another project). Revert to 3000 before committing.
      '/auth/callback': {
        target: 'http://localhost:3002',
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
