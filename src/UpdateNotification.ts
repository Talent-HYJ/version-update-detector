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

export class UpdateNotification {
  private container: HTMLElement | null = null;
  private options: Required<UpdateNotificationOptions>;
  private events: UpdateNotificationEvents;
  private isVisible: boolean = false;
  private refreshing: boolean = false;
  private laterTimestamp: number = 0;

  constructor(options: UpdateNotificationOptions = {}, events: UpdateNotificationEvents = {}) {
    this.options = {
      title: '应用更新提醒',
      description: '请刷新页面以获得最新内容。',
      showClose: false,
      closeOnClickModal: false,
      closeOnPressEscape: false,
      forceUpdate: false,
      customClass: 'update-notification-dialog',
      width: '480px',
      center: true,
      buttonText: {
        later: '稍后提醒',
        refresh: '立即刷新',
        refreshing: '正在刷新...'
      },
      laterInterval: 10 * 60 * 1000, // 10分钟
      customStyles: {},
      ...options
    };
    this.events = events;
    this.init();
  }

  private init(): void {
    this.createContainer();
    this.bindEvents();
  }

  private createContainer(): void {
    // 创建遮罩层
    const overlay = document.createElement('div');
    overlay.className = 'update-notification-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background-color: rgba(0, 0, 0, 0.5);
      z-index: 9999;
      display: none;
    `;

    // 创建弹窗容器
    this.container = document.createElement('div');
    this.container.className = `update-notification-dialog ${this.options.customClass}`;
    this.container.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: ${this.options.width};
      max-width: 90%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      z-index: 10000;
      display: none;
    `;

    // 添加自定义样式
    if (this.options.customStyles.container) {
      this.container.style.cssText += this.options.customStyles.container;
    }

    overlay.appendChild(this.container);
    document.body.appendChild(overlay);
  }

