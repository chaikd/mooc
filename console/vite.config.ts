import { defineConfig, PluginOption } from 'vite';
import { resolve } from 'node:path'
import React from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    (React() as PluginOption)
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
})