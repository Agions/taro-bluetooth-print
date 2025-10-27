#!/usr/bin/env node

/**
 * Performance Analysis Script
 * Analyzes performance test results and generates reports
 */

const fs = require('fs');
const path = require('path');

class PerformanceAnalyzer {
  constructor(options = {}) {
    this.threshold = options.threshold || 10; // Performance regression threshold in percentage
    this.baselineFile = options.baseline;
    this.inputFile = options.input;
    this.outputFile = options.output || 'performance-analysis.html';
  }

  async analyze() {
    console.log('🔍 分析性能测试结果...');

    const currentResults = this.loadResults(this.inputFile);
    const baselineResults = this.baselineFile ? this.loadResults(this.baselineFile) : null;

    const analysis = {
      timestamp: new Date().toISOString(),
      current: currentResults,
      baseline: baselineResults,
      comparison: baselineResults ? this.compareResults(currentResults, baselineResults) : null,
      recommendations: this.generateRecommendations(currentResults, baselineResults)
    };

    this.generateHTMLReport(analysis);
    this.generateJSONReport(analysis);

    console.log('✅ 性能分析完成');
    return analysis;
  }

  loadResults(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ 文件不存在: ${filePath}`);
        return null;
      }

      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      console.error(`❌ 读取结果文件失败: ${error.message}`);
      return null;
    }
  }

  compareResults(current, baseline) {
    if (!current || !baseline) return null;

    const comparison = {
      metrics: {},
      summary: {
        improved: 0,
        regressed: 0,
        unchanged: 0
      }
    };

    // 比较各项性能指标
    const metrics = ['responseTime', 'throughput', 'memoryUsage', 'cpuUsage', 'errorRate'];

    metrics.forEach(metric => {
      const currentVal = this.extractMetric(current, metric);
      const baselineVal = this.extractMetric(baseline, metric);

      if (currentVal !== null && baselineVal !== null && baselineVal > 0) {
        const change = ((currentVal - baselineVal) / baselineVal) * 100;
        const status = this.getStatus(change, metric);

        comparison.metrics[metric] = {
          current: currentVal,
          baseline: baselineVal,
          change: change.toFixed(2),
          status: status,
          significant: Math.abs(change) >= this.threshold
        };

        if (status === 'improved') comparison.summary.improved++;
        else if (status === 'regressed') comparison.summary.regressed++;
        else comparison.summary.unchanged++;
      }
    });

    return comparison;
  }

  extractMetric(data, metric) {
    // 从性能测试数据中提取特定指标
    const extractors = {
      responseTime: (d) => d.avgResponseTime || d.meanLatency || d.responseTime,
      throughput: (d) => d.throughput || d.requestsPerSecond || d.rps,
      memoryUsage: (d) => d.memoryUsage || d.heapUsed || d.memory,
      cpuUsage: (d) => d.cpuUsage || d.cpu || d.cpuPercent,
      errorRate: (d) => d.errorRate || (d.errors / d.requests * 100) || 0
    };

    const extractor = extractors[metric];
    return extractor ? extractor(data) : null;
  }

  getStatus(change, metric) {
    // 根据指标类型确定变化是好是坏
    const lowerIsBetter = ['responseTime', 'memoryUsage', 'cpuUsage', 'errorRate'];
    const higherIsBetter = ['throughput'];

    if (lowerIsBetter.includes(metric)) {
      return change < -this.threshold ? 'improved' : change > this.threshold ? 'regressed' : 'unchanged';
    } else if (higherIsBetter.includes(metric)) {
      return change > this.threshold ? 'improved' : change < -this.threshold ? 'regressed' : 'unchanged';
    }

    return 'unchanged';
  }

  generateRecommendations(current, baseline) {
    const recommendations = [];

    if (!current) return recommendations;

    // 基于当前性能数据生成建议
    if (this.extractMetric(current, 'responseTime') > 5000) {
      recommendations.push({
        type: 'performance',
        priority: 'high',
        title: '响应时间过长',
        description: '平均响应时间超过5秒，建议优化代码逻辑或增加缓存',
        action: '检查数据库查询、API调用和算法复杂度'
      });
    }

    if (this.extractMetric(current, 'memoryUsage') > 512) {
      recommendations.push({
        type: 'memory',
        priority: 'medium',
        title: '内存使用过高',
        description: '内存使用超过512MB，可能存在内存泄漏',
        action: '进行内存分析，检查未释放的资源'
      });
    }

    if (this.extractMetric(current, 'errorRate') > 1) {
      recommendations.push({
        type: 'reliability',
        priority: 'high',
        title: '错误率过高',
        description: '错误率超过1%，影响系统稳定性',
        action: '检查错误日志，修复导致失败的问题'
      });
    }

    if (this.extractMetric(current, 'cpuUsage') > 80) {
      recommendations.push({
        type: 'performance',
        priority: 'medium',
        title: 'CPU使用率过高',
        description: 'CPU使用率超过80%，影响系统性能',
        action: '优化CPU密集型操作，考虑异步处理'
      });
    }

    // 与基准比较的建议
    if (baseline) {
      const comparison = this.compareResults(current, baseline);
      if (comparison && comparison.summary.regressed > 0) {
        recommendations.push({
          type: 'regression',
          priority: 'high',
          title: '检测到性能回归',
          description: `发现${comparison.summary.regressed}项性能指标回归`,
          action: '对比最近代码变更，找出导致性能下降的原因'
        });
      }
    }

    return recommendations;
  }

  generateHTMLReport(analysis) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>性能分析报告</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }
        .content { padding: 30px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .metric-value { font-size: 2em; font-weight: bold; color: #007bff; }
        .metric-label { color: #6c757d; margin-top: 5px; }
        .comparison-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        .comparison-table th, .comparison-table td { padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6; }
        .improved { color: #28a745; font-weight: bold; }
        .regressed { color: #dc3545; font-weight: bold; }
        .unchanged { color: #6c757d; }
        .recommendations { margin-top: 30px; }
        .recommendation { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 15px; margin-bottom: 15px; }
        .recommendation.high { background: #f8d7da; border-color: #f5c6cb; }
        .recommendation.medium { background: #fff3cd; border-color: #ffeaa7; }
        .recommendation.low { background: #d1ecf1; border-color: #bee5eb; }
        .timestamp { color: #6c757d; text-align: center; margin-top: 30px; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>性能分析报告</h1>
            <p>生成时间: ${new Date(analysis.timestamp).toLocaleString('zh-CN')}</p>
        </div>

        <div class="content">
            <h2>📊 当前性能指标</h2>
            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value">${this.extractMetric(analysis.current, 'responseTime') || 'N/A'}ms</div>
                    <div class="metric-label">响应时间</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.extractMetric(analysis.current, 'throughput') || 'N/A'}</div>
                    <div class="metric-label">吞吐量 (req/s)</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.extractMetric(analysis.current, 'memoryUsage') || 'N/A'}MB</div>
                    <div class="metric-label">内存使用</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value">${this.extractMetric(analysis.current, 'cpuUsage') || 'N/A'}%</div>
                    <div class="metric-label">CPU使用率</div>
                </div>
            </div>

            ${analysis.comparison ? `
            <h2>📈 性能对比分析</h2>
            <table class="comparison-table">
                <thead>
                    <tr>
                        <th>指标</th>
                        <th>当前值</th>
                        <th>基准值</th>
                        <th>变化</th>
                        <th>状态</th>
                    </tr>
                </thead>
                <tbody>
                    ${Object.entries(analysis.comparison.metrics).map(([metric, data]) => `
                        <tr>
                            <td>${this.getMetricLabel(metric)}</td>
                            <td>${data.current}</td>
                            <td>${data.baseline}</td>
                            <td>${data.change}%</td>
                            <td class="${data.status}">
                                ${this.getStatusIcon(data.status)} ${this.getStatusText(data.status)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="metric-grid">
                <div class="metric-card">
                    <div class="metric-value improved">${analysis.comparison.summary.improved}</div>
                    <div class="metric-label">改进指标</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value regressed">${analysis.comparison.summary.regressed}</div>
                    <div class="metric-label">回归指标</div>
                </div>
                <div class="metric-card">
                    <div class="metric-value unchanged">${analysis.comparison.summary.unchanged}</div>
                    <div class="metric-label">不变指标</div>
                </div>
            </div>
            ` : '<p>⚠️ 无基准数据进行对比</p>'}

            <h2>💡 优化建议</h2>
            <div class="recommendations">
                ${analysis.recommendations.length > 0 ?
                  analysis.recommendations.map(rec => `
                    <div class="recommendation ${rec.priority}">
                        <h4>${this.getPriorityIcon(rec.priority)} ${rec.title}</h4>
                        <p>${rec.description}</p>
                        <p><strong>建议操作:</strong> ${rec.action}</p>
                    </div>
                  `).join('') :
                  '<p>✅ 当前性能表现良好，无特定建议</p>'
                }
            </div>

            <div class="timestamp">
                报告由 Taro Bluetooth Print 性能分析系统生成
            </div>
        </div>
    </div>
</body>
</html>`;

    fs.writeFileSync(this.outputFile, html);
    console.log(`📄 HTML报告已生成: ${this.outputFile}`);
  }

  generateJSONReport(analysis) {
    const jsonFile = this.outputFile.replace('.html', '.json');
    fs.writeFileSync(jsonFile, JSON.stringify(analysis, null, 2));
    console.log(`📊 JSON报告已生成: ${jsonFile}`);
  }

  getMetricLabel(metric) {
    const labels = {
      responseTime: '响应时间',
      throughput: '吞吐量',
      memoryUsage: '内存使用',
      cpuUsage: 'CPU使用率',
      errorRate: '错误率'
    };
    return labels[metric] || metric;
  }

  getStatusIcon(status) {
    const icons = {
      improved: '📈',
      regressed: '📉',
      unchanged: '➡️'
    };
    return icons[status] || '❓';
  }

  getStatusText(status) {
    const texts = {
      improved: '改进',
      regressed: '回归',
      unchanged: '不变'
    };
    return texts[status] || '未知';
  }

  getPriorityIcon(priority) {
    const icons = {
      high: '🚨',
      medium: '⚠️',
      low: 'ℹ️'
    };
    return icons[priority] || 'ℹ️';
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
      case '--input':
        options.input = value;
        break;
      case '--baseline':
        options.baseline = value;
        break;
      case '--threshold':
        options.threshold = parseFloat(value);
        break;
      case '--output':
        options.output = value;
        break;
    }
  }

  if (!options.input) {
    console.error('❌ 请指定输入文件: --input <file>');
    process.exit(1);
  }

  const analyzer = new PerformanceAnalyzer(options);
  analyzer.analyze().catch(error => {
    console.error('❌ 性能分析失败:', error.message);
    process.exit(1);
  });
}

module.exports = PerformanceAnalyzer;