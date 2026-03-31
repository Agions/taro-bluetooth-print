import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'taro-bluetooth-print',
  base: '/taro-bluetooth-print/',
  description: '轻量级、高性能的热敏/标签蓝牙打印库，支持微信小程序、H5、鸿蒙系统等多种平台',
  lang: 'zh-CN',

  head: [
    // Favicon
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],

    // Theme color
    ['meta', { name: 'theme-color', content: '#0d9488' }],

    // SEO
    ['meta', { name: 'keywords', content: 'taro, bluetooth, printer, escpos, thermal, tspl, zpl, 小程序, 蓝牙打印, 热敏打印, 标签打印' }],
    ['meta', { name: 'author', content: 'Agions' }],

    // Open Graph
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'taro-bluetooth-print - 蓝牙打印库' }],
    ['meta', { name: 'og:description', content: '轻量级、高性能的热敏/标签蓝牙打印库，支持微信小程序、H5、鸿蒙系统等多种平台' }],
    ['meta', { name: 'og:url', content: 'https://agions.github.io/taro-bluetooth-print/' }],
    ['meta', { name: 'og:image', content: 'https://placehold.co/1200x630/0891b2/ffffff?text=taro-bluetooth-print' }],

    // Twitter Card
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'taro-bluetooth-print' }],
    ['meta', { name: 'twitter:description', content: '轻量级、高性能的热敏/标签蓝牙打印库' }],

    // PWA
    ['link', { rel: 'manifest', href: '/manifest.webmanifest' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'taro-bluetooth-print' }],

    // Google Fonts
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Noto+Sans+SC:wght@400;500;700&display=swap' }],
  ],

  themeConfig: {
    // Logo
    logo: '/logo.svg',
    logoFetch: '/logo.svg',

    // Site title
    siteTitle: 'taro-bluetooth-print',

    // 导航栏
    nav: [
      { text: '首页', link: '/' },
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '功能特性', link: '/guide/features' },
          { text: '驱动支持', link: '/guide/drivers' },
          { text: '平台适配器', link: '/guide/adapters' },
        ],
      },
      {
        text: '开发',
        items: [
          { text: '核心概念', link: '/guide/core-concepts' },
          { text: '高级用法', link: '/guide/advanced' },
          { text: '架构设计', link: '/guide/architecture' },
        ],
      },
      {
        text: '参考',
        items: [
          { text: 'API 参考', link: '/api/' },
          { text: '常见问题', link: '/guide/faq' },
        ],
      },
      {
        text: '资源',
        items: [
          { text: 'GitHub', link: 'https://github.com/agions/taro-bluetooth-print' },
          { text: 'Changelog', link: 'https://github.com/agions/taro-bluetooth-print/blob/main/CHANGELOG.md' },
          { text: 'NPM', link: 'https://www.npmjs.com/package/taro-bluetooth-print' },
        ],
      },
    ],

    // 侧边栏配置
    sidebar: {
      '/guide/': [
        {
          text: '入门指南',
          collapsed: false,
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '功能特性', link: '/guide/features' },
          ],
        },
        {
          text: '驱动与适配器',
          collapsed: false,
          items: [
            { text: '驱动支持', link: '/guide/drivers' },
            { text: '平台适配器', link: '/guide/adapters' },
          ],
        },
        {
          text: '开发指南',
          collapsed: false,
          items: [
            { text: '核心概念', link: '/guide/core-concepts' },
            { text: '高级用法', link: '/guide/advanced' },
            { text: '架构设计', link: '/guide/architecture' },
          ],
        },
        {
          text: '问题解决',
          collapsed: false,
          items: [
            { text: '常见问题', link: '/guide/faq' },
          ],
        },
      ],
      '/api/': [
        {
          text: '概览',
          items: [
            { text: 'API 参考', link: '/api/' },
          ],
        },
        {
          text: '核心类',
          collapsed: false,
          items: [
            { text: 'BluetoothPrinter', link: '/api/bluetooth-printer' },
            { text: 'DeviceManager', link: '/api/device-manager' },
            { text: 'MultiPrinterManager', link: '/api/multi-printer-manager' },
            { text: 'PrintQueue', link: '/api/print-queue' },
          ],
        },
        {
          text: '数据管理',
          collapsed: false,
          items: [
            { text: 'OfflineCache', link: '/api/offline-cache' },
            { text: 'PrintHistory', link: '/api/print-history' },
            { text: 'PrintStatistics', link: '/api/print-statistics' },
          ],
        },
        {
          text: '高级管理',
          collapsed: false,
          items: [
            { text: 'ScheduledRetryManager', link: '/api/scheduled-retry-manager' },
            { text: 'BatchPrintManager', link: '/api/batch-print-manager' },
            { text: 'PrinterStatus', link: '/api/printer-status' },
          ],
        },
        {
          text: '工具与模板',
          collapsed: false,
          items: [
            { text: 'TemplateEngine', link: '/api/template-engine' },
            { text: 'BarcodeGenerator', link: '/api/barcode-generator' },
            { text: 'PrinterConfigManager', link: '/api/printer-config-manager' },
            { text: '工具函数', link: '/api/utils' },
          ],
        },
        {
          text: '驱动 API',
          collapsed: false,
          items: [
            { text: '驱动参考', link: '/guide/drivers' },
          ],
        },

      ],
    },

    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/agions/taro-bluetooth-print' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/taro-bluetooth-print' },
    ],

    // 搜索配置
    search: {
      provider: 'local',
      options: {
        detailedView: true,
        translations: {
          button: {
            buttonText: '搜索文档',
            buttonAriaLabel: '搜索文档',
          },
          modal: {
            noResultsText: '无法找到相关结果',
            resetButtonTitle: '清除查询条件',
            footer: {
              selectText: '选择',
              navigateText: '切换',
              closeText: '关闭',
            },
          },
        },
      },
    },

    // Footer
    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024-present Agions',
    },

    // 编辑链接
    editLink: {
      pattern: 'https://github.com/agions/taro-bluetooth-print/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    // 最后更新
    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },

    // 右侧目录
    outline: {
      level: [2, 3],
      label: '目录',
    },

    // 上一页/下一页
    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    // 回到顶部
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
  },

  // Markdown 配置
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
    container: {
      tipLabel: '💡 提示',
      warningLabel: '⚠️ 注意',
      dangerLabel: '🚨 危险',
      infoLabel: 'ℹ️ 信息',
      detailsLabel: '详情',
    },
    deadLinks: 'ignore',
  },

  // Vite 配置
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
    css: {
      preprocessorOptions: {},
    },
  },
});
