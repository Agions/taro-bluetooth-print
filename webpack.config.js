const path = require('path')
const { createRequire } = require('module')
const TerserPlugin = require('terser-webpack-plugin')
const { CleanWebpackPlugin } = require('clean-webpack-plugin')
const { DtsPlugin } = require('webpack-dts-bundle')

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

const isProduction = process.env.NODE_ENV === 'production'
const isDevelopment = !isProduction

module.exports = {
  mode: isProduction ? 'production' : 'development',
  devtool: isDevelopment ? 'eval-source-map' : 'hidden-source-map',

  // Entry points for different formats
  entry: {
    index: './src/index.ts',
    // Sub-entries for better tree-shaking
    bluetooth: './src/bluetooth/index.ts',
    printer: './src/printer/index.ts',
    components: './src/components/index.ts',
    utils: './src/utils/index.ts',
    types: './src/types/index.ts'
  },

  // Output configuration
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: (chunkData) => {
      const name = chunkData.chunk.name
      if (name === 'index') {
        return '[name].js'
      }
      return `[name]/index.js`
    },
    library: {
      name: 'TaroBluePrint',
      type: 'umd', // Default to UMD
      umdNamedDefine: true
    },
    globalObject: 'this',
    clean: true,
    sourceMapFilename: '[file].map',
    publicPath: '/'
  },

  // Module configuration
  module: {
    rules: [
      // TypeScript compilation
      {
        test: /\.ts$/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.build.json',
              transpileOnly: isDevelopment,
              compilerOptions: {
                sourceMap: isDevelopment,
                inlineSourceMap: false,
                sourceRoot: path.resolve(__dirname, 'src')
              }
            }
          }
        ],
        exclude: /node_modules/
      },

      // JSON files
      {
        test: /\.json$/,
        type: 'json'
      },

      // Source files (for source maps)
      {
        test: /\.(js|ts)$/,
        enforce: 'pre',
        use: ['source-map-loader'],
        exclude: /node_modules/
      }
    ]
  },

  // Resolve configuration
  resolve: {
    extensions: ['.ts', '.js', '.json', '.mjs'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    fallback: {
      // Polyfills if needed
      'crypto': false,
      'stream': false,
      'buffer': false
    }
  },

  // External dependencies
  externals: [
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.peerDependencies || {}),
    '@tarojs/taro'
  ],

  // Optimization
  optimization: {
    minimize: isProduction,
    minimizer: [
      new TerserPlugin({
        extractComments: false,
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
        sourceMap: isDevelopment
      })
    ],

    // Split chunks for better caching
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    },

    // Module IDs for caching
    moduleIds: isProduction ? 'deterministic' : 'named',
    chunkIds: isProduction ? 'deterministic' : 'named'
  },

  // Plugins
  plugins: [
    // Clean output directory
    new CleanWebpackPlugin(),

    // Generate type declarations
    ...(isProduction ? [
      new DtsPlugin({
        name: pkg.name,
        output: path.resolve(__dirname, 'dist/index.d.ts'),
        outDir: 'dist/types'
      })
    ] : [])
  ],

  // Performance hints
  performance: {
    hints: isProduction ? 'warning' : false,
    maxEntrypointSize: 512000,
    maxAssetSize: 512000
  },

  // Watch configuration for development
  watchOptions: isDevelopment ? {
    ignored: /node_modules/,
    poll: 1000,
    aggregateTimeout: 300
  } : undefined,

  // Statistics
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: false,
    chunkModules: false
  },

  // Target configuration
  target: ['web', 'es5'],

  // Node configuration
  node: {
    global: false,
    __filename: false,
    __dirname: false
  },

  // Define global constants
  define: {
    __DEV__: JSON.stringify(isDevelopment),
    __PROD__: JSON.stringify(isProduction),
    __VERSION__: JSON.stringify(pkg.version),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString())
  }
}