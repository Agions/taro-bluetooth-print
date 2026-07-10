/**
 * UMD build config — single entry (root) UMD bundle for CDN / <script> tag use.
 *
 * Why a separate config: Vite 7 forbids multi-entry + UMD/IIFE in a single build.
 * This produces dist/index.umd.js (legacy default export).
 *
 * Run with: npm run build:umd
 */
import { defineConfig } from 'vite';
import { resolve } from 'path';
import dts from 'vite-plugin-dts';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TaroBluePrint',
      formats: ['umd'],
      fileName: () => 'index.umd.js',
    },
    copyPublicDir: false,
    rollupOptions: {
      external: ['@tarojs/taro', /^@tarojs\//],
      output: {
        globals: { '@tarojs/taro': 'Taro' },
        compact: true,
        sourcemap: false,
        chunkFileNames: 'chunks/[name]-[hash].js',
      },
      treeshake: {
        propertyReadSideEffects: false,
        moduleSideEffects: false,
      },
    },
    target: 'es2015',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        dead_code: true,
        unused: true,
        passes: 2,
      },
      mangle: { toplevel: true },
      format: { comments: false, ascii_only: true },
    },
    declarationDir: 'dist/types',
    emptyOutDir: false,
    outDir: 'dist',
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      outDir: 'dist/types',
      exclude: ['node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
      compilerOptions: { declarationMap: false, skipLibCheck: true },
    }),
  ],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
    extensions: ['.ts', '.js', '.json'],
  },
});