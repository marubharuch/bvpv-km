import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    port: 3000,
    strictPort: true,
  },

  build: {
    // Warn only if a chunk exceeds 600KB
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks: {
          // Firebase split into its own cached chunk
          firebase: [
            'firebase/app',
            'firebase/auth',
            'firebase/database',
          ],
          // React core in its own chunk
          vendor: [
            'react',
            'react-dom',
            'react-router-dom',
          ],
          // Heavy UI libs in their own chunk
          ui: [
            'framer-motion',
            'lucide-react',
          ],
        },
      },
    },
  },
})