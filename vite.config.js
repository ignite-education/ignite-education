import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks - separate large libraries
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'supabase-vendor': ['@supabase/supabase-js'],
          'stripe-vendor': ['@stripe/stripe-js', 'stripe'],
          'ai-vendor': ['@anthropic-ai/sdk', '@aws-sdk/client-polly'],
          'ui-vendor': ['lottie-react', 'react-calendly'],
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
    ],
    exclude: [
      '@anthropic-ai/sdk',
      '@aws-sdk/client-polly',
    ],
  },
})
