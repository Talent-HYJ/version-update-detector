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

interface InternalOptions {
  checkInterval: number;
  skipInDevelopment: boolean;
  isDevelopment: () => boolean;
  enableResourceErrorDetection: boolean;
}

export class VersionDetector {
  private currentVersion: string;
  private checkInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;
  private onUpdateCallbacks: Array<(reason: UpdateReason) => void> = [];
  private onResourceErrorCallbacks: Array<(element?: Element) => void> = [];
  private isLocalDevelopment: boolean;
  private options: InternalOptions;

  constructor(options: VersionDetectorOptions = {}) {
    this.currentVersion = (window as any).version || '1.0.0';
    this.options = {
      checkInterval: 30 * 60 * 1000, // 30分钟
      skipInDevelopment: true,
      isDevelopment: () => this.detectLocalEnvironment(),
      enableResourceErrorDetection: true,
      ...options
    };
    this.checkInterval = this.options.checkInterval;
    this.isLocalDevelopment = this.options.isDevelopment();

    this.init();
  }

  private init(): void {
    // 如果是本地开发环境，不进行版本检测
    if (this.isLocalDevelopment && this.options.skipInDevelopment) {
      console.log('检测到本地开发环境，跳过版本检测');
      return;
    }

    // 监听资源加载失败事件
    if (this.options.enableResourceErrorDetection) {
      this.listenResourceErrors();
    }
    
    // 监听页面可见性变化
    this.listenVisibilityChange();
    
    // 立即记录当前版本信息（避免首次检测时记录错误的版本）
    this.recordInitialVersion();
    
    // 开始定期检查版本
    this.startVersionCheck();
  }

