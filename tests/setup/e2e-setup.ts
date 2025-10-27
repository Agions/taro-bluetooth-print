/**
 * E2E 测试环境设置
 */

// 导入集成测试设置的基础配置
import './integration-setup';

// E2E测试特定配置

// 模拟真实的浏览器环境
Object.defineProperty(window, 'outerWidth', {
  writable: true,
  value: 1024
});

Object.defineProperty(window, 'outerHeight', {
  writable: true,
  value: 768
});

Object.defineProperty(window, 'innerWidth', {
  writable: true,
  value: 1024
});

Object.defineProperty(window, 'innerHeight', {
  writable: true,
  value: 768
});

// 模拟滚动行为
Element.prototype.scrollIntoView = jest.fn();
Element.prototype.scroll = jest.fn();
Element.prototype.scrollTo = jest.fn();

// 模拟滚动位置属性
Object.defineProperty(window, 'scrollX', {
  writable: true,
  value: 0
});

Object.defineProperty(window, 'scrollY', {
  writable: true,
  value: 0
});

Object.defineProperty(window, 'pageXOffset', {
  writable: true,
  value: 0
});

Object.defineProperty(window, 'pageYOffset', {
  writable: true,
  value: 0
});

// 模拟文档尺寸
Object.defineProperty(document.documentElement, 'scrollWidth', {
  writable: true,
  value: 1024
});

Object.defineProperty(document.documentElement, 'scrollHeight', {
  writable: true,
  value: 768
});

// 模拟焦点管理
HTMLElement.prototype.focus = jest.fn();
HTMLElement.prototype.blur = jest.fn();

Object.defineProperty(document, 'activeElement', {
  writable: true,
  value: document.body
});

// 模拟选择管理
Object.defineProperty(window, 'getSelection', {
  writable: true,
  value: jest.fn(() => ({
    addRange: jest.fn(),
    removeAllRanges: jest.fn(),
    getRangeAt: jest.fn(() => ({
      startContainer: document.body,
      endContainer: document.body,
      startOffset: 0,
      endOffset: 0,
      collapsed: true,
      commonAncestorContainer: document.body,
      deleteContents: jest.fn(),
      extractContents: jest.fn(),
      cloneContents: jest.fn(),
      insertNode: jest.fn(),
      surroundContents: jest.fn(),
      cloneRange: jest.fn(),
      detach: jest.fn(),
      selectNode: jest.fn(),
      selectNodeContents: jest.fn(),
      collapse: jest.fn(),
      collapseToEnd: jest.fn(),
      collapseToStart: jest.fn(),
      setStart: jest.fn(),
      setStartAfter: jest.fn(),
      setStartBefore: jest.fn(),
      setEnd: jest.fn(),
      setEndAfter: jest.fn(),
      setEndBefore: jest.fn(),
      compareBoundaryPoints: jest.fn(() => 0),
      deleteContents: jest.fn(),
      extractContents: jest.fn(),
      cloneContents: jest.fn(),
      insertNode: jest.fn(),
      surroundContents: jest.fn(),
      cloneRange: jest.fn(),
      toString: jest.fn(() => '')
    })),
    removeRange: jest.fn(),
    empty: jest.fn(),
    toString: jest.fn(() => ''),
    collapse: jest.fn(),
    extend: jest.fn(),
    collapseToStart: jest.fn(),
    collapseToEnd: jest.fn(),
    selectAllChildren: jest.fn(),
    addRange: jest.fn(),
    removeAllRanges: jest.fn(),
    removeRange: jest.fn(),
    getRangeAt: jest.fn(),
    containsNode: jest.fn(),
    toString: jest.fn(() => '')
  }))
});

// 模拟剪贴板 API
Object.defineProperty(navigator, 'clipboard', {
  writable: true,
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    readText: jest.fn().mockResolvedValue(''),
    write: jest.fn().mockResolvedValue(undefined),
    read: jest.fn().mockResolvedValue([])
  }
});

// 模拟全屏 API
Object.defineProperty(document, 'fullscreenEnabled', {
  writable: true,
  value: true
});

Element.prototype.requestFullscreen = jest.fn().mockResolvedValue(undefined);
document.exitFullscreen = jest.fn().mockResolvedValue(undefined);

