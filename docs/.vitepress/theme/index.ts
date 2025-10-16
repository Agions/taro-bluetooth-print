import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import './styles/custom.css'

const theme: Theme = {
  extends: DefaultTheme,
  enhanceApp({ router }) {
    // Add any app-level enhancements here
  }
}

export default theme