import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/data/incidents.json': {
        target: 'http://localhost:5173',
        rewrite: (path) => path.replace(/^\/data/, '/src/data')
      }
    }
  }
})
