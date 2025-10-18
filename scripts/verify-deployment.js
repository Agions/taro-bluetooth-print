#!/usr/bin/env node

/**
 * GitHub Pages部署验证脚本
 * 验证部署后的文档站点是否正常工作
 */

const https = require('https');
const { execSync } = require('child_process');

const BASE_URL = 'https://agions.github.io/taro-bluetooth-print';
const PAGES_TO_CHECK = [
  '/',
  '/api/',
  '/examples/',
  '/guide/getting-started',
  '/reference/changelog'
];

function checkPage(url) {
  return new Promise((resolve) => {
    const fullUrl = `${BASE_URL}${url}`;

    console.log(`🔍 检查页面: ${fullUrl}`);

    const req = https.get(fullUrl, (res) => {
      const statusCode = res.statusCode;

      if (statusCode >= 200 && statusCode < 400) {
        console.log(`✅ ${url} - ${statusCode}`);
        resolve({ url, success: true, statusCode });
      } else {
        console.log(`❌ ${url} - ${statusCode}`);
        resolve({ url, success: false, statusCode });
      }
    });

    req.on('error', (err) => {
      console.log(`💥 ${url} - 连接错误: ${err.message}`);
      resolve({ url, success: false, error: err.message });
    });

    req.setTimeout(10000, () => {
      req.destroy();
      console.log(`⏰ ${url} - 超时`);
      resolve({ url, success: false, error: 'Timeout' });
    });
  });
}

async function main() {
  console.log('🚀 开始验证GitHub Pages部署...\n');

  const results = [];

  for (const page of PAGES_TO_CHECK) {
    const result = await checkPage(page);
    results.push(result);

    // 避免请求过于频繁
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n📊 验证结果:');
  console.log('=' .repeat(50));

  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ 成功: ${successful}`);
  console.log(`❌ 失败: ${failed}`);

  if (failed > 0) {
    console.log('\n🚨 失败的页面:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.url}: ${r.error || `HTTP ${r.statusCode}`}`);
    });

    console.log('\n🔧 可能的解决方案:');
    console.log('1. 检查GitHub Pages设置是否正确');
    console.log('2. 确认构建输出包含所有必要文件');
    console.log('3. 验证base路径配置');
    console.log('4. 检查.nojekyll文件是否存在');

    process.exit(1);
  } else {
    console.log('\n🎉 所有页面验证通过！');
    console.log('文档站点部署成功！');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { checkPage, PAGES_TO_CHECK };