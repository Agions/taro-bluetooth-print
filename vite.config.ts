import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

/**
 * Build configuration for taro-bluetooth-print library.
 *
 * Bundle layout (after code splitting):
 *   dist/index.es.js        - main entry (root: . /)
 *   dist/index.cjs.js       - main entry CJS
 *   dist/index.umd.js       - main entry UMD (CDN/script-tag compat)
 *   dist/core/index.es.js   - sub-export: ./core
 *   dist/drivers/index.es.js - sub-export: ./drivers
 *   dist/adapters/index.es.js - sub-export: ./adapters
 *   dist/encoding/index.es.js - sub-export: ./encoding (GBK tables)
 *   dist/chunks/*.js        - shared chunks extracted via manualChunks
 *
 * Strategy: multi-entry lib build. Each sub-module declared as an entry,
 * so rollup emits them as separate files. Shared code (utils, types, errors)
 * is hoisted into dist/chunks/*.js via the manualChunks function.
 *
 * Sub-export contract (mirrors package.json `exports` field):
 *   `taro-bluetooth-print`           -> dist/index.es.js
 *   `taro-bluetooth-print/core`      -> dist/core/index.es.js
 *   `taro-bluetooth-print/drivers`   -> dist/drivers/index.es.js
 *   `taro-bluetooth-print/adapters`  -> dist/adapters/index.es.js
 *   `taro-bluetooth-print/encoding`  -> dist/encoding/index.es.js
 *
 * copyPublicDir=false is critical: Vite otherwise copies the docs/public
 * assets (hero-illustration.svg, logo.svg, manifest.webmanifest, offline.html,
 * service-worker.js) into dist/, leaking ~10KB of VitePress assets into the
 * npm package. We don't need them in the library bundle.
 */
export default defineConfig({
  build: {
    lib: {
      // Multi-entry: root index + four sub-exports + a single data-only entry.
      // UMD is built for the root entry only (CDN/script-tag compat); sub-exports
      // are ESM-only because the package.json `exports` field declares them as
      // `import` only. Vite 7 cannot build UMD for multi-entry anyway.
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
        'core/index': resolve(__dirname, 'src/core/index.ts'),
        'drivers/index': resolve(__dirname, 'src/drivers/index.ts'),
        'adapters/index': resolve(__dirname, 'src/adapters/index.ts'),
        'encoding/index': resolve(__dirname, 'src/encoding/index.ts'),
      },
      name: 'TaroBluePrint',
      // UMD is intentionally not produced by the primary `vite build` because
    // Vite 7 disallows multi-entry + UMD/IIFE formats. UMD consumers should
    // use the dedicated `vite build --config vite.umd.config.ts` (see
    // `build:umd` script) or rely on an external bundler (webpack/rollup).
    // The package.json `exports` field keeps the `default` key removed since
    // no UMD artifact ships by default.
    formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        // Sub-exports use entry-specific filenames matching package.json exports.
        // Entry "core/index" → "core/index.es.js" (NOT "core/index.js").
        if (entryName !== 'index') {
          return `${entryName}.${format}.js`
        }
        // Root entry: backwards-compatible file names.
        switch (format) {
          case 'es':
            return 'index.es.js'
          case 'cjs':
            return 'index.cjs.js'
          default:
            return `index.${format}.js`
        }
      },
    },
    // CRITICAL: prevent vitepress public assets from being copied into dist/
    copyPublicDir: false,
    rollupOptions: {
      external: ['@tarojs/taro', /^@tarojs\//],
      output: {
        globals: {
          '@tarojs/taro': 'Taro',
        },
        // 优化输出配置
        compact: true,
        // 禁用生成sourcemap以减少文件体积
        sourcemap: false,
        // Shared chunks hoisted out of entries.
        // Entry file names are controlled by build.lib.fileName above; we do
        // NOT set entryFileNames here because doing so would override the
        // lib fileName callback and break backwards-compatible naming
        // (index.es.js / index.cjs.js).
        chunkFileNames: 'chunks/[name]-[hash].js',
        // Hoist shared code into common chunks. Anything imported by 2+ entries
        // becomes a single shared chunk; per-entry code stays in the entry file.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            return 'vendor'
          }
          // v2.15.4: Put the entire GBK/Big5 encoding table family (GbkData,
          // GbkTable, GbkLite) into a single dedicated chunk. Together they
          // are ~452 KB raw / ~180 KB gzip — a meaningful chunk that gets
          // hoisted out of the main shared chunk. Sync API is preserved (no
          // dynamic import); future v2.15.5+ can swap to async pre-warm.
          if (
            id.includes('/src/encoding/GbkData') ||
            id.includes('/src/encoding/GbkTable') ||
            id.includes('/src/encoding/GbkLite')
          ) {
            return 'gbk-data'
          }
          // Shared cross-cutting modules (used by >=2 of the entries)
          if (
            id.includes('/src/utils/') ||
            id.includes('/src/errors/') ||
            id.includes('/src/constants/') ||
            id.includes('/src/types.ts') ||
            id.includes('/src/encoding/KoreanJapanese') ||
            id.includes('/src/encoding/EncodingService')
          ) {
            return 'shared'
          }
          return undefined
        },
      },
      // 优化tree-shaking
      treeshake: {
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        // 启用严格的tree-shaking
        moduleSideEffects: false,
      },
    },
    target: 'es2015',
    minify: 'terser',
    // 优化terser配置
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.warn', 'console.error', 'console.info', 'console.debug'],
        dead_code: true,
        unused: true,
        collapse_vars: true,
        reduce_vars: true,
        // 更激进的压缩选项
        passes: 2,
        unsafe: true,
        unsafe_comps: true,
        unsafe_math: true,
        unsafe_symbols: true,
        unsafe_undefined: true,
        keep_infinity: false,
      },
      mangle: {
        toplevel: true,
        keep_classnames: false,
        keep_fnames: false,
        // 更激进的混淆选项
        reserved: [],
      },
      format: {
        comments: false,
        beautify: false,
        // 优化输出格式
        ascii_only: true,
        wrap_func_args: false,
      },
    },
    // 启用增量构建
    incremental: true,
    // 启用缓存
    cache: true,
    // 优化类型声明生成
    declarationDir: 'dist/types',
    // 禁用不必要的生成
    emptyOutDir: true,
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      outDir: 'dist/types',
      // 优化类型声明生成
      exclude: ['node_modules/**', '**/*.test.ts', '**/*.spec.ts'],
      // 生成更简洁的类型声明
      compilerOptions: {
        declarationMap: false,
        skipLibCheck: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    extensions: ['.ts', '.js', '.json'],
  },
  // 优化开发环境配置
  optimizeDeps: {
    include: ['@tarojs/taro'],
    exclude: [],
    // 启用esbuild优化
    esbuildOptions: {
      target: 'es2015',
      define: {
        global: 'globalThis',
      },
      supported: {
        bigint: false,
      },
    },
  },
})
