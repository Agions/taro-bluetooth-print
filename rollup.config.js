import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from 'rollup-plugin-typescript2'
import json from '@rollup/plugin-json'
import { terser } from 'rollup-plugin-terser'
import { visualizer } from 'rollup-plugin-visualizer'
import cleanup from 'rollup-plugin-cleanup'

const pkg = require('./package.json')

const libraryName = 'index'

export default {
  input: `src/${libraryName}.ts`,
  output: [
    { 
      file: pkg.main, 
      name: libraryName, 
      format: 'cjs', 
      sourcemap: true,
      exports: 'named',
    },
    { 
      file: pkg.module, 
      format: 'es', 
      sourcemap: true,
      exports: 'named',
    },
    {
      file: 'dist/index.min.js',
      format: 'umd',
      name: 'TaroBluetooth',
      plugins: [terser()],
      sourcemap: true,
      exports: 'named',
    }
  ],
  external: [],
  watch: {
    include: 'src/**',
  },
  plugins: [
    json(),
    typescript({ 
      useTsconfigDeclarationDir: true,
      clean: true
    }),
    commonjs(),
    resolve(),
    cleanup(),
    visualizer({
      filename: 'bundle-analysis.html',
      gzipSize: true,
    }),
  ],
}
