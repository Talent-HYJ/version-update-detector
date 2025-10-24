// 使用新的版本更新检测器的示例代码

// 方法1: 使用工厂函数（推荐）
import { createVersionUpdateDetector } from 'version-update-detector';

// 创建检测器和通知组件
const { detector, notification, destroy } = createVersionUpdateDetector(
  {
    // 检测器选项
    checkInterval: 30 * 60 * 1000, // 30分钟检查一次
    skipInDevelopment: true, // 开发环境跳过检测
    versionCheckUrl: '/package.json', // 版本检查URL
    enableResourceErrorDetection: true // 启用资源错误检测
  },
  {
    // 通知选项
    title: '应用更新提醒',
    description: '请刷新页面以获得最新内容。',
    forceUpdate: false,
    width: '480px',
    buttonText: {
      later: '稍后提醒',
      refresh: '立即刷新',
      refreshing: '正在刷新...'
    },
    laterInterval: 10 * 60 * 1000 // 10分钟
  },
  {
    // 事件回调
    onRefresh: () => {
      console.log('用户点击了刷新');
      // 清除缓存并刷新
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
      }
      window.location.reload();
    },
    onLater: () => {
      console.log('用户点击了稍后提醒');
    },
    onClose: () => {
      console.log('弹窗关闭');
    }
  }
);

// 页面卸载时清理
window.addEventListener('beforeunload', destroy);

// 方法2: 分别使用检测器和通知组件
import { VersionDetector, UpdateNotification } from 'version-update-detector';

// 创建版本检测器
const detector2 = new VersionDetector({
  checkInterval: 30 * 60 * 1000,
  skipInDevelopment: true,
  versionCheckUrl: '/package.json',
  enableResourceErrorDetection: true
});

// 创建更新通知
const notification2 = new UpdateNotification(
  {
    title: '应用更新提醒',
    description: '请刷新页面以获得最新内容。',
    forceUpdate: false,
    width: '480px',
    buttonText: {
      later: '稍后提醒',
      refresh: '立即刷新',
      refreshing: '正在刷新...'
    }
  },
  {
    onRefresh: () => {
      console.log('用户点击了刷新');
      window.location.reload();
    },
    onLater: () => {
      console.log('用户点击了稍后提醒');
    }
  }
);

// 绑定事件
detector2.onUpdate((reason) => {
  console.log('检测到更新:', reason);
  notification2.show(reason);
});

detector2.onResourceError((element) => {
  console.log('资源加载失败:', element);
  notification2.show('resource-error', true);
});

// 手动检查更新
const checkUpdate = async () => {
  const hasUpdate = await detector2.checkForUpdate();
  if (hasUpdate) {
    console.log('发现新版本');
  }
};

// 设置开发模式
detector2.setDevelopmentMode(false);

// 销毁组件
const cleanup = () => {
  detector2.destroy();
  notification2.destroy();
};
