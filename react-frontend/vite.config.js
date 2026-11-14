import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import fs from 'fs'

const httpsConfig = (() => {
  try {
    return {
      key: fs.readFileSync('./certs/key.pem'),
      cert: fs.readFileSync('./certs/cert.pem'),
    }
  } catch {
    return false
  }
})()

// Backend the dev server proxies to; override to run a second backend side by side.
const apiProxyTarget = process.env.VITE_API_PROXY_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    ...(httpsConfig ? { https: httpsConfig } : {}),
    proxy: {
      '/api': apiProxyTarget,
      '/uploads': apiProxyTarget,
    },
  },
})
