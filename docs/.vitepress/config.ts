import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'taro-bluetooth-print',
  base: '/taro-bluetooth-print/',
  description: '轻量级、高性能的热敏/标签蓝牙打印库，支持微信小程序、H5、鸿蒙系统等多种平台',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#10b981' }],
    ['meta', { name: 'keywords', content: 'taro, bluetooth, printer, escpos, thermal, tspl, zpl, 小程序, 蓝牙打印, 热敏打印, 标签打印' }],
    ['meta', { name: 'author', content: 'Agions' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'taro-bluetooth-print - 蓝牙打印库' }],
    ['meta', { name: 'og:description', content: '轻量级、高性能的热敏/标签蓝牙打印库，支持微信小程序、H5、鸿蒙系统等多种平台' }],
    ['meta', { name: 'og:url', content: 'https://agions.github.io/taro-bluetooth-print/' }],
    ['meta', { name: 'og:image', content: 'https://placehold.co/1200x630/10b981/ffffff?text=taro-bluetooth-print' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:title', content: 'taro-bluetooth-print' }],
    ['meta', { name: 'twitter:description', content: '轻量级、高性能的热敏/标签蓝牙打印库' }],
    // PWA
    ['link', { rel: 'manifest', href: '/manifest.webmanifest' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'taro-bluetooth-print' }],
  ],

  themeConfig: {
    logo: '/logo.svg',

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
          { text: 'API 参考', link: '/api' },
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
          text: 'API 参考',
          collapsed: false,
          items: [
            { text: 'BluetoothPrinter', link: '/api' },
            { text: 'DeviceManager', link: '/api' },
            { text: 'MultiPrinterManager', link: '/api' },
            { text: 'PrintQueue', link: '/api' },
            { text: 'OfflineCache', link: '/api' },
            { text: 'TemplateEngine', link: '/api' },
            { text: 'BarcodeGenerator', link: '/api' },
            { text: 'PrintStatistics', link: '/api' },
            { text: 'ScheduledRetryManager', link: '/api' },
            { text: 'BatchPrintManager', link: '/api' },
            { text: 'PrinterStatus', link: '/api' },
            { text: 'uuid 工具', link: '/api' },
            { text: 'validation 工具', link: '/api' },
            { text: '驱动 API', link: '/api' },
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
      text: '最后更新',
      formatOptions: {
        dateStyle: 'short',
        timeStyle: 'short',
      },
    },

    outline: {
      level: [2, 3],
      label: '目录',
    },

    docFooter: {
      prev: '上一页',
      next: '下一页',
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
  },

  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined,
        },
      },
    },
  },

  // PWA: service worker already exists in public/
  // Head already references manifest.webmanifest above
});
