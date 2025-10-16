/**
 * Build tool compatibility patterns for Vite and Webpack
 */

// Module detection utilities
export const moduleDetection = {
  isESM: (): boolean => {
    try {
      return typeof document === 'undefined' &&
             typeof process === 'undefined' &&
             import.meta.url !== undefined
    } catch {
      return false
    }
  },

  isCJS: (): boolean => {
    try {
      return typeof require === 'function' &&
             typeof module !== 'undefined' &&
             module.exports !== undefined
    } catch {
      return false
    }
  },

  isUMD: (): boolean => {
    try {
      return typeof window !== 'undefined' &&
             typeof window !== 'undefined' &&
             !(window as any).importScripts
    } catch {
      return false
    }
  }
}

// Build tool detection
export const buildToolDetection = {
  isVite: (): boolean => {
    return !!(import.meta?.hot || import.meta?.env)
  },

  isWebpack: (): boolean => {
    return !!(typeof __webpack_require__ !== 'undefined' ||
             typeof __webpack_hash__ !== 'undefined')
  },

  isRollup: (): boolean => {
    return !!(typeof __ROLLUP__ !== 'undefined')
  }
}

// Dynamic import helpers for compatibility
export const dynamicImport = {
  // For ESM environments
  esm: async (modulePath: string) => {
    return import(modulePath)
  },

  // For CJS environments
  cjs: async (modulePath: string) => {
    return Promise.resolve(require(modulePath))
  },

  // Universal dynamic import
  universal: async (modulePath: string) => {
    try {
      // Try ESM first
      return await import(modulePath)
    } catch {
      // Fallback to CJS
      try {
        return Promise.resolve(require(modulePath))
      } catch (error) {
        throw new Error(`Failed to import module: ${modulePath}`)
      }
    }
  }
}

// Environment-specific exports
export const createUniversalExport = <T>(
  esmValue: T,
  cjsValue: T = esmValue,
  umdValue: T = esmValue
): T => {
  const isESM = moduleDetection.isESM()
  const isCJS = moduleDetection.isCJS()
  const isUMD = moduleDetection.isUMD()

  if (isESM) return esmValue
  if (isCJS) return cjsValue
  if (isUMD) return umdValue

  return esmValue // Default to ESM
}

// Asset loading compatibility
export const assetLoading = {
  // Vite-style asset loading
  vite: {
    loadImage: (path: string) => {
      return new URL(path, import.meta.url).href
    },

    loadJSON: async (path: string) => {
      const response = await fetch(path)
      return response.json()
    }
  },

  // Webpack-style asset loading
  webpack: {
    loadImage: (path: string) => {
      // Webpack will handle this at build time
      return path
    },

    loadJSON: async (path: string) => {
      return Promise.resolve(require(path))
    }
  },

  // Universal asset loading
  universal: {
    loadImage: (path: string) => {
      if (buildToolDetection.isVite()) {
        return assetLoading.vite.loadImage(path)
      }
      return assetLoading.webpack.loadImage(path)
    },

    loadJSON: async (path: string) => {
      try {
        if (buildToolDetection.isVite()) {
          return await assetLoading.vite.loadJSON(path)
        }
        return await assetLoading.webpack.loadJSON(path)
      } catch {
        // Fallback: try both methods
        try {
          return await import(path)
        } catch {
          return Promise.resolve(require(path))
        }
      }
    }
  }
}

// HMR (Hot Module Replacement) compatibility
export const hmrCompatibility = {
  accept: (callback: () => void) => {
    if (buildToolDetection.isVite() && import.meta.hot) {
      import.meta.hot.accept(callback)
    } else if (buildToolDetection.isWebpack() && (module as any).hot) {
      ;(module as any).hot.accept(callback)
    }
  },

  dispose: (callback: () => void) => {
    if (buildToolDetection.isVite() && import.meta.hot) {
      import.meta.hot.dispose(callback)
    } else if (buildToolDetection.isWebpack() && (module as any).hot) {
      ;(module as any).hot.dispose(callback)
    }
  },

  isHot: (): boolean => {
    return !!(import.meta?.hot || (module as any)?.hot)
  }
}

// Development server detection
export const devServerDetection = {
  isDevelopment: (): boolean => {
    if (buildToolDetection.isVite()) {
      return import.meta.env?.DEV === true
    }
    if (buildToolDetection.isWebpack()) {
      return process.env?.NODE_ENV === 'development'
    }
    return false
  },

  getBaseUrl: (): string => {
    if (buildToolDetection.isVite()) {
      return import.meta.env?.BASE_URL || '/'
    }
    if (buildToolDetection.isWebpack()) {
      return (window as any).__webpack_public_path__ || '/'
    }
    return '/'
  }
}

// Bundle analysis helpers
export const bundleAnalysis = {
  // Get bundle size information
  getBundleInfo: () => {
    if (buildToolDetection.isVite()) {
      return {
        tool: 'vite',
        version: import.meta.env?.VITE_APP_VERSION || 'unknown'
      }
    }
    if (buildToolDetection.isWebpack()) {
      return {
        tool: 'webpack',
        version: (typeof __webpack_require__ !== 'undefined' &&
                (__webpack_require__ as any).c) ? '5.x' : '4.x'
      }
    }
    return { tool: 'unknown', version: 'unknown' }
  },

  // Log development warnings
  logDevWarning: (message: string) => {
    if (devServerDetection.isDevelopment()) {
      console.warn(`[${bundleAnalysis.getBundleInfo().tool}] ${message}`)
    }
  }
}

// Export all utilities as a namespace
export const compatibility = Object.freeze({
  module: moduleDetection,
  buildTool: buildToolDetection,
  dynamicImport,
  createUniversalExport,
  assets: assetLoading,
  hmr: hmrCompatibility,
  devServer: devServerDetection,
  bundle: bundleAnalysis
} as const)