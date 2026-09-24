/// <reference types="vitest/config" />
import { resolve } from 'node:path';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

// 双用途配置：
// - dev（vite）：以 playground/ 为 root，提供组件预览应用，HMR 直通 src 源码
// - build（vite build）：lib 模式产出 ESM + d.ts 到 dist/，仅预留给未来独立发布
export default defineConfig(({ command }) => {
  const isServe = command === 'serve';

  return {
    root: isServe ? resolve(__dirname, 'playground') : __dirname,
    plugins: [
      react(),
      tailwindcss(),
      ...(isServe
        ? []
        : [
            dts({
              include: ['src'],
              entryRoot: 'src',
              exclude: ['**/__tests__/**'],
            }),
          ]),
    ],
    build: isServe
      ? {}
      : {
          outDir: 'dist',
          lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['es'],
            fileName: 'index',
          },
          rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
          },
        },
    test: {
      globals: true,
      environment: 'jsdom',
      dir: resolve(__dirname, 'src'),
      include: ['**/__tests__/**/*.test.{ts,tsx}'],
      setupFiles: resolve(__dirname, 'vitest.setup.ts'),
      css: false,
    },
  };
});
