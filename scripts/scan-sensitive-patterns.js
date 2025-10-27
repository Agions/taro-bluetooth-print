#!/usr/bin/env node

/**
 * Sensitive Pattern Scanner
 * Scans source code for potentially sensitive information patterns
 */

const fs = require('fs');
const path = require('path');

class SensitivePatternScanner {
  constructor(options = {}) {
    this.inputDir = options.inputDir || 'src';
    this.outputFile = options.output || 'sensitive-patterns-report.json';
    this.patterns = this.getPatterns();
  }

  getPatterns() {
    return [
      // API Keys and Tokens
      {
        name: 'API Key',
        pattern: /(?:api[_-]?key|apikey|api[_-]?secret|token)\s*[:=]\s*['"']?([a-zA-Z0-9_-]{20,})['"']?/gi,
        severity: 'critical',
        description: 'Possible API key or token detected'
      },
      // Database connection strings
      {
        name: 'Database Connection',
        pattern: /(?:mongodb|mysql|postgres|redis)[^:]*:\/\/[^:\s]+:[^@\s]+@/gi,
        severity: 'critical',
        description: 'Database connection string with credentials detected'
      },
      // URLs with credentials
      {
        name: 'URL with Credentials',
        pattern: /https?:\/\/[^:\s]+:[^@\s]+@/gi,
        severity: 'high',
        description: 'URL containing username and password'
      },
      // Email addresses
      {
        name: 'Email Address',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        severity: 'medium',
        description: 'Email address detected'
      },
      // IP addresses
      {
        name: 'IP Address',
        pattern: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
        severity: 'low',
        description: 'IP address detected'
      },
      // AWS credentials
      {
        name: 'AWS Credentials',
        pattern: /AKIA[0-9A-Z]{16}/g,
        severity: 'critical',
        description: 'AWS access key detected'
      },
      // JWT tokens
      {
        name: 'JWT Token',
        pattern: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
        severity: 'high',
        description: 'JWT token detected'
      },
      // SSH keys
      {
        name: 'SSH Private Key',
        pattern: /-----BEGIN [A-Z]+ PRIVATE KEY-----/g,
        severity: 'critical',
        description: 'SSH private key detected'
      },
      // Certificates
      {
        name: 'Certificate',
        pattern: /-----BEGIN [A-Z]+ CERTIFICATE-----/g,
        severity: 'high',
        description: 'Certificate detected'
      },
      // Potential passwords
      {
        name: 'Password',
        pattern: /(?:password|passwd|pwd)\s*[:=]\s*['"']?([^\s'"']{6,})['"']?/gi,
        severity: 'high',
        description: 'Possible password detected'
      },
      // Private keys in PEM format
      {
        name: 'Private Key PEM',
        pattern: /-----BEGIN\s+RSA\s+PRIVATE\s+KEY-----/g,
        severity: 'critical',
        description: 'RSA private key detected'
      },
      // OAuth tokens
      {
        name: 'OAuth Token',
        pattern: /oauth[_-]?token\s*[:=]\s*['"']?([a-zA-Z0-9_-]{20,})['"']?/gi,
        severity: 'high',
        description: 'OAuth token detected'
      }
    ];
  }

  async scan() {
    console.log('🔍 扫描敏感信息模式...');

    const results = {
      timestamp: new Date().toISOString(),
      scanDir: this.inputDir,
      findings: [],
      summary: {
        total: 0,
        critical: 0,
        high: 0,
        medium: 0,
        low: 0
      }
    };

    const files = this.getFiles(this.inputDir);

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const fileResults = this.scanFile(file, content);

      results.findings.push(...fileResults);
    }

    // 计算摘要
    results.findings.forEach(finding => {
      results.summary.total++;
      results.summary[finding.severity]++;
    });

    // 保存结果
    this.saveResults(results);

    // 输出摘要
    this.outputSummary(results.summary);

    console.log('✅ 敏感信息扫描完成');
    return results;
  }

  getFiles(dir, fileList = []) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        this.getFiles(fullPath, fileList);
      } else if (stat.isFile() && this.shouldScanFile(item)) {
        fileList.push(fullPath);
      }
    }

    return fileList;
  }

  shouldScanFile(fileName) {
    const extensions = ['.ts', '.tsx', '.js', '.jsx', '.json', '.yml', '.yaml', '.env', '.config'];
    const excludePatterns = [
      /\.d\.ts$/,
      /\.min\.js$/,
      /\.bundle\.js$/,
      /node_modules/,
      /\.git/
    ];

    // 检查扩展名
    const hasValidExtension = extensions.some(ext => fileName.endsWith(ext));
    if (!hasValidExtension) return false;

    // 检查排除模式
    return !excludePatterns.some(pattern => pattern.test(fileName));
  }

  scanFile(filePath, content) {
    const findings = [];
    const lines = content.split('\n');

    this.patterns.forEach(pattern => {
      let match;
      const regex = new RegExp(pattern.pattern);

      while ((match = regex.exec(content)) !== null) {
        const lineNumber = this.getLineNumber(content, match.index);
        const lineContent = lines[lineNumber - 1];

        findings.push({
          file: path.relative(process.cwd(), filePath),
          line: lineNumber,
          pattern: pattern.name,
          severity: pattern.severity,
          description: pattern.description,
          match: match[0],
          context: lineContent.trim()
        });
      }
    });

    return findings;
  }

  getLineNumber(content, index) {
    const beforeIndex = content.substring(0, index);
    return beforeIndex.split('\n').length;
  }

  outputSummary(summary) {
    console.log('\n📊 敏感信息扫描摘要:');
    console.log('='.repeat(50));
    console.log(`🔍 总发现: ${summary.total}`);
    console.log(`🚨 严重: ${summary.critical}`);
    console.log(`⚠️  高危: ${summary.high}`);
    console.log(`📝 中危: ${summary.medium}`);
    console.log(`ℹ️  低危: ${summary.low}`);

    if (summary.critical > 0) {
      console.log('\n❌ 发现严重安全问题，请立即处理！');
    } else if (summary.high > 0) {
      console.log('\n⚠️ 发现高危安全问题，建议及时处理');
    } else if (summary.total > 0) {
      console.log('\n📝 发现一些需要关注的敏感信息');
    } else {
      console.log('\n✅ 未发现明显的敏感信息');
    }
  }

  saveResults(results) {
    fs.writeFileSync(this.outputFile, JSON.stringify(results, null, 2));
    console.log(`\n📄 扫描结果已保存: ${this.outputFile}`);
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
      case '--input-dir':
        options.inputDir = value;
        break;
      case '--output':
        options.output = value;
        break;
    }
  }

  const scanner = new SensitivePatternScanner(options);
  scanner.scan().catch(error => {
    console.error('❌ 敏感信息扫描失败:', error.message);
    process.exit(1);
  });
}

module.exports = SensitivePatternScanner;