import React from '@vitejs/plugin-react';
import { resolve } from 'node:path';
import { defineConfig, loadEnv, PluginOption } from 'vite';
// import vitePluginEslint from 'vite-plugin-eslint'

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
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
      minify:false,
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
    define: {
      'process.env.SOCKETIO_HOST': JSON.stringify(env.SOCKETIO_HOST)
    },
    server: {
      // https: {
      //   key: readFileSync(resolve(__dirname, './local/ssl/server.key')),
      //   cert: readFileSync(resolve(__dirname, './local/ssl/server.crt')),
      // },
      proxy: {
        '/api': {
          target: 'http://localhost:3004',
          // target: 'https://console.mooc.chaikd.com',
          secure: false,
          changeOrigin: true
        },
      }
    }
  }
})