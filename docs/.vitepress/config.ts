import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Taro Bluetooth Print',
  base: '/taro-bluetooth-print/',
  description: '轻量级、高性能的热敏/标签蓝牙打印库，支持微信小程序、H5、鸿蒙系统',
  lang: 'zh-CN',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#10b981' }],
    ['meta', { name: 'keywords', content: 'taro, bluetooth, printer, escpos, thermal, printing' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'Taro Bluetooth Print - 蓝牙打印库' }],
    ['meta', { 
      name: 'og:description', 
      content: '轻量级、高性能的热敏/标签蓝牙打印库，支持微信小程序、H5、鸿蒙系统等多种平台' 
    }],
  ],

  themeConfig: {
    logo: '/logo.svg',

    siteTitle: 'Taro Bluetooth Print',

    nav: [
      { text: '首页', link: '/' },
      { 
        text: '指南', 
        items: [
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '功能特性', link: '/guide/features' },
          { text: '驱动支持', link: '/guide/drivers' },
        ]
      },
      { text: 'API', link: '/api' },
      {
        text: '更多',
        items: [
          { text: '核心概念', link: '/guide/core-concepts' },
          { text: '高级用法', link: '/guide/advanced' },
          { text: '常见问题', link: '/guide/faq' },
          { text: '故障排除', link: '/guide/troubleshooting' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '入门',
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
          ],
        },
        {
          text: '问题解决',
          collapsed: false,
          items: [
            { text: '常见问题', link: '/guide/faq' },
            { text: '故障排除', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          collapsed: false,
          items: [
            { text: 'BluetoothPrinter', link: '/api' },
            { text: '驱动', link: '/api' },
            { text: '类型定义', link: '/api' },
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
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
});
