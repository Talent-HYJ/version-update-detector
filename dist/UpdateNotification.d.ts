import { UpdateReason } from './VersionDetector';
export interface UpdateNotificationOptions {
    /** 弹窗标题 */
    title?: string;
    /** 弹窗描述 */
    description?: string;
    /** 是否显示关闭按钮 */
    showClose?: boolean;
    /** 是否允许点击遮罩关闭 */
    closeOnClickModal?: boolean;
    /** 是否允许ESC键关闭 */
    closeOnPressEscape?: boolean;
    /** 是否强制更新（不显示稍后提醒按钮） */
    forceUpdate?: boolean;
    /** 自定义CSS类名 */
    customClass?: string;
    /** 弹窗宽度 */
    width?: string;
    /** 是否居中显示 */
    center?: boolean;
    /** 按钮文本配置 */
    buttonText?: {
        later?: string;
        refresh?: string;
        refreshing?: string;
    };
    /** 稍后提醒间隔时间（毫秒） */
    laterInterval?: number;
    /** 自定义样式 */
    customStyles?: {
        container?: string;
        content?: string;
        button?: string;
    };
}
export interface UpdateNotificationEvents {
    onRefresh?: () => void;
    onLater?: () => void;
    onClose?: () => void;
}
export declare class UpdateNotification {
    private container;
    private options;
    private events;
    private isVisible;
    private refreshing;
    private laterTimestamp;
    constructor(options?: UpdateNotificationOptions, events?: UpdateNotificationEvents);
    private init;
    private createContainer;
    private bindEvents;
    /**
     * 显示更新通知
     */
    show(reason?: UpdateReason, forceUpdate?: boolean): void;
    /**
     * 隐藏更新通知
     */
    hide(): void;
    /**
     * 更新弹窗内容
     */
    private updateContent;
    /**
     * 根据更新原因获取内容
     */
    private getContentByReason;
    /**
     * 获取错误详情
     */
    private getErrorDetails;
    /**
     * 绑定按钮事件
     */
    private bindButtonEvents;
    /**
     * 处理刷新操作
     */
    private handleRefresh;
    /**
     * 处理稍后提醒操作
     */
    private handleLater;
    /**
     * 销毁通知组件
     */
    destroy(): void;
    /**
     * 检查是否可见
     */
    isNotificationVisible(): boolean;
}
