import { resolve } from 'path';
import copy from 'rollup-plugin-copy';
import nodeExternals from 'rollup-plugin-node-externals';
import { defineConfig, loadEnv } from 'vite';
export default defineConfig(({mode}) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    plugins: [
      nodeExternals(),
      (copy as any)({
        targets: [
          { src: 'src/middleware/jwt/pem', dest: 'dist/middleware/jwt' }
        ],
        hook: 'writeBundle'
      })
    ],
    build: {
      target: 'node16',
      outDir: 'dist',
      minify: false,
      rollupOptions: {
        input: './src/server.ts',
        output: {
          entryFileNames: '[name].mjs',
          preserveModules: true,
          preserveModulesRoot: 'src',
        },
        preserveEntrySignatures: 'strict',
        external: [
          'mongoose',
          'winston',
          'redis',
          'jsonwebtoken',
          'http-errors',
          'express',
          'cookie-parser',
          'socket.io',
        ],
      },
    },
    define: {
      'process.env.PORT': JSON.stringify(env.PORT),
      'process.env.WEBRTC_TRANSPORT_IP': JSON.stringify(env.WEBRTC_TRANSPORT_IP),
      'process.env.MONGO_URI': JSON.stringify(env.MONGO_URI),
      'process.env.QINNIU_ASSESSKEY': JSON.stringify(env.QINNIU_ASSESSKEY),
      'process.env.QINNIU_SECRETKEY': JSON.stringify(env.QINNIU_SECRETKEY),
      'process.env.QINIU_URL': JSON.stringify(env.QINIU_URL),
    },
    resolve: {
      extensions: ['.ts', '.js'],
      alias: {
        "@": resolve(__dirname, './src'),
        "@mooc/db-shared": resolve(__dirname, '../packages/db-shared/src'),
      }
    }
  }
})