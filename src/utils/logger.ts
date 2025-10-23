/**
 * 日志工具
 */

// 日志级别
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

// 当前日志级别
let currentLogLevel = LogLevel.INFO;

// 设置日志级别
export function setLogLevel(level: LogLevel): void {
  currentLogLevel = level;
}

// 获取当前日志级别
export function getLogLevel(): LogLevel {
  return currentLogLevel;
}

// 获取时间戳
function getTimestamp(): string {
  const now = new Date();
  return now.toISOString();
}

// 格式化日志消息
function formatMessage(level: string, message: string, ...args: any[]): string {
  const timestamp = getTimestamp();
  let formattedMessage = `[${timestamp}] [${level}] [蓝牙打印库] ${message}`;
  
  // 处理参数
  if (args.length > 0) {
    try {
      // 尝试格式化参数
      const formattedArgs = args.map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        } else if (typeof arg === 'object') {
          try {
            return JSON.stringify(arg);
          } catch (e) {
            return String(arg);
          }
        } else {
          return String(arg);
        }
      });
      
      formattedMessage += ` - ${formattedArgs.join(', ')}`;
    } catch (e) {
      formattedMessage += ` - [无法格式化参数: ${e}]`;
    }
  }
  
  return formattedMessage;
}

export const logger = {
  debug: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.DEBUG) {
      const formattedMessage = formatMessage('DEBUG', message, ...args);
      console.log(formattedMessage);
    }
  },
  
  info: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.INFO) {
      const formattedMessage = formatMessage('INFO', message, ...args);
      console.info(formattedMessage);
    }
  },
  
  warn: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.WARN) {
      const formattedMessage = formatMessage('WARN', message, ...args);
      console.warn(formattedMessage);
    }
  },
  
  error: (message: string, ...args: any[]): void => {
    if (currentLogLevel <= LogLevel.ERROR) {
      const formattedMessage = formatMessage('ERROR', message, ...args);
      console.error(formattedMessage);
    }
  }
}; 