import { resolve } from 'path';
import copy from 'rollup-plugin-copy';
import nodeExternals from 'rollup-plugin-node-externals';
import { defineConfig } from 'vite';

export default defineConfig({
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
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      "@": resolve(__dirname, './src'),
      "@mooc/db-shared": resolve(__dirname, '../packages/db-shared/src'),
    }
  }
})