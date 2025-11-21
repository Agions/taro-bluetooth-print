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
        }
      }
    },
    target: 'es2015',
    minify: 'terser'
  },
  plugins: [
    dts({
      insertTypesEntry: true,
      include: ['src/**/*'],
      outDir: 'dist/types'
    })
  ],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})