import type { Config } from '@jest/types';
import { defaults } from 'jest-config';

const config: Config.InitialOptions = {
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
  coverageReporters: [
    'text',
    'text-summary',
    'html',
    'lcov',
    'json-summary'
  ],
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
  moduleFileExtensions: [
    'ts',
    'tsx',
    'js',
    'jsx',
    'json',
    'node'
  ],

  // 模块名映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1',
    '^@mocks/(.*)$': '<rootDir>/src/__mocks__/$1'
  },

  // 设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest-setup.ts'
  ],

  // 模块路径映射
  modulePaths: ['<rootDir>/src'],

  // 忽略转换路径
  transformIgnorePatterns: [
    'node_modules/(?!(.*\\.mjs$))'
  ],

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
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/'
  ],

  // 快照序列化器
  snapshotSerializers: [],

  // 测试结果处理器
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results/html-report',
        filename: 'test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'Test Report',
        logoImgPath: undefined,
        inlineSource: false
      }
    ]
  ],

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
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }],
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }]
      ]
    }]
  },

  // 测试环境配置
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    resources: 'usable',
    runScripts: 'dangerously'
  },

  // 模拟文件扩展名
  moduleFileExtensions: [...defaults.moduleFileExtensions, 'ts', 'tsx'],

  // 依赖提取
  dependencyExtractor: undefined,

  // 测试超时设置
  testTimeout: 10000,

  // 钩子超时
  hookTimeout: 10000
};

export default config;