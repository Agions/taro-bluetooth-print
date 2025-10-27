import type { Config } from '@jest/types';

const config: Config.InitialOptions = {
  // 基础配置
  rootDir: '.',
  testEnvironment: 'jsdom',
  preset: 'ts-jest',

  // 集成测试文件匹配
  testMatch: [
    '<rootDir>/tests/integration/**/*.test.{ts,tsx}',
    '<rootDir>/tests/integration/**/*.spec.{ts,tsx}'
  ],

  // 集成测试设置文件
  setupFilesAfterEnv: [
    '<rootDir>/tests/setup/jest-setup.ts',
    '<rootDir>/tests/setup/integration-setup.ts'
  ],

  // 模块映射
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@tests/(.*)$': '<rootDir>/tests/$1'
  },

  // 覆盖率配置
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!src/**/__tests__/**',
    '!src/**/__mocks__/**'
  ],
  coverageDirectory: 'coverage/integration',
  coverageReporters: ['text', 'text-summary', 'html', 'lcov'],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70
    }
  },

  // 测试超时时间
  testTimeout: 30000, // 集成测试需要更长时间

  // 串行执行，避免并发问题
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
        outputDirectory: 'test-results/integration',
        outputName: 'integration-junit.xml',
        suiteNameTemplate: '{filepath}',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}'
      }
    ]
  ],

  // 缓存
  cache: true,
  cacheDirectory: '<rootDir>/.jest-cache/integration',

  // 清除模拟
  clearMocks: false,
  restoreMocks: false

};

export default config;