/**
 * 首页 - 演示入口
 * 列出 4 个演示场景：打印机管理 / 收据打印 / 标签打印 / 队列状态
 */
import Taro from '@tarojs/taro';
import { View, Text } from '@tarojs/components';

import './index.less';

interface DemoItem {
  id: string;
  title: string;
  desc: string;
  path: string;
  emoji: string;
}

const DEMOS: DemoItem[] = [
  {
    id: 'printer',
    title: '打印机管理',
    desc: '扫描附近 BLE 打印机，连接 / 断开，查看实时状态',
    path: '/pages/printer/index',
    emoji: '🖨️'
  },
  {
    id: 'receipt',
    title: '收据打印',
    desc: 'ESC/POS 小票示例 — 商品明细 / 二维码 / 切纸',
    path: '/pages/receipt/index',
    emoji: '🧾'
  },
  {
    id: 'label',
    title: '标签打印',
    desc: 'TSPL 标签示例 — 商品标签 / 条形码 / 二维码',
    path: '/pages/label/index',
    emoji: '🏷️'
  }
];

export default function IndexPage() {
  const handleTap = (item: DemoItem) => {
    Taro.navigateTo({ url: item.path });
  };

  return (
    <View className="index-page">
      <View className="hero">
        <Text className="hero-title">蓝牙打印 Demo</Text>
        <Text className="hero-sub">taro-bluetooth-print v2.15.2</Text>
      </View>

      <View className="demo-list">
        {DEMOS.map((item) => (
          <View key={item.id} className="demo-card" onClick={() => handleTap(item)}>
            <Text className="demo-emoji">{item.emoji}</Text>
            <View className="demo-info">
              <Text className="demo-title">{item.title}</Text>
              <Text className="demo-desc">{item.desc}</Text>
            </View>
            <Text className="demo-arrow">›</Text>
          </View>
        ))}
      </View>

      <View className="footer">
        <Text className="footer-tip">⚠️ 微信蓝牙 API 需真机预览</Text>
      </View>
    </View>
  );
}
