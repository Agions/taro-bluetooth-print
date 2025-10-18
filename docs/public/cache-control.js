// GitHub Pages静态资源缓存控制
// 添加到VitePress构建后处理脚本

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DIST_DIR = path.join(__dirname, '../.vitepress/dist');

function addCacheControl() {
  // 为静态资源添加缓存控制头信息
  const assetsDir = path.join(DIST_DIR, 'assets');

  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir);

    files.forEach(file => {
      const filePath = path.join(assetsDir, file);
      const ext = path.extname(file);

      // 不同文件类型设置不同的缓存策略
      let cacheControl = 'public, max-age=31536000, immutable'; // 1年，不可变

      switch(ext) {
        case '.html':
          cacheControl = 'public, max-age=3600, must-revalidate'; // 1小时
          break;
        case '.js':
        case '.css':
          cacheControl = 'public, max-age=31536000, immutable'; // 1年，不可变
          break;
        case '.woff':
        case '.woff2':
          cacheControl = 'public, max-age=31536000, immutable'; // 1年，不可变
          break;
        case '.png':
        case '.jpg':
        case '.jpeg':
        case '.svg':
        case '.ico':
          cacheControl = 'public, max-age=86400, immutable'; // 1天，不可变
          break;
      }

      // GitHub Pages不支持服务器端缓存控制，所以这里只是文档说明
      console.log(`📁 ${file} -> ${cacheControl}`);
    });
  }
}

// 创建缓存控制说明文件
function createCacheManifest() {
  const manifest = {
    "version": Date.now(),
    "files": {
      "/*.html": "public, max-age=3600, must-revalidate",
      "/assets/*.js": "public, max-age=31536000, immutable",
      "/assets/*.css": "public, max-age=31536000, immutable",
      "/assets/*.woff": "public, max-age=31536000, immutable",
      "/assets/*.woff2": "public, max-age=31536000, immutable",
      "/assets/*.png": "public, max-age=86400, immutable",
      "/assets/*.jpg": "public, max-age=86400, immutable",
      "/assets/*.svg": "public, max-age=86400, immutable",
      "/assets/*.ico": "public, max-age=86400, immutable"
    }
  };

  fs.writeFileSync(
    path.join(DIST_DIR, 'cache-manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log('✅ 缓存清单文件已创建');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('🔧 设置静态资源缓存控制...');
  addCacheControl();
  createCacheManifest();
  console.log('✅ 缓存控制配置完成');
}

export { addCacheControl, createCacheManifest };