  /**
   * 记录初始版本信息
   * 在页面加载时立即记录当前的 ETag，避免首次检测时误判
   */
  private async recordInitialVersion(): Promise<void> {
    // 如果已经有存储的版本信息，说明不是首次访问，无需记录
    const storedEtag = localStorage.getItem('app_index_etag');
    const storedLastModified = localStorage.getItem('app_index_last_modified');
    
    if (storedEtag || storedLastModified) {
      console.log('已有版本记录，跳过初始化记录');
      return;
    }

    // 首次访问，立即记录当前页面的版本信息
    try {
      const response = await fetch(`/index.html?${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (response.ok) {
        const etag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');

        if (etag) {
          localStorage.setItem('app_index_etag', etag);
          console.log('初始化记录 ETag:', etag);
        }
        if (lastModified) {
          localStorage.setItem('app_index_last_modified', lastModified);
          console.log('初始化记录 Last-Modified:', lastModified);
        }
      }
    } catch (error) {
      console.warn('记录初始版本信息失败:', error);
    }
  }

  /**
   * 检测是否为本地开发环境
   */
  private detectLocalEnvironment(): boolean {
    // 检查是否为本地地址
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';

    // 检查环境变量
    const isNodeEnvDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';

    const isDev = isLocalhost || isNodeEnvDev;

    console.log('开发环境检测:', { isLocalhost, isNodeEnvDev, isDev });
    return isDev;
  }

  /**
   * 监听页面可见性变化
   * 当页面从不可见变为可见状态时触发检测
   */
  private listenVisibilityChange(): void {
    if (typeof document === 'undefined' || !document.addEventListener) {
      return;
    }

    document.addEventListener('visibilitychange', () => {
      // 当页面从不可见变为可见时，触发版本检测
      if (!document.hidden) {
        console.log('页面变为可见，检查版本更新');
        this.checkForUpdate();
      }
    });
  }

  /**
   * 监听资源加载失败事件
   */
  private listenResourceErrors(): void {
    // 监听全局错误事件
    window.addEventListener(
      'error',
      (event) => {
        // 检查是否是资源加载错误
        if (event.target !== window) {
          const element = event.target as Element;
          const isResourceError =
            element.tagName &&
            (element.tagName.toLowerCase() === 'script' || element.tagName.toLowerCase() === 'link' || element.tagName.toLowerCase() === 'img');

          if (isResourceError) {
            console.warn('资源加载失败:', (element as HTMLScriptElement).src || (element as HTMLLinkElement).href);
            this.handleResourceError(element);
          }
        }
      },
      true
    );

    // 监听未处理的Promise rejection（可能的网络请求失败）
    window.addEventListener('unhandledrejection', (event) => {
      // 检查是否是网络相关错误
      if (
        event.reason &&
        (event.reason.message?.includes('Loading chunk') || event.reason.message?.includes('Failed to fetch') || event.reason.code === 'ECONNABORTED')
      ) {
        console.warn('网络请求失败，可能是版本更新导致:', event.reason);
        this.handleResourceError();
      }
    });
  }

  /**
   * 处理资源加载错误
   */
  private async handleResourceError(element?: Element): Promise<void> {
    // 如果是本地开发环境，不处理资源错误
    if (this.isLocalDevelopment && this.options.skipInDevelopment) {
      console.log('本地开发环境，忽略资源加载错误');
      return;
    }

    // 延迟一点时间，避免频繁检查
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 检查是否有新版本
    const hasUpdate = await this.checkForUpdate();
    if (hasUpdate) {
      this.onResourceErrorCallbacks.forEach((callback) => {
        try {
          callback(element);
        } catch (error) {
          console.error('Resource error callback error:', error);
        }
      });
    }
  }

  /**
   * 开始定期检查版本
   */
  private startVersionCheck(): void {
    // 如果是本地开发环境，不启动版本检查
    if (this.isLocalDevelopment && this.options.skipInDevelopment) {
      console.log('本地开发环境，跳过版本检查启动');
      return;
    }

    if (this.timer) {
      clearInterval(this.timer);
    }

    // 初始化时已经记录了版本信息，所以第一次检测可以稍微延后
    // 避免在页面刚加载时频繁请求
    setTimeout(() => this.checkForUpdate(), 10000); // 10秒后首次检测

    // 定期检查
    this.timer = setInterval(() => {
      this.checkForUpdate();
    }, this.checkInterval);
  }

  /**
   * 停止版本检查
   */
  public stopVersionCheck(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * 检查是否有新版本
   * 通过检查 index.html 的 ETag 和 Last-Modified 来判断
   */
  public async checkForUpdate(): Promise<boolean> {
    // 如果是本地开发环境，直接返回false
    if (this.isLocalDevelopment && this.options.skipInDevelopment) {
      return false;
    }

    if (this.isChecking) {
      return false;
    }

    this.isChecking = true;

    try {
      // 检查 index.html 的变化
      const hasIndexUpdate = await this.checkVersionByIndex();
      if (hasIndexUpdate) {
        return true;
      }
    } catch (error) {
      console.warn('版本检查失败:', error);
      // 如果检查失败，可能是网络问题或新版本导致的路径变化
      // 尝试简单的连通性测试
      try {
        await fetch('/', { method: 'HEAD', cache: 'no-cache' });
      } catch (connectError) {
        // 连接失败，可能需要更新
        this.notifyUpdate('network-error');
        return true;
      }
    } finally {
      this.isChecking = false;
    }

    return false;
  }

  /**
   * 通过检查 index.html 来判断更新
   * 使用 ETag 和 Last-Modified 来判断是否有更新
   */
  private async checkVersionByIndex(): Promise<boolean> {
    try {
      const response = await fetch(`/index.html?${Date.now()}`, {
        method: 'HEAD',
        cache: 'no-cache'
      });

      if (response.ok) {
        // 通过ETag或Last-Modified来判断是否有更新
        const etag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');

        const storedEtag = localStorage.getItem('app_index_etag');
        const storedLastModified = localStorage.getItem('app_index_last_modified');

        // 如果没有存储的版本信息（理论上不应该发生，因为初始化时已记录）
        // 这里作为保护措施，避免误报更新
        if (!storedEtag && !storedLastModified) {
          console.warn('未找到存储的版本信息，记录当前版本');
          if (etag) localStorage.setItem('app_index_etag', etag);
          if (lastModified) localStorage.setItem('app_index_last_modified', lastModified);
          return false;
        }

        // 检查是否有变化
        const hasUpdate = (etag && etag !== storedEtag) || (lastModified && lastModified !== storedLastModified);

        if (hasUpdate) {
          console.log('检测到版本更新:', {
            oldEtag: storedEtag,
            newEtag: etag,
            oldLastModified: storedLastModified,
            newLastModified: lastModified
          });

          // 更新存储的值
          if (etag) localStorage.setItem('app_index_etag', etag);
          if (lastModified) localStorage.setItem('app_index_last_modified', lastModified);

          this.notifyUpdate('redeploy');
          return true;
        }
      }
    } catch (error) {
      console.warn('无法检查index.html:', error);
    }

    return false;
  }

  /**
   * 通知有新版本更新
   */
  private notifyUpdate(reason: UpdateReason = 'unknown'): void {
    console.log('检测到应用更新, 原因:', reason);
    this.onUpdateCallbacks.forEach((callback) => {
      try {
        callback(reason);
      } catch (error) {
        console.error('Update callback error:', error);
      }
    });
  }

  /**
   * 注册更新回调
   */
  public onUpdate(callback: (reason: UpdateReason) => void): void {
    if (typeof callback === 'function') {
      this.onUpdateCallbacks.push(callback);
    }
  }

  /**
   * 注册资源错误回调
   */
  public onResourceError(callback: (element?: Element) => void): void {
    if (typeof callback === 'function') {
      this.onResourceErrorCallbacks.push(callback);
    }
  }

  /**
   * 移除回调
   */
  public removeCallback(callback: Function): void {
    const updateIndex = this.onUpdateCallbacks.indexOf(callback as any);
    if (updateIndex > -1) {
      this.onUpdateCallbacks.splice(updateIndex, 1);
    }

    const errorIndex = this.onResourceErrorCallbacks.indexOf(callback as any);
    if (errorIndex > -1) {
      this.onResourceErrorCallbacks.splice(errorIndex, 1);
    }
  }

  /**
   * 销毁检测器
   */
  public destroy(): void {
    this.stopVersionCheck();
    this.onUpdateCallbacks = [];
    this.onResourceErrorCallbacks = [];
  }

  /**
   * 手动设置开发模式
   */
  public setDevelopmentMode(isDev: boolean): void {
    this.isLocalDevelopment = isDev;
    if (isDev) {
      console.log('手动设置为开发模式，停止版本检测');
      this.stopVersionCheck();
    } else {
      console.log('手动设置为生产模式，重新启动版本检测');
      this.init();
    }
  }

  /**
   * 获取当前是否为开发环境
   */
  public isDevelopment(): boolean {
    return this.isLocalDevelopment;
  }

  /**
   * 刷新页面
   */
  public reload(): void {
    // 清除缓存并刷新
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => registration.unregister());
        setTimeout(() => window.location.reload(), 100);
      });
    } else {
      window.location.reload();
    }
  }
}
