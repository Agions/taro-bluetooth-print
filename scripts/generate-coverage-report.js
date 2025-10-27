#!/usr/bin/env node

/**
 * 覆盖率报告生成器
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class CoverageReporter {
  constructor(options = {}) {
    this.coverageDir = options.coverageDir || 'coverage';
    this.outputDir = options.outputDir || 'coverage/reports';
    this.projectName = options.projectName || 'Taro Bluetooth Printer';
    this.repositoryUrl = options.repositoryUrl || '';
    this.minCoverage = options.minCoverage || 80;
    this.includeUncoveredFiles = options.includeUncoveredFiles || false;
    this.enableThresholdCheck = options.enableThresholdCheck !== false;
  }

  /**
   * 生成完整的覆盖率报告
   */
  async generateReport() {
    console.log('📊 开始生成覆盖率报告...');

    try {
      // 确保输出目录存在
      this.ensureDirectoryExists(this.outputDir);

      // 读取覆盖率数据
      const coverageData = this.readCoverageData();
      if (!coverageData) {
        throw new Error('无法读取覆盖率数据');
      }

      // 生成各种报告
      await this.generateHtmlReport(coverageData);
      await this.generateMarkdownReport(coverageData);
      await this.generateJsonReport(coverageData);
      await this.generateCsvReport(coverageData);
      await this.generateBadgeReport(coverageData);
      await this.generateTrendReport(coverageData);

      // 新增：生成详细分析报告
      await this.generateDetailedAnalysis(coverageData);
      await this.generateThresholdReport(coverageData);
      await this.generateFileLevelReport(coverageData);
      await this.generateQualityMetrics(coverageData);

      // 检查覆盖率阈值
      if (this.enableThresholdCheck) {
        await this.checkCoverageThresholds(coverageData);
      }

      console.log('✅ 覆盖率报告生成完成');
      console.log(`📁 报告位置: ${this.outputDir}`);
    } catch (error) {
      console.error('❌ 生成覆盖率报告失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 读取覆盖率数据
   */
  readCoverageData() {
    const summaryFile = path.join(this.coverageDir, 'coverage-summary.json');

    if (!fs.existsSync(summaryFile)) {
      console.error('❌ 覆盖率摘要文件不存在:', summaryFile);
      return null;
    }

    try {
      const rawData = fs.readFileSync(summaryFile, 'utf8');
      return JSON.parse(rawData);
    } catch (error) {
      console.error('❌ 解析覆盖率数据失败:', error.message);
      return null;
    }
  }

  /**
   * 生成HTML报告
   */
  async generateHtmlReport(data) {
    const template = this.createHtmlTemplate(data);
    const outputFile = path.join(this.outputDir, 'coverage-report.html');

    fs.writeFileSync(outputFile, template);
    console.log('✅ HTML报告已生成:', outputFile);
  }

  /**
   * 创建HTML模板
   */
  createHtmlTemplate(data) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const total = data.total;

    // 计算覆盖率等级
    const getGrade = (percentage) => {
      if (percentage >= 90) return { grade: 'A', color: '#28a745' };
      if (percentage >= 80) return { grade: 'B', color: '#17a2b8' };
      if (percentage >= 70) return { grade: 'C', color: '#ffc107' };
      if (percentage >= 60) return { grade: 'D', color: '#fd7e14' };
      return { grade: 'F', color: '#dc3545' };
    };

    const linesGrade = getGrade(total.lines.pct);
    const functionsGrade = getGrade(total.functions.pct);
    const branchesGrade = getGrade(total.branches.pct);
    const statementsGrade = getGrade(total.statements.pct);

    // 生成文件覆盖率表格
    const fileRows = Object.entries(data)
      .filter(([key]) => key !== 'total')
      .map(([file, coverage]) => `
        <tr>
          <td><code>${file}</code></td>
          <td>
            <div class="progress">
              <div class="progress-bar" style="width: ${coverage.lines.pct}%; background-color: ${getGrade(coverage.lines.pct).color};">
                ${coverage.lines.pct}%
              </div>
            </div>
          </td>
          <td>${coverage.functions.pct}%</td>
          <td>${coverage.branches.pct}%</td>
          <td>${coverage.statements.pct}%</td>
        </tr>
      `).join('');

    return `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>覆盖率报告 - ${this.projectName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; background-color: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 30px; text-align: center; }
        .header h1 { color: #2c3e50; margin-bottom: 10px; }
        .header .subtitle { color: #6c757d; font-size: 16px; }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: white; padding: 25px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .metric-title { font-size: 14px; color: #6c757d; margin-bottom: 10px; }
        .metric-value { font-size: 36px; font-weight: bold; margin-bottom: 10px; }
        .metric-grade { font-size: 18px; font-weight: bold; padding: 5px 15px; border-radius: 20px; color: white; }
        .files-section { background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .files-section h2 { margin-bottom: 20px; color: #2c3e50; }
        .table-container { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        th { background-color: #f8f9fa; font-weight: 600; color: #495057; }
        .progress { background-color: #e9ecef; border-radius: 10px; overflow: hidden; height: 20px; }
        .progress-bar { height: 100%; line-height: 20px; text-align: center; color: white; font-size: 12px; }
        .footer { text-align: center; margin-top: 30px; color: #6c757d; }
        @media (max-width: 768px) {
            .metrics { grid-template-columns: 1fr; }
            .metric-value { font-size: 28px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>📊 覆盖率报告</h1>
            <div class="subtitle">${this.projectName} - ${timestamp}</div>
        </header>

        <div class="metrics">
            <div class="metric-card">
                <div class="metric-title">📝 行覆盖率</div>
                <div class="metric-value" style="color: ${linesGrade.color};">${total.lines.pct}%</div>
                <div class="metric-grade" style="background-color: ${linesGrade.color};">Grade ${linesGrade.grade}</div>
                <div style="margin-top: 10px; font-size: 14px; color: #6c757d;">
                    ${total.lines.covered} / ${total.lines.total}
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-title">🔧 函数覆盖率</div>
                <div class="metric-value" style="color: ${functionsGrade.color};">${total.functions.pct}%</div>
                <div class="metric-grade" style="background-color: ${functionsGrade.color};">Grade ${functionsGrade.grade}</div>
                <div style="margin-top: 10px; font-size: 14px; color: #6c757d;">
                    ${total.functions.covered} / ${total.functions.total}
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-title">🌿 分支覆盖率</div>
                <div class="metric-value" style="color: ${branchesGrade.color};">${total.branches.pct}%</div>
                <div class="metric-grade" style="background-color: ${branchesGrade.color};">Grade ${branchesGrade.grade}</div>
                <div style="margin-top: 10px; font-size: 14px; color: #6c757d;">
                    ${total.branches.covered} / ${total.branches.total}
                </div>
            </div>

            <div class="metric-card">
                <div class="metric-title">📖 语句覆盖率</div>
                <div class="metric-value" style="color: ${statementsGrade.color};">${total.statements.pct}%</div>
                <div class="metric-grade" style="background-color: ${statementsGrade.color};">Grade ${statementsGrade.grade}</div>
                <div style="margin-top: 10px; font-size: 14px; color: #6c757d;">
                    ${total.statements.covered} / ${total.statements.total}
                </div>
            </div>
        </div>

        <div class="files-section">
            <h2>📁 文件覆盖率详情</h2>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>文件</th>
                            <th>行覆盖</th>
                            <th>函数覆盖</th>
                            <th>分支覆盖</th>
                            <th>语句覆盖</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${fileRows}
                    </tbody>
                </table>
            </div>
        </div>

        <footer class="footer">
            <p>📅 报告生成时间: ${timestamp}</p>
            ${this.repositoryUrl ? `<p>🔗 项目地址: <a href="${this.repositoryUrl}">${this.repositoryUrl}</a></p>` : ''}
        </footer>
    </div>
</body>
</html>
    `;
  }

  /**
   * 生成Markdown报告
   */
  async generateMarkdownReport(data) {
    const timestamp = new Date().toLocaleString('zh-CN');
    const total = data.total;

    const content = `# 📊 覆盖率报告

## 项目信息
- **项目名称**: ${this.projectName}
- **生成时间**: ${timestamp}
- **报告类型**: 代码覆盖率分析

## 总体覆盖率

| 指标 | 覆盖率 | 已覆盖 | 总数 | 等级 |
|------|--------|--------|------|------|
| 📝 行覆盖率 | ${total.lines.pct}% | ${total.lines.covered} | ${total.lines.total} | ${this.getGrade(total.lines.pct)} |
| 🔧 函数覆盖率 | ${total.functions.pct}% | ${total.functions.covered} | ${total.functions.total} | ${this.getGrade(total.functions.pct)} |
| 🌿 分支覆盖率 | ${total.branches.pct}% | ${total.branches.covered} | ${total.branches.total} | ${this.getGrade(total.branches.pct)} |
| 📖 语句覆盖率 | ${total.statements.pct}% | ${total.statements.covered} | ${total.statements.total} | ${this.getGrade(total.statements.pct)} |

## 文件覆盖率详情

| 文件 | 行覆盖 | 函数覆盖 | 分支覆盖 | 语句覆盖 |
|------|--------|----------|----------|----------|
${Object.entries(data)
  .filter(([key]) => key !== 'total')
  .map(([file, coverage]) =>
    `| \`${file}\` | ${coverage.lines.pct}% | ${coverage.functions.pct}% | ${coverage.branches.pct}% | ${coverage.statements.pct}% |`
  ).join('\n')}

## 覆盖率说明

- **A级 (90-100%)**: 优秀 - 代码覆盖非常全面
- **B级 (80-89%)**: 良好 - 代码覆盖较为全面
- **C级 (70-79%)**: 一般 - 代码覆盖基本满足需求
- **D级 (60-69%)**: 需要改进 - 代码覆盖不够充分
- **F级 (0-59%)**: 不合格 - 代码覆盖严重不足

## 建议

${this.generateSuggestions(total)}

---

*此报告由自动化测试系统生成*
`;

    const outputFile = path.join(this.outputDir, 'coverage-report.md');
    fs.writeFileSync(outputFile, content);
    console.log('✅ Markdown报告已生成:', outputFile);
  }

  /**
   * 生成JSON报告
   */
  async generateJsonReport(data) {
    const report = {
      project: {
        name: this.projectName,
        repositoryUrl: this.repositoryUrl
      },
      timestamp: new Date().toISOString(),
      summary: data.total,
      files: Object.entries(data)
        .filter(([key]) => key !== 'total')
        .map(([file, coverage]) => ({
          file,
          coverage
        })),
      grades: {
        lines: this.getGrade(data.total.lines.pct),
        functions: this.getGrade(data.total.functions.pct),
        branches: this.getGrade(data.total.branches.pct),
        statements: this.getGrade(data.total.statements.pct)
      },
      recommendations: this.generateRecommendations(data.total)
    };

    const outputFile = path.join(this.outputDir, 'coverage-report.json');
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log('✅ JSON报告已生成:', outputFile);
  }

  /**
   * 生成CSV报告
   */
  async generateCsvReport(data) {
    const headers = ['File', 'Lines %', 'Lines Covered', 'Lines Total', 'Functions %', 'Functions Covered', 'Functions Total', 'Branches %', 'Branches Covered', 'Branches Total', 'Statements %', 'Statements Covered', 'Statements Total'];

    const rows = Object.entries(data)
      .filter(([key]) => key !== 'total')
      .map(([file, coverage]) => [
        file,
        coverage.lines.pct,
        coverage.lines.covered,
        coverage.lines.total,
        coverage.functions.pct,
        coverage.functions.covered,
        coverage.functions.total,
        coverage.branches.pct,
        coverage.branches.covered,
        coverage.branches.total,
        coverage.statements.pct,
        coverage.statements.covered,
        coverage.statements.total
      ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const outputFile = path.join(this.outputDir, 'coverage-report.csv');
    fs.writeFileSync(outputFile, csvContent);
    console.log('✅ CSV报告已生成:', outputFile);
  }

  /**
   * 生成徽章报告
   */
  async generateBadgeReport(data) {
    const lines = data.total.lines.pct;
    const color = this.getBadgeColor(lines);

    const badge = {
      schemaVersion: 1,
      label: 'coverage',
      message: `${lines}%`,
      color: color
    };

    const outputFile = path.join(this.outputDir, 'coverage-badge.json');
    fs.writeFileSync(outputFile, JSON.stringify(badge, null, 2));
    console.log('✅ 徽章报告已生成:', outputFile);
  }

  /**
   * 生成趋势报告
   */
  async generateTrendReport(data) {
    const trendFile = path.join(this.outputDir, 'trend.json');
    const timestamp = new Date().toISOString();

    let trendData = [];
    if (fs.existsSync(trendFile)) {
      trendData = JSON.parse(fs.readFileSync(trendFile, 'utf8'));
    }

    const newDataPoint = {
      timestamp,
      lines: data.total.lines.pct,
      functions: data.total.functions.pct,
      branches: data.total.branches.pct,
      statements: data.total.statements.pct
    };

    trendData.push(newDataPoint);

    // 只保留最近30个数据点
    if (trendData.length > 30) {
      trendData = trendData.slice(-30);
    }

    fs.writeFileSync(trendFile, JSON.stringify(trendData, null, 2));
    console.log('✅ 趋势报告已更新:', trendFile);
  }

  /**
   * 获取覆盖率等级
   */
  getGrade(percentage) {
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  }

  /**
   * 获取徽章颜色
   */
  getBadgeColor(percentage) {
    if (percentage >= 90) return 'brightgreen';
    if (percentage >= 80) return 'green';
    if (percentage >= 70) return 'yellow';
    if (percentage >= 60) return 'orange';
    return 'red';
  }

  /**
   * 生成建议
   */
  generateSuggestions(total) {
    const suggestions = [];

    if (total.lines.pct < 80) {
      suggestions.push('- 📝 建议增加更多的测试用例来覆盖未测试的代码行');
    }

    if (total.functions.pct < 80) {
      suggestions.push('- 🔧 建议为未覆盖的函数编写单元测试');
    }

    if (total.branches.pct < 80) {
      suggestions.push('- 🌿 建议增加条件分支测试，确保所有分支都被执行');
    }

    if (total.statements.pct < 80) {
      suggestions.push('- 📖 建议完善语句覆盖率测试');
    }

    if (suggestions.length === 0) {
      suggestions.push('✅ 覆盖率表现良好，继续保持！');
    }

    return suggestions.join('\n');
  }

  /**
   * 生成改进建议
   */
  generateRecommendations(total) {
    const recommendations = [];

    Object.entries(total).forEach(([key, value]) => {
      if (typeof value === 'object' && value.pct !== undefined) {
        if (value.pct < 60) {
          recommendations.push({
            type: key,
            priority: 'high',
            current: value.pct,
            target: 80,
            action: `立即增加${this.getChineseName(key)}测试覆盖率`
          });
        } else if (value.pct < 80) {
          recommendations.push({
            type: key,
            priority: 'medium',
            current: value.pct,
            target: 80,
            action: `持续改进${this.getChineseName(key)}测试覆盖率`
          });
        }
      }
    });

    return recommendations;
  }

  /**
   * 获取中文名称
   */
  getChineseName(key) {
    const names = {
      lines: '代码行',
      functions: '函数',
      branches: '分支',
      statements: '语句'
    };
    return names[key] || key;
  }

  /**
   * 生成详细分析报告
   */
  async generateDetailedAnalysis(data) {
    const analysis = {
      summary: this.calculateSummaryMetrics(data),
      uncoveredFiles: this.getUncoveredFiles(data),
      lowCoverageFiles: this.getLowCoverageFiles(data),
      highRiskFiles: this.getHighRiskFiles(data),
      recommendations: this.generateAdvancedRecommendations(data),
      qualityScore: this.calculateQualityScore(data),
      trendAnalysis: this.analyzeCoverageTrends(data)
    };

    const outputFile = path.join(this.outputDir, 'detailed-analysis.json');
    fs.writeFileSync(outputFile, JSON.stringify(analysis, null, 2));
    console.log('✅ 详细分析报告已生成:', outputFile);
  }

  /**
   * 生成阈值检查报告
   */
  async generateThresholdReport(data) {
    const thresholds = this.checkThresholds(data);
    const report = {
      passed: thresholds.passed,
      overall: thresholds.overall,
      details: thresholds.details,
      failedMetrics: thresholds.failedMetrics,
      recommendations: this.generateThresholdRecommendations(thresholds)
    };

    const outputFile = path.join(this.outputDir, 'threshold-report.json');
    fs.writeFileSync(outputFile, JSON.stringify(report, null, 2));
    console.log('✅ 阈值检查报告已生成:', outputFile);
  }

  /**
   * 生成文件级报告
   */
  async generateFileLevelReport(data) {
    const fileReports = Object.entries(data)
      .filter(([key]) => key !== 'total')
      .map(([file, coverage]) => ({
        file,
        path: file,
        ...coverage,
        riskLevel: this.assessFileRiskLevel(coverage),
        complexity: this.estimateFileComplexity(coverage),
        testSuggestions: this.generateFileTestSuggestions(coverage)
      }))
      .sort((a, b) => b.riskLevel.score - a.riskLevel.score);

    const outputFile = path.join(this.outputDir, 'file-level-report.json');
    fs.writeFileSync(outputFile, JSON.stringify(fileReports, null, 2));
    console.log('✅ 文件级报告已生成:', outputFile);
  }

  /**
   * 生成质量指标报告
   */
  async generateQualityMetrics(data) {
    const metrics = {
      codeQuality: {
        overallScore: this.calculateOverallQualityScore(data),
        maintainabilityIndex: this.calculateMaintainabilityIndex(data),
        testComplexity: this.calculateTestComplexity(data),
        coverageBalance: this.calculateCoverageBalance(data)
      },
      healthMetrics: {
        technicalDebt: this.assessTechnicalDebt(data),
        testCoverage: this.assessTestHealth(data),
        codeRisks: this.identifyCodeRisks(data)
      },
      benchmarks: {
        industryAverage: this.getIndustryBenchmarks(),
        projectComparison: this.compareWithBenchmarks(data)
      }
    };

    const outputFile = path.join(this.outputDir, 'quality-metrics.json');
    fs.writeFileSync(outputFile, JSON.stringify(metrics, null, 2));
    console.log('✅ 质量指标报告已生成:', outputFile);
  }

  /**
   * 检查覆盖率阈值
   */
  async checkCoverageThresholds(data) {
    const total = data.total;
    const thresholds = {
      lines: { target: this.minCoverage, actual: total.lines.pct, passed: total.lines.pct >= this.minCoverage },
      functions: { target: this.minCoverage, actual: total.functions.pct, passed: total.functions.pct >= this.minCoverage },
      branches: { target: this.minCoverage, actual: total.branches.pct, passed: total.branches.pct >= this.minCoverage },
      statements: { target: this.minCoverage, actual: total.statements.pct, passed: total.statements.pct >= this.minCoverage }
    };

    const passed = Object.values(thresholds).every(t => t.passed);
    const failedMetrics = Object.entries(thresholds).filter(([_, t]) => !t.passed);

    return {
      passed,
      overall: {
        target: this.minCoverage,
        actual: total.lines.pct,
        passed,
        score: Object.values(thresholds).reduce((sum, t) => sum + t.actual, 0) / 4
      },
      details: thresholds,
      failedMetrics
    };
  }

  /**
   * 计算汇总指标
   */
  calculateSummaryMetrics(data) {
    const total = data.total;
    return {
      totalLines: total.lines.total,
      coveredLines: total.lines.covered,
      totalFunctions: total.functions.total,
      coveredFunctions: total.functions.covered,
      totalBranches: total.branches.total,
      coveredBranches: total.branches.covered,
      totalStatements: total.statements.total,
      coveredStatements: total.statements.covered,
      coveragePercentage: total.lines.pct,
      coverageTrend: 'stable' // 可以从历史数据计算
    };
  }

  /**
   * 获取未覆盖的文件
   */
  getUncoveredFiles(data) {
    return Object.entries(data)
      .filter(([key]) => key !== 'total')
      .filter(([_, coverage]) => coverage.lines.pct === 0)
      .map(([file, coverage]) => ({
        file,
        path: file,
        lines: coverage.lines.total,
        functions: coverage.functions.total,
        branches: coverage.branches.total,
        statements: coverage.statements.total,
        complexity: this.estimateFileComplexity(coverage)
      }));
  }

  /**
   * 获取低覆盖率文件
   */
  getLowCoverageFiles(data) {
    const threshold = this.minCoverage * 0.5; // 50% of target
    return Object.entries(data)
      .filter(([key]) => key !== 'total')
      .filter(([_, coverage]) => coverage.lines.pct > 0 && coverage.lines.pct < threshold)
      .map(([file, coverage]) => ({
        file,
        path: file,
        coverage: coverage.lines.pct,
        lines: coverage.lines.total,
        uncoveredLines: coverage.lines.total - coverage.lines.covered,
        complexity: this.estimateFileComplexity(coverage),
        improvementPotential: threshold - coverage.lines.pct
      }))
      .sort((a, b) => a.improvementPotential - b.improvementPotential);
  }

  /**
   * 获取高风险文件
   */
  getHighRiskFiles(data) {
    const criticalPatterns = [
      /BluetoothPrinter\.ts$/,
      /index\.ts$/,
      /\/domain\//,
      /\/infrastructure\//,
      /\.test\.ts$/,
      /\.spec\.ts$/
    ];

    return Object.entries(data)
      .filter(([key]) => key !== 'total')
      .filter(([file, coverage]) => {
        const isCritical = criticalPatterns.some(pattern => pattern.test(file));
        const lowCoverage = coverage.lines.pct < 80;
        const highComplexity = this.estimateFileComplexity(coverage) > 10;
        return isCritical && (lowCoverage || highComplexity);
      })
      .map(([file, coverage]) => ({
        file,
        path: file,
        coverage: coverage.lines.pct,
        complexity: this.estimateFileComplexity(coverage),
        riskFactors: this.assessRiskFactors(file, coverage)
      }));
  }

  /**
   * 生成高级建议
   */
  generateAdvancedRecommendations(data) {
    const recommendations = [];
    const total = data.total;

    // 基于覆盖率水平的建议
    if (total.lines.pct < 60) {
      recommendations.push({
        priority: 'critical',
        category: 'coverage',
        title: '覆盖率严重不足',
        description: '当前覆盖率远低于行业基准，建议立即采取行动',
        actions: ['增加基础单元测试', '优先测试核心业务逻辑', '制定覆盖率提升计划']
      });
    } else if (total.lines.pct < 80) {
      recommendations.push({
        priority: 'high',
        category: 'coverage',
        title: '覆盖率需要提升',
        description: '覆盖率有待提升，建议制定系统性测试计划',
        actions: ['增加边界条件测试', '完善异常处理测试', '补充集成测试']
      });
    }

    // 基于分支覆盖率的建议
    if (total.branches.pct < total.lines.pct - 10) {
      recommendations.push({
        priority: 'medium',
        category: 'testing',
        title: '分支覆盖率不足',
        description: '分支覆盖率明显低于行覆盖率，可能存在条件分支未充分测试',
        actions: ['增加条件边界测试', '测试异常处理路径', '验证所有控制流']
      });
    }

    // 基于文件分析的建议
    const uncoveredFiles = this.getUncoveredFiles(data);
    if (uncoveredFiles.length > 0) {
      recommendations.push({
        priority: 'medium',
        category: 'coverage',
        title: '存在未测试文件',
        description: `发现 ${uncoveredFiles.length} 个完全未测试的文件`,
        actions: ['为核心文件添加基础测试', '建立测试用例模板', '实施测试驱动开发']
      });
    }

    return recommendations;
  }

  /**
   * 计算质量评分
   */
  calculateQualityScore(data) {
    const total = data.total;
    const weights = {
      coverage: 0.4,
      balance: 0.3,
      complexity: 0.2,
      completeness: 0.1
    };

    const coverageScore = total.lines.pct / 100;
    const balanceScore = this.calculateCoverageBalance(data);
    const complexityScore = Math.max(0, 1 - this.calculateAverageComplexity(data) / 20);
    const completenessScore = this.calculateTestCompleteness(data);

    const overallScore = (
      coverageScore * weights.coverage +
      balanceScore * weights.balance +
      complexityScore * weights.complexity +
      completenessScore * weights.completeness
    ) * 100;

    return {
      overall: Math.round(overallScore),
      breakdown: {
        coverage: Math.round(coverageScore * 100),
        balance: Math.round(balanceScore * 100),
        complexity: Math.round(complexityScore * 100),
        completeness: Math.round(completenessScore * 100)
      }
    };
  }

  /**
   * 分析覆盖率趋势
   */
  analyzeCoverageTrends(data) {
    // 这里可以读取历史数据并分析趋势
    return {
      trend: 'stable',
      direction: 'neutral',
      confidence: 'medium',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * 评估文件风险等级
   */
  assessFileRiskLevel(coverage) {
    const coverage = coverage.lines.pct;
    const complexity = this.estimateFileComplexity(coverage);

    let riskLevel = 'low';
    let score = 100;

    if (coverage < 30) {
      riskLevel = 'critical';
      score -= 50;
    } else if (coverage < 60) {
      riskLevel = 'high';
      score -= 30;
    } else if (coverage < 80) {
      riskLevel = 'medium';
      score -= 15;
    }

    if (complexity > 15) {
      score -= 10;
    }

    score = Math.max(0, Math.min(100, score));

    return { level: riskLevel, score };
  }

  /**
   * 估算文件复杂度
   */
  estimateFileComplexity(coverage) {
    const branchCount = coverage.branches.total;
    const functionCount = coverage.functions.total;
    const lineCount = coverage.lines.total;

    // 简化的复杂度计算
    return (branchCount * 2 + functionCount * 3 + lineCount * 0.1) / 10;
  }

  /**
   * 生成文件测试建议
   */
  generateFileTestSuggestions(coverage) {
    const suggestions = [];

    if (coverage.lines.pct < 50) {
      suggestions.push('添加基础单元测试');
    }

    if (coverage.branches.pct < coverage.lines.pct - 5) {
      suggestions.push('增加条件分支测试');
    }

    if (coverage.functions.pct < coverage.lines.pct - 5) {
      suggestions.push('确保所有函数都有测试');
    }

    return suggestions;
  }

  /**
   * 计算覆盖率平衡度
   */
  calculateCoverageBalance(data) {
    const total = data.total;
    const metrics = [total.lines.pct, total.functions.pct, total.branches.pct, total.statements.pct];
    const avg = metrics.reduce((sum, val) => sum + val, 0) / metrics.length;
    const variance = metrics.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / metrics.length;
    const stdDev = Math.sqrt(variance);

    // 平衡度：标准差越小，平衡度越高
    return Math.max(0, 1 - (stdDev / avg));
  }

  /**
   * 计算平均复杂度
   */
  calculateAverageComplexity(data) {
    const complexities = Object.entries(data)
      .filter(([key]) => key !== 'total')
      .map(([_, coverage]) => this.estimateFileComplexity(coverage));

    return complexities.length > 0 ? complexities.reduce((sum, c) => sum + c, 0) / complexities.length : 0;
  }

  /**
   * 计算测试完整性
   */
  calculateTestCompleteness(data) {
    const total = data.total;
    const hasUnitTests = total.functions.covered > 0;
    const hasIntegrationTests = total.branches.covered > 0;
    const hasE2ETests = false; // 可以从其他数据源获取

    return (hasUnitTests ? 0.4 : 0) +
           (hasIntegrationTests ? 0.3 : 0) +
           (hasE2ETests ? 0.3 : 0);
  }

  /**
   * 评估技术债务
   */
  assessTechnicalDebt(data) {
    const total = data.total;
    const uncoveredFiles = this.getUncoveredFiles(data).length;
    const lowCoverageFiles = this.getLowCoverageFiles(data).length;
    const totalFiles = Object.keys(data).length - 1;

    const debtScore = (uncoveredFiles * 3 + lowCoverageFiles * 2 + (100 - total.lines.pct) * 0.5) / totalFiles;

    return {
      score: Math.min(100, debtScore),
      level: debtScore > 20 ? 'high' : debtScore > 10 ? 'medium' : 'low',
      estimatedHours: Math.round(debtScore * 2)
    };
  }

  /**
   * 评估测试健康度
   */
  assessTestHealth(data) {
    const total = data.total;
    return {
      coverageHealth: total.lines.pct,
      distributionHealth: this.calculateCoverageBalance(data),
      qualityHealth: this.calculateQualityScore(data).overall,
      overallHealth: (total.lines.pct + this.calculateCoverageBalance(data) * 100) / 2
    };
  }

  /**
   * 识别代码风险
   */
  identifyCodeRisks(data) {
    const risks = [];

    const uncoveredFiles = this.getUncoveredFiles(data);
    if (uncoveredFiles.length > 0) {
      risks.push({
        type: 'uncovered_code',
        severity: 'high',
        description: `存在 ${uncoveredFiles.length} 个未测试文件`,
        affectedFiles: uncoveredFiles.length
      });
    }

    const lowCoverageFiles = this.getLowCoverageFiles(data);
    if (lowCoverageFiles.length > 0) {
      risks.push({
        type: 'low_coverage',
        severity: 'medium',
        description: `存在 ${lowCoverageFiles.length} 个低覆盖率文件`,
        affectedFiles: lowCoverageFiles.length
      });
    }

    return risks;
  }

  /**
   * 获取行业基准
   */
  getIndustryBenchmarks() {
    return {
      averageCoverage: 75,
      excellentCoverage: 90,
      branchesVsLinesRatio: 0.9,
      functionsVsLinesRatio: 0.95
    };
  }

  /**
   * 与基准比较
   */
  compareWithBenchmarks(data) {
    const benchmarks = this.getIndustryBenchmarks();
    const total = data.total;

    return {
      coverageComparison: {
        industry: total.lines.pct - benchmarks.averageCoverage,
        excellent: total.lines.pct - benchmarks.excellentCoverage,
        status: total.lines.pct >= benchmarks.excellent ? 'excellent' :
                total.lines.pct >= benchmarks.averageCoverage ? 'good' : 'needs_improvement'
      },
      balanceComparison: {
        branchesVsLines: (total.branches.pct / total.lines.pct) - benchmarks.branchesVsLinesRatio,
        functionsVsLines: (total.functions.pct / total.lines.pct) - benchmarks.functionsVsLinesRatio
      }
    };
  }

  /**
   * 生成阈值建议
   */
  generateThresholdRecommendations(thresholds) {
    const recommendations = [];

    if (!thresholds.passed) {
      recommendations.push('立即提升测试覆盖率以满足质量要求');

      thresholds.failedMetrics.forEach(([metric, result]) => {
        recommendations.push(`${metric}: 需要从 ${result.actual}% 提升到 ${result.target}%`);
      });
    }

    return recommendations;
  }

  /**
   * 确保目录存在
   */
  ensureDirectoryExists(dir) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}

// 命令行接口
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {};

  // 解析命令行参数
  for (let i = 0; i < args.length; i += 2) {
    if (args[i] === '--coverage-dir') {
      options.coverageDir = args[i + 1];
    } else if (args[i] === '--output-dir') {
      options.outputDir = args[i + 1];
    } else if (args[i] === '--project-name') {
      options.projectName = args[i + 1];
    } else if (args[i] === '--repository-url') {
      options.repositoryUrl = args[i + 1];
    } else if (args[i] === '--min-coverage') {
      options.minCoverage = parseInt(args[i + 1]);
    } else if (args[i] === '--include-uncovered') {
      options.includeUncoveredFiles = true;
    } else if (args[i] === '--disable-threshold-check') {
      options.enableThresholdCheck = false;
    } else if (args[i] === '--help' || args[i] === '-h') {
      console.log(`
覆盖率报告生成器

用法: node ${path.basename(__filename)} [选项]

选项:
  --coverage-dir <dir>     覆盖率数据目录 (默认: coverage)
  --output-dir <dir>        报告输出目录 (默认: coverage/reports)
  --project-name <name>      项目名称 (默认: Taro Bluetooth Print)
  --repository-url <url>     项目仓库地址
  --min-coverage <number>    最低覆盖率要求 (默认: 80)
  --include-uncovered        包含未覆盖的文件在报告中
  --disable-threshold-check   禁用阈值检查

示例:
  node generate-coverage-report.js
  node generate-coverage-report.js --project-name "My Project" --min-coverage 85
  node generate-coverage-report.js --include-uncovered --disable-threshold-check
  node generate-coverage-report.js --coverage-dir ./test-coverage --output-dir ./reports
      `);
      process.exit(0);
    }
  }

  const reporter = new CoverageReporter(options);
  reporter.generateReport().catch(error => {
    console.error('❌ 生成报告失败:', error);
    process.exit(1);
  });
}

module.exports = CoverageReporter;