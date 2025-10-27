#!/usr/bin/env node

/**
 * Bundle Size Checker
 * Checks bundle sizes against configured thresholds
 */

const fs = require('fs');
const path = require('path');

class BundleSizeChecker {
  constructor(options = {}) {
    this.bundleFile = options.bundleFile || 'bundle-analysis.json';
    this.thresholdsFile = options.thresholdsFile || 'bundle-size-thresholds.json';
    this.thresholds = this.loadThresholds();
  }

  loadThresholds() {
    const defaultThresholds = {
      main: {
        max: '200KB',
        warning: '150KB'
      },
      minified: {
        max: '100KB',
        warning: '75KB'
      },
      gzipped: {
        max: '30KB',
        warning: '20KB'
      }
    };

    try {
      if (fs.existsSync(this.thresholdsFile)) {
        const customThresholds = JSON.parse(fs.readFileSync(this.thresholdsFile, 'utf8'));
        return { ...defaultThresholds, ...customThresholds };
      }
    } catch (error) {
      console.warn('⚠️ 无法加载包大小阈值，使用默认值');
    }

    return defaultThresholds;
  }

  async checkBundleSize() {
    console.log('🔍 检查包大小...');

    try {
      const bundleData = JSON.parse(fs.readFileSync(this.bundleFile, 'utf8'));
      const results = {
        passed: true,
        warnings: [],
        errors: [],
        details: {},
        summary: {}
      };

      // 检查各项指标
      ['main', 'minified', 'gzipped'].forEach(type => {
        const size = this.parseSize(bundleData.bundleSize[type]);
        const maxSize = this.parseSize(this.thresholds[type].max);
        const warningSize = this.parseSize(this.thresholds[type].warning);

        results.details[type] = {
          actual: size,
          max: maxSize,
          warning: warningSize,
          status: this.getStatus(size, warningSize, maxSize)
        };

        if (size > maxSize) {
          results.errors.push(`${type}: ${this.formatSize(size)} > ${this.thresholds[type].max}`);
          results.passed = false;
        } else if (size > warningSize) {
          results.warnings.push(`${type}: ${this.formatSize(size)} > ${this.thresholds[type].warning}`);
        }
      });

      // 生成摘要
      results.summary = {
        totalChecks: 3,
        passed: results.details.main.status === 'pass' &&
                results.details.minified.status === 'pass' &&
                results.details.gzipped.status === 'pass',
        warnings: results.warnings.length,
        errors: results.errors.length
      };

      // 输出结果
      this.outputResults(results);

      // 保存结果
      this.saveResults(results);

      if (!results.passed) {
        console.error('❌ 包大小检查失败');
        process.exit(1);
      }

      console.log('✅ 包大小检查通过');
      return results;
    } catch (error) {
      console.error('❌ 包大小检查失败:', error.message);
      process.exit(1);
    }
  }

  parseSize(sizeStr) {
    if (!sizeStr || sizeStr === 'N/A') return 0;

    // 转换大小字符串为字节数
    const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB|bytes?)$/i);
    if (!match) return 0;

    const value = parseFloat(match[1]);
    const unit = match[2].toLowerCase();

    const multipliers = {
      'b': 1,
      'byte': 1,
      'bytes': 1,
      'kb': 1024,
      'mb': 1024 * 1024,
      'gb': 1024 * 1024 * 1024
    };

    return Math.round(value * (multipliers[unit] || 1));
  }

  formatSize(bytes) {
    if (bytes === 0) return '0 bytes';

    const units = ['bytes', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
  }

  getStatus(actual, warning, max) {
    if (actual > max) return 'fail';
    if (actual > warning) return 'warning';
    return 'pass';
  }

  outputResults(results) {
    console.log('\n📊 包大小检查结果:');
    console.log('='.repeat(50));

    Object.entries(results.details).forEach(([type, detail]) => {
      const statusIcon = detail.status === 'pass' ? '✅' : detail.status === 'warning' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${type.toUpperCase()}:`);
      console.log(`   实际大小: ${this.formatSize(detail.actual)}`);
      console.log(`   警告阈值: ${this.thresholds[type].warning}`);
      console.log(`   最大阈值: ${this.thresholds[type].max}`);
      console.log();
    });

    console.log('📋 摘要:');
    console.log(`   总检查数: ${results.summary.totalChecks}`);
    console.log(`   通过状态: ${results.summary.passed ? '✅ 通过' : '❌ 失败'}`);
    console.log(`   警告数量: ${results.summary.warnings}`);
    console.log(`   错误数量: ${results.summary.errors}`);

    if (results.warnings.length > 0) {
      console.log('\n⚠️ 警告:');
      results.warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    if (results.errors.length > 0) {
      console.log('\n❌ 错误:');
      results.errors.forEach(error => console.log(`   - ${error}`));
    }
  }

  saveResults(results) {
    const outputFile = 'bundle-size-check-results.json';
    fs.writeFileSync(outputFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 检查结果已保存: ${outputFile}`);
  }
}

// CLI入口
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i += 2) {
    const flag = args[i];
    const value = args[i + 1];

    switch (flag) {
      case '--bundle-file':
        options.bundleFile = value;
        break;
      case '--thresholds':
        options.thresholdsFile = value;
        break;
    }
  }

  const checker = new BundleSizeChecker(options);
  checker.checkBundleSize().catch(error => {
    console.error('❌ 包大小检查失败:', error.message);
    process.exit(1);
  });
}

module.exports = BundleSizeChecker;