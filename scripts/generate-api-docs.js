#!/usr/bin/env node

/**
 * API Documentation Generation Script
 *
 * This script generates comprehensive API documentation using TypeDoc
 * and processes the output to be compatible with VitePress.
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class APIDocGenerator {
  constructor(options = {}) {
    this.rootDir = options.rootDir || process.cwd();
    this.srcDir = path.join(this.rootDir, 'src');
    this.docsDir = path.join(this.rootDir, 'docs');
    this.apiDir = path.join(this.docsDir, 'api');
    this.tempDir = path.join(this.rootDir, '.temp-api-docs');

    this.config = {
      typeDocConfig: path.join(this.rootDir, 'build', 'typedoc.json'),
      outputDir: this.apiDir,
      tempOutputDir: this.tempDir,
      verbose: options.verbose || false
    };
  }

  /**
   * Log messages if verbose mode is enabled
   */
  log(message, level = 'info') {
    if (this.config.verbose) {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
    }
  }

  /**
   * Clean up temporary directories
   */
  async cleanup() {
    try {
      await fs.rmdir(this.tempDir, { recursive: true });
      this.log('Cleaned up temporary directory');
    } catch (error) {
      // Ignore if directory doesn't exist
    }
  }

  /**
   * Ensure required directories exist
   */
  async ensureDirectories() {
    const dirs = [
      this.docsDir,
      this.apiDir,
      this.tempDir
    ];

    for (const dir of dirs) {
      await fs.mkdir(dir, { recursive: true });
      this.log(`Created directory: ${dir}`);
    }
  }

  /**
   * Recursively get all TypeScript files
   */
  async getTypeScriptFiles(dir) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          // Skip node_modules and .git directories
          if (!['node_modules', '.git', 'dist', 'coverage'].includes(entry.name)) {
            const subFiles = await this.getTypeScriptFiles(fullPath);
            files.push(...subFiles);
          }
        } else if (entry.isFile() && fullPath.endsWith('.ts')) {
          // Skip test files
          if (!fullPath.includes('.test.') && !fullPath.includes('.spec.')) {
            files.push(fullPath);
          }
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Check if source files exist
   */
  async validateSourceFiles() {
    try {
      const entryFiles = await this.getTypeScriptFiles(this.srcDir);

      if (entryFiles.length === 0) {
        throw new Error('No TypeScript source files found in src directory');
      }

      this.log(`Found ${entryFiles.length} TypeScript files`);
      return true;
    } catch (error) {
      this.log(`Source validation failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Generate TypeDoc documentation
   */
  async generateTypeDoc() {
    try {
      this.log('Starting TypeDoc generation...');

      const command = `npx typedoc --options ${this.config.typeDocConfig} --out ${this.config.tempOutputDir}`;

      this.log(`Running command: ${command}`);

      execSync(command, {
        stdio: this.config.verbose ? 'inherit' : 'pipe',
        cwd: this.rootDir
      });

      this.log('TypeDoc generation completed');
      return true;
    } catch (error) {
      this.log(`TypeDoc generation failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Recursively get all markdown files
   */
  async getMarkdownFiles(dir) {
    const files = [];

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          const subFiles = await this.getMarkdownFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && fullPath.endsWith('.md')) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }

    return files;
  }

  /**
   * Process generated markdown files for VitePress compatibility
   */
  async processMarkdownFiles() {
    try {
      this.log('Processing markdown files for VitePress...');

      const markdownFiles = await this.getMarkdownFiles(this.config.tempOutputDir);

      for (const filePath of markdownFiles) {
        await this.processMarkdownFile(filePath);
      }

      this.log(`Processed ${markdownFiles.length} markdown files`);
      return true;
    } catch (error) {
      this.log(`Markdown processing failed: ${error.message}`, 'error');
      return false;
    }
  }

  /**
   * Process individual markdown file
   */
  async processMarkdownFile(filePath) {
    try {
      let content = await fs.readFile(filePath, 'utf8');
      const relativePath = path.relative(this.config.tempOutputDir, filePath);
      const outputPath = path.join(this.config.outputDir, relativePath);

      // Add frontmatter for VitePress
      content = this.addFrontmatter(content, relativePath);

      // Fix internal links
      content = this.fixInternalLinks(content);

      // Enhance code blocks
      content = this.enhanceCodeBlocks(content);

      // Add table of contents for long pages
      content = this.addTableOfContents(content);

      // Ensure output directory exists
      await fs.mkdir(path.dirname(outputPath), { recursive: true });

      // Write processed file
      await fs.writeFile(outputPath, content, 'utf8');

      this.log(`Processed: ${relativePath}`);
    } catch (error) {
      this.log(`Failed to process file ${filePath}: ${error.message}`, 'error');
    }
  }

  /**
   * Add VitePress frontmatter to markdown files
   */
  addFrontmatter(content, relativePath) {
    // Skip if already has frontmatter
    if (content.startsWith('---')) {
      return content;
    }

    const fileName = path.basename(relativePath, '.md');
    const title = this.extractTitle(content) || fileName;

    const frontmatter = `---
title: ${title}
description: ${this.generateDescription(content, fileName)}
---

`;

    return frontmatter + content;
  }

  /**
   * Extract title from content
   */
  extractTitle(content) {
    const titleMatch = content.match(/^#\s+(.+)$/m);
    return titleMatch ? titleMatch[1] : null;
  }

  /**
   * Generate description from content
   */
  generateDescription(content, fileName) {
    const firstParagraph = content.match(/^#.*?\n\n(.+?)(?:\n\n|$)/s);
    if (firstParagraph) {
      return firstParagraph[1].replace(/\n/g, ' ').substring(0, 150) + '...';
    }
    return `API documentation for ${fileName}`;
  }

  /**
   * Fix internal links to work with VitePress
   */
  fixInternalLinks(content) {
    // Convert .md links to VitePress format
    content = content.replace(/\[([^\]]+)\]\([^)]+\.md\)/g, (match, text) => {
      return `[${text}](${match.toLowerCase().replace('.md', '')})`;
    });

    // Fix anchor links
    content = content.replace(/\[([^\]]+)\]\(#([^)]+)\)/g, (match, text, anchor) => {
      return `[${text}](#${anchor.toLowerCase().replace(/[^a-z0-9-]/g, '-')})`;
    });

    return content;
  }

  /**
   * Enhance code blocks with better syntax highlighting
   */
  enhanceCodeBlocks(content) {
    // Add language hints to code blocks without them
    content = content.replace(/```(\s*\n)/g, '```typescript\n');

    // Enhance TypeScript code blocks
    content = content.replace(/```typescript\n([\s\S]*?)```/g, (match, code) => {
      // Add line numbers for short code blocks
      if (code.split('\n').length <= 10 && !code.includes('```')) {
        return ````typescript:line-numbers\n${code}`;
      }
      return match;
    });

    return content;
  }

  /**
   * Add table of contents for long pages
   */
  addTableOfContents(content) {
    const lines = content.split('\n');
    const headers = [];

    // Extract headers
    lines.forEach((line, index) => {
      const match = line.match(/^(#{2,4})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const title = match[2];
        const anchor = title.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        headers.push({ level, title, anchor, index });
      }
    });

    // Add TOC if there are enough headers
    if (headers.length >= 3) {
      const tocLines = ['## 目录\n'];

      headers.forEach(header => {
        const indent = '  '.repeat(header.level - 2);
        tocLines.push(`${indent}- [${header.title}](#${header.anchor})`);
      });

      tocLines.push('\n---\n');

      // Insert TOC after the first # header
      const firstHeaderIndex = lines.findIndex(line => line.startsWith('# '));
      if (firstHeaderIndex !== -1) {
        lines.splice(firstHeaderIndex + 2, 0, ...tocLines);
        return lines.join('\n');
      }
    }

    return content;
  }

  /**
   * Generate API index page
   */
  async generateAPIIndex() {
    try {
      this.log('Generating API index page...');

      const indexPath = path.join(this.config.outputDir, 'index.md');

      const indexContent = `---
title: API 参考
description: Taro Bluetooth Print 完整 API 文档
---

# API 参考

本页面提供了 Taro Bluetooth Print 库的完整 API 参考。

## 快速导航

### 核心类

- [BluetoothPrinter](./classes/BluetoothPrinter.md) - 主要的蓝牙打印机类
- [BluetoothAdapter](./classes/BluetoothAdapter.md) - 蓝牙适配器管理

### 类型定义

- [PrinterOptions](./interfaces/PrinterOptions.md) - 打印机配置选项
- [BluetoothDevice](./interfaces/BluetoothDevice.md) - 蓝牙设备信息
- [PrintResult](./interfaces/PrintResult.md) - 打印结果

### 工具函数

- [formatPrintData](./functions/formatPrintData.md) - 格式化打印数据
- [validateDevice](./functions/validateDevice.md) - 验证设备兼容性

## 使用示例

### 基础用法

\`\`\`typescript
import { BluetoothPrinter } from 'taro-bluetooth-print'

const printer = new BluetoothPrinter({
  debug: true
})

// 连接设备并打印
await printer.connect('device_id')
await printer.printText('Hello World!')
await printer.disconnect()
\`\`\`

### 高级配置

\`\`\`typescript
const printer = new BluetoothPrinter({
  timeout: 30000,
  retries: 3,
  autoReconnect: true
})
\`\`\`

## 错误处理

所有 API 方法都可能抛出以下错误类型：

- \`BluetoothError\` - 蓝牙连接相关错误
- \`PrinterError\` - 打印机操作错误
- \`TimeoutError\` - 操作超时错误

详细错误信息请参考各个 API 方法的文档。

---

> 💡 **提示**: 如果您是第一次使用，建议先阅读 [快速开始指南](../guide/getting-started.md)。
`;

      await fs.writeFile(indexPath, indexContent, 'utf8');
      this.log('API index page generated');
    } catch (error) {
      this.log(`Failed to generate API index: ${error.message}`, 'error');
    }
  }

  /**
   * Recursively copy all files and directories
   */
  async copyFiles(srcDir, destDir) {
    await fs.mkdir(destDir, { recursive: true });

    try {
      const entries = await fs.readdir(srcDir, { withFileTypes: true });

      for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);

        if (entry.isDirectory()) {
          await this.copyFiles(srcPath, destPath);
        } else if (entry.isFile()) {
          await fs.copyFile(srcPath, destPath);
        }
      }
    } catch (error) {
      // Directory doesn't exist or can't be read
    }
  }

  /**
   * Copy processed files to final destination
   */
  async copyToOutput() {
    try {
      this.log('Copying files to output directory...');

      await this.copyFiles(this.config.tempOutputDir, this.config.outputDir);

      this.log('Files copied to output directory');
    } catch (error) {
      this.log(`Failed to copy files: ${error.message}`, 'error');
    }
  }

  /**
   * Generate documentation statistics
   */
  async generateStats() {
    try {
      const stats = {
        generatedAt: new Date().toISOString(),
        totalFiles: 0,
        classes: 0,
        interfaces: 0,
        functions: 0,
        types: 0
      };

      const files = await this.getMarkdownFiles(this.config.outputDir);
      stats.totalFiles = files.length;

      // Count different types of API elements
      for (const filePath of files) {
        const content = await fs.readFile(filePath, 'utf8');

        if (filePath.includes('/classes/')) stats.classes++;
        else if (filePath.includes('/interfaces/')) stats.interfaces++;
        else if (filePath.includes('/functions/')) stats.functions++;
        else if (filePath.includes('/types/')) stats.types++;
      }

      // Write stats file
      const statsPath = path.join(this.config.outputDir, '.stats.json');
      await fs.writeFile(statsPath, JSON.stringify(stats, null, 2));

      this.log('Documentation statistics:');
      this.log(`  Total files: ${stats.totalFiles}`);
      this.log(`  Classes: ${stats.classes}`);
      this.log(`  Interfaces: ${stats.interfaces}`);
      this.log(`  Functions: ${stats.functions}`);
      this.log(`  Types: ${stats.types}`);

      return stats;
    } catch (error) {
      this.log(`Failed to generate stats: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Main generation process
   */
  async generate() {
    try {
      this.log('Starting API documentation generation...');

      // Clean up and prepare
      await this.cleanup();
      await this.ensureDirectories();

      // Validate source files
      const sourceValid = await this.validateSourceFiles();
      if (!sourceValid) {
        throw new Error('Source files validation failed');
      }

      // Generate TypeDoc documentation
      const typeDocSuccess = await this.generateTypeDoc();
      if (!typeDocSuccess) {
        throw new Error('TypeDoc generation failed');
      }

      // Process markdown files for VitePress
      const processingSuccess = await this.processMarkdownFiles();
      if (!processingSuccess) {
        this.log('Warning: Markdown processing had issues, but continuing...');
      }

      // Generate additional pages
      await this.generateAPIIndex();

      // Generate statistics
      await this.generateStats();

      // Clean up
      await this.cleanup();

      this.log('✅ API documentation generation completed successfully!');
      return true;

    } catch (error) {
      this.log(`❌ API documentation generation failed: ${error.message}`, 'error');
      await this.cleanup();
      return false;
    }
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    verbose: args.includes('--verbose') || args.includes('-v')
  };

  const generator = new APIDocGenerator(options);

  generator.generate()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('Generation failed:', error);
      process.exit(1);
    });
}

module.exports = APIDocGenerator;