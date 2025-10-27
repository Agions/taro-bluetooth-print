#!/usr/bin/env node

/**
 * Project Health Score Calculator
 * Calculates comprehensive project health score based on various metrics
 */

const fs = require('fs');
const path = require('path');

class HealthScoreCalculator {
  constructor(options = {}) {
    this.outputFile = options.output || 'health-score.json';
    this.metrics = this.getMetrics();
  }

  getMetrics() {
    return {
      // 代码质量权重
      codeQuality: { weight: 25, passing: 80 },
      // 测试覆盖率权重
      testCoverage: { weight: 20, passing: 85 },
      // 安全性权重
      security: { weight: 20, passing: 75 },
      // 性能权重
      performance: { weight: 15, passing: 70 },
      // 文档完整性权重
      documentation: { weight: 10, passing: 70 },
      // 依赖健康权重
      dependencies: { weight: 10, passing: 75 }
    };
  }

  async calculateScore() {
    console.log('🔍 计算项目健康评分...');

    const healthData = {
      timestamp: new Date().toISOString(),
      project: 'Taro Bluetooth Print v2.0',
      version: this.getProjectVersion(),
      overall_score: 0,
      status: 'unknown',
      categories: {},
      issues: [],
      total_issues: 0,
      recommendations: []
    };

    // 计算各类别得分
    healthData.categories.codeQuality = await this.calculateCodeQualityScore();
    healthData.categories.testCoverage = await this.calculateTestCoverageScore();
    healthData.categories.security = await this.calculateSecurityScore();
    healthData.categories.performance = await this.calculatePerformanceScore();
    healthData.categories.documentation = await this.calculateDocumentationScore();
    healthData.categories.dependencies = await this.calculateDependencyScore();

    // 计算总分
    let totalScore = 0;
    let totalWeight = 0;

    Object.entries(this.metrics).forEach(([category, config]) => {
      const score = healthData.categories[category]?.score || 0;
      totalScore += score * config.weight;
      totalWeight += config.weight;

      // 收集问题
      if (healthData.categories[category]?.issues) {
        healthData.issues.push(...healthData.categories[category].issues);
      }
    });

    healthData.overall_score = totalWeight > 0 ? Math.round(totalScore / totalWeight) : 0;
    healthData.total_issues = healthData.issues.length;
    healthData.status = this.determineStatus(healthData.overall_score);
    healthData.recommendations = this.generateRecommendations(healthData.categories);

    // 保存结果
    this.saveResults(healthData);

    // 输出摘要
    this.outputSummary(healthData);

    console.log('✅ 健康评分计算完成');
    return healthData;
  }

  async calculateCodeQualityScore() {
    try {
      // 尝试从最新的质量报告中获取数据
      const qualityFile = this.findLatestFile('quality-score.json');
      if (qualityFile && fs.existsSync(qualityFile)) {
        const qualityData = JSON.parse(fs.readFileSync(qualityFile, 'utf8'));
        return {
          score: qualityData.overall_score || 0,
          status: this.getScoreStatus(qualityData.overall_score || 0, this.metrics.codeQuality.passing),
          issues: this.convertQualityIssues(qualityData.recommendations || [])
        };
      }

      // 如果没有质量报告，使用ESLint和TypeScript检查
      return this.runQuickQualityCheck();
    } catch (error) {
      console.warn('⚠️ 无法计算代码质量评分:', error.message);
      return { score: 0, status: 'error', issues: [] };
    }
  }

  async calculateTestCoverageScore() {
    try {
      const coverageFile = this.findLatestFile('coverage-summary.json', ['coverage-reports', 'coverage']);
      if (coverageFile && fs.existsSync(coverageFile)) {
        const coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));

        if (coverageData.total) {
          const lines = coverageData.total.lines.pct || 0;
          const functions = coverageData.total.functions.pct || 0;
          const branches = coverageData.total.branches.pct || 0;
          const statements = coverageData.total.statements.pct || 0;

          // 加权平均覆盖率
          const weightedCoverage = (lines * 0.4 + functions * 0.2 + branches * 0.2 + statements * 0.2);

          const issues = [];
          if (lines < 80) issues.push({ severity: 'medium', description: '行覆盖率低于80%' });
          if (functions < 80) issues.push({ severity: 'medium', description: '函数覆盖率低于80%' });
          if (branches < 75) issues.push({ severity: 'medium', description: '分支覆盖率低于75%' });

          return {
            score: Math.round(weightedCoverage),
            status: this.getScoreStatus(weightedCoverage, this.metrics.testCoverage.passing),
            issues,
            details: { lines, functions, branches, statements }
          };
        }
      }

