/**
 * 集成测试环境设置
 */

import { TextEncoder, TextDecoder } from 'util';

// 设置全局 polyfills
global.TextEncoder = TextEncoder as any;
global.TextDecoder = TextDecoder as any;

// 模拟浏览器 API
Object.defineProperty(window, 'requestAnimationFrame', {
  writable: true,
  value: jest.fn(cb => setTimeout(cb, 16))
});

Object.defineProperty(window, 'cancelAnimationFrame', {
  writable: true,
  value: jest.fn(id => clearTimeout(id))
});

// 模拟 IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// 模拟 ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn()
}));

// 模拟 WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3
}));

// 模拟 localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn()
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// 模拟 sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
    length: 0,
    key: jest.fn()
  };
})();

Object.defineProperty(window, 'sessionStorage', {
  value: sessionStorageMock
});

// 模拟 navigator 蓝牙 API
const mockBluetooth = {
  requestDevice: jest.fn().mockResolvedValue({
    id: 'test-device-id',
    name: 'Test Bluetooth Device',
    gatt: {
      connect: jest.fn().mockResolvedValue({
        getPrimaryService: jest.fn().mockResolvedValue({
          getCharacteristic: jest.fn().mockResolvedValue({
            startNotifications: jest.fn(),
            stopNotifications: jest.fn(),
            addEventListener: jest.fn(),
            removeEventListener: jest.fn(),
            readValue: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
            writeValue: jest.fn().mockResolvedValue(undefined)
          })
        })
      })
    }
  })
};

Object.defineProperty(navigator, 'bluetooth', {
  value: mockBluetooth,
  writable: true
});

