/**
 * 应用版本检测工具类
 * 用于检测应用版本更新，监听资源加载失败等
 */
export interface VersionDetectorOptions {
    /** 检查间隔时间（毫秒），默认30分钟 */
    checkInterval?: number;
    /** 是否在开发环境下跳过检测，默认true */
    skipInDevelopment?: boolean;
    /** 自定义开发环境检测函数 */
    isDevelopment?: () => boolean;
    /** 版本检查的URL路径，默认为'/package.json' */
    versionCheckUrl?: string;
    /** 是否启用资源错误监听，默认true */
    enableResourceErrorDetection?: boolean;
}
export interface PackageInfo {
    version: string;
    etag?: string;
    lastModified?: string;
    checkTime: number;
}
export type UpdateReason = 'version-change' | 'redeploy' | 'resource-error' | 'network-error' | 'unknown';
export declare class VersionDetector {
    private currentVersion;
    private checkInterval;
    private timer;
    private isChecking;
    private onUpdateCallbacks;
    private onResourceErrorCallbacks;
    private isLocalDevelopment;
    private options;
    constructor(options?: VersionDetectorOptions);
    private init;
    /**
     * 检测是否为本地开发环境
     */
    private detectLocalEnvironment;
    /**
     * 监听资源加载失败事件
     */
    private listenResourceErrors;
    /**
     * 处理资源加载错误
     */
    private handleResourceError;
    /**
     * 开始定期检查版本
     */
    private startVersionCheck;
    /**
     * 停止版本检查
     */
    stopVersionCheck(): void;
    /**
     * 检查是否有新版本
     */
    checkForUpdate(): Promise<boolean>;
    /**
     * 通过检查package.json来判断更新（主要方式）
     */
    private checkVersionByPackage;
    /**
     * 通过检查index.html来判断更新（备选方式）
     */
    private checkVersionByIndex;
    /**
     * 通知有新版本更新
     */
    private notifyUpdate;
    /**
     * 注册更新回调
     */
    onUpdate(callback: (reason: UpdateReason) => void): void;
    /**
     * 注册资源错误回调
     */
    onResourceError(callback: (element?: Element) => void): void;
    /**
     * 移除回调
     */
    removeCallback(callback: Function): void;
    /**
     * 销毁检测器
     */
    destroy(): void;
    /**
     * 手动设置开发模式
     */
    setDevelopmentMode(isDev: boolean): void;
    /**
     * 获取当前是否为开发环境
     */
    isDevelopment(): boolean;
    /**
     * 刷新页面
     */
    reload(): void;
}
