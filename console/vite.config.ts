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
  build: {
    rollupOptions: {
      output: {
        entryFileNames: '[name]-[hash].js',
        chunkFileNames: 'js/[name]-[hash].js',
        assetFileNames: (file) => {
          if(file.names[0].includes('.css')) {
            return 'assets/[name]-[hash].[ext]'
          } else {
            return 'assets/resouce/[name]-[hash].[ext]'
          }
        },
        minifyInternalExports: true
      }
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