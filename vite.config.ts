import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'TaroBluePrint',
      formats: ['es', 'cjs', 'umd'],
      fileName: (format) => {
        switch (format) {
          case 'es':
            return 'index.es.js'
          case 'cjs':
            return 'index.cjs.js'
          case 'umd':
            return 'index.umd.js'
          default:
            return `index.${format}.js`
        }
      }
    },
    rollupOptions: {
      external: ['@tarojs/taro'],
      output: {
        globals: {
          '@tarojs/taro': 'Taro'
        },
        // 优化输出配置
        compact: true,
        // 禁用生成sourcemap以减少文件体积
        sourcemap: false,
        // 优化代码分割和tree-shaking
        manualChunks: undefined
      },
      // 优化tree-shaking
      treeshake: {
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
        // 启用严格的tree-shaking
        moduleSideEffects: (id) => {
          // 仅允许必要的副作用
          return id.includes('reflect-metadata')
        }
      }
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
        keep_infinity: false
      },
      mangle: {
        toplevel: true,
        keep_classnames: false,
        keep_fnames: false,
        // 更激进的混淆选项
        reserved: []
      },
      format: {
        comments: false,
        beautify: false,
        // 优化输出格式
        ascii_only: true,
        wrap_func_args: false
      }
    },
    // 启用增量构建
    incremental: true,
    // 启用缓存
    cache: true,
    // 优化类型声明生成
    declarationDir: 'dist/types',
    // 禁用不必要的生成
    emptyOutDir: true
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
        skipLibCheck: true
      }
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    },
    extensions: ['.ts', '.js', '.json']
  },
  // 优化开发环境配置
  optimizeDeps: {
    include: ['@tarojs/taro'],
    exclude: [],
    // 启用esbuild优化
    esbuildOptions: {
      target: 'es2015',
      define: {
        global: 'globalThis'
      },
      supported: {
        bigint: false
      }
    }
  }
})