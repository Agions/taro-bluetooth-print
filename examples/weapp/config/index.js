/**
 * Taro 构建配置 - 微信小程序
 * @see https://taro-docs.jd.com/docs/config
 */
const path = require('path');

module.exports = {
  projectName: 'taro-bluetooth-print-demo',
  date: '2026-7-9',
  designWidth: 750,
  deviceRatio: { 640: 2.34 / 2, 750: 1, 828: 1.81 / 2, 375: 2 / 1 },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
  copy: { patterns: [], options: {} },
  framework: 'react',
  compiler: 'webpack5',
  cache: { enable: false },
  sass: { resource: [] },
  mini: {
    webpackChain(chain) {
      // 让 taro-bluetooth-print 的 dist/index.cjs.js 能被小程序识别
      chain.resolve.extensions.prepend('.cjs');
      // 修复 webpackbar 5.0.2 + webpack 5.97+ schema 不兼容
      // 策略: 在 chain.toConfig() 输出的 config 中关闭 webpack 的 schema 校验
      // webpack 5 的 Compiler.validate 会在 this.options.validate === false 时直接返回
      // 关闭 validate 不影响功能,只跳过 plugins/loaders 的字段校验
      const originalToConfig = chain.toConfig.bind(chain);
      chain.toConfig = function () {
        const config = originalToConfig();
        config.validate = false;
        return config;
      };
    },
    postcss: {
      pxtransform: { enable: true, config: {} },
      cssModules: { enable: false }
    }
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    output: { filename: 'js/[name].[hash:8].js', chunkFilename: 'js/[name].[chunkhash:8].js' }
  },
  // 关闭 progress 显示 — Taro 3.6.40 的 ProgressPlugin 选项与 webpack 5 不兼容,
  // 整个干掉它比修补更稳
  enableProgress: false
};
