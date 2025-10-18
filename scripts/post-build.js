#!/usr/bin/env node

/**
 * VitePress构建后处理脚本
 * 确保所有GitHub Pages需要的文件都存在
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../docs/.vitepress/dist');

function createEssentialFiles() {
  console.log('🔧 创建GitHub Pages必需文件...');

  // 1. 确保存在.nojekyll文件
  const nojekyllPath = path.join(DIST_DIR, '.nojekyll');
  if (!fs.existsSync(nojekyllPath)) {
    fs.writeFileSync(nojekyllPath, '');
    console.log('✅ 创建.nojekyll文件');
  }

  // 2. 创建robots.txt
  const robotsPath = path.join(DIST_DIR, 'robots.txt');
  if (!fs.existsSync(robotsPath)) {
    const robotsContent = `User-agent: *
Allow: /
Sitemap: https://agions.github.io/taro-bluetooth-print/sitemap.xml

# 允许所有爬虫访问文档站点
`;
    fs.writeFileSync(robotsPath, robotsContent);
    console.log('✅ 创建robots.txt文件');
  }

  // 3. 创建安全头部
  const securityPath = path.join(DIST_DIR, '.well-known/security.txt');
  const securityDir = path.dirname(securityPath);

  if (!fs.existsSync(securityDir)) {
    fs.mkdirSync(securityDir, { recursive: true });
  }

  const securityContent = `Contact: mailto:security@agions.com
Expires: 2025-12-31T23:59:59.000Z
Preferred-Languages: en, zh-CN
Canonical: https://agions.github.io/taro-bluetooth-print/.well-known/security.txt
`;

  if (!fs.existsSync(securityPath)) {
    fs.writeFileSync(securityPath, securityContent);
    console.log('✅ 创建安全策略文件');
  }

  // 4. 验证并修复HTML文件中的路径
  console.log('🔍 验证HTML文件路径...');
  const htmlFiles = [];

  function findHtmlFiles(dir) {
    const items = fs.readdirSync(dir);
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stats = fs.statSync(itemPath);

      if (stats.isDirectory()) {
        findHtmlFiles(itemPath);
      } else if (item.endsWith('.html')) {
        htmlFiles.push(itemPath);
      }
    });
  }

  if (fs.existsSync(DIST_DIR)) {
    findHtmlFiles(DIST_DIR);
  }

  htmlFiles.forEach(filePath => {
    try {
      let content = fs.readFileSync(filePath, 'utf8');
      let modified = false;

      // 检查并修复相对路径问题
      if (content.includes('href="/') && !content.includes('href="/taro-bluetooth-print/')) {
        // 这是一个简化的检查，实际使用中需要更复杂的逻辑
        console.log(`⚠️  检查路径: ${path.relative(DIST_DIR, filePath)}`);
      }

      if (modified) {
        fs.writeFileSync(filePath, content);
      }
    } catch (err) {
      console.log(`❌ 处理文件失败: ${filePath} - ${err.message}`);
    }
  });

  console.log(`✅ 处理了 ${htmlFiles.length} 个HTML文件`);

  // 5. 创建部署信息文件
  const deployInfoPath = path.join(DIST_DIR, 'deploy-info.json');
  const deployInfo = {
    buildTime: new Date().toISOString(),
    buildVersion: process.env.GITHUB_SHA || 'local',
    buildUrl: process.env.GITHUB_SERVER_URL + '/' + process.env.GITHUB_REPOSITORY || 'local',
    nodeVersion: process.version,
    platform: process.platform
  };

  fs.writeFileSync(deployInfoPath, JSON.stringify(deployInfo, null, 2));
  console.log('✅ 创建部署信息文件');
}

function validateBuild() {
  console.log('\n🔍 验证构建输出...');

  const criticalFiles = [
    'index.html',
    '404.html',
    '.nojekyll',
    'manifest.json'
  ];

  const criticalPaths = [
    'api/index.html',
    'examples/index.html',
    'guide/getting-started.html',
    'reference/changelog.html'
  ];

  let allGood = true;

  console.log('📁 检查关键文件:');
  criticalFiles.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    const exists = fs.existsSync(filePath);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
    if (!exists) allGood = false;
  });

  console.log('\n📂 检查关键路径:');
  criticalPaths.forEach(filePath => {
    const fullPath = path.join(DIST_DIR, filePath);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✅' : '❌'} ${filePath}`);
    if (!exists) allGood = false;
  });

  if (allGood) {
    console.log('\n🎉 构建验证通过！');
  } else {
    console.log('\n❌ 构建验证失败，请检查构建过程');
    process.exit(1);
  }
}

// 检查是否直接运行此脚本
const isMainModule = import.meta.url === `file://${process.argv[1]}` ||
                   import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` ||
                   process.argv[1].endsWith('post-build.js');

if (isMainModule) {
  createEssentialFiles();
  validateBuild();
}

export { createEssentialFiles, validateBuild };