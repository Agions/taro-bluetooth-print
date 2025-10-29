/**
 * 平台检测工具类
 * 用于检测当前运行环境的平台类型
 */

export class Platform {

  /**
   * 获取当前平台类型
   * @returns {string} 平台类型
   */
  static getPlatform(): string {
    // 获取 Taro 的环境变量
    const env = process.env.TARO_ENV as string;
    
    // 根据环境变量判断平台类型
    switch (env) {
      case 'weapp':
        return 'weapp';
      case 'alipay':
        return 'alipay';
      case 'swan':
        return 'swan';
      case 'tt':
        return 'tt';
      case 'qq':
        return 'qq';
      case 'h5':
        return 'h5';
      case 'rn':
        return 'rn';
      case 'harmony':
        return 'harmony';
      default:
        return 'h5'; // 默认返回 H5 平台
    }
  }
}

// 导出函数以适配导入
export function getPlatform(): string {
  return Platform.getPlatform();
}
