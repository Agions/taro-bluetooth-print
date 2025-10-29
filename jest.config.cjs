const config = {
  // 测试环境
  testEnvironment: 'jsdom',

  // 根目录
  rootDir: '.',

  // 测试文件匹配模式
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.{ts,tsx}',
    '<rootDir>/src/**/*.{test,spec}.{ts,tsx}',
    '<rootDir>/tests/**/*.{test,spec}.{ts,tsx}'
  ],

  // 覆盖率收集
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**',
    '!src/**/*.stories.{ts,tsx}',
    '!src/**/*.config.{ts,tsx}'
  ],

  // 覆盖率配置
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov', 'json-summary'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },

  // TypeScript 预处理
  preset: 'ts-jest',
  presetOptions: {
    tsconfig: {
      tsconfig: 'tsconfig.json',
      compiler: 'typescript'
    }
  },

  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],

  // 模块名映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@mocks/(.*)$': '<rootDir>/src/__mocks__/$1'
  },

  // 设置文件
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest-setup.ts'],

  // 模块路径映射
  modulePaths: ['<rootDir>/src'],

  // 忽略转换路径
  transformIgnorePatterns: ['node_modules/(?!(.*\\.mjs$))'],

  // 全局变量
  globals: {
    'ts-jest': {
      isolatedModules: true,
      tsconfig: {
        jsx: 'react-jsx',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true
      }
    }
  },

  // 测试超时时间
  testTimeout: 10000,

  // 并行进程数
  maxWorkers: '50%',

  // 详细输出
  verbose: true,

  // 错误时停止
  bail: false,

  // 监视模式忽略模式
  watchPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/', '<rootDir>/coverage/'],

  // 快照序列化器
  snapshotSerializers: [],

  // 测试结果处理器
  reporters: ['default'],

  // 清除模拟
  clearMocks: true,

  // 恢复模拟
  restoreMocks: true,

  // 错误收集
  errorOnDeprecated: true,

  // notify
  notify: false,
  notifyMode: 'failure-change',

  // 缓存
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache',

  // transform 配置
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        isolatedModules: true
      }
    ]
  },

  // 测试环境配置
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    resources: 'usable',
    runScripts: 'dangerously'
  }
};

module.exports = config;
