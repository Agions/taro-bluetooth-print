import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'taro-bluetooth-print',
  base: '/taro-bluetooth-print/',
  description: '轻量级、高性能的热敏/标签蓝牙打印库，支持微信小程序、H5、鸿蒙系统等多种平台',
  lang: 'zh-CN',
  lastUpdated: true,
  cleanUrls: true,

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#4f46e5' }],
    ['meta', { name: 'keywords', content: 'taro, bluetooth, printer, escpos, thermal, tspl, zpl, 小程序, 蓝牙打印, 热敏打印, 标签打印, 票据打印' }],
    ['meta', { name: 'author', content: 'Agions' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'taro-bluetooth-print - 专业蓝牙打印库' }],
    ['meta', { name: 'og:description', content: '轻量级、高性能的热敏/标签蓝牙打印库，支持微信小程序、H5、鸿蒙系统等多种平台' }],
    ['meta', { name: 'og:url', content: 'https://agions.github.io/taro-bluetooth-print/' }],
    ['meta', { name: 'og:image', content: 'https://agions.github.io/taro-bluetooth-print/og-image.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'taro-bluetooth-print' }],
    ['meta', { name: 'twitter:description', content: '轻量级、高性能的热敏/标签蓝牙打印库' }],
    ['link', { rel: 'manifest', href: '/manifest.webmanifest' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'taro-bluetooth-print' }],
    // PWA 相关
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    ['meta', { name: 'msapplication-TileColor', content: '#4f46e5' }],
    // 预加载字体
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',
    siteTitle: 'taro-bluetooth-print',

    nav: [
      { text: '首页', link: '/' },
      {
        text: '指南',
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '功能特性', link: '/guide/features' },
          { text: '驱动支持', link: '/guide/drivers' },
          { text: '平台适配器', link: '/guide/adapters' },
          { text: '核心概念', link: '/guide/core-concepts' },
          { text: '高级用法', link: '/guide/advanced' },
        ],
      },
      {
        text: 'API',
        items: [
          { text: 'API 概览', link: '/api/' },
          { text: 'BluetoothPrinter', link: '/api/bluetooth-printer' },
          { text: 'DeviceManager', link: '/api/device-manager' },
          { text: 'PrintQueue', link: '/api/queue' },
          { text: 'OfflineCache', link: '/api/cache' },
        ],
      },
      {
        text: '参考',
        items: [
          { text: '架构设计', link: '/guide/architecture' },
          { text: '定时调度', link: '/guide/scheduler' },
          { text: '设备发现', link: '/guide/discovery' },
          { text: '输出限制', link: '/guide/output-limit' },
          { text: '常见问题', link: '/guide/faq' },
          { text: '故障排查', link: '/guide/troubleshooting' },
        ],
      },
      {
        text: 'v2.9',
        items: [
          { text: '更新日志', link: '/changelog' },
          { text: '贡献指南', link: '/contributing' },
          { text: '路线图', link: '/roadmap' },
          { text: 'GitHub', link: 'https://github.com/agions/taro-bluetooth-print' },
          { text: 'NPM', link: 'https://www.npmjs.com/package/taro-bluetooth-print' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门指南',
          collapsed: false,
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '功能特性', link: '/guide/features' },
            { text: '核心概念', link: '/guide/core-concepts' },
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
            { text: '高级用法', link: '/guide/advanced' },
            { text: '架构设计', link: '/guide/architecture' },
            { text: '定时调度', link: '/guide/scheduler' },
            { text: '设备发现', link: '/guide/discovery' },
            { text: '输出限制', link: '/guide/output-limit' },
          ],
        },
        {
          text: '问题解决',
          collapsed: false,
          items: [
            { text: '常见问题', link: '/guide/faq' },
            { text: '故障排查', link: '/guide/troubleshooting' },
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
            { text: 'PrintQueue', link: '/api/queue' },
          ],
        },
        {
          text: '数据管理',
          collapsed: false,
          items: [
            { text: 'OfflineCache', link: '/api/cache' },
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
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/agions/taro-bluetooth-print' },
      { icon: 'npm', link: 'https://www.npmjs.com/package/taro-bluetooth-print' },
    ],

    search: {
      provider: 'local',
      options: {
        detailedView: true,
        miniSearch: {
          searchOptions: {
            fuzzy: 0.2,
            prefix: true,
            boost: { title: 4, text: 2, titles: 1 },
          },
        },
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

    footer: {
      message: '基于 MIT 许可发布',
      copyright: 'Copyright © 2024-present Agions',
    },

    editLink: {
      pattern: 'https://github.com/agions/taro-bluetooth-print/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页',
    },

    lastUpdated: {
      text: '最后更新于',
      formatOptions: {
        dateStyle: 'medium',
        timeStyle: 'short',
      },
    },

    outline: {
      level: [2, 3],
      label: '目录',
    },

    docFooter: {
      prev: '上一篇',
      next: '下一篇',
    },

    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
  },

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
  },

  ignoreDeadLinks: true,

  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },
});
