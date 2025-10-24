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

export class VersionDetector {
  private currentVersion: string;
  private checkInterval: number;
  private timer: NodeJS.Timeout | null = null;
  private isChecking: boolean = false;
  private onUpdateCallbacks: Array<(reason: UpdateReason) => void> = [];
  private onResourceErrorCallbacks: Array<(element?: Element) => void> = [];
  private isLocalDevelopment: boolean;
  private options: Required<VersionDetectorOptions>;

  constructor(options: VersionDetectorOptions = {}) {
    this.currentVersion = (window as any).version || '1.0.0';
    this.options = {
      checkInterval: 30 * 60 * 1000, // 30分钟
      skipInDevelopment: true,
      isDevelopment: () => this.detectLocalEnvironment(),
      versionCheckUrl: '/package.json',
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
    // 开始定期检查版本
    this.startVersionCheck();
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

    // 立即检查一次
    setTimeout(() => this.checkForUpdate(), 5000);

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
      // 方法1: 检查package.json的版本号和修改时间（主要方式）
      const hasPackageUpdate = await this.checkVersionByPackage();
      if (hasPackageUpdate) {
        return true;
      }

      // 方法2: 检查index.html的变化（备选方式）
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
   * 通过检查package.json来判断更新（主要方式）
   */
  private async checkVersionByPackage(): Promise<boolean> {
    try {
      const response = await fetch(`${this.options.versionCheckUrl}?${Date.now()}`, {
        cache: 'no-cache'
      });

      if (response.ok) {
        const packageInfo = await response.json();
        const remoteVersion = packageInfo.version;

        // 获取HTTP缓存头信息
        const etag = response.headers.get('etag');
        const lastModified = response.headers.get('last-modified');

        // 获取本地存储的信息
        const storedPackageInfo = localStorage.getItem('app_package_info');

        // 首次访问，存储信息
        if (!storedPackageInfo) {
          const packageData: PackageInfo = {
            version: remoteVersion,
            etag: etag || undefined,
            lastModified: lastModified || undefined,
            checkTime: Date.now()
          };
          localStorage.setItem('app_package_info', JSON.stringify(packageData));
          return false;
        }

        const localPackageInfo: PackageInfo = JSON.parse(storedPackageInfo);

        // 检查各种变化情况
        const hasVersionChange = remoteVersion && remoteVersion !== localPackageInfo.version;
        const hasEtagChange = etag && etag !== localPackageInfo.etag;
        const hasLastModifiedChange = lastModified && lastModified !== localPackageInfo.lastModified;

        // 如果有任何变化，说明应用已更新或重新部署
        if (hasVersionChange || hasEtagChange || hasLastModifiedChange) {
          // 更新本地存储
          const updatedPackageData: PackageInfo = {
            version: remoteVersion,
            etag: etag || undefined,
            lastModified: lastModified || undefined,
            checkTime: Date.now()
          };
          localStorage.setItem('app_package_info', JSON.stringify(updatedPackageData));

          // 根据变化类型确定提示原因
          const reason: UpdateReason = hasVersionChange ? 'version-change' : 'redeploy';
          this.notifyUpdate(reason);
          return true;
        }
      }
    } catch (error) {
      console.warn('无法获取package.json:', error);
    }

    return false;
  }

  /**
   * 通过检查index.html来判断更新（备选方式）
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

        // 首次访问，存储当前值
        if (!storedEtag && !storedLastModified) {
          if (etag) localStorage.setItem('app_index_etag', etag);
          if (lastModified) localStorage.setItem('app_index_last_modified', lastModified);
          return false;
        }

        // 检查是否有变化
        const hasUpdate = (etag && etag !== storedEtag) || (lastModified && lastModified !== storedLastModified);

        if (hasUpdate) {
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
