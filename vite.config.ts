import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production'
  const isDevelopment = mode === 'development'

  return {
    mode,
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'TaroBluePrint',
        formats: ['es', 'cjs', 'umd'],
        fileName: (format) => {
          switch (format) {
            case 'es':
              return 'index.js'
            case 'cjs':
              return 'index.cjs'
            case 'umd':
              return 'index.umd.js'
            default:
              return `index.${format}.js`
          }
        }
      },
      rollupOptions: {
        external: [
          ...Object.keys(pkg.dependencies || {}),
          ...Object.keys(pkg.peerDependencies || {}),
          '@tarojs/taro'
        ],
        output: {
          globals: {
            '@tarojs/taro': 'Taro'
          },
          // Preserve module structure for tree-shaking
          preserveModules: false,
          // Chunk strategy for better caching
          manualChunks: undefined
        }
      },
      sourcemap: isDevelopment ? true : isProduction ? 'hidden' : false,
      minify: isProduction ? 'terser' : false,
      terserOptions: {
        format: {
          comments: false
        },
        compress: {
          drop_console: false,
          drop_debugger: true,
          pure_funcs: ['console.log']
        },
        mangle: {
          reserved: ['TaroBluePrint', 'BluetoothManager', 'PrinterManager']
        }
      },
      // Target environments
      target: ['es2015', 'node14'],
      // Optimize for modern browsers
      cssCodeSplit: true,
      // Report compressed size
      reportCompressedSize: true,
      // Generate chunk size report
      chunkSizeWarningLimit: 1000
    },

    // Plugin configurations
    plugins: [
      // Generate type declarations
      dts({
        insertTypesEntry: true,
        include: ['src/**/*'],
        exclude: ['src/**/*.test.*', 'src/**/*.spec.*'],
        rollupTypes: true,
        copyDtsFiles: true,
        outDir: 'dist'
      })
    ],

    // Resolve configuration
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src')
      },
      extensions: ['.ts', '.js', '.json', '.mjs']
    },

    // Development server (for library testing)
    server: isDevelopment ? {
      port: 3000,
      open: false,
      cors: true
    } : undefined,

    // Preview server (for testing production build)
    preview: {
      port: 4173,
      open: false
    },

    // Optimizations
    optimizeDeps: {
      include: [],
      exclude: ['@tarojs/taro']
    },

    // Environment variables
    define: {
      __DEV__: isDevelopment,
      __PROD__: isProduction,
      __VERSION__: JSON.stringify(pkg.version),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString())
    },

    // CSS processing
    css: {
      devSourcemap: isDevelopment,
      preprocessorOptions: {
        scss: {
          additionalData: `@import "@/styles/variables.scss";`
        }
      }
    }
  }
})