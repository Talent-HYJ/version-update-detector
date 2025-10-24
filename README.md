# Version Update Detector

一个轻量级的 JavaScript 库，用于检测应用程序版本更新并显示更新通知。

## 特性

- 🔍 **智能版本检测** - 通过检查 package.json 和 index.html 的变化来检测版本更新
- 🚨 **资源错误监听** - 自动监听资源加载失败，及时提醒用户更新
- 💡 **纯 JS 实现** - 无依赖，不依赖任何框架
- 🎨 **可定制 UI** - 支持自定义样式和配置
- 📱 **响应式设计** - 支持移动端和桌面端
- 🔧 **TypeScript 支持** - 完整的类型定义
- 📦 **多格式支持** - 支持 ES 模块、CommonJS 和 UMD 格式

## 安装

```bash
npm install version-update-detector
```

## 快速开始

### 基础用法

```javascript
import { createVersionUpdateDetector } from 'version-update-detector';

// 创建检测器和通知组件
const { detector, notification, destroy } = createVersionUpdateDetector();

// 页面卸载时清理
window.addEventListener('beforeunload', destroy);
```

### 高级用法

```javascript
import { VersionDetector, UpdateNotification } from 'version-update-detector';

// 创建版本检测器
const detector = new VersionDetector({
  checkInterval: 30 * 60 * 1000, // 30分钟检查一次
  skipInDevelopment: true, // 开发环境跳过检测
  versionCheckUrl: '/package.json', // 版本检查URL
  enableResourceErrorDetection: true // 启用资源错误检测
});

// 创建更新通知
const notification = new UpdateNotification(
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
detector.onUpdate((reason) => {
  console.log('检测到更新:', reason);
  notification.show(reason);
});

detector.onResourceError((element) => {
  console.log('资源加载失败:', element);
  notification.show('resource-error', true);
});
```

## API 文档

### VersionDetector

版本检测器类，用于检测应用程序版本更新。

#### 构造函数选项

```typescript
interface VersionDetectorOptions {
  checkInterval?: number; // 检查间隔时间（毫秒），默认30分钟
  skipInDevelopment?: boolean; // 是否在开发环境下跳过检测，默认true
  isDevelopment?: () => boolean; // 自定义开发环境检测函数
  versionCheckUrl?: string; // 版本检查的URL路径，默认为'/package.json'
  enableResourceErrorDetection?: boolean; // 是否启用资源错误监听，默认true
}
```

#### 方法

- `onUpdate(callback: (reason: UpdateReason) => void)` - 注册更新回调
- `onResourceError(callback: (element?: Element) => void)` - 注册资源错误回调
- `removeCallback(callback: Function)` - 移除回调
- `checkForUpdate(): Promise<boolean>` - 手动检查更新
- `stopVersionCheck()` - 停止版本检查
- `setDevelopmentMode(isDev: boolean)` - 设置开发模式
- `isDevelopment(): boolean` - 获取当前是否为开发环境
- `reload()` - 刷新页面
- `destroy()` - 销毁检测器

### UpdateNotification

更新通知组件，用于显示更新提醒弹窗。

#### 构造函数选项

```typescript
interface UpdateNotificationOptions {
  title?: string; // 弹窗标题
  description?: string; // 弹窗描述
  showClose?: boolean; // 是否显示关闭按钮
  closeOnClickModal?: boolean; // 是否允许点击遮罩关闭
  closeOnPressEscape?: boolean; // 是否允许ESC键关闭
  forceUpdate?: boolean; // 是否强制更新
  customClass?: string; // 自定义CSS类名
  width?: string; // 弹窗宽度
  center?: boolean; // 是否居中显示
  buttonText?: {
    // 按钮文本配置
    later?: string;
    refresh?: string;
    refreshing?: string;
  };
  laterInterval?: number; // 稍后提醒间隔时间（毫秒）
  customStyles?: {
    // 自定义样式
    container?: string;
    content?: string;
    button?: string;
  };
}
```

#### 事件回调

```typescript
interface UpdateNotificationEvents {
  onRefresh?: () => void; // 刷新回调
  onLater?: () => void; // 稍后提醒回调
  onClose?: () => void; // 关闭回调
}
```

#### 方法

- `show(reason: UpdateReason, forceUpdate?: boolean)` - 显示通知
- `hide()` - 隐藏通知
- `isNotificationVisible(): boolean` - 检查是否可见
- `destroy()` - 销毁组件

### 更新原因类型

```typescript
type UpdateReason =
  | 'version-change' // 版本号变化
  | 'redeploy' // 重新部署
  | 'resource-error' // 资源加载错误
  | 'network-error' // 网络错误
  | 'unknown'; // 未知原因
```

## 使用场景

### 1. 单页应用 (SPA)

```javascript
import { createVersionUpdateDetector } from 'version-update-detector';

// 在应用初始化时创建
const { detector, notification, destroy } = createVersionUpdateDetector(
  {
    // 检测器选项
  },
  {
    // 通知选项
    title: '应用已更新',
    description: '请刷新页面以获得最新功能。'
  },
  {
    // 事件回调
    onRefresh: () => {
      // 清除缓存并刷新
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
        });
      }
      window.location.reload();
    }
  }
);
```

### 2. 多页应用

```javascript
import { VersionDetector } from 'version-update-detector';

// 在每个页面中初始化
const detector = new VersionDetector({
  checkInterval: 15 * 60 * 1000, // 15分钟检查一次
  versionCheckUrl: '/api/version' // 自定义版本检查接口
});

detector.onUpdate((reason) => {
  if (confirm('检测到新版本，是否立即刷新？')) {
    window.location.reload();
  }
});
```

### 3. 自定义样式

```javascript
import { UpdateNotification } from 'version-update-detector';

const notification = new UpdateNotification({
  customClass: 'my-update-dialog',
  width: '600px',
  customStyles: {
    container: `
      border: 2px solid #409eff;
      box-shadow: 0 8px 32px rgba(64, 158, 255, 0.3);
    `,
    button: `
      border-radius: 8px;
      font-weight: 600;
    `
  }
});
```

## 开发环境检测

库会自动检测开发环境，在以下情况下会跳过版本检测：

- 访问地址为 `localhost`、`127.0.0.1` 或 `0.0.0.0`
- `process.env.NODE_ENV === 'development'`

你也可以自定义开发环境检测：

```javascript
const detector = new VersionDetector({
  isDevelopment: () => {
    return window.location.hostname.includes('dev') || window.location.port === '3000';
  }
});
```

## 浏览器支持

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## 许可证

MIT License

## 贡献

欢迎提交 Issue 和 Pull Request！

## 更新日志

### 1.0.0

- 初始版本发布
- 支持版本检测和更新通知
- 支持 TypeScript
- 支持多种模块格式
