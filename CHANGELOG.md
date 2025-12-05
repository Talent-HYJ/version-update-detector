# Changelog

## [1.1.1] - 2025-12-05

### 新增
- 添加 `visibilityCheckInterval` 配置项，用于控制页面可见性变化时的检测间隔（默认 5 分钟）
- 支持自定义可见性检测间隔时间

### 优化
- **性能优化**：页面不可见时自动停止定时版本检测，节省系统资源
- **智能检测**：页面从不可见变为可见时，自动重新启动定时检测
- **节流机制**：添加可见性检测节流逻辑，只有距离上次检测超过配置间隔时才会立即检测，避免频繁检测
- 优化 `startVersionCheck()` 方法，避免在可见性变化时重复设置首次延迟检测

### 使用示例

```typescript
// 使用默认配置（可见性检测间隔为5分钟）
const detector = new VersionDetector();

// 自定义可见性检测间隔为10分钟
const detector = new VersionDetector({
  visibilityCheckInterval: 10 * 60 * 1000 // 10分钟
});
```

## [1.1.0] - 2025-XX-XX

### 功能
- 初始版本发布
- 版本检测功能
- 更新通知功能

