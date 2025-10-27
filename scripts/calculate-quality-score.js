#!/usr/bin/env node

/**
 * Code Quality Score Calculator
 * Calculates comprehensive code quality scores based on various metrics
 */

const fs = require('fs');
const path = require('path');

class QualityScoreCalculator {
  constructor(options = {}) {
    this.thresholdsFile = options.thresholdsFile || 'quality-thresholds.json';
    this.outputFile = options.output || 'quality-score.json';
    this.artifactsDir = options.artifactsDir || 'quality-artifacts';
    this.thresholds = this.loadThresholds();
  }

  loadThresholds() {
    const defaultThresholds = {
      eslint: { weight: 20, passing: 90 },
      typescript: { weight: 20, passing: 95 },
      complexity: { weight: 15, passing: 80 },
      duplication: { weight: 15, passing: 90 },
      maintainability: { weight: 15, passing: 70 },
      coverage: { weight: 15, passing: 80 }
    };

    try {
      if (fs.existsSync(this.thresholdsFile)) {
        const customThresholds = JSON.parse(fs.readFileSync(this.thresholdsFile, 'utf8'));
        return { ...defaultThresholds, ...customThresholds };
      }
    } catch (error) {
      console.warn('⚠️ 无法加载自定义阈值，使用默认值');
    }

    return defaultThresholds;
  }

