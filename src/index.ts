export { VersionDetector } from './VersionDetector';
export { UpdateNotification } from './UpdateNotification';
export type { VersionDetectorOptions, PackageInfo, UpdateReason } from './VersionDetector';
export type { UpdateNotificationOptions, UpdateNotificationEvents } from './UpdateNotification';

// 创建默认实例的工厂函数
import { VersionDetector } from './VersionDetector';
import { UpdateNotification } from './UpdateNotification';
import { VersionDetectorOptions } from './VersionDetector';
import { UpdateNotificationOptions, UpdateNotificationEvents } from './UpdateNotification';

/**
 * 创建版本检测器和更新通知的默认实例
 */
export function createVersionUpdateDetector(
  detectorOptions: VersionDetectorOptions = {},
  notificationOptions: UpdateNotificationOptions = {},
  notificationEvents: UpdateNotificationEvents = {}
) {
  const detector = new VersionDetector(detectorOptions);
  const notification = new UpdateNotification(notificationOptions, notificationEvents);

  // 自动绑定事件
  detector.onUpdate((reason) => {
    notification.show(reason);
  });

  detector.onResourceError(() => {
    notification.show('resource-error', true);
  });

  return {
    detector,
    notification,
    destroy: () => {
      detector.destroy();
      notification.destroy();
    }
  };
}

// 默认导出
export default {
  VersionDetector,
  UpdateNotification,
  createVersionUpdateDetector
};
