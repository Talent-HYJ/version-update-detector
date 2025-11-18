# Version Update Detector

一个轻量级的 JavaScript 库，用于检测应用程序版本更新并显示更新通知。

## 特性

- 🔍 **智能版本检测** - 通过检查 index.html 的 ETag 和 Last-Modified 来检测版本更新
- 👁️ **页面可见性监听** - 用户切换标签页回来时自动检测更新
- 🚨 **资源错误监听** - 自动监听资源加载失败，及时提醒用户更新
- 💡 **纯 JS 实现** - 零依赖，不依赖任何框架
- 🎨 **可定制 UI** - 支持自定义样式和配置
- 📱 **响应式设计** - 支持移动端和桌面端
- 🔧 **TypeScript 支持** - 完整的类型定义
- 📦 **多格式支持** - 支持 ES 模块、CommonJS 和 UMD 格式

## 安装

### 方式 1：通过 npm 安装

```bash
npm install version-update-detector
```

### 方式 2：通过 CDN 使用（无需安装）

```html
<!-- 通过 unpkg CDN -->
<script src="https://unpkg.com/version-update-detector@latest/dist/index.umd.js"></script>

<!-- 或通过 jsdelivr CDN -->
<script src="https://cdn.jsdelivr.net/npm/version-update-detector@latest/dist/index.umd.js"></script>
```

## 快速开始

### 检测原理

该库通过检测 `index.html` 文件的 HTTP 头信息（ETag 和 Last-Modified）来判断应用是否有更新。

### 检测时机

1. **页面可见性变化时**：当用户从其他标签页切回来时自动检测
2. **定时检测**：页面保持打开状态时，默认每 30 分钟检测一次
3. **资源加载失败时**：检测到 JS/CSS 等资源加载失败时触发检测

### 基础用法

#### 方式 1：ES Module（推荐）

```javascript
import { createVersionUpdateDetector } from 'version-update-detector';

// 创建检测器和通知组件
const { detector, notification, destroy } = createVersionUpdateDetector();

// 页面卸载时清理
window.addEventListener('beforeunload', destroy);
```

#### 方式 2：通过 Script 标签

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <h1>我的应用</h1>

  <!-- 引入库 -->
  <script src="https://unpkg.com/version-update-detector@latest/dist/index.umd.js"></script>
  
  <!-- 使用库 -->
  <script>
    // 通过全局变量 VersionUpdateDetector 访问
    const { createVersionUpdateDetector } = VersionUpdateDetector;
    
    // 创建检测器和通知组件
    const { detector, notification, destroy } = createVersionUpdateDetector();
    
    // 页面卸载时清理
    window.addEventListener('beforeunload', destroy);
  </script>
</body>
</html>
```

**完整示例：**

```html
<!DOCTYPE html>
<html>
<head>
  <title>My App</title>
</head>
<body>
  <h1>我的应用</h1>

  <script src="https://unpkg.com/version-update-detector@latest/dist/index.umd.js"></script>
  <script>
    const { createVersionUpdateDetector } = VersionUpdateDetector;
    
    // 自定义配置
    const { detector, notification, destroy } = createVersionUpdateDetector(
      {
        checkInterval: 30 * 60 * 1000, // 30分钟检查一次
        skipInDevelopment: false // 在 CDN 使用时建议设为 false
      },
      {
        title: '🎉 发现新版本',
        description: '请刷新页面以获得最新功能'
      }
    );
    
    console.log('版本检测已启动');
  </script>
</body>
</html>
```

### 高级用法

```javascript
import { VersionDetector, UpdateNotification } from 'version-update-detector';

// 创建版本检测器
const detector = new VersionDetector({
  checkInterval: 30 * 60 * 1000, // 30分钟检查一次
  skipInDevelopment: true, // 开发环境跳过检测
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

## 检测机制说明

### 如何检测版本更新？

库通过检测 `index.html` 文件的 HTTP 响应头来判断应用是否有更新：

- **ETag**：文件内容的唯一标识符
- **Last-Modified**：文件最后修改时间

当应用重新部署后，这些值会发生变化，从而触发更新提示。

### 何时触发检测？

1. **页面可见性变化**：用户从其他标签页切回来时自动检测
2. **定时检测**：页面保持打开状态时，默认每 30 分钟检测一次
3. **资源加载失败**：检测到 JS/CSS 等资源加载失败时触发检测

### 服务器配置建议

为了确保检测功能正常工作，建议禁用 `index.html` 的缓存：

**Nginx 配置：**
```nginx
location / {
    try_files $uri $uri/ /index.html;
    
    # 禁用 index.html 缓存
    location = /index.html {
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
}
```

**Vercel (`vercel.json`)：**
```json
{
  "headers": [
    {
      "source": "/index.html",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "no-cache, no-store, must-revalidate"
        }
      ]
    }
  ]
}
```

## 使用场景

### 1. 单页应用 (SPA)

```javascript
import { createVersionUpdateDetector } from 'version-update-detector';

// 在应用初始化时创建
const { detector, notification, destroy } = createVersionUpdateDetector(
  {
    // 检测器选项（可选）
    checkInterval: 30 * 60 * 1000 // 30分钟检查一次
  },
  {
    // 通知选项（可选）
    title: '应用已更新',
    description: '请刷新页面以获得最新功能。'
  },
  {
    // 事件回调（可选）
    onRefresh: () => {
      // 清除 Service Worker 缓存并刷新
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          registrations.forEach((registration) => registration.unregister());
          window.location.reload();
        });
      } else {
        window.location.reload();
      }
    }
  }
);
```

### 2. 自定义检查间隔

```javascript
import { createVersionUpdateDetector } from 'version-update-detector';

// 自定义检查间隔为 15 分钟
const { detector } = createVersionUpdateDetector({
  checkInterval: 15 * 60 * 1000
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

查看 [CHANGELOG.md](./CHANGELOG.md) 了解详细的版本更新历史。

### 1.1.0

- 🔥 简化检测方式：只保留检测 index.html 的方式
- ⚡ 优化检测时机：页面可见性变化时自动检测
- ✨ 初始化时立即记录版本信息，避免误判
- 📝 大幅简化 API，更易使用

### 1.0.0

- 初始版本发布
- 支持版本检测和更新通知
- 支持 TypeScript
- 支持多种模块格式
