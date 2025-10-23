/**
 * Tree-shaking optimization helpers
 * These utilities help ensure dead code elimination works properly
 */

// Use pure functions for better tree-shaking
export const createPureFunction = <T extends (...args: any[]) => any>(fn: T): T => {
  return fn
}

// Export constants as readonly to enable better optimization
export const PURE_CONSTANTS = Object.freeze({
  BLUETOOTH_TIMEOUT: 30000,
  PRINTER_BUFFER_SIZE: 1024,
  MAX_RETRY_ATTEMPTS: 3,
  DEFAULT_ENCODING: 'utf-8'
} as const)

// Helper for conditional exports that can be tree-shaken
export const conditionalExport = <T>(condition: boolean, value: T): T | undefined =>
  condition ? value : undefined

// Create namespace objects that can be tree-shaken
export const createNamespace = <T extends Record<string, any>>(obj: T): T =>
  Object.freeze(obj)

// Export individual functions for better tree-shaking granularity
export const bluetoothHelpers = createNamespace({
  formatDeviceId: (id: string): string => id.trim().toLowerCase(),
  isValidDeviceId: (id: string): boolean => /^[a-f0-9-]+$/i.test(id),
  parseBluetoothError: (error: any): string => error?.message || 'Unknown Bluetooth error'
} as const)

export const printerHelpers = createNamespace({
  validatePrintData: (data: string): boolean => typeof data === 'string' && data.length > 0,
  escapePrintData: (data: string): string => data.replace(/[\x00-\x1F\x7F]/g, ''),
  calculatePrintTime: (dataLength: number): number => Math.ceil(dataLength / 100) * 1000
} as const)

// Export utilities for platform-specific code
export const platformUtils = {
  isWeapp: (): boolean => typeof (globalThis as any).wx !== 'undefined',
  isH5: (): boolean => typeof window !== 'undefined',
  isNode: (): boolean => typeof process !== 'undefined' && Boolean(process.versions?.node),
  isHarmony: (): boolean => typeof (globalThis as any).harmony !== 'undefined'
} as const

// Lazy initialization helper
export const lazy = <T>(factory: () => T): (() => T) => {
  let value: T | undefined
  return () => {
    if (value === undefined) {
      value = factory()
    }
    return value
  }
}

// Side-effect free event emitter
export const createEventEmitter = () => {
  const listeners = new Map<string, Set<Function>>()

  return {
    on: (event: string, fn: Function) => {
      if (!listeners.has(event)) {
        listeners.set(event, new Set())
      }
      listeners.get(event)!.add(fn)
    },
    off: (event: string, fn: Function) => {
      listeners.get(event)?.delete(fn)
    },
    emit: (event: string, ...args: any[]) => {
      listeners.get(event)?.forEach(fn => fn(...args))
    }
  }
}