import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,       // Expose on LAN for testing from other devices
    port: 5173,
  },
  build: {
    sourcemap: false,               // Smaller production bundle
    chunkSizeWarningLimit: 800,     // Recharts is large; suppress noise
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Split heavy vendor libs into separate cacheable chunks
          if (id.includes('node_modules/react-dom') || id.includes('node_modules/react-router-dom')) {
            return 'vendor';
          }
          if (id.includes('node_modules/react/')) {
            return 'vendor';
          }
          if (id.includes('node_modules/recharts') || id.includes('node_modules/d3')) {
            return 'charts';
          }
          if (id.includes('node_modules/firebase')) {
            return 'firebase';
          }
        },
      },
    },
  },
})
