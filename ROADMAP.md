# 项目规划 / Project Roadmap

## 当前状态 (v2.3.0)

### ✅ 已完成

| 类别 | 内容 |
|------|------|
| **核心功能** | 蓝牙连接、打印、断点续传、队列、离线缓存 |
| **驱动** | ESC/POS, TSPL, ZPL, CPCL |
| **适配器** | 微信/支付宝/百度/字节小程序, H5 WebBluetooth, 鸿蒙 |
| **文档** | 完整中文文档、API参考、故障排除 |
| **示例** | 微信/H5/鸿蒙/React Native 完整示例 |
| **测试** | 69 个测试用例 |

### 📊 质量指标

```
Build: 547KB (gzip: 207KB)
Tests: 69 passed
Lint: 大部分通过
```

---

## 短期规划 (v2.4.0)

### 1. 自动化 CI/CD

- [ ] GitHub Actions 自动测试
- [ ] 自动发布到 npm
- [ ] 自动构建文档网站
- [ ] 自动检查 lint

### 2. 测试增强

- [x] 增加驱动单元测试 (EscPos, TSPL, ZPL, CPCL) - v2.6.0
- [x] 增加适配器 mock 测试 - v2.6.0
- [ ] 集成测试示例

### 3. 文档增强

- [ ] 英文文档翻译
- [ ] API 文档自动生成
- [ ] 更多使用示例

### 4. 临时移除

- [ ] **HarmonyOSAdapter** - 暂时移除，需要重写实现

---

## 中期规划 (v2.5.0 - v3.0)

### 1. 功能增强

- [ ] **NFC 打印** - 触碰打印
- [ ] **多语言支持** - i18n
- [ ] **WebSocket 支持** - 远程打印
- [ ] **打印机状态查询** - 纸张、墨量等

### 2. 驱动扩展

- [ ] **CPCL 增强** - 图片打印、更多条码
- [ ] **ZPL 增强** - 图片、字体支持
- [ **星火牌驱动** - 国产打印机
- [ ] **佳博驱动** - 国产标签

### 3. 平台扩展

- [ ] **uni-app 支持** - vue3 小程序
- [ ] **Flutter 支持** - 插件开发

---

## 长期规划 (v3.0+)

### 1. 云打印服务

- [ ] 打印服务中间件
- [ ] 打印机管理平台
- [ ] 打印任务监控

### 2. 生态系统

- [ ] VS Code 插件
- [ ] CLI 工具
- [ ] 在线打印预览工具

### 3. 社区

- [ ] Discord/Telegram 社区
- [ ] 更多开源贡献者
- [ ] 商业支持

---

## 技术债务

### 需要修复

- [ ] 修复 HarmonyOSAdapter lint 警告
- [ ] 移除 EventEmitter 中的 console.log
- [ ] 完善 TypeScript strict 模式
- [ ] 优化 bundle 大小 (可考虑 tree-shaking)

### 需要清理

- [ ] 合并重复代码
- [ ] 简化复杂函数
- [ ] 补充 JSDoc 注释

---

## 贡献指南

### 如何贡献

1. Fork 项目
2. 创建功能分支 `git checkout -b feature/xxx`
3. 提交修改 `git commit -m 'feat: xxx'`
4. 推送分支 `git push origin feature/xxx`
5. 创建 Pull Request

### 代码规范

- 使用 Prettier 格式化
- 使用 ESLint 检查
- 提交前运行测试
- 保持测试覆盖率

---

## 版本发布流程

```
1. 更新版本号 (package.json)
2. 更新 CHANGELOG.md
3. 创建 GitHub Release
4. 自动发布到 npm
5. 自动部署文档
```

---

## 鸣谢

感谢所有贡献者！

- @Agions (作者)
- 测试用户
- 开源社区
