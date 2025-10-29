/**
 * 依赖注入模块入口
 */

export { Container } from './Container';
export { ServiceDescriptor } from './ServiceDescriptor';
export { ServiceScope, ServiceScopeImpl } from './ServiceScope';
export {
  ServiceLifecycle,
  ServiceFactory,
  ServiceScope as IServiceScope,
  DependencyResolver
} from './types';

// 便捷导出
export type { ServiceDescriptor as IServiceDescriptor } from './ServiceDescriptor';