      return { score: 0, status: 'error', issues: [{ severity: 'high', description: '无法获取测试覆盖率数据' }] };
    } catch (error) {
      console.warn('⚠️ 无法计算测试覆盖率评分:', error.message);
      return { score: 0, status: 'error', issues: [] };
    }
  }

  async calculateSecurityScore() {
    try {
      const securityFile = this.findLatestFile('security-score.json');
      if (securityFile && fs.existsSync(securityFile)) {
        const securityData = JSON.parse(fs.readFileSync(securityFile, 'utf8'));
        return {
          score: securityData.overall_score || 0,
          status: this.getScoreStatus(securityData.overall_score || 0, this.metrics.security.passing),
          issues: this.convertSecurityIssues(securityData.issues || [])
        };
      }

      // 运行快速安全检查
      return this.runQuickSecurityCheck();
    } catch (error) {
      console.warn('⚠️ 无法计算安全评分:', error.message);
      return { score: 0, status: 'error', issues: [] };
    }
  }

  async calculatePerformanceScore() {
    try {
      const performanceFile = this.findLatestFile('performance-trends.json');
      if (performanceFile && fs.existsSync(performanceFile)) {
        const performanceData = JSON.parse(fs.readFileSync(performanceFile, 'utf8'));

        // 基于性能回归情况计算评分
        const regressions = performanceData.regressions || [];
        const score = Math.max(0, 100 - regressions.length * 20);

        const issues = regressions.map(regression => ({
          severity: regression.severity || 'medium',
          description: `性能回归: ${regression.metric} ${regression.change}%`
        }));

        return {
          score,
          status: this.getScoreStatus(score, this.metrics.performance.passing),
          issues,
          details: { regressions: regressions.length }
        };
      }

      return { score: 80, status: 'unknown', issues: [] }; // 默认良好
    } catch (error) {
      console.warn('⚠️ 无法计算性能评分:', error.message);
      return { score: 0, status: 'error', issues: [] };
    }
  }

  async calculateDocumentationScore() {
    try {
      const docsPath = 'docs';
      if (!fs.existsSync(docsPath)) {
        return { score: 0, status: 'error', issues: [{ severity: 'high', description: '文档目录不存在' }] };
      }

      let score = 0;
      const issues = [];

      // 检查必要的文档文件
      const requiredDocs = [
        'README.md',
        'CHANGELOG.md',
        'CONTRIBUTING.md',
        'api/README.md',
        'guide/getting-started.md'
      ];

      requiredDocs.forEach(doc => {
        const docPath = path.join(docsPath, doc);
        if (fs.existsSync(docPath)) {
          score += 20;
        } else {
          issues.push({ severity: 'medium', description: `缺少文档: ${doc}` });
        }
      });

      // 检查文档质量（简单的文件大小和内容长度检查）
      try {
        const readmePath = path.join(docsPath, 'README.md');
        if (fs.existsSync(readmePath)) {
          const readmeContent = fs.readFileSync(readmePath, 'utf8');
          if (readmeContent.length > 1000) {
            score += 10; // README内容充实
          }
        }
      } catch (error) {
        // 忽略README检查错误
      }

      return {
        score: Math.min(100, score),
        status: this.getScoreStatus(score, this.metrics.documentation.passing),
        issues
      };
    } catch (error) {
      console.warn('⚠️ 无法计算文档评分:', error.message);
      return { score: 0, status: 'error', issues: [] };
    }
  }

  async calculateDependencyScore() {
    try {
      // 检查package.json
      if (!fs.existsSync('package.json')) {
        return { score: 0, status: 'error', issues: [{ severity: 'high', description: 'package.json不存在' }] };
      }

      const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      let score = 50; // 基础分
      const issues = [];

      // 检查依赖数量
      const depCount = Object.keys(packageData.dependencies || {}).length;
      const devDepCount = Object.keys(packageData.devDependencies || {}).length;

      if (depCount > 50) {
        issues.push({ severity: 'low', description: '生产依赖过多，可能影响包大小' });
        score = Math.max(0, score - 10);
      }

      // 检查脚本配置
      if (packageData.scripts && Object.keys(packageData.scripts).length >= 5) {
        score += 20;
      } else {
        issues.push({ severity: 'medium', description: 'npm脚本配置不完整' });
      }

      // 检查engines配置
      if (packageData.engines && packageData.engines.node) {
        score += 20;
      } else {
        issues.push({ severity: 'low', description: '缺少Node.js版本限制' });
      }

      // 检查依赖安全状况
      try {
        const auditFile = 'npm-audit-report.json';
        if (fs.existsSync(auditFile)) {
          const auditData = JSON.parse(fs.readFileSync(auditFile, 'utf8'));
          const vulnCount = Object.keys(auditData.vulnerabilities || {}).length;

          if (vulnCount > 0) {
            issues.push({ severity: 'high', description: `发现${vulnCount}个依赖漏洞` });
            score = Math.max(0, score - vulnCount * 5);
          }
        }
      } catch (error) {
        // 忽略审计检查错误
      }

      return {
        score: Math.min(100, score),
        status: this.getScoreStatus(score, this.metrics.dependencies.passing),
        issues,
        details: { depCount, devDepCount }
      };
    } catch (error) {
      console.warn('⚠️ 无法计算依赖评分:', error.message);
      return { score: 0, status: 'error', issues: [] };
    }
  }

  findLatestFile(fileName, searchDirs = ['']) {
    for (const dir of searchDirs) {
      const fullPath = dir ? path.join(dir, fileName) : fileName;
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }
    return null;
  }

  getProjectVersion() {
    try {
      const packageData = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      return packageData.version || 'unknown';
    } catch (error) {
      return 'unknown';
    }
  }

  getScoreStatus(score, passingScore) {
    if (score >= passingScore) return 'excellent';
    if (score >= passingScore * 0.8) return 'good';
    if (score >= passingScore * 0.6) return 'fair';
    return 'poor';
  }

  determineStatus(overallScore) {
    if (overallScore >= 85) return 'healthy';
    if (overallScore >= 70) return 'warning';
    if (overallScore >= 50) return 'critical';
    return 'failing';
  }

  convertQualityIssues(recommendations) {
    return recommendations.slice(0, 5).map(rec => ({
      severity: 'medium',
      description: rec
    }));
  }

  convertSecurityIssues(issues) {
    return issues.map(issue => ({
      severity: issue.severity || 'medium',
      description: issue.title || issue.description
    }));
  }

  runQuickQualityCheck() {
    // 快速代码质量检查
    let score = 70;
    const issues = [];

    try {
      // 检查TypeScript配置
      if (fs.existsSync('tsconfig.json')) {
        score += 15;
      } else {
        issues.push({ severity: 'high', description: '缺少TypeScript配置' });
      }

      // 检查ESLint配置
      if (fs.existsSync('.eslintrc.js') || fs.existsSync('.eslintrc.json')) {
        score += 15;
      } else {
        issues.push({ severity: 'medium', description: '缺少ESLint配置' });
      }
    } catch (error) {
      score = 50;
      issues.push({ severity: 'high', description: '代码质量检查失败' });
    }

    return { score, status: this.getScoreStatus(score, this.metrics.codeQuality.passing), issues };
  }

  runQuickSecurityCheck() {
    // 快速安全检查
    let score = 80;
    const issues = [];

    try {
      // 检查是否有敏感文件
      const sensitiveFiles = ['.env', '.env.example', 'config.json'];
      sensitiveFiles.forEach(file => {
        if (fs.existsSync(file)) {
          const content = fs.readFileSync(file, 'utf8');
          if (content.includes('password') || content.includes('secret') || content.includes('key')) {
            issues.push({ severity: 'high', description: `文件 ${file} 可能包含敏感信息` });
            score -= 20;
          }
        }
      });
    } catch (error) {
      score = 60;
      issues.push({ severity: 'medium', description: '安全检查失败' });
    }

    return { score, status: this.getScoreStatus(score, this.metrics.security.passing), issues };
  }

  generateRecommendations(categories) {
    const recommendations = [];

    Object.entries(categories).forEach(([category, data]) => {
      if (data.score < 70) {
        switch (category) {
          case 'codeQuality':
            recommendations.push('改善代码质量，配置ESLint和TypeScript严格模式');
            break;
          case 'testCoverage':
            recommendations.push('提高测试覆盖率，确保关键功能有测试保护');
            break;
          case 'security':
            recommendations.push('修复安全漏洞，定期更新依赖包');
            break;
          case 'performance':
            recommendations.push('优化性能瓶颈，监控关键指标');
            break;
          case 'documentation':
            recommendations.push('完善项目文档，确保用户指南完整');
            break;
          case 'dependencies':
            recommendations.push('清理不必要的依赖，定期更新包版本');
            break;
        }
      }
    });

    return recommendations;
  }

  outputSummary(healthData) {
    console.log('\n📊 项目健康评分摘要:');
    console.log('='.repeat(50));
    console.log(`🎯 总体评分: ${healthData.overall_score}/100`);
    console.log(`📊 健康状态: ${healthData.status.toUpperCase()}`);
    console.log(`📋 问题数量: ${healthData.total_issues}`);

    console.log('\n📈 各类别评分:');
    Object.entries(healthData.categories).forEach(([category, data]) => {
      const statusIcon = data.status === 'excellent' ? '✅' :
                        data.status === 'good' ? '👍' :
                        data.status === 'fair' ? '⚠️' : '❌';
      console.log(`${statusIcon} ${category}: ${data.score}/100`);
    });

    if (healthData.recommendations.length > 0) {
      console.log('\n💡 改进建议:');
      healthData.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   - ${rec}`);
      });
    }
  }

  saveResults(healthData) {
    fs.writeFileSync(this.outputFile, JSON.stringify(healthData, null, 2));
    console.log(`\n📄 健康评分报告已保存: ${this.outputFile}`);
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
      case '--output':
        options.output = value;
        break;
    }
  }

  const calculator = new HealthScoreCalculator(options);
  calculator.calculateScore().catch(error => {
    console.error('❌ 健康评分计算失败:', error.message);
    process.exit(1);
  });
}

module.exports = HealthScoreCalculator;