Object.defineProperty(document, 'fullscreenElement', {
  writable: true,
  value: null
});

// 模拟 Pointer Events API
Element.prototype.setPointerCapture = jest.fn();
Element.prototype.releasePointerCapture = jest.fn();
Element.prototype.hasPointerCapture = jest.fn().mockReturnValue(false);

// 模拟 Drag and Drop API
DataTransfer.prototype.setData = jest.fn();
DataTransfer.prototype.getData = jest.fn().mockReturnValue('');
DataTransfer.prototype.clearData = jest.fn();
DataTransfer.prototype.setDragImage = jest.fn();

DataTransferItemList.prototype.add = jest.fn();
DataTransferItemList.prototype.remove = jest.fn();
DataTransferItemList.prototype.clear = jest.fn();

// 模拟 Notification API
global.Notification = jest.fn().mockImplementation((title, options) => ({
  title,
  body: options?.body || '',
  icon: options?.icon || '',
  tag: options?.tag || '',
  data: options?.data || null,
  requireInteraction: options?.requireInteraction || false,
  silent: options?.silent || false,
  close: jest.fn(),
  onclick: null,
  onshow: null,
  onerror: null,
  onclose: null
}));

Object.defineProperty(Notification, 'permission', {
  writable: true,
  value: 'granted'
});

Object.defineProperty(Notification, 'requestPermission', {
  writable: true,
  value: jest.fn().mockResolvedValue('granted')
});

// 模拟 Service Worker API
global.ServiceWorkerRegistration = jest.fn().mockImplementation(() => ({
  scope: '',
  active: null,
  installing: null,
  waiting: null,
  navigationPreload: {
    enable: jest.fn(),
    disable: jest.fn(),
    getState: jest.fn()
  },
  pushManager: {
    subscribe: jest.fn().mockResolvedValue({
      endpoint: '',
      keys: {}
    }),
    getSubscription: jest.fn().mockResolvedValue(null),
    permissionState: jest.fn().mockResolvedValue('granted')
  },
  sync: {
    register: jest.fn().mockResolvedValue(undefined),
    getTags: jest.fn().mockResolvedValue([])
  },
  periodicSync: {
    register: jest.fn().mockResolvedValue(undefined),
  unregister: jest.fn().mockResolvedValue(undefined),
  getTags: jest.fn().mockResolvedValue([])
  },
  update: jest.fn().mockResolvedValue(undefined),
  unregister: jest.fn().mockResolvedValue(true)
}));

global.ServiceWorkerContainer = jest.fn().mockImplementation(() => ({
  controller: null,
  ready: Promise.resolve(null),
  register: jest.fn().mockResolvedValue({
    installing: null,
    waiting: null,
    active: null,
    navigationPreload: {
      enable: jest.fn(),
      disable: jest.fn(),
      getState: jest.fn()
    },
    pushManager: {
      subscribe: jest.fn().mockResolvedValue({
        endpoint: '',
        keys: {}
      }),
      getSubscription: jest.fn().mockResolvedValue(null),
      permissionState: jest.fn().mockResolvedValue('granted')
    },
    sync: {
      register: jest.fn().mockResolvedValue(undefined),
      getTags: jest.fn().mockResolvedValue([])
    },
    update: jest.fn().mockResolvedValue(undefined),
    unregister: jest.fn().mockResolvedValue(true)
  }),
  getRegistration: jest.fn().mockResolvedValue(null),
  getRegistrations: jest.fn().mockResolvedValue([]),
  startMessages: jest.fn()
}));

Object.defineProperty(navigator, 'serviceWorker', {
  writable: true,
  value: new global.ServiceWorkerContainer()
});

// 模拟 Web Share API
Object.defineProperty(navigator, 'share', {
  writable: true,
  value: jest.fn().mockResolvedValue(undefined)
});

