import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Ensure compatibility with modern browsers
    target: ['es2020', 'chrome90', 'firefox90', 'safari14', 'edge90'],
    // Generate source maps for better debugging
    sourcemap: true,
    // Optimize for better browser compatibility
    rollupOptions: {
      output: {
        // Ensure consistent module format
        format: 'es',
        // Split chunks for better loading
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['framer-motion', 'lucide-react']
        }
      }
    }
  },
  server: {
    // Ensure consistent development server behavior
    hmr: {
      overlay: true
    }
  },
  // Better browser compatibility for development
  esbuild: {
    target: 'es2020'
  }
})
