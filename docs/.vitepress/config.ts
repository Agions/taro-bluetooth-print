import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Taro Bluetooth Print',
  description: '基于 Taro 的蓝牙打印机库文档',
  lang: 'zh-CN',
  base: '/taro-bluetooth-print/',

  // 暂时忽略死链接检查
  ignoreDeadLinks: true,

  // 优化GitHub Pages部署配置
  cleanUrls: true,
  rewrites: {
    'api/index.html': '/api/',
    'examples/index.html': '/examples/',
    'guide/index.html': '/guide/',
    'reference/index.html': '/reference/'
  },

  // Theme configuration
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/getting-started' },
      { text: 'API', link: '/api/' },
      { text: '示例', link: '/examples/' },
      { text: '更新日志', link: '/reference/changelog' }
    ],

    sidebar: [
      {
        text: '开始',
        items: [
          { text: '介绍', link: '/' },
          { text: '快速开始', link: '/guide/getting-started' },
          { text: '安装', link: '/guide/installation' },
          { text: '基础用法', link: '/guide/basic-usage' }
        ]
      },
      {
        text: '指南',
        items: [
          { text: '蓝牙连接', link: '/guide/bluetooth-connection' },
          { text: '打印机配置', link: '/guide/printer-configuration' },
          { text: '图片打印', link: '/guide/image-printing' },
          { text: '错误处理', link: '/guide/error-handling' },
          { text: '性能优化', link: '/guide/performance' }
        ]
      },
      {
        text: 'API 参考',
        items: [
          { text: '核心 API', link: '/api/' },
          { text: '蓝牙适配器', link: '/api/bluetooth-adapter' },
          { text: '打印机管理器', link: '/api/printer-manager' },
          { text: '组件', link: '/api/components' },
          { text: '工具函数', link: '/api/utils' }
        ]
      },
      {
        text: '示例',
        items: [
          { text: '基础打印', link: '/examples/basic-print' },
          { text: '图片打印', link: '/examples/image-print' },
          { text: '收据打印', link: '/examples/receipt-print' },
          { text: '批量打印', link: '/examples/batch-print' }
        ]
      },
      {
        text: '参考',
        items: [
          { text: '更新日志', link: '/reference/changelog' },
          { text: '迁移指南', link: '/reference/migration' },
          { text: '常见问题', link: '/reference/faq' },
          { text: '贡献指南', link: '/reference/contributing' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Agions/taro-bluetooth-print' }
    ],

    footer: {
      message: '基于 MIT 许可证发布',
      copyright: 'Copyright © 2025 Agions'
    },

    search: {
      provider: 'local'
    },

    editLink: {
      pattern: 'https://github.com/Agions/taro-bluetooth-print/edit/main/docs/:path',
      text: '在 GitHub 上编辑此页面'
    }
  },

  // Build configuration
  outDir: '.vitepress/dist',
  cacheDir: '.vitepress/cache',

  // Markdown configuration
  markdown: {
    theme: {
      light: 'github-light',
      dark: 'github-dark'
    },
    lineNumbers: true,
    config: (md) => {
      // Add any markdown-it plugins here
    }
  },

  // Vite configuration
  vite: {
    define: {
      __VUE_OPTIONS_API__: false
    },
    server: {
      host: true,
      port: 5173
    },
    build: {
      minify: 'terser',
      chunkSizeWarningLimit: 1000
    }
  },

  // Head configuration
  head: [
    ['meta', { name: 'keywords', content: 'taro, bluetooth, printer, 微信小程序, mini-program' }],
    ['meta', { name: 'author', content: 'Agions' }],
    ['meta', { property: 'og:title', content: 'Taro Bluetooth Print' }],
    ['meta', { property: 'og:description', content: '基于 Taro 的蓝牙打印机库文档' }],
    ['meta', { property: 'og:type', content: 'website' }],
    ['meta', { property: 'og:url', content: 'https://Agions.github.io/taro-bluetooth-print/' }],
    ['meta', { property: 'og:image', content: '/og-image.png' }],
    ['meta', { name: 'twitter:card', content: 'summary_large_image' }],
    ['meta', { name: 'twitter:site', content: '@your-handle' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['link', { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }],
    // Mobile optimization
    ['meta', { name: 'viewport', content: 'width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes' }],
    ['meta', { name: 'theme-color', content: '#3b82f6' }],
    ['meta', { name: 'apple-mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'apple-mobile-web-app-status-bar-style', content: 'default' }],
    ['meta', { name: 'apple-mobile-web-app-title', content: 'Taro Bluetooth Print' }],
    ['meta', { name: 'mobile-web-app-capable', content: 'yes' }],
    ['meta', { name: 'application-name', content: 'Taro Bluetooth Print' }],
    ['meta', { name: 'msapplication-TileColor', content: '#3b82f6' }],
    ['meta', { name: 'msapplication-config', content: '/browserconfig.xml' }],
    // PWA configuration
    ['link', { rel: 'manifest', href: '/manifest.json' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' }],
    ['meta', { name: 'format-detection', content: 'telephone=no' }],
    ['meta', { name: 'robots', content: 'index, follow' }],
    ['meta', { name: 'googlebot', content: 'index, follow' }]
  ],

  // PWA configuration
  pwa: {
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
      runtimeCaching: [
        {
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'google-fonts-cache',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
            }
          }
        },
        {
          urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i,
          handler: 'CacheFirst',
          options: {
            cacheName: 'jsdelivr-cache',
            expiration: {
              maxEntries: 20,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
            }
          }
        },
        {
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
          handler: 'StaleWhileRevalidate',
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
            }
          }
        }
      ],
      navigateFallbackDenylist: [/^\/api\//, /^\/examples\//, /^\/guide\//, /^\/reference\//],
      navigateFallback: '/taro-bluetooth-print/index.html',
      skipWaiting: true,
      clientsClaim: true
    },
    manifest: {
      name: 'Taro Bluetooth Print - 文档',
      short_name: 'Taro蓝牙打印文档',
      description: '基于 Taro 的蓝牙打印机库完整文档',
      theme_color: '#3b82f6',
      background_color: '#ffffff',
      display: 'standalone',
      orientation: 'portrait-primary',
      scope: '/taro-bluetooth-print/',
      start_url: '/taro-bluetooth-print/',
      icons: [
        {
          src: '/icons/icon-192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/icons/icon-512.png',
          sizes: '512x512',
          type: 'image/png'
        },
        {
          src: '/icons/maskable-icon-192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'maskable'
        }
      ],
      shortcuts: [
        {
          name: '快速开始',
          short_name: '快速开始',
          description: '查看快速开始指南',
          url: '/taro-bluetooth-print/guide/getting-started',
          icons: [{ src: '/icons/quick-start-96.png', sizes: '96x96' }]
        },
        {
          name: 'API参考',
          short_name: 'API',
          description: '查看API文档',
          url: '/taro-bluetooth-print/api/',
          icons: [{ src: '/icons/api-96.png', sizes: '96x96' }]
        }
      ]
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  }
})