import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'Taro Bluetooth Print',
  base: '/taro-bluetooth-print/',
  description: 'Lightweight, high-performance Bluetooth printing library for Taro',

  head: [
    ['link', { rel: 'icon', type: 'image/svg+xml', href: '/logo.svg' }],
    ['meta', { name: 'theme-color', content: '#10b981' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:title', content: 'Taro Bluetooth Print' }],
    [
      'meta',
      {
        name: 'og:description',
        content: 'Lightweight, high-performance Bluetooth printing library for Taro',
      },
    ],
  ],

  themeConfig: {
    logo: '/logo.svg',

    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api' },
      {
        text: '更多',
        items: [
          { text: '常见问题', link: '/guide/faq' },
          { text: '故障排除', link: '/guide/troubleshooting' },
          { text: '更新日志', link: '/changelog' },
          { text: '贡献指南', link: '/contributing' },
        ],
      },
    ],

    sidebar: {
      '/guide/': [
        {
          text: '开始',
          items: [
            { text: '快速开始', link: '/guide/getting-started' },
            { text: '功能特性', link: '/guide/features' },
          ],
        },
        {
          text: '核心概念',
          items: [
            { text: '架构设计', link: '/guide/core-concepts' },
            { text: '高级用法', link: '/guide/advanced' },
          ],
        },
        {
          text: '帮助',
          items: [
            { text: '常见问题', link: '/guide/faq' },
            { text: '故障排除', link: '/guide/troubleshooting' },
          ],
        },
      ],
      '/api/': [
        {
          text: 'API 参考',
          items: [{ text: 'BluetoothPrinter', link: '/api' }],
        },
      ],
    },

    socialLinks: [{ icon: 'github', link: 'https://github.com/agions/taro-bluetooth-print' }],

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
      copyright: 'Copyright © 2025-present Agions',
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
  },

  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark',
    },
    lineNumbers: true,
  },
});