/**
 * DI 版本的 BluetoothPrinter 工厂
 *
 * 使用依赖注入容器创建打印机实例
 */

import { BluetoothPrinter } from '@/core/BluetoothPrinter';
import { createServiceProvider } from '@/providers';
import type { ServiceProviderOptions } from '@/providers';
import type { IConnectionManager, IPrintJobManager, ICommandBuilder } from '@/services/interfaces';

/**
 * 创建打印机实例的选项
 */
export interface CreatePrinterOptions extends ServiceProviderOptions {
  /** 自定义连接管理器 */
  connectionManager?: IConnectionManager;
  /** 自定义打印任务管理器 */
  printJobManager?: IPrintJobManager;
  /** 自定义命令构建器 */
  commandBuilder?: ICommandBuilder;
}

/**
 * 使用依赖注入创建 BluetoothPrinter 实例
 *
 * @example
 * ```typescript
 * // 基本用法
 * const printer = createPrinter();
 *
 * // 使用自定义配置
 * const printer = createPrinter({
 *   config: { debug: true },
 *   useGlobalEventBus: true
 * });
 * ```
 */
export function createPrinter(options: CreatePrinterOptions = {}): BluetoothPrinter {
  // 注册服务（如果尚未注册）
  const provider = createServiceProvider(options);

  // 使用提供的实例或从容器解析（需要类型断言）
  const connectionManager =
    options.connectionManager || (provider.getConnectionManager() as IConnectionManager);
  const printJobManager =
    options.printJobManager || (provider.getPrintJobManager() as IPrintJobManager);
  const commandBuilder =
    options.commandBuilder || (provider.getCommandBuilder() as ICommandBuilder);

  return new BluetoothPrinter(connectionManager, printJobManager, commandBuilder);
}

/**
 * 获取服务提供者（用于访问所有服务）
 */
export function getServiceProvider(options: ServiceProviderOptions = {}) {
  return createServiceProvider(options);
}

export { createServiceProvider, ServiceProviderOptions };
