import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PluginManager, type Plugin, type PluginContext } from '../../src/core/plugin/PluginManager';
import { EventBus } from '../../src/core/event/EventBus';
import { Container } from '../../src/core/di/Container';

describe('PluginManager', () => {
  let pluginManager: PluginManager;
  let eventBus: EventBus;
  let container: Container;
  let context: PluginContext;

  beforeEach(() => {
    eventBus = new EventBus();
    container = new Container();
    context = {
      eventBus,
      container,
      config: { debug: false }
    };
    pluginManager = new PluginManager(context);
  });

  const createPlugin = (name: string, version: string, options: {
    dependencies?: string[];
    installFn?: (ctx: PluginContext) => void | Promise<void>;
    uninstallFn?: (ctx: PluginContext) => void | Promise<void>;
  } = {}): Plugin => ({
    name,
    version,
    dependencies: options.dependencies,
    install: options.installFn || vi.fn(),
    uninstall: options.uninstallFn || vi.fn(),
  });

  describe('register()', () => {
    it('should register a plugin', () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      
      expect(pluginManager.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should register with config', () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      const config = { setting: 'value' };
      pluginManager.register(plugin, config);
      
      expect(pluginManager.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should throw when registering duplicate plugin', () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      
      expect(() => pluginManager.register(plugin)).toThrow('already registered');
    });

    it('should register multiple plugins', () => {
      const plugin1 = createPlugin('plugin1', '1.0.0');
      const plugin2 = createPlugin('plugin2', '2.0.0');
      
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      
      expect(pluginManager.getPlugin('plugin1')).toBe(plugin1);
      expect(pluginManager.getPlugin('plugin2')).toBe(plugin2);
    });
  });

  describe('install()', () => {
    it('should install a plugin', async () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      
      await pluginManager.install('test-plugin');
      
      expect(plugin.install).toHaveBeenCalledTimes(1);
      expect(pluginManager.isInstalled('test-plugin')).toBe(true);
    });

    it('should pass context to install', async () => {
      const contextReceived: PluginContext[] = [];
      const plugin = createPlugin('test-plugin', '1.0.0', {
        installFn: (ctx) => contextReceived.push(ctx)
      });
      pluginManager.register(plugin, { custom: 'config' });
      
      await pluginManager.install('test-plugin');
      
      expect(contextReceived).toHaveLength(1);
      expect(contextReceived[0].config.custom).toBe('config');
    });

    it('should throw when plugin not found', async () => {
      await expect(pluginManager.install('non-existent')).rejects.toThrow('not found');
    });

    it('should not install already installed plugin', async () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      
      await pluginManager.install('test-plugin');
      await pluginManager.install('test-plugin');
      
      expect(plugin.install).toHaveBeenCalledTimes(1);
    });

    it('should install dependencies first', async () => {
      const depPlugin = createPlugin('dep-plugin', '1.0.0');
      const mainPlugin = createPlugin('main-plugin', '1.0.0', {
        dependencies: ['dep-plugin']
      });
      
      pluginManager.register(depPlugin);
      pluginManager.register(mainPlugin);
      
      await pluginManager.install('main-plugin');
      
      expect(depPlugin.install).toHaveBeenCalledTimes(1);
      expect(mainPlugin.install).toHaveBeenCalledTimes(1);
      expect(depPlugin.install).toHaveBeenCalledBefore(mainPlugin.install);
    });

    it('should throw when dependency not registered', async () => {
      const plugin = createPlugin('main-plugin', '1.0.0', {
        dependencies: ['missing-dep']
      });
      pluginManager.register(plugin);
      
      await expect(pluginManager.install('main-plugin')).rejects.toThrow('not registered');
    });

    it('should emit plugin:installed event', async () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      
      const events: any[] = [];
      eventBus.on('plugin:installed', (payload) => events.push(payload));
      
      await pluginManager.install('test-plugin');
      
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('test-plugin');
      expect(events[0].version).toBe('1.0.0');
    });
  });

  describe('uninstall()', () => {
    it('should uninstall an installed plugin', async () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      await pluginManager.install('test-plugin');
      
      await pluginManager.uninstall('test-plugin');
      
      expect(plugin.uninstall).toHaveBeenCalledTimes(1);
      expect(pluginManager.isInstalled('test-plugin')).toBe(false);
    });

    it('should not uninstall uninstalled plugin', async () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      
      await pluginManager.uninstall('test-plugin');
      
      expect(plugin.uninstall).not.toHaveBeenCalled();
    });

    it('should throw when another plugin depends on it', async () => {
      const depPlugin = createPlugin('dep-plugin', '1.0.0');
      const mainPlugin = createPlugin('main-plugin', '1.0.0', {
        dependencies: ['dep-plugin']
      });
      
      pluginManager.register(depPlugin);
      pluginManager.register(mainPlugin);
      await pluginManager.install('main-plugin');
      
      await expect(pluginManager.uninstall('dep-plugin')).rejects.toThrow('depends on it');
    });

    it('should emit plugin:uninstalled event', async () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      await pluginManager.install('test-plugin');
      
      const events: any[] = [];
      eventBus.on('plugin:uninstalled', (payload) => events.push(payload));
      
      await pluginManager.uninstall('test-plugin');
      
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('test-plugin');
    });
  });

  describe('installAll()', () => {
    it('should install all registered plugins', async () => {
      const plugin1 = createPlugin('plugin1', '1.0.0');
      const plugin2 = createPlugin('plugin2', '2.0.0');
      
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      
      await pluginManager.installAll();
      
      expect(plugin1.install).toHaveBeenCalledTimes(1);
      expect(plugin2.install).toHaveBeenCalledTimes(1);
      expect(pluginManager.isInstalled('plugin1')).toBe(true);
      expect(pluginManager.isInstalled('plugin2')).toBe(true);
    });

    it('should install dependencies before dependents', async () => {
      const depPlugin = createPlugin('dep', '1.0.0');
      const mainPlugin = createPlugin('main', '1.0.0', {
        dependencies: ['dep']
      });
      
      pluginManager.register(depPlugin);
      pluginManager.register(mainPlugin);
      
      await pluginManager.installAll();
      
      expect(depPlugin.install).toHaveBeenCalledBefore(mainPlugin.install);
    });
  });

  describe('getPlugin()', () => {
    it('should return plugin by name', () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      
      expect(pluginManager.getPlugin('test-plugin')).toBe(plugin);
    });

    it('should return undefined for non-existent plugin', () => {
      expect(pluginManager.getPlugin('non-existent')).toBeUndefined();
    });
  });

  describe('isInstalled()', () => {
    it('should return true for installed plugin', async () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      await pluginManager.install('test-plugin');
      
      expect(pluginManager.isInstalled('test-plugin')).toBe(true);
    });

    it('should return false for uninstalled plugin', () => {
      const plugin = createPlugin('test-plugin', '1.0.0');
      pluginManager.register(plugin);
      
      expect(pluginManager.isInstalled('test-plugin')).toBe(false);
    });

    it('should return false for non-existent plugin', () => {
      expect(pluginManager.isInstalled('non-existent')).toBe(false);
    });
  });

  describe('getInstalledPlugins()', () => {
    it('should return only installed plugins', async () => {
      const plugin1 = createPlugin('plugin1', '1.0.0');
      const plugin2 = createPlugin('plugin2', '2.0.0');
      
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      await pluginManager.install('plugin1');
      
      const installed = pluginManager.getInstalledPlugins();
      
      expect(installed).toHaveLength(1);
      expect(installed[0]).toBe(plugin1);
    });

    it('should return empty array when no plugins installed', () => {
      expect(pluginManager.getInstalledPlugins()).toEqual([]);
    });
  });

  describe('getRegisteredPlugins()', () => {
    it('should return all registered plugins', () => {
      const plugin1 = createPlugin('plugin1', '1.0.0');
      const plugin2 = createPlugin('plugin2', '2.0.0');
      
      pluginManager.register(plugin1);
      pluginManager.register(plugin2);
      
      const registered = pluginManager.getRegisteredPlugins();
      
      expect(registered).toHaveLength(2);
    });

    it('should return empty array when no plugins registered', () => {
      expect(pluginManager.getRegisteredPlugins()).toEqual([]);
    });
  });
});