  private bindEvents(): void {
    if (!this.container) return;

    // ESC键关闭
    if (this.options.closeOnPressEscape) {
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.isVisible) {
          this.hide();
        }
      });
    }

    // 点击遮罩关闭
    if (this.options.closeOnClickModal) {
      const overlay = this.container.parentElement;
      if (overlay) {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            this.hide();
          }
        });
      }
    }
  }

  /**
   * 显示更新通知
   */
  public show(reason: UpdateReason = 'unknown', forceUpdate: boolean = false): void {
    // 检查是否在稍后提醒间隔内
    const now = Date.now();
    if (reason !== 'resource-error' && this.laterTimestamp && now - this.laterTimestamp < this.options.laterInterval) {
      return;
    }

    if (!this.container) return;

    this.isVisible = true;
    this.refreshing = false;

    // 更新内容
    this.updateContent(reason, forceUpdate);

    // 显示弹窗
    const overlay = this.container.parentElement;
    if (overlay) {
      overlay.style.display = 'block';
      this.container.style.display = 'block';
    }

    // 添加动画效果
    requestAnimationFrame(() => {
      if (this.container) {
        this.container.style.opacity = '0';
        this.container.style.transform = 'translate(-50%, -50%) scale(0.8)';
        requestAnimationFrame(() => {
          if (this.container) {
            this.container.style.transition = 'all 0.3s ease';
            this.container.style.opacity = '1';
            this.container.style.transform = 'translate(-50%, -50%) scale(1)';
          }
        });
      }
    });
  }

  /**
   * 隐藏更新通知
   */
  public hide(): void {
    if (!this.container) return;

    this.isVisible = false;
    this.refreshing = false;

    // 添加关闭动画
    if (this.container) {
      this.container.style.transition = 'all 0.3s ease';
      this.container.style.opacity = '0';
      this.container.style.transform = 'translate(-50%, -50%) scale(0.8)';
    }

    setTimeout(() => {
      const overlay = this.container?.parentElement;
      if (overlay) {
        overlay.style.display = 'none';
      }
      if (this.container) {
        this.container.style.display = 'none';
      }
    }, 300);

    this.events.onClose?.();
  }

  /**
   * 更新弹窗内容
   */
  private updateContent(reason: UpdateReason, forceUpdate: boolean): void {
    if (!this.container) return;

    const { title, description, icon } = this.getContentByReason(reason, forceUpdate);
    const isForceUpdate = forceUpdate || reason === 'resource-error';

    this.container.innerHTML = `
      <div class="update-notification-content" style="padding: 20px;">
        <div class="update-notification-header" style="text-align: center; margin-bottom: 20px;">
          <div class="update-notification-icon" style="margin-bottom: 16px;">
            <i class="update-icon" style="
              display: inline-block;
              width: 48px;
              height: 48px;
              background: #409eff;
              border-radius: 50%;
              color: white;
              font-size: 24px;
              line-height: 48px;
              text-align: center;
              animation: rotate 2s linear infinite;
            ">${icon}</i>
          </div>
          <h3 style="
            margin: 0 0 16px 0;
            color: #303133;
            font-weight: 600;
            font-size: 20px;
          ">${title}</h3>
          <p style="
            margin: 0 0 16px 0;
            color: #606266;
            font-size: 14px;
            line-height: 1.6;
          ">${description}</p>
          ${this.getErrorDetails(reason)}
        </div>
        <div class="update-notification-footer" style="
          text-align: right;
          border-top: 1px solid #ebeef5;
          padding-top: 20px;
        ">
          ${
            !isForceUpdate
              ? `
            <button class="later-btn" style="
              margin-right: 10px;
              padding: 8px 16px;
              border: 1px solid #dcdfe6;
              border-radius: 4px;
              background: white;
              color: #606266;
              cursor: pointer;
              font-size: 14px;
            ">${this.options.buttonText.later}</button>
          `
              : ''
          }
          <button class="refresh-btn" style="
            padding: 8px 16px;
            border: 1px solid #409eff;
            border-radius: 4px;
            background: #409eff;
            color: white;
            cursor: pointer;
            font-size: 14px;
          ">${this.refreshing ? this.options.buttonText.refreshing : this.options.buttonText.refresh}</button>
        </div>
      </div>
      <style>
        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .update-notification-dialog {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .later-btn:hover {
          background: #f5f7fa;
        }
        .refresh-btn:hover {
          background: #66b1ff;
        }
        .refresh-btn:disabled {
          background: #a0cfff;
          cursor: not-allowed;
        }
      </style>
    `;

    // 绑定按钮事件
    this.bindButtonEvents();
  }

  /**
   * 根据更新原因获取内容
   */
  private getContentByReason(reason: UpdateReason, forceUpdate: boolean): { title: string; description: string; icon: string } {
    switch (reason) {
      case 'version-change':
        return {
          title: '发现新版本',
          description: '为了获得更好的使用体验，请刷新页面更新到最新版本。',
          icon: '↻'
        };
      case 'resource-error':
        return {
          title: '应用已更新',
          description: '请刷新页面以获得最新内容。',
          icon: '⚠'
        };
      case 'network-error':
        return {
          title: '网络连接异常',
          description: '网络连接异常，建议刷新页面重试。',
          icon: '⚠'
        };
      case 'redeploy':
      default:
        return {
          title: '应用已更新',
          description: '请刷新页面以获得最新内容。',
          icon: '↻'
        };
    }
  }

  /**
   * 获取错误详情
   */
  private getErrorDetails(reason: UpdateReason): string {
    if (reason === 'resource-error') {
      return `
        <div style="
          margin-top: 16px;
          padding: 12px;
          border: 1px solid #fbc4c4;
          border-radius: 4px;
          background-color: #fef0f0;
          color: #f56c6c;
          font-size: 14px;
        ">
          <span style="margin-right: 8px;">⚠</span>
          检测到部分资源加载失败，可能影响正常使用
        </div>
      `;
    }
    if (reason === 'network-error') {
      return `
        <div style="
          margin-top: 16px;
          padding: 12px;
          border: 1px solid #fbc4c4;
          border-radius: 4px;
          background-color: #fef0f0;
          color: #f56c6c;
          font-size: 14px;
        ">
          <span style="margin-right: 8px;">⚠</span>
          网络连接异常，建议刷新页面重试
        </div>
      `;
    }
    return '';
  }

  /**
   * 绑定按钮事件
   */
  private bindButtonEvents(): void {
    if (!this.container) return;

    const laterBtn = this.container.querySelector('.later-btn');
    const refreshBtn = this.container.querySelector('.refresh-btn');

    if (laterBtn) {
      laterBtn.addEventListener('click', () => {
        this.handleLater();
      });
    }

    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        this.handleRefresh();
      });
    }
  }

  /**
   * 处理刷新操作
   */
  private handleRefresh(): void {
    this.refreshing = true;
    this.events.onRefresh?.();

    // 更新按钮状态
    const refreshBtn = this.container?.querySelector('.refresh-btn') as HTMLButtonElement;
    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = this.options.buttonText.refreshing || '正在刷新...';
    }

    // 防止刷新失败，5秒后强制刷新
    setTimeout(() => {
      if (this.refreshing) {
        window.location.reload();
      }
    }, 5000);
  }

  /**
   * 处理稍后提醒操作
   */
  private handleLater(): void {
    this.laterTimestamp = Date.now();
    this.hide();
    this.events.onLater?.();
  }

  /**
   * 销毁通知组件
   */
  public destroy(): void {
    if (this.container) {
      const overlay = this.container.parentElement;
      if (overlay) {
        document.body.removeChild(overlay);
      }
      this.container = null;
    }
  }

  /**
   * 检查是否可见
   */
  public isNotificationVisible(): boolean {
    return this.isVisible;
  }
}
