/**
 * 代码覆盖率配置
 */

module.exports = {
  // 覆盖率收集配置
  collector: {
    // 需要收集覆盖率的文件模式
    include: [
      'src/**/*.{js,ts,tsx}',
      '!src/**/*.d.ts',
      '!src/**/index.ts',
      '!src/**/__tests__/**',
      '!src/**/__mocks__/**',
      '!src/**/*.stories.{ts,tsx}',
      '!src/**/*.config.{ts,tsx}',
      '!src/**/types/**'
    ],

    // 排除的文件模式
    exclude: [
      'node_modules/**',
      'dist/**',
      'coverage/**',
      'test-results/**',
      'docs/**',
      'scripts/**',
      '**/*.test.{js,ts,tsx}',
      '**/*.spec.{js,ts,tsx}'
    ]
  },

  // 覆盖率报告配置
  reporter: [
    // 控制台输出
    'text',

    // 文本摘要
    'text-summary',

    // HTML报告
    'html',

    // LCOV格式（用于CI/CD）
    'lcov',

    // JSON格式（用于程序化处理）
    'json',

    // JSON摘要格式
    'json-summary',

    // Cobertura格式（用于某些CI系统）
    'cobertura'
  ],

  // 覆盖率目录
  reportsDirectory: 'coverage',

  // 覆盖率阈值配置
  thresholds: {
    // 全局阈值
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },

    // 文件级阈值（可选）
    './src/bluetooth/**': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },

    './src/printer/**': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },

    './src/utils/**': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    }
  },

  // 覆盖率忽略配置
  ignorePatterns: [
    // 忽略特定的代码行
    'if (process.env.NODE_ENV === "development")',
    'if (process.env.DEBUG)',
    'console\\.log',
    'console\\.warn',
    'console\\.error',

    // 忽略错误处理代码
    'catch.*\\{[^}]*\\}',
    'throw new Error',

    // 忽略类型断言
    'as [A-Za-z]+',
    '<[A-Za-z]+>',

    // 忽略默认导出
    'export default'
  ],

  // 水印配置
  watermarks: {
    statements: [50, 80],
    functions: [50, 80],
    branches: [50, 80],
    lines: [50, 80]
  },

  // 报告选项
  reportOptions: {
    // HTML报告选项
    html: {
      theme: 'default',
      subdir: 'html-report',
      verbose: true,
      metricsToShow: [
        'lines',
        'functions',
        'branches',
        'statements'
      ]
    },

    // LCOV报告选项
    lcov: {
      file: 'lcov.info',
      projectRoot: '.'
    },

    // JSON报告选项
    json: {
      file: 'coverage-final.json'
    },

    // JSON摘要报告选项
    'json-summary': {
      file: 'coverage-summary.json'
    },

    // Cobertura报告选项
    cobertura: {
      file: 'cobertura-coverage.xml',
      projectRoot: '.'
    }
  },

  // 分支覆盖率配置
  branches: {
    // 包含条件分支
    conditional: true,

    // 包含switch语句
    switch: true,

    // 包含循环
    loops: true
  },

  // 函数覆盖率配置
  functions: {
    // 包含箭头函数
    arrow: true,

    // 包含异步函数
    async: true,

    // 包含生成器函数
    generator: true
  },

  // 行覆盖率配置
  lines: {
    // 包含空行（但不计入覆盖率）
    empty: true,

    // 包含注释行（但不计入覆盖率）
    comments: true
  },

  // 语句覆盖率配置
  statements: {
    // 包含简单语句
    simple: true,

    // 包含复合语句
    compound: true,

    // 包含控制流语句
    control: true
  },

  // 性能优化配置
  performance: {
    // 并行处理
    parallel: true,

    // 缓存结果
    cache: true,

    // 增量计算
    incremental: true
  },

  // CI/CD集成配置
  ci: {
    // 在CI环境中运行
    enabled: process.env.CI === 'true',

    // 上传覆盖率数据
    upload: {
      // Coveralls
      coveralls: {
        enabled: true,
        repoToken: process.env.COVERALLS_REPO_TOKEN
      },

      // Codecov
      codecov: {
        enabled: true,
        token: process.env.CODECOV_TOKEN
      },

      // Codacy
      codacy: {
        enabled: false,
        projectToken: process.env.CODACY_PROJECT_TOKEN
      }
    },

    // CI特定阈值
    thresholds: {
      global: {
        branches: 75,
        functions: 75,
        lines: 75,
        statements: 75
      }
    }
  },

  // 本地开发配置
  development: {
    // 开发模式
    enabled: process.env.NODE_ENV !== 'production',

    // 实时更新
    watch: true,

    // 详细输出
    verbose: true,

    // 开发环境阈值（较低）
    thresholds: {
      global: {
        branches: 60,
        functions: 60,
        lines: 60,
        statements: 60
      }
    }
  },

  // 自定义钩子
  hooks: {
    // 覆盖率收集前
    beforeCoverage: async () => {
      console.log('🔍 开始收集覆盖率数据...');
    },

    // 覆盖率收集后
    afterCoverage: async (results) => {
      console.log('📊 覆盖率收集完成');
      console.log(`📈 总体覆盖率: ${results.global.lines.pct}%`);
    },

    // 报告生成前
    beforeReport: async (type) => {
      console.log(`📝 生成${type}报告...`);
    },

    // 报告生成后
    afterReport: async (type, filePath) => {
      console.log(`✅ ${type}报告已生成: ${filePath}`);
    },

    // 阈值检查前
    beforeThresholdCheck: async () => {
      console.log('🎯 检查覆盖率阈值...');
    },

    // 阈值检查后
    afterThresholdCheck: async (passed, thresholds) => {
      if (passed) {
        console.log('✅ 覆盖率阈值检查通过');
      } else {
        console.log('❌ 覆盖率阈值检查失败');
        console.log('目标阈值:', thresholds);
      }
    }
  }
};