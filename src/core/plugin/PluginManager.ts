import type { EventBus } from '../event/EventBus';
import type { Container } from '../di/Container';

export interface PluginContext {
  /** 事件总线 */
  eventBus: EventBus;
  /** DI容器 */
  container: Container;
  /** 配置 */
  config: Record<string, unknown>;
}

export interface Plugin {
  /** 插件名称 */
  name: string;
  /** 插件版本 */
  version: string;
  /** 插件依赖 */
  dependencies?: string[];
  /** 安装插件 */
  install(context: PluginContext): void | Promise<void>;
  /** 卸载插件 */
  uninstall?(context: PluginContext): void | Promise<void>;
}

export interface PluginRegistration {
  plugin: Plugin;
  config: Record<string, unknown>;
  installed: boolean;
}

export class PluginManager {
  private plugins = new Map<string, PluginRegistration>();
  private context: PluginContext;

  constructor(context: PluginContext) {
    this.context = context;
  }

  /**
   * 注册插件
   */
  register(plugin: Plugin, config: Record<string, unknown> = {}): void {
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin "${plugin.name}" is already registered`);
    }

    this.plugins.set(plugin.name, {
      plugin,
      config,
      installed: false,
    });
  }

  /**
   * 安装插件
   */
  async install(pluginName: string): Promise<void> {
    const registration = this.plugins.get(pluginName);
    if (!registration) {
      throw new Error(`Plugin "${pluginName}" not found`);
    }

    if (registration.installed) {
      return;
    }

    // 检查依赖
    if (registration.plugin.dependencies) {
      for (const dep of registration.plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin "${pluginName}" depends on "${dep}" which is not registered`);
        }
        await this.install(dep);
      }
    }

    // 安装插件
    const context: PluginContext = {
      ...this.context,
      config: { ...this.context.config, ...registration.config },
    };

    await registration.plugin.install(context);
    registration.installed = true;

    // 发布插件安装事件
    await this.context.eventBus.emit('plugin:installed', {
      name: pluginName,
      version: registration.plugin.version,
    });
  }

  /**
   * 卸载插件
   */
  async uninstall(pluginName: string): Promise<void> {
    const registration = this.plugins.get(pluginName);
    if (!registration || !registration.installed) {
      return;
    }

    // 检查是否有其他插件依赖此插件
    for (const [name, reg] of this.plugins) {
      if (reg.installed && reg.plugin.dependencies?.includes(pluginName)) {
        throw new Error(`Cannot uninstall "${pluginName}" because "${name}" depends on it`);
      }
    }

    if (registration.plugin.uninstall) {
      await registration.plugin.uninstall(this.context);
    }

    registration.installed = false;

    await this.context.eventBus.emit('plugin:uninstalled', { name: pluginName });
  }

  /**
   * 批量安装插件
   */
  async installAll(): Promise<void> {
    for (const [name] of this.plugins) {
      await this.install(name);
    }
  }

  /**
   * 获取插件
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name)?.plugin;
  }

  /**
   * 检查插件是否已安装
   */
  isInstalled(name: string): boolean {
    return this.plugins.get(name)?.installed ?? false;
  }

  /**
   * 获取所有已安装的插件
   */
  getInstalledPlugins(): Plugin[] {
    return Array.from(this.plugins.values())
      .filter(r => r.installed)
      .map(r => r.plugin);
  }

  /**
   * 获取所有已注册的插件
   */
  getRegisteredPlugins(): Plugin[] {
    return Array.from(this.plugins.values()).map(r => r.plugin);
  }
}
