# GitHub Pages 部署检查清单

## 🔧 部署前检查

### 1. 项目配置
- [ ] VitePress配置文件 `docs/.vitepress/config.ts` 正确设置
- [ ] `base` 路径设置为 `/taro-bluetooth-print/`
- [ ] `.nojekyll` 文件存在
- [ ] GitHub Actions 工作流配置正确

### 2. 构建验证
```bash
# 本地构建测试
npm run docs:full

# 验证构建输出
node scripts/debug-build.js

# 本地预览测试
npm run docs:serve
```

### 3. GitHub仓库设置
- [ ] 仓库是公开的（Public）
- [ ] GitHub Pages 已启用
- [ ] 源分支设置为 `gh-pages` 或 `main`
- [ ] 正确的权限设置：
  - `contents: read`
  - `pages: write`
  - `id-token: write`

## 🚀 部署过程

### 1. 推送代码
```bash
git add .
git commit -m "feat: update docs for GitHub Pages deployment"
git push origin main
```

### 2. 监控GitHub Actions
- [ ] 工作流开始执行
- [ ] 构建步骤成功
- [ ] 部署步骤成功
- [ ] 无错误或警告

## ✅ 部署后验证

### 1. 基础访问测试
```bash
# 等待部署完成（通常需要2-5分钟）
sleep 300

# 运行验证脚本
npm run docs:verify
```

### 2. 手动测试页面
- [ ] 主页: https://agions.github.io/taro-bluetooth-print/
- [ ] API文档: https://agions.github.io/taro-bluetooth-print/api/
- [ ] 示例页面: https://agions.github.io/taro-bluetooth-print/examples/
- [ ] 指南页面: https://agions.github.io/taro-bluetooth-print/guide/getting-started

### 3. 功能测试
- [ ] 导航菜单正常工作
- [ ] 搜索功能正常
- [ ] 链接跳转正常
- [ ] 响应式设计正常
- [ ] PWA功能正常（如果启用）

## 🚨 常见问题排查

### 问题1: 404错误
**症状**: 访问任何页面都返回404
**解决方案**:
1. 检查`.nojekyll`文件是否存在
2. 验证`base`路径配置
3. 确认GitHub Pages设置正确

### 问题2: 静态资源加载失败
**症状**: CSS/JS文件无法加载
**解决方案**:
1. 检查资源路径是否包含正确的base路径
2. 验证构建输出文件完整性
3. 清除浏览器缓存重试

### 问题3: PWA问题
**症状**: Service Worker注册失败
**解决方案**:
1. 检查`manifest.json`路径
2. 验证Service Worker作用域
3. 检查HTTPS证书（GitHub Pages自动提供）

### 问题4: 构建失败
**症状**: GitHub Actions构建失败
**解决方案**:
1. 检查依赖版本兼容性
2. 验证Node.js版本
3. 查看详细错误日志

## 🛠️ 维护任务

### 每月检查
- [ ] 检查依赖更新
- [ ] 验证所有链接仍然有效
- [ ] 测试新功能兼容性

### 版本发布时
- [ ] 更新版本号
- [ ] 更新CHANGELOG
- [ ] 重新构建文档
- [ ] 验证部署成功

## 📞 获取帮助

### GitHub文档
- [GitHub Pages文档](https://docs.github.com/en/pages)
- [GitHub Actions文档](https://docs.github.com/en/actions)
- [VitePress部署指南](https://vitepress.dev/guide/deploy)

### 社区支持
- [GitHub Issues](https://github.com/Agions/taro-bluetooth-print/issues)
- [讨论区](https://github.com/Agions/taro-bluetooth-print/discussions)

---

**最后更新**: 2025-10-18
**维护者**: Agions