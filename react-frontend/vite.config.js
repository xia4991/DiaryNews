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

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    host: '0.0.0.0',
    ...(httpsConfig ? { https: httpsConfig } : {}),
    proxy: {
      '/api': 'http://localhost:8000',
    },
  },
})
