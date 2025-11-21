import { defineConfig } from 'vitepress'

export default defineConfig({
  title: "Taro Bluetooth Print",
  base: "/taro-bluetooth-print/",
  description: "Lightweight, high-performance Bluetooth printing library for Taro",
  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Guide', link: '/guide/getting-started' },
      { text: 'API', link: '/api' }
    ],

    sidebar: [
      {
        text: 'Guide',
        items: [
          { text: 'Getting Started', link: '/guide/getting-started' },
          { text: 'Core Concepts', link: '/guide/core-concepts' },
          { text: 'Advanced Usage', link: '/guide/advanced' }
        ]
      },
      {
        text: 'API Reference',
        items: [
          { text: 'BluetoothPrinter', link: '/api' }
        ]
      }
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/agions/taro-bluetooth-print' }
    ]
  }
})