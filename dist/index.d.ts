export { VersionDetector } from './VersionDetector';
export { UpdateNotification } from './UpdateNotification';
export type { VersionDetectorOptions, PackageInfo, UpdateReason } from './VersionDetector';
export type { UpdateNotificationOptions, UpdateNotificationEvents } from './UpdateNotification';
import { VersionDetector } from './VersionDetector';
import { UpdateNotification } from './UpdateNotification';
import { VersionDetectorOptions } from './VersionDetector';
import { UpdateNotificationOptions, UpdateNotificationEvents } from './UpdateNotification';
/**
 * 创建版本检测器和更新通知的默认实例
 */
export declare function createVersionUpdateDetector(detectorOptions?: VersionDetectorOptions, notificationOptions?: UpdateNotificationOptions, notificationEvents?: UpdateNotificationEvents): {
    detector: VersionDetector;
    notification: UpdateNotification;
    destroy: () => void;
};
declare const _default: {
    VersionDetector: typeof VersionDetector;
    UpdateNotification: typeof UpdateNotification;
    createVersionUpdateDetector: typeof createVersionUpdateDetector;
};
export default _default;
