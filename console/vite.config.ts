import React from '@vitejs/plugin-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, PluginOption } from 'vite';
// import vitePluginEslint from 'vite-plugin-eslint'

export default defineConfig({
  plugins: [
    (React() as PluginOption),
    // vitePluginEslint()
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
    https: {
      key: readFileSync(resolve(__dirname, './local/pem/server.key')),
      cert: readFileSync(resolve(__dirname, './local/pem/server.crt')),
    },
    proxy: {
      '/api': {
        target: 'https://localhost:3000',
        // target: 'https://console.mooc.chaikd.com',
        secure: false,
        changeOrigin: true
      },
    }
  }
})