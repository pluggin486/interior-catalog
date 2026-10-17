import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5080',
      '/health': process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:5080',
    },
  },
})