// 模拟 Web Payments API
Object.defineProperty(window, 'PaymentRequest', {
  writable: true,
  value: jest.fn().mockImplementation((methodData, details) => ({
    methodData,
    details,
    id: 'mock-payment-request',
    show: jest.fn().mockResolvedValue({
      requestId: 'mock-payment-response',
      methodName: 'mock-method',
      details: {},
      payerName: '',
      payerEmail: '',
      payerPhone: '',
      complete: jest.fn().mockResolvedValue(undefined),
      toJSON: jest.fn(() => ({}))
    }),
    abort: jest.fn().mockResolvedValue(undefined),
    canMakePayment: jest.fn().mockResolvedValue(true),
    onmerchantvalidation: null,
    onshippingaddresschange: null,
    onshippingoptionchange: null,
    onpaymentmethodchange: null
  }))
});

// 模拟 Gamepad API
Object.defineProperty(navigator, 'getGamepads', {
  writable: true,
  value: jest.fn(() => [
    null,
    null,
    null,
    null
  ])
});

// 模拟 VR API
Object.defineProperty(navigator, 'activeVRDisplays', {
  writable: true,
  value: []
});

Object.defineProperty(navigator, 'getVRDisplays', {
  writable: true,
  value: jest.fn().mockResolvedValue([])
});

// 模拟 Web Audio API
global.AudioContext = jest.fn().mockImplementation(() => ({
  decodeAudioData: jest.fn().mockResolvedValue({
    sampleRate: 44100,
    length: 0,
    duration: 0,
    numberOfChannels: 2,
    channelData: []
  }),
  createBuffer: jest.fn().mockReturnValue({
    sampleRate: 44100,
    length: 0,
    duration: 0,
    numberOfChannels: 2,
    channelData: [],
    getChannelData: jest.fn().mockReturnValue(new Float32Array(0)),
    copyFromChannel: jest.fn(),
    copyToChannel: jest.fn()
  }),
  createBufferSource: jest.fn().mockReturnValue({
    buffer: null,
    loop: false,
    loopStart: 0,
    loopEnd: 0,
    playbackRate: { value: 1 },
    detune: { value: 0 },
    onended: null,
    start: jest.fn(),
    stop: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  createGain: jest.fn().mockReturnValue({
    gain: { value: 1 },
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  createOscillator: jest.fn().mockReturnValue({
    type: 'sine',
    frequency: { value: 440 },
    detune: { value: 0 },
    onended: null,
    start: jest.fn(),
    stop: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  createAnalyser: jest.fn().mockReturnValue({
    fftSize: 2048,
    frequencyBinCount: 1024,
    minDecibels: -100,
    maxDecibels: -30,
    smoothingTimeConstant: 0.8,
    getFloatFrequencyData: jest.fn(),
    getByteFrequencyData: jest.fn(),
    getFloatTimeDomainData: jest.fn(),
    getByteTimeDomainData: jest.fn(),
    connect: jest.fn(),
    disconnect: jest.fn()
  }),
  destination: {},
  sampleRate: 44100,
  state: 'running',
  currentTime: 0,
  resume: jest.fn().mockResolvedValue(undefined),
  suspend: jest.fn().mockResolvedValue(undefined),
  close: jest.fn().mockResolvedValue(undefined),
  onstatechange: null
}));

// E2E测试前的全局设置
beforeAll(async () => {
  // 设置页面标题
  document.title = 'Taro Bluetooth Print - E2E Tests';

  // 设置视口元标签
  const viewport = document.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1.0';
  document.head.appendChild(viewport);

  // 设置字符编码
  const charset = document.createElement('meta');
  charset.charset = 'utf-8';
  document.head.appendChild(charset);
});

// E2E测试前的设置
beforeEach(() => {
  // 重置页面尺寸
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    value: 1024
  });

  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    value: 768
  });

  // 重置滚动位置
  window.scrollTo(0, 0);

  // 清理焦点
  if (document.activeElement && document.activeElement !== document.body) {
    (document.activeElement as HTMLElement).blur();
  }

  // 清理选择
  const selection = window.getSelection();
  if (selection) {
    selection.removeAllRanges();
  }
});

// E2E测试后的清理
afterEach(() => {
  // 等待所有微任务完成
  return new Promise(resolve => {
    setTimeout(resolve, 0);
  });
});

// E2E测试完成后的清理
afterAll(() => {
  // 清理事件监听器
  window.removeAllListeners?.();

  // 重置 DOM
  document.head.innerHTML = '';
  document.body.innerHTML = '';
});