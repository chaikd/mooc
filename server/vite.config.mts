import { resolve } from 'path';
import nodeExternals from 'rollup-plugin-node-externals';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    nodeExternals(),
  ],
  build: {
    target: 'node16',
    outDir: 'dist',
    rollupOptions: {
      input: './src/server.ts',
      output: {
        entryFileNames: '[name].mjs',
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
      preserveEntrySignatures: 'strict',
      external: ['mongoose']
    },
  },
  resolve: {
    extensions: ['.ts', '.js'],
    alias: {
      "@": resolve(__dirname, './src'),
      "@mooc/db-shared": resolve(__dirname, '../packages/db-shared/src'),
      "@mooc/live-service": resolve(__dirname, '../packages/live-service/src')
    }
  }
})