  async calculateScore() {
    console.log('🔍 计算代码质量评分...');

    const scores = {
      overall_score: 0,
      details: {},
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    // 计算各项指标得分
    scores.details.eslint_score = this.calculateESLintScore();
    scores.details.typescript_score = this.calculateTypeScriptScore();
    scores.details.complexity_score = this.calculateComplexityScore();
    scores.details.duplication_score = this.calculateDuplicationScore();
    scores.details.maintainability_score = this.calculateMaintainabilityScore();
    scores.details.coverage_score = this.calculateCoverageScore();

    // 计算总分
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(this.thresholds).forEach(([metric, config]) => {
      const score = scores.details[`${metric}_score`] || 0;
      totalScore += score * config.weight;
      totalWeight += config.weight;
    });

    scores.overall_score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;

    // 生成改进建议
    scores.recommendations = this.generateRecommendations(scores.details);

    // 保存结果
    this.saveResults(scores);

    console.log(`✅ 代码质量评分完成: ${scores.overall_score}/100`);
    return scores;
  }

  calculateESLintScore() {
    try {
      const eslintReport = this.findFile('eslint-report.json', this.artifactsDir);
      if (!eslintReport) return 100; // 没有错误就是满分

      const data = JSON.parse(fs.readFileSync(eslintReport, 'utf8'));
      const errorCount = data.length || 0;

      // 基于错误数量计算得分
      if (errorCount === 0) return 100;
      if (errorCount <= 5) return 90;
      if (errorCount <= 10) return 75;
      if (errorCount <= 20) return 60;
      return Math.max(20, 100 - errorCount * 2);
    } catch (error) {
      console.warn('⚠️ 无法计算ESLint评分:', error.message);
      return 0;
    }
  }

  calculateTypeScriptScore() {
    try {
      const typecheckReport = this.findFile('typecheck-report.txt', this.artifactsDir);
      if (!typecheckReport) return 100;

      const content = fs.readFileSync(typecheckReport, 'utf8');
      const errorCount = (content.match(/error TS/gi) || []).length;

      // 基于TypeScript错误数量计算得分
      if (errorCount === 0) return 100;
      if (errorCount <= 3) return 90;
      if (errorCount <= 8) return 75;
      if (errorCount <= 15) return 60;
      return Math.max(20, 100 - errorCount * 3);
    } catch (error) {
      console.warn('⚠️ 无法计算TypeScript评分:', error.message);
      return 0;
    }
  }

  calculateComplexityScore() {
    try {
      const complexityReport = this.findFile('complexity-report.json', this.artifactsDir);
      if (!complexityReport) return 100;

      const data = JSON.parse(fs.readFileSync(complexityReport, 'utf8'));

      // 计算平均复杂度
      let totalComplexity = 0;
      let fileCount = 0;

      if (data.reports && Array.isArray(data.reports)) {
        data.reports.forEach(report => {
          if (report.aggregate && report.aggregate.complexity) {
            totalComplexity += report.aggregate.complexity.cyclomatic;
            fileCount++;
          }
        });
      }

      if (fileCount === 0) return 100;

      const avgComplexity = totalComplexity / fileCount;

      // 基于平均复杂度计算得分
      if (avgComplexity <= 5) return 100;
      if (avgComplexity <= 10) return 90;
      if (avgComplexity <= 15) return 75;
      if (avgComplexity <= 20) return 60;
      return Math.max(20, 100 - avgComplexity * 2);
    } catch (error) {
      console.warn('⚠️ 无法计算复杂度评分:', error.message);
      return 0;
    }
  }

  calculateDuplicationScore() {
    try {
      const duplicationReport = this.findFile('duplication-report.json', this.artifactsDir);
      if (!duplicationReport) return 100;

      const data = JSON.parse(fs.readFileSync(duplicationReport, 'utf8'));

      // 计算重复率
      let duplicatedLines = 0;
      let totalLines = 0;

      if (data && Array.isArray(data)) {
        data.forEach(duplication => {
          duplicatedLines += duplication.lines || 0;
          totalLines += (duplication.instances || 0) * (duplication.lines || 0);
        });
      }

      if (totalLines === 0) return 100;

      const duplicationRate = (duplicatedLines / totalLines) * 100;

      // 基于重复率计算得分
      if (duplicationRate <= 3) return 100;
      if (duplicationRate <= 5) return 90;
      if (duplicationRate <= 8) return 75;
      if (duplicationRate <= 12) return 60;
      return Math.max(20, 100 - duplicationRate * 5);
    } catch (error) {
      console.warn('⚠️ 无法计算重复率评分:', error.message);
      return 0;
    }
  }

  calculateMaintainabilityScore() {
    try {
      const maintainabilityReport = this.findFile('maintainability-report.json', this.artifactsDir);
      if (!maintainabilityReport) return 85; // 默认良好

      const data = JSON.parse(fs.readFileSync(maintainabilityReport, 'utf8'));

      // 基于可维护性指数计算得分
      let totalScore = 0;
      let fileCount = 0;

      if (data.files && Array.isArray(data.files)) {
        data.files.forEach(file => {
          if (file.maintainability) {
            totalScore += file.maintainability;
            fileCount++;
          }
        });
      }

      if (fileCount === 0) return 85;

      const avgMaintainability = totalScore / fileCount;

      // 可维护性指数通常范围是0-100，但这里使用0-171的范围
      // 转换为0-100的评分
      return Math.min(100, Math.round((avgMaintainability / 171) * 100));
    } catch (error) {
      console.warn('⚠️ 无法计算可维护性评分:', error.message);
      return 70;
    }
  }

  calculateCoverageScore() {
    try {
      const coverageFile = this.findFile('coverage-summary.json', path.join(this.artifactsDir, 'coverage-reports'));
      if (!coverageFile) return 0;

      const data = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

      if (!data.total) return 0;

      // 使用综合覆盖率指标
      const lines = data.total.lines.pct || 0;
      const functions = data.total.functions.pct || 0;
      const branches = data.total.branches.pct || 0;
      const statements = data.total.statements.pct || 0;

      // 计算加权平均覆盖率
      const weights = { lines: 0.4, functions: 0.2, branches: 0.2, statements: 0.2 };
      const weightedCoverage =
        lines * weights.lines +
        functions * weights.functions +
        branches * weights.branches +
        statements * weights.statements;

      return Math.round(weightedCoverage);
    } catch (error) {
      console.warn('⚠️ 无法计算覆盖率评分:', error.message);
      return 0;
    }
  }

  generateRecommendations(details) {
    const recommendations = [];

    // ESLint建议
    if (details.eslint_score < 80) {
      recommendations.push('修复ESLint报告的代码风格问题，提高代码一致性');
    }

    // TypeScript建议
    if (details.typescript_score < 80) {
      recommendations.push('解决TypeScript类型错误，增强类型安全性');
    }

    // 复杂度建议
    if (details.complexity_score < 70) {
      recommendations.push('降低代码复杂度，考虑重构复杂函数和类');
    }

    // 重复代码建议
    if (details.duplication_score < 80) {
      recommendations.push('减少代码重复，提取公共函数和组件');
    }

    // 可维护性建议
    if (details.maintainability_score < 70) {
      recommendations.push('提高代码可维护性，改善模块设计和命名规范');
    }

    // 测试覆盖率建议
    if (details.coverage_score < 70) {
      recommendations.push('增加单元测试和集成测试，提高测试覆盖率');
    }

    return recommendations;
  }

  findFile(fileName, searchDir) {
    try {
      const files = this.searchFiles(searchDir, fileName);
      return files.length > 0 ? files[0] : null;
    } catch (error) {
      return null;
    }
  }

  searchFiles(dir, fileName) {
    const results = [];

    if (!fs.existsSync(dir)) return results;

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        results.push(...this.searchFiles(fullPath, fileName));
      } else if (item === fileName) {
        results.push(fullPath);
      }
    }

    return results;
  }

  saveResults(scores) {
    fs.writeFileSync(this.outputFile, JSON.stringify(scores, null, 2));
    console.log(`📊 质量评分报告已保存: ${this.outputFile}`);
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
      case '--artifacts-dir':
        options.artifactsDir = value;
        break;
      case '--output':
        options.output = value;
        break;
      case '--thresholds':
        options.thresholdsFile = value;
        break;
    }
  }

  const calculator = new QualityScoreCalculator(options);
  calculator.calculateScore().catch(error => {
    console.error('❌ 质量评分计算失败:', error.message);
    process.exit(1);
  });
}

module.exports = QualityScoreCalculator;