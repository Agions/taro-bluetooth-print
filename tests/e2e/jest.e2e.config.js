import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // 基础配置
  rootDir: '.',
  testEnvironment: 'jsdom',
  preset: 'ts-jest',

  // E2E测试文件匹配
  testMatch: [
    '<rootDir>/tests/e2e/**/*.test.{ts,tsx}',
    '<rootDir>/tests/e2e/**/*.spec.{ts,tsx}'
  ],

  // E2E测试设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest-setup.ts',
    '<rootDir>/tests/setup/e2e-setup.ts'
  ],

  // 模块映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // E2E测试通常不收集覆盖率
  collectCoverage: false,

  // 测试超时时间 - E2E测试需要更长时间
  testTimeout: 60000,

  // 串行执行
  maxWorkers: 1,

  // 详细输出
  verbose: true,

  // 转换配置
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      isolatedModules: true
    }]
  },

  // 测试环境选项
  testEnvironmentOptions: {
    url: 'http://localhost:3000',
    resources: 'usable',
    runScripts: 'dangerously'
  },

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

  // 报告器
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'test-results/e2e',
        outputName: 'e2e-junit.xml',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ],
    [
      'jest-html-reporters',
      {
        publicPath: './test-results/e2e/html-report',
        filename: 'e2e-test-report.html',
        expand: true,
        hideIcon: false,
        pageTitle: 'E2E Test Report'
      }
    ]
  ],

  // 缓存
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/e2e',

  // 测试序列化器
  snapshotSerializers: [],

  // 测试失败时退出
  bail: false,

  // 错误时停止
  stopOnSpecFailure: false,

  // 随机化测试顺序
  randomize: false

};

export default config;