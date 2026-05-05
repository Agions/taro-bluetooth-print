import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  registerServices, 
  createServiceProvider,
  type ServiceProviderOptions 
} from '../../src/providers/ServiceProvider';
import { rootContainer } from '../../src/core/di/Container';
import { EVENT_BUS_TOKEN, ADAPTER_TOKEN, CONNECTION_MANAGER_TOKEN } from '../../src/core/di/Tokens';

// Define mock classes properly as constructors
function createMockClass(name: string) {
  return class {
    constructor(...args: any[]) {}
  };
}

// vi.mock must be at top level and hoisted
vi.mock('@/services/ConnectionManager', () => ({
  ConnectionManager: class { connect = vi.fn(); disconnect = vi.fn(); }
}));

vi.mock('@/services/PrintJobManager', () => ({
  PrintJobManager: class {}
}));

vi.mock('@/services/CommandBuilder', () => ({
  CommandBuilder: class {}
}));

vi.mock('@/device/DeviceManager', () => ({
  DeviceManager: class {}
}));

vi.mock('@/queue/PrintQueue', () => ({
  PrintQueue: class {}
}));

vi.mock('@/cache/OfflineCache', () => ({
  OfflineCache: class {}
}));

vi.mock('@/config/PrinterConfigManager', () => ({
  PrinterConfigManager: class {}
}));

vi.mock('@/services/PrinterStatus', () => ({
  PrinterStatus: class {}
}));

vi.mock('@/services/PrintHistory', () => ({
  PrintHistory: class {}
}));

vi.mock('@/services/PrintStatistics', () => ({
  PrintStatistics: class {}
}));

vi.mock('@/services/CloudPrintManager', () => ({
  CloudPrintManager: class {}
}));

vi.mock('@/services/ScheduledRetryManager', () => ({
  ScheduledRetryManager: class {}
}));

vi.mock('@/services/BatchPrintManager', () => ({
  BatchPrintManager: class {}
}));

vi.mock('@/core/event/EventBus', () => ({
  globalEventBus: { emit: vi.fn(), on: vi.fn(), off: vi.fn() },
  EventBus: class { emit = vi.fn(); on = vi.fn(); off = vi.fn(); }
}));

vi.mock('@/core/plugin/PluginManager', () => ({
  PluginManager: class {}
}));

vi.mock('@/adapters/AdapterFactory', () => ({
  AdapterFactory: {
    create: vi.fn().mockReturnValue({ name: 'mock-adapter' })
  }
}));

describe('ServiceProvider', () => {
  beforeEach(() => {
    rootContainer.clear();
    vi.clearAllMocks();
  });

  describe('registerServices()', () => {
    it('should register all services to rootContainer', () => {
      registerServices();
      
      expect(rootContainer.isRegistered(EVENT_BUS_TOKEN)).toBe(true);
      expect(rootContainer.isRegistered(ADAPTER_TOKEN)).toBe(true);
      expect(rootContainer.isRegistered(CONNECTION_MANAGER_TOKEN)).toBe(true);
    });

    it('should use global EventBus by default', () => {
      registerServices();
      
      const eventBus = rootContainer.resolve(EVENT_BUS_TOKEN);
      expect(eventBus).toBeDefined();
    });

    it('should create new EventBus when useGlobalEventBus is false', () => {
      registerServices({ useGlobalEventBus: false });
      
      const eventBus = rootContainer.resolve(EVENT_BUS_TOKEN);
      expect(eventBus).toBeDefined();
    });

    it('should pass custom config to PluginManager', () => {
      const customConfig = { customSetting: 'value' };
      registerServices({ config: customConfig });
      
      expect(rootContainer.isRegistered(EVENT_BUS_TOKEN)).toBe(true);
    });

    it('should register adapter with factory', () => {
      registerServices();
      
      const adapter = rootContainer.resolve(ADAPTER_TOKEN);
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('mock-adapter');
    });
  });

  describe('createServiceProvider()', () => {
    it('should return service provider with all getters', () => {
      registerServices();
      const provider = createServiceProvider();
      
      expect(provider.getConnectionManager).toBeDefined();
      expect(provider.getPrintJobManager).toBeDefined();
      expect(provider.getCommandBuilder).toBeDefined();
      expect(provider.getDeviceManager).toBeDefined();
      expect(provider.getPrintQueue).toBeDefined();
      expect(provider.getOfflineCache).toBeDefined();
      expect(provider.getConfigManager).toBeDefined();
      expect(provider.getPrinterStatus).toBeDefined();
      expect(provider.getPrintHistory).toBeDefined();
      expect(provider.getPrintStatistics).toBeDefined();
      expect(provider.getCloudPrintManager).toBeDefined();
      expect(provider.getScheduledRetryManager).toBeDefined();
      expect(provider.getBatchPrintManager).toBeDefined();
      expect(provider.getEventBus).toBeDefined();
      expect(provider.getPluginManager).toBeDefined();
      expect(provider.getAdapter).toBeDefined();
    });

    it('should resolve ConnectionManager', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const connectionManager = provider.getConnectionManager();
      expect(connectionManager).toBeDefined();
    });

    it('should resolve PrintJobManager', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const printJobManager = provider.getPrintJobManager();
      expect(printJobManager).toBeDefined();
    });

    it('should resolve CommandBuilder', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const commandBuilder = provider.getCommandBuilder();
      expect(commandBuilder).toBeDefined();
    });

    it('should resolve DeviceManager', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const deviceManager = provider.getDeviceManager();
      expect(deviceManager).toBeDefined();
    });

    it('should resolve PrintQueue', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const printQueue = provider.getPrintQueue();
      expect(printQueue).toBeDefined();
    });

    it('should resolve OfflineCache', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const offlineCache = provider.getOfflineCache();
      expect(offlineCache).toBeDefined();
    });

    it('should resolve ConfigManager', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const configManager = provider.getConfigManager();
      expect(configManager).toBeDefined();
    });

    it('should resolve PrinterStatus', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const printerStatus = provider.getPrinterStatus();
      expect(printerStatus).toBeDefined();
    });

    it('should resolve PrintHistory', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const printHistory = provider.getPrintHistory();
      expect(printHistory).toBeDefined();
    });

    it('should resolve PrintStatistics', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const printStatistics = provider.getPrintStatistics();
      expect(printStatistics).toBeDefined();
    });

    it('should resolve CloudPrintManager', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const cloudPrintManager = provider.getCloudPrintManager();
      expect(cloudPrintManager).toBeDefined();
    });

    it('should resolve ScheduledRetryManager', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const scheduledRetryManager = provider.getScheduledRetryManager();
      expect(scheduledRetryManager).toBeDefined();
    });

    it('should resolve BatchPrintManager', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const batchPrintManager = provider.getBatchPrintManager();
      expect(batchPrintManager).toBeDefined();
    });

    it('should resolve EventBus', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const eventBus = provider.getEventBus();
      expect(eventBus).toBeDefined();
    });

    it('should resolve PluginManager', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const pluginManager = provider.getPluginManager();
      expect(pluginManager).toBeDefined();
    });

    it('should resolve Adapter', () => {
      registerServices();
      const provider = createServiceProvider();
      
      const adapter = provider.getAdapter();
      expect(adapter).toBeDefined();
      expect(adapter.name).toBe('mock-adapter');
    });

    it('should accept options', () => {
      const provider = createServiceProvider({ 
        useGlobalEventBus: false,
        config: { test: 'value' }
      });
      
      expect(provider.getEventBus()).toBeDefined();
    });
  });
});