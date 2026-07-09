/**
 * 微信小程序 app.config.ts
 * - 4 个页面：首页 / 打印机管理 / 收据打印 / 标签打印
 * - 蓝牙权限声明（scope.bluetooth）和小程序地理位置
 */
export default {
  pages: [
    'pages/index/index',
    'pages/printer/index',
    'pages/receipt/index',
    'pages/label/index'
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#4338ca',
    navigationBarTitleText: '蓝牙打印 Demo',
    navigationBarTextStyle: 'white',
    backgroundColor: '#f5f5f7'
  },
  permission: {
    'scope.bluetooth': {
      desc: '需要使用您的蓝牙连接打印机'
    }
  },
  requiredPrivateInfos: ['getLocation'],
  style: 'v2'
};
