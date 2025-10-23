#!/usr/bin/env node

/**
 * VitePress构建调试脚本
 * 用于诊断GitHub Pages部署问题
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../docs/.vitepress/dist');

function debugBuild() {
  console.log('🔍 VitePress构建调试\n');

  // 1. 检查基础文件结构
  console.log('📁 检查基础文件结构:');
  const requiredFiles = [
    'index.html',
    '404.html',
    '.nojekyll',
    'manifest.json',
    'api/index.html',
    'examples/index.html',
    'guide/index.html',
    'reference/index.html'
  ];

  requiredFiles.forEach(file => {
    const filePath = path.join(DIST_DIR, file);
    const exists = fs.existsSync(filePath);
    console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  });

  console.log('\n📂 目录结构:');
  function showTree(dir, prefix = '') {
    try {
      const items = fs.readdirSync(dir);
      items.forEach((item, index) => {
        const itemPath = path.join(dir, item);
        const isLast = index === items.length - 1;
        const stats = fs.statSync(itemPath);

        console.log(`${prefix}${isLast ? '└──' : '├──'} ${item}${stats.isDirectory() ? '/' : ''}`);

        if (stats.isDirectory() && !item.startsWith('.') && prefix.length < 12) {
          showTree(itemPath, prefix + (isLast ? '    ' : '│   '));
        }
      });
    } catch (err) {
      console.log(`${prefix}❌ 无法读取目录: ${err.message}`);
    }
  }

  if (fs.existsSync(DIST_DIR)) {
    showTree(DIST_DIR);
  }

  // 2. 检查HTML文件中的路径配置
  console.log('\n🔍 检查HTML文件路径配置:');
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');

    // 检查base路径
    const hasCorrectBase = indexContent.includes('/taro-bluetooth-print/');
    console.log(`  ${hasCorrectBase ? '✅' : '❌'} Base路径配置正确`);

    // 检查关键资源路径
    const checks = [
      { name: 'CSS文件路径', pattern: /href="\/taro-bluetooth-print\/assets\// },
      { name: 'JS文件路径', pattern: /src="\/taro-bluetooth-print\/assets\// },
      { name: '字体文件路径', pattern: /href="\/taro-bluetooth-print\/assets\// },
      { name: '图标路径', pattern: /href="\/taro-bluetooth-print\// }
    ];

    checks.forEach(check => {
      const found = check.pattern.test(indexContent);
      console.log(`  ${found ? '✅' : '❌'} ${check.name}`);
    });
  }

  // 3. 检查API页面
  console.log('\n🔍 检查API页面:');
  const apiIndexPath = path.join(DIST_DIR, 'api/index.html');
  if (fs.existsSync(apiIndexPath)) {
    const apiContent = fs.readFileSync(apiIndexPath, 'utf8');
    const hasTitle = apiContent.includes('核心 API 参考') || apiContent.includes('API');
    console.log(`  ${hasTitle ? '✅' : '❌'} API页面内容正确`);
  }

  // 4. 检查404页面
  console.log('\n🔍 检查404页面:');
  const notFoundPath = path.join(DIST_DIR, '404.html');
  if (fs.existsSync(notFoundPath)) {
    const notFoundContent = fs.readFileSync(notFoundPath, 'utf8');
    const hasCorrectRouting = notFoundContent.includes('/taro-bluetooth-print/');
    console.log(`  ${hasCorrectRouting ? '✅' : '❌'} 404页面路由正确`);
  }

  // 5. 检查PWA文件
  console.log('\n🔍 检查PWA配置:');
  const manifestPath = path.join(DIST_DIR, 'manifest.json');
  if (fs.existsSync(manifestPath)) {
    try {
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      const hasCorrectStartUrl = manifest.start_url && manifest.start_url.includes('/taro-bluetooth-print/');
      const hasCorrectScope = manifest.scope && manifest.scope.includes('/taro-bluetooth-print/');
      console.log(`  ${hasCorrectStartUrl ? '✅' : '❌'} PWA启动URL正确`);
      console.log(`  ${hasCorrectScope ? '✅' : '❌'} PWA作用域正确`);
    } catch (err) {
      console.log(`  ❌ PWA清单文件格式错误`);
    }
  }

  // 6. 检查Service Worker
  console.log('\n🔍 检查Service Worker:');
  const swPath = path.join(DIST_DIR, 'sw.js');
  if (fs.existsSync(swPath)) {
    const swContent = fs.readFileSync(swPath, 'utf8');
    const hasCorrectFallback = swContent.includes('/taro-bluetooth-print/index.html');
    console.log(`  ${hasCorrectFallback ? '✅' : '❌'} Service Worker回退路径正确`);
  }

  // 7. 生成问题报告
  console.log('\n📊 问题诊断完成！');
  console.log('如果发现问题，请检查：');
  console.log('1. VitePress配置中的base路径设置');
  console.log('2. 构建过程中是否有错误');
  console.log('3. GitHub Pages部署设置');
  console.log('4. 仓库的GitHub Pages权限');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  debugBuild();
}

export { debugBuild };