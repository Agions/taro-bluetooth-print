/**
 * Build tool compatibility utilities
 * Provides utilities for detecting build environment and ensuring compatibility
 */

export interface BuildEnvironment {
  isVite: boolean
  isWebpack: boolean
  isRollup: boolean
  isDevelopment: boolean
  isProduction: boolean
}

/**
 * Detect current build environment
 */
export function detectBuildEnvironment(): BuildEnvironment {
  // Check for Vite
  const isVite = typeof import.meta !== 'undefined' ||
                 process.env?.VITE !== undefined

  // Check for Webpack
  const isWebpack = process.env?.WEBPACK !== undefined

  // Check for Rollup (legacy, no longer used)
  const isRollup = process.env?.ROLLUP !== undefined

  const isDevelopment = process.env?.NODE_ENV === 'development'
  const isProduction = process.env?.NODE_ENV === 'production'

  return {
    isVite,
    isWebpack,
    isRollup,
    isDevelopment,
    isProduction
  }
}

/**
 * Get platform-specific build configuration
 */
export function getPlatformConfig() {
  const env = detectBuildEnvironment()

  return {
    // Module resolution strategy
    moduleResolution: env.isVite ? 'vite' : env.isWebpack ? 'webpack' : 'node',

    // Source map strategy
    sourceMaps: env.isDevelopment || env.isProduction,

    // Minification strategy
    minify: env.isProduction,

    // Tree shaking support
    treeShaking: env.isVite || env.isWebpack,

    // External dependencies handling
    externals: {
      '@tarojs/taro': 'Taro',
      '@tarojs/plugin-platform-weapp': 'WeappPlugin'
    }
  }
}

/**
 * Validate build compatibility
 */
export function validateBuildCompatibility(): boolean {
  const env = detectBuildEnvironment()

  // Ensure we're running in a supported build environment
  if (!env.isVite && !env.isWebpack) {
    console.warn('Warning: Running in unsupported build environment')
    return false
  }

  // Check for required globals
  if (typeof window === 'undefined' && typeof global === 'undefined') {
    console.warn('Warning: No global object available')
    return false
  }

  return true
}