// 模拟地理位置 API
const mockGeolocation = {
  getCurrentPosition: jest.fn().mockImplementation(success =>
    success({
      coords: {
        latitude: 0,
        longitude: 0,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    })
  ),
  watchPosition: jest.fn().mockImplementation((success, error, options) => {
    const position = {
      coords: {
        latitude: 0,
        longitude: 0,
        accuracy: 100,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now()
    };

    success(position);
    return 1; // Return watch ID
  }),
  clearWatch: jest.fn()
};

Object.defineProperty(navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

// 模拟媒体设备 API
const mockMediaDevices = {
  getUserMedia: jest.fn().mockResolvedValue({
    getTracks: jest.fn(() => [
      {
        stop: jest.fn(),
        getSettings: jest.fn(() => ({})),
        getCapabilities: jest.fn(() => ({}))
      }
    ])
  }),
  enumerateDevices: jest.fn().mockResolvedValue([]),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
};

Object.defineProperty(navigator, 'mediaDevices', {
  value: mockMediaDevices,
  writable: true
});

// 模拟屏幕 API
Object.defineProperty(window, 'screen', {
  value: {
    width: 1024,
    height: 768,
    availWidth: 1024,
    availHeight: 768,
    colorDepth: 24,
    pixelDepth: 24,
    orientation: {
      type: 'landscape-primary',
      angle: 0
    }
  },
  writable: true
});

// 模拟设备内存 API
Object.defineProperty(navigator, 'deviceMemory', {
  value: 8,
  writable: true
});

// 模拟连接类型 API
Object.defineProperty(navigator, 'connection', {
  value: {
    effectiveType: '4g',
    downlink: 10,
    rtt: 50,
    saveData: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn()
  },
  writable: true
});

// 模拟 URL 和 URLSearchParams
global.URL = class URL {
  constructor(public href: string) {
    const parser = document.createElement('a');
    parser.href = href;

    Object.defineProperties(this, {
      protocol: { value: parser.protocol },
      host: { value: parser.host },
      hostname: { value: parser.hostname },
      port: { value: parser.port },
      pathname: { value: parser.pathname },
      search: { value: parser.search },
      hash: { value: parser.hash },
      origin: { value: parser.origin }
    });
  }

  protocol: string;
  host: string;
  hostname: string;
  port: string;
  pathname: string;
  search: string;
  hash: string;
  origin: string;

  toString() {
    return this.href;
  }
};

global.URLSearchParams = class URLSearchParams {
  private params: Map<string, string> = new Map();

  constructor(init?: string | URLSearchParams | Record<string, string> | string[][] | undefined) {
    if (typeof init === 'string') {
      new URL(init).searchParams.forEach((value, key) => {
        this.params.set(key, value);
      });
    } else if (init instanceof URLSearchParams) {
      init.forEach((value, key) => {
        this.params.set(key, value);
      });
    } else if (init && typeof init === 'object') {
      Object.entries(init).forEach(([key, value]) => {
        this.params.set(key, value);
      });
    }
  }

  append(name: string, value: string): void {
    this.params.set(name, value);
  }

  delete(name: string): void {
    this.params.delete(name);
  }

  get(name: string): string | null {
    return this.params.get(name) || null;
  }

  getAll(name: string): string[] {
    const value = this.params.get(name);
    return value ? [value] : [];
  }

  has(name: string): boolean {
    return this.params.has(name);
  }

  set(name: string, value: string): void {
    this.params.set(name, value);
  }

  sort(): void {
    const sorted = Array.from(this.params.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    this.params = new Map(sorted);
  }

  forEach(callbackfn: (value: string, key: string, parent: URLSearchParams) => void, thisArg?: any): void {
    this.params.forEach((value, key) => {
      callbackfn.call(thisArg, value, key, this);
    });
  }

  toString(): string {
    const params = Array.from(this.params.entries())
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
    return params;
  }
};

// 模拟 fetch API
global.fetch = jest.fn().mockImplementation(async (url, options) => {
  return {
    ok: true,
    status: 200,
    statusText: 'OK',
    headers: new Map(),
    json: async () => ({}),
    text: async () => '',
    blob: async () => new Blob(),
    arrayBuffer: async () => new ArrayBuffer(0),
    formData: async () => new FormData(),
    clone: jest.fn()
  };
});

// 模拟 AbortController
global.AbortController = jest.fn().mockImplementation(() => ({
  signal: {
    aborted: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  },
  abort: jest.fn()
}));

// 模拟 AbortSignal
global.AbortSignal = {
  timeout: jest.fn(() => ({
    aborted: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn()
  }))
};

// 模拟 Performance API
Object.defineProperty(window, 'performance', {
  value: {
    now: jest.fn(() => Date.now()),
    mark: jest.fn(),
    measure: jest.fn(),
    getEntriesByName: jest.fn(() => []),
    getEntriesByType: jest.fn(() => []),
    clearMarks: jest.fn(),
    clearMeasures: jest.fn(),
    timing: {
      navigationStart: Date.now(),
      loadEventEnd: Date.now()
    },
    navigation: {
      type: 'navigate'
    }
  },
  writable: true
});

// 模拟 Canvas API
HTMLCanvasElement.prototype.getContext = jest.fn().mockReturnValue({
  fillRect: jest.fn(),
  clearRect: jest.fn(),
  getImageData: jest.fn(),
  putImageData: jest.fn(),
  createImageData: jest.fn(),
  setTransform: jest.fn(),
  drawImage: jest.fn(),
  save: jest.fn(),
  fillText: jest.fn(),
  restore: jest.fn(),
  beginPath: jest.fn(),
  moveTo: jest.fn(),
  lineTo: jest.fn(),
  closePath: jest.fn(),
  stroke: jest.fn(),
  translate: jest.fn(),
  scale: jest.fn(),
  rotate: jest.fn(),
  arc: jest.fn(),
  fill: jest.fn(),
  measureText: jest.fn(() => ({ width: 0 })),
  transform: jest.fn(),
  rect: jest.fn(),
  clip: jest.fn()
});

HTMLCanvasElement.prototype.toDataURL = jest.fn(() => 'data:image/png;base64,mock');

// 模拟 Image API
global.Image = jest.fn().mockImplementation(() => ({
  onload: null,
  onerror: null,
  src: '',
  width: 0,
  height: 0,
  complete: false,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn()
}));

// 模拟 File API
global.File = jest.fn().mockImplementation((bits, name, options) => ({
  name,
  size: bits.length,
  type: options?.type || '',
  lastModified: Date.now(),
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(bits.length)),
  text: jest.fn().mockResolvedValue(bits.join('')),
  stream: jest.fn(),
  slice: jest.fn(),
  webkitRelativePath: ''
}));

// 模拟 Blob API
global.Blob = jest.fn().mockImplementation((parts, options) => ({
  size: parts.reduce((total, part) => total + (typeof part === 'string' ? part.length : part.size), 0),
  type: options?.type || '',
  arrayBuffer: jest.fn().mockResolvedValue(new ArrayBuffer(0)),
  text: jest.fn().mockResolvedValue(''),
  stream: jest.fn(),
  slice: jest.fn()
}));

// 集成测试前清理
beforeEach(() => {
  // 清理 localStorage
  localStorageMock.clear();

  // 清理 sessionStorage
  sessionStorageMock.clear();

  // 重置所有模拟函数
  jest.clearAllMocks();
});

// 集成测试后清理
afterEach(() => {
  // 清理定时器
  jest.clearAllTimers();

  // 清理 DOM
  document.body.innerHTML = '';

  // 重置 window 对象上的属性
  delete (window as any).testData;
});