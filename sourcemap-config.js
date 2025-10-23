/**
 * Source map generation strategies for different environments
 */

// Development source maps (detailed, separate files)
export const developmentSourceMaps = {
  // Inline source maps for fast development
  inline: {
    sourcemap: 'inline',
    sourcemapExcludeSources: false,
    sourcemapPathTransform: (relativePath, sourcemapPath) => {
      // Transform paths for development
      return relativePath.replace('src/', '../src/')
    }
  },

  // External source maps for debugging
  external: {
    sourcemap: true,
    sourcemapExcludeSources: false,
    sourcemapFile: 'dist/index.js.map'
  }
}

// Production source maps (optimized, minimal)
export const productionSourceMaps = {
  // Hidden source maps for production debugging
  hidden: {
    sourcemap: true,
    sourcemapExcludeSources: true,
    sourcemapPathTransform: (relativePath) => {
      // Remove sensitive paths
      return relativePath.replace(/^.*\/src\//, 'src/')
    }
  },

  // No source maps for maximum performance
  none: {
    sourcemap: false
  },

  // Eval source maps for fast builds
  eval: {
    sourcemap: 'eval',
    sourcemapExcludeSources: true
  }
}

// Environment-specific source map configuration
export const getSourceMapConfig = (environment = 'development', buildTool = 'rollup') => {
  const isDevelopment = environment === 'development'
  const isProduction = environment === 'production'

  if (buildTool === 'vite') {
    return {
      css: isDevelopment ? true : 'hidden',
      server: isDevelopment,
      build: {
        sourcemap: isDevelopment ? true : isProduction ? 'hidden' : false,
        rollupOptions: {
          output: {
            sourcemap: isDevelopment ? 'inline' : isProduction ? 'hidden' : false
          }
        }
      }
    }
  }

  if (buildTool === 'webpack') {
    return {
      devtool: isDevelopment
        ? 'eval-source-map'
        : isProduction
          ? 'hidden-source-map'
          : false,
      module: {
        rules: [
          {
            test: /\.ts$/,
            use: [
              {
                loader: 'ts-loader',
                options: {
                  compilerOptions: {
                    sourceMap: isDevelopment
                  }
                }
              }
            ]
          }
        ]
      }
    }
  }

  if (buildTool === 'rollup') {
    return isDevelopment
      ? developmentSourceMaps.external
      : productionSourceMaps.hidden
  }

  return productionSourceMaps.none
}

// Source map validation utility
export const validateSourceMaps = (buildPath: string) => {
  const fs = require('fs')
  const path = require('path')

  const jsFiles = fs.readdirSync(buildPath).filter(file => file.endsWith('.js'))
  const mapFiles = fs.readdirSync(buildPath).filter(file => file.endsWith('.js.map'))

  const report = {
    totalJsFiles: jsFiles.length,
    totalMapFiles: mapFiles.length,
    missingMaps: [] as string[],
    invalidMaps: [] as string[]
  }

  jsFiles.forEach(jsFile => {
    const mapFile = jsFile + '.map'
    if (!mapFiles.includes(mapFile)) {
      report.missingMaps.push(jsFile)
    } else {
      try {
        const mapPath = path.join(buildPath, mapFile)
        const mapContent = JSON.parse(fs.readFileSync(mapPath, 'utf8'))

        // Basic validation
        if (!mapContent.sources || !Array.isArray(mapContent.sources)) {
          report.invalidMaps.push(mapFile)
        }
      } catch (error) {
        report.invalidMaps.push(mapFile)
      }
    }
  })

  return report
}