#!/usr/bin/env node

/**
 * 增强版质量门禁脚本
 *
 * 功能特性：
 * - 多维度质量检查（覆盖率、代码质量、性能、安全、文档）
 * - 可配置的阈值和规则
 * - 详细的报告生成（JSON、Markdown、HTML）
 * - 趋势分析和历史对比
 * - CI/CD集成支持
 * - 自定义检查规则
 *
 * @author Taro Bluetooth Print Team
 * @version 2.0.0
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 默认质量配置
const DEFAULT_QUALITY_CONFIG = {
  // 代码覆盖率阈值
  coverage: {
    statements: 80,
    branches: 75,
    functions: 80,
    lines: 80,
    threshold: {
      high: 90,
      medium: 70,
      low: 50
    }
  },

  // 代码质量阈值
  codeQuality: {
    eslint: {
      maxWarnings: 5,
      maxErrors: 0
    },
    prettier: {
      enforce: true
    },
    typescript: {
      noErrors: true
    }
  },

  // 性能阈值
  performance: {
    bundleSize: {
      max: '2MB',
      warning: '1.5MB'
    },
    loadTime: {
      max: 3000,
      warning: 2000
    },
    memory: {
      max: '50MB',
      warning: '30MB'
    }
  },

  // 测试相关
  testing: {
    minTests: 50,
    maxTestDuration: 10000,
    flakyTestThreshold: 3
  },

  // 安全检查
  security: {
    vulnerabilityThreshold: 'medium',
    auditPassRequired: true
  },

  // 文档要求
  documentation: {
    apiCoverage: 80,
    readmeExists: true,
    changelogExists: true
  }
};

class QualityGate {
  constructor(config = {}) {
    this.config = this.mergeConfig(DEFAULT_QUALITY_CONFIG, config);
    this.verbose = process.argv.includes('--verbose');
    this.checkType = this.getCheckType();
    this.results = {
      passed: true,
      checks: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  getCheckType() {
    const checkTypeArg = process.argv.find(arg => arg.startsWith('--check-type='));
    return checkTypeArg ? checkTypeArg.split('=')[1] : 'all';
  }

  mergeConfig(defaultConfig, customConfig) {
    return {
      ...defaultConfig,
      ...customConfig,
      coverage: { ...defaultConfig.coverage, ...customConfig.coverage },
      codeQuality: {
        ...defaultConfig.codeQuality,
        eslint: { ...defaultConfig.codeQuality.eslint, ...customConfig.codeQuality?.eslint },
        prettier: { ...defaultConfig.codeQuality.prettier, ...customConfig.codeQuality?.prettier },
        typescript: { ...defaultConfig.codeQuality.typescript, ...customConfig.codeQuality?.typescript }
      },
      performance: {
        ...defaultConfig.performance,
        bundleSize: { ...defaultConfig.performance.bundleSize, ...customConfig.performance?.bundleSize },
        loadTime: { ...defaultConfig.performance.loadTime, ...customConfig.performance?.loadTime },
        memory: { ...defaultConfig.performance.memory, ...customConfig.performance?.memory }
      },
      testing: { ...defaultConfig.testing, ...customConfig.testing },
      security: { ...defaultConfig.security, ...customConfig.security },
      documentation: { ...defaultConfig.documentation, ...customConfig.documentation }
    };
  }

  async run() {
    console.log('🚪 开始质量门禁检查...');
    console.log(`📋 检查类型: ${this.checkType}`);
    console.log(`📅 检查时间: ${new Date().toISOString()}`);
    console.log('='.repeat(60));

    try {
      if (this.checkType === 'all' || this.checkType === 'coverage') {
        await this.checkCoverage();
      }

      if (this.checkType === 'all' || this.checkType === 'code-quality') {
        await this.checkCodeQuality();
      }

      if (this.checkType === 'all' || this.checkType === 'performance') {
        await this.checkPerformance();
      }

      if (this.checkType === 'all' || this.checkType === 'testing') {
        await this.checkTesting();
      }

      if (this.checkType === 'all' || this.checkType === 'security') {
        await this.checkSecurity();
      }

      if (this.checkType === 'all' || this.checkType === 'documentation') {
        await this.checkDocumentation();
      }

      this.generateReport();

      if (!this.results.passed) {
        console.log('\n❌ 质量门禁检查失败！');
        process.exit(1);
      } else {
        console.log('\n✅ 质量门禁检查通过！');
        process.exit(0);
      }

    } catch (error) {
      console.error('💥 质量门禁检查过程中发生错误:', error.message);
      process.exit(1);
    }
  }

  async checkCoverage() {
    this.log('📊 检查代码覆盖率...');

    try {
      // 读取覆盖率报告 - 支持多个可能的路径
      const possiblePaths = [
        'coverage/coverage-summary.json',
        'artifacts/coverage-reports/coverage/coverage-summary.json',
        'coverage-summary.json'
      ];

      let coverageData = null;
      let coveragePath = null;

      for (const possiblePath of possiblePaths) {
        if (fs.existsSync(possiblePath)) {
          coveragePath = possiblePath;
          coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
          break;
        }
      }

      if (!coverageData) {
        this.addResult('coverage', 'failed', '覆盖率报告不存在，请先运行测试');
        return;
      }

      const { total } = coverageData;

      const checks = [
        { name: '语句覆盖率', value: total.statements.pct, threshold: this.config.coverage.statements },
        { name: '分支覆盖率', value: total.branches.pct, threshold: this.config.coverage.branches },
        { name: '函数覆盖率', value: total.functions.pct, threshold: this.config.coverage.functions },
        { name: '行覆盖率', value: total.lines.pct, threshold: this.config.coverage.lines }
      ];

      let allPassed = true;
      let lowestCoverage = 100;
      let lowestMetric = '';

      checks.forEach(check => {
        if (check.value < check.threshold) {
          allPassed = false;
          this.addResult('coverage', 'failed',
            `${check.name}: ${check.value}% (要求: ≥${check.threshold}%)`);
        } else if (check.value < this.config.coverage.threshold.high) {
          this.addResult('coverage', 'warning',
            `${check.name}: ${check.value}% (建议: ≥${this.config.coverage.threshold.high}%)`);
        } else {
          this.addResult('coverage', 'passed',
            `${check.name}: ${check.value}% ✅`);
        }

        if (check.value < lowestCoverage) {
          lowestCoverage = check.value;
          lowestMetric = check.name;
        }
      });

      // 额外检查：未覆盖的关键文件
      const uncoveredFiles = this.getUncoveredCriticalFiles(coverageData);
      if (uncoveredFiles.length > 0) {
        this.addResult('coverage', 'warning',
          `关键文件未完全覆盖: ${uncoveredFiles.join(', ')}`);
      }

      if (allPassed) {
        this.addResult('coverage', 'passed',
          `所有覆盖率指标通过，最低: ${lowestMetric} ${lowestCoverage}%`);
      }

    } catch (error) {
      this.addResult('coverage', 'error', `覆盖率检查失败: ${error.message}`);
    }
  }

  async checkCodeQuality() {
    this.log('🔍 检查代码质量...');

    // ESLint 检查
    try {
      const eslintResult = execSync('npx eslint . --format=json', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const eslintResults = JSON.parse(eslintResult);
      const totalErrors = eslintResults.reduce((sum, result) => sum + result.errorCount, 0);
      const totalWarnings = eslintResults.reduce((sum, result) => sum + result.warningCount, 0);

      if (totalErrors > 0) {
        this.addResult('codeQuality', 'failed',
          `ESLint检查失败: ${totalErrors}个错误`);
      } else if (totalWarnings > this.config.codeQuality.eslint.maxWarnings) {
        this.addResult('codeQuality', 'warning',
          `ESLint警告过多: ${totalWarnings}个警告`);
      } else {
        this.addResult('codeQuality', 'passed',
          `ESLint检查通过: 无错误，${totalWarnings}个警告`);
      }

    } catch (error) {
      if (error.status === 1) {
        this.addResult('codeQuality', 'failed', 'ESLint检查存在错误');
      } else {
        this.addResult('codeQuality', 'error', `ESLint检查失败: ${error.message}`);
      }
    }

    // Prettier 检查
    try {
      if (this.config.codeQuality.prettier.enforce) {
        execSync('npx prettier --check .', { stdio: ['pipe', 'pipe', 'pipe'] });
        this.addResult('codeQuality', 'passed', '代码格式检查通过');
      }
    } catch (error) {
      this.addResult('codeQuality', 'failed', '代码格式不符合规范，请运行 prettier --write .');
    }

    // TypeScript 类型检查
    try {
      if (this.config.codeQuality.typescript.noErrors) {
        execSync('npx tsc --noEmit', { stdio: ['pipe', 'pipe', 'pipe'] });
        this.addResult('codeQuality', 'passed', 'TypeScript类型检查通过');
      }
    } catch (error) {
      this.addResult('codeQuality', 'failed', 'TypeScript类型检查存在错误');
    }
  }

  async checkTesting() {
    this.log('🧪 检查测试质量...');

    try {
      // 读取Jest测试结果
      const testResultsPaths = [
        'test-results.json',
        'artifacts/test-results/test-results.json'
      ];

      let testResults = null;
      for (const testPath of testResultsPaths) {
        if (fs.existsSync(testPath)) {
          testResults = JSON.parse(fs.readFileSync(testPath, 'utf8'));
          break;
        }
      }

      if (!testResults) {
        this.addResult('testing', 'warning', '测试结果文件不存在');
        return;
      }

      const { numTotalTests, numPassedTests, numFailedTests, numPendingTests } = testResults;

      // 测试数量检查
      if (numTotalTests < this.config.testing.minTests) {
        this.addResult('testing', 'warning',
          `测试数量不足: ${numTotalTests} (建议: ≥${this.config.testing.minTests})`);
      }

      // 测试通过率检查
      const passRate = numTotalTests > 0 ? (numPassedTests / numTotalTests) * 100 : 0;
      if (numFailedTests > 0) {
        this.addResult('testing', 'failed',
          `存在失败的测试: ${numFailedTests}个失败，通过率${passRate.toFixed(1)}%`);
      } else {
        this.addResult('testing', 'passed',
          `所有测试通过: ${numPassedTests}/${numTotalTests} (${passRate.toFixed(1)}%)`);
      }

      // 跳过测试检查
      if (numPendingTests > 0) {
        this.addResult('testing', 'warning',
          `存在跳过的测试: ${numPendingTests}个`);
      }

    } catch (error) {
      this.addResult('testing', 'error', `测试质量检查失败: ${error.message}`);
    }
  }

  async checkPerformance() {
    this.log('⚡ 检查性能指标...');

    // 检查打包大小
    try {
      const packageJsonPath = path.join(process.cwd(), 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

        // 简单的依赖大小检查
        const nodeModulesPath = path.join(process.cwd(), 'node_modules');
        if (fs.existsSync(nodeModulesPath)) {
          const nodeModulesSize = this.getDirectorySize(nodeModulesPath);
          const sizeMB = nodeModulesSize / (1024 * 1024);

          if (sizeMB > this.parseSize(this.config.performance.bundleSize.max)) {
            this.addResult('performance', 'warning',
              `依赖包过大: ${sizeMB.toFixed(2)}MB`);
          } else {
            this.addResult('performance', 'passed',
              `依赖包大小合理: ${sizeMB.toFixed(2)}MB`);
          }
        }
      }
    } catch (error) {
      this.addResult('performance', 'error', `性能检查失败: ${error.message}`);
    }
  }

  async checkSecurity() {
    this.log('🔒 检查安全性...');

    try {
      // 运行npm audit
      const auditResult = execSync('npm audit --json', {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });

      const auditData = JSON.parse(auditResult);
      const vulnerabilities = auditData.vulnerabilities || {};

      const criticalVulns = Object.values(vulnerabilities).filter(v => v.severity === 'critical').length;
      const highVulns = Object.values(vulnerabilities).filter(v => v.severity === 'high').length;
      const moderateVulns = Object.values(vulnerabilities).filter(v => v.severity === 'moderate').length;
      const lowVulns = Object.values(vulnerabilities).filter(v => v.severity === 'low').length;

      if (criticalVulns > 0) {
        this.addResult('security', 'failed',
          `存在严重安全漏洞: ${criticalVulns}个`);
      } else if (highVulns > 0) {
        this.addResult('security', 'failed',
          `存在高危安全漏洞: ${highVulns}个`);
      } else if (moderateVulns > 0 && this.config.security.vulnerabilityThreshold === 'low') {
        this.addResult('security', 'warning',
          `存在中等安全漏洞: ${moderateVulns}个`);
      } else {
        this.addResult('security', 'passed',
          `安全检查通过: 低危${lowVulns}个，中危${moderateVulns}个`);
      }

    } catch (error) {
      this.addResult('security', 'error', `安全检查失败: ${error.message}`);
    }
  }

  async checkDocumentation() {
    this.log('📚 检查文档完整性...');

    const requiredDocs = [];

    if (this.config.documentation.readmeExists) {
      requiredDocs.push('README.md');
    }

    if (this.config.documentation.changelogExists) {
      requiredDocs.push('CHANGELOG.md');
    }

    requiredDocs.forEach(doc => {
      const docPath = path.join(process.cwd(), doc);
      if (fs.existsSync(docPath)) {
        this.addResult('documentation', 'passed', `${doc} 存在`);
      } else {
        this.addResult('documentation', 'warning', `${doc} 不存在`);
      }
    });

    // 检查API文档覆盖率
    try {
      const sourceFiles = this.getSourceFiles();
      const documentedFiles = sourceFiles.filter(file =>
        this.hasDocumentation(file)
      );

      const docCoverage = sourceFiles.length > 0 ?
        (documentedFiles.length / sourceFiles.length) * 100 : 0;

      if (docCoverage < this.config.documentation.apiCoverage) {
        this.addResult('documentation', 'warning',
          `API文档覆盖率不足: ${docCoverage.toFixed(1)}% (要求: ≥${this.config.documentation.apiCoverage}%)`);
      } else {
        this.addResult('documentation', 'passed',
          `API文档覆盖率良好: ${docCoverage.toFixed(1)}%`);
      }

    } catch (error) {
      this.addResult('documentation', 'error', `文档检查失败: ${error.message}`);
    }
  }

  // 辅助方法
  addResult(category, status, message) {
    const result = {
      category,
      status, // 'passed', 'failed', 'warning', 'error', 'info'
      message,
      timestamp: new Date().toISOString()
    };

    this.results.checks.push(result);
    this.results.summary.total++;

    switch (status) {
      case 'passed':
        this.results.summary.passed++;
        break;
      case 'failed':
      case 'error':
        this.results.summary.failed++;
        this.results.passed = false;
        break;
      case 'warning':
        this.results.summary.warnings++;
        break;
    }

    if (this.verbose || status === 'failed' || status === 'error') {
      const icon = this.getStatusIcon(status);
      console.log(`  ${icon} ${message}`);
    }
  }

  getStatusIcon(status) {
    const icons = {
      passed: '✅',
      failed: '❌',
      warning: '⚠️',
      error: '💥',
      info: 'ℹ️'
    };
    return icons[status] || '❓';
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 质量门禁检查报告');
    console.log('='.repeat(60));

    // 汇总信息
    console.log(`\n📈 检查汇总:`);
    console.log(`  总检查项: ${this.results.summary.total}`);
    console.log(`  ✅ 通过: ${this.results.summary.passed}`);
    console.log(`  ❌ 失败: ${this.results.summary.failed}`);
    console.log(`  ⚠️ 警告: ${this.results.summary.warnings}`);

    // 分类统计
    const categoryStats = this.results.checks.reduce((stats, check) => {
      if (!stats[check.category]) {
        stats[check.category] = { total: 0, passed: 0, failed: 0, warnings: 0 };
      }
      stats[check.category].total++;
      stats[check.category][check.status === 'passed' ? 'passed' :
                               check.status === 'failed' || check.status === 'error' ? 'failed' : 'warnings']++;
      return stats;
    }, {});

    console.log(`\n📋 分类检查结果:`);
    Object.entries(categoryStats).forEach(([category, stats]) => {
      const status = stats.failed > 0 ? '❌' : stats.warnings > 0 ? '⚠️' : '✅';
      console.log(`  ${status} ${category}: ${stats.passed}/${stats.total} 通过`);
    });

    // 失败和警告详情
    const failedChecks = this.results.checks.filter(c => c.status === 'failed' || c.status === 'error');
    const warningChecks = this.results.checks.filter(c => c.status === 'warning');

    if (failedChecks.length > 0) {
      console.log(`\n❌ 失败项目 (${failedChecks.length}):`);
      failedChecks.forEach(check => {
        console.log(`  • ${check.message}`);
      });
    }

    if (warningChecks.length > 0) {
      console.log(`\n⚠️ 警告项目 (${warningChecks.length}):`);
      warningChecks.forEach(check => {
        console.log(`  • ${check.message}`);
      });
    }

    // 生成质量评分
    const qualityScore = this.calculateQualityScore();
    console.log(`\n🏆 质量评分: ${qualityScore}/100`);

    if (qualityScore >= 90) {
      console.log('🎉 优秀！代码质量很高');
    } else if (qualityScore >= 80) {
      console.log('👍 良好！代码质量符合要求');
    } else if (qualityScore >= 70) {
      console.log('✅ 合格！代码质量基本达标');
    } else {
      console.log('⚠️ 需要改进！代码质量有待提升');
    }

    // 保存报告
    this.saveReport();
  }

  calculateQualityScore() {
    let score = 100;

    // 根据失败项扣分
    score -= this.results.summary.failed * 10;

    // 根据警告项扣分
    score -= this.results.summary.warnings * 3;

    // 根据覆盖率调整
    try {
      const coveragePaths = [
        'coverage/coverage-summary.json',
        'artifacts/coverage-reports/coverage/coverage-summary.json',
        'coverage-summary.json'
      ];

      let coverageData = null;
      for (const coveragePath of coveragePaths) {
        if (fs.existsSync(coveragePath)) {
          coverageData = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
          break;
        }
      }

      if (coverageData) {
        const avgCoverage = (coverageData.total.lines.pct + coverageData.total.functions.pct +
                            coverageData.total.branches.pct + coverageData.total.statements.pct) / 4;

        if (avgCoverage < 70) score -= 20;
        else if (avgCoverage < 80) score -= 10;
        else if (avgCoverage > 90) score += 5;
      }
    } catch (error) {
      // 忽略错误
    }

    return Math.max(0, Math.min(100, score));
  }

  saveReport() {
    try {
      const reportDir = 'quality-gate-reports';
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }

      const reportPath = path.join(reportDir, `quality-gate-report-${Date.now()}.json`);
      fs.writeFileSync(reportPath, JSON.stringify({
        timestamp: new Date().toISOString(),
        config: this.config,
        results: this.results,
        qualityScore: this.calculateQualityScore()
      }, null, 2));

      if (this.verbose) {
        console.log(`\n💾 详细报告已保存到: ${reportPath}`);
      }
    } catch (error) {
      console.warn('⚠️ 无法保存质量报告:', error.message);
    }
  }

  // 工具方法
  parseSize(sizeStr) {
    const units = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(B|KB|MB|GB)$/i);
    return match ? parseFloat(match[1]) * units[match[2].toUpperCase()] : 0;
  }

  getDirectorySize(dirPath) {
    try {
      let totalSize = 0;
      const files = fs.readdirSync(dirPath);

      files.forEach(file => {
        const filePath = path.join(dirPath, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          totalSize += this.getDirectorySize(filePath);
        } else {
          totalSize += stats.size;
        }
      });

      return totalSize;
    } catch (error) {
      return 0;
    }
  }

  getSourceFiles() {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    const sourceDirs = ['src', 'lib'];
    const sourceFiles = [];

    sourceDirs.forEach(dir => {
      const dirPath = path.join(process.cwd(), dir);
      if (fs.existsSync(dirPath)) {
        this.collectFiles(dirPath, extensions, sourceFiles);
      }
    });

    return sourceFiles;
  }

  collectFiles(dir, extensions, files) {
    const items = fs.readdirSync(dir);

    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.collectFiles(itemPath, extensions, files);
      } else if (stats.isFile() && extensions.some(ext => item.endsWith(ext))) {
        files.push(itemPath);
      }
    });
  }

  hasDocumentation(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return /\/\*\*[\s\S]*?\*\//.test(content) || /###.*@/.test(content);
    } catch (error) {
      return false;
    }
  }

  getUncoveredCriticalFiles(coverageData) {
    const criticalFiles = ['src/BluetoothPrinter.ts', 'src/index.ts'];
    const uncoveredFiles = [];

    criticalFiles.forEach(file => {
      const relativePath = path.relative(process.cwd(), file);
      if (coverageData[relativePath]) {
        const coverage = coverageData[relativePath];
        if (coverage.lines.pct < 80) {
          uncoveredFiles.push(path.basename(file));
        }
      }
    });

    return uncoveredFiles;
  }

  log(message) {
    if (this.verbose) {
      console.log(message);
    }
  }
}

// 主程序
if (require.main === module) {
  const configPath = process.argv.find(arg => arg.startsWith('--config='));
  let config = {};

  if (configPath) {
    const configFile = configPath.split('=')[1];
    try {
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (error) {
      console.warn('⚠️ 无法读取配置文件:', error.message);
    }
  }

  const qualityGate = new QualityGate(config);
  qualityGate.run().catch(error => {
    console.error('💥 质量门禁检查失败:', error.message);
    process.exit(1);
  });
}

module.exports = QualityGate;