/**
 * 首页 - 演示入口
 * 列出 6 个演示场景：打印机管理 / 收据打印 / 标签打印 / 图片打印 / 模板引擎 / 离线缓存
 *
 * 设计要点:
 * - Hero 区域: 渐变背景 + 装饰圆 + 版本徽章 (v2.15.2)
 * - Demo 卡片: hover/active 态, 箭头右浮动效, 选中态高亮
 * - Footer: 动态显示运行平台 + 基础库版本 (供开发者快速判断兼容性)
 */
import { useCallback, useEffect, useState } from 'react';
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';

import './index.less';

interface DemoItem {
  id: string;
  title: string;
  desc: string;
  path: string;
  emoji: string;
  tag?: 'NEW' | 'HOT' | 'BETA';
}

const DEMOS: DemoItem[] = [
  {
    id: 'printer',
    title: '打印机管理',
    desc: '扫描附近 BLE 打印机，连接 / 断开，查看实时状态',
    path: '/pages/printer/index',
    emoji: '🖨️'
  },
  {
    id: 'receipt',
    title: '收据打印',
    desc: 'ESC/POS 小票示例 — 商品明细 / 二维码 / 切纸',
    path: '/pages/receipt/index',
    emoji: '🧾',
    tag: 'HOT'
  },
  {
    id: 'label',
    title: '标签打印',
    desc: 'TSPL 标签示例 — 商品标签 / 条形码 / 二维码',
    path: '/pages/label/index',
    emoji: '🏷️'
  },
  {
    id: 'image',
    title: '图片打印',
    desc: 'ImageProcessing 灰度转换 + ESC/POS GS v 0 指令',
    path: '/pages/image/index',
    emoji: '🖼️',
    tag: 'NEW'
  },
  {
    id: 'template',
    title: '模板引擎',
    desc: 'TemplateEngine 数据驱动 — 改数据不改代码',
    path: '/pages/template/index',
    emoji: '🎨',
    tag: 'NEW'
  },
  {
    id: 'offline',
    title: '离线缓存',
    desc: 'OfflineCache 断网/断连场景 — 任务排队 + 自动重发',
    path: '/pages/offline/index',
    emoji: '📦',
    tag: 'BETA'
  }
];

interface SysInfo {
  platform: string;
  sdkVersion: string;
  version: string;
}

const LIB_VERSION = '2.15.2';

export default function IndexPage() {
  const [sys, setSys] = useState<SysInfo>({ platform: 'wechat', sdkVersion: '—', version: '—' });
  // 跟踪最近点击的卡片 ID, 用于显示 active 反馈
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const info = Taro.getSystemInfoSync();
      setSys({
        platform: info.platform || 'wechat',
        sdkVersion: info.SDKVersion || '—',
        version: info.version || '—'
      });
    } catch {
      // 非微信环境或 API 不可用,保持默认值
    }
  }, []);

  // ✅ 任务 4 / Q2: 用 useCallback 稳定 handleTap 引用
  const handleTap = useCallback((item: DemoItem) => {
    setActiveId(item.id);
    // 200ms 后清除高亮,让 ripple 反馈明显
    setTimeout(() => setActiveId(null), 200);
    Taro.navigateTo({ url: item.path });
  }, []);

  return (
    <View className="index-page">
      {/* 任务 1: 升级版 hero */}
      <View className="hero">
        <View className="hero-deco hero-deco--1" />
        <View className="hero-deco hero-deco--2" />
        <View className="hero-deco hero-deco--3" />

        <View className="hero-content">
          <View className="hero-badge">
            <Text className="hero-badge-dot" />
            <Text className="hero-badge-text">v{LIB_VERSION}</Text>
          </View>
          <Text className="hero-title">蓝牙打印 Demo</Text>
          <Text className="hero-sub">taro-bluetooth-print · 6 大场景</Text>
        </View>
      </View>

      {/* 任务 2: 升级版 demo 卡片 (有 hover 态 + 选中态 + 箭头动画 + 标签) */}
      <View className="demo-list">
        {DEMOS.map((item) => {
          const isActive = activeId === item.id;
          return (
            <View
              key={item.id}
              className={`demo-card ${isActive ? 'demo-card--active' : ''}`}
              hoverClass="demo-card--hover"
              hoverStayTime={100}
              onClick={() => handleTap(item)}
            >
              <Text className="demo-emoji">{item.emoji}</Text>
              <View className="demo-info">
                <View className="demo-title-row">
                  <Text className="demo-title">{item.title}</Text>
                  {item.tag && <Text className={`demo-tag demo-tag--${item.tag.toLowerCase()}`}>{item.tag}</Text>}
                </View>
                <Text className="demo-desc">{item.desc}</Text>
              </View>
              <Text className="demo-arrow">›</Text>
            </View>
          );
        })}
      </View>

      {/* 任务 3: 增强 footer (动态系统信息) */}
      <View className="footer">
        <View className="footer-tip">
          <Text className="footer-tip-icon">⚠️</Text>
          <Text>微信蓝牙 API 需真机预览</Text>
        </View>
        <View className="footer-meta">
          <View className="footer-meta-item">
            <Text className="footer-meta-label">平台</Text>
            <Text className="footer-meta-value">{sys.platform}</Text>
          </View>
          <View className="footer-meta-divider" />
          <View className="footer-meta-item">
            <Text className="footer-meta-label">微信</Text>
            <Text className="footer-meta-value">{sys.version}</Text>
          </View>
          <View className="footer-meta-divider" />
          <View className="footer-meta-item">
            <Text className="footer-meta-label">基础库</Text>
            <Text className="footer-meta-value">{sys.sdkVersion}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}