'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class VersionDetector {
    constructor(options = {}) {
        this.timer = null;
        this.isChecking = false;
        this.onUpdateCallbacks = [];
        this.onResourceErrorCallbacks = [];
        this.currentVersion = window.version || '1.0.0';
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
    init() {
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
    detectLocalEnvironment() {
        // 检查是否为本地地址
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '0.0.0.0';
        // 检查环境变量
        const isNodeEnvDev = typeof process !== 'undefined' && process.env && process.env.NODE_ENV === 'development';
        const isDev = isLocalhost || isNodeEnvDev;
        console.log('开发环境检测:', { isLocalhost, isNodeEnvDev, isDev });
        return isDev;
    }
    /**
     * 监听资源加载失败事件
     */
    listenResourceErrors() {
        // 监听全局错误事件
        window.addEventListener('error', (event) => {
            // 检查是否是资源加载错误
            if (event.target !== window) {
                const element = event.target;
                const isResourceError = element.tagName &&
                    (element.tagName.toLowerCase() === 'script' || element.tagName.toLowerCase() === 'link' || element.tagName.toLowerCase() === 'img');
                if (isResourceError) {
                    console.warn('资源加载失败:', element.src || element.href);
                    this.handleResourceError(element);
                }
            }
        }, true);
        // 监听未处理的Promise rejection（可能的网络请求失败）
        window.addEventListener('unhandledrejection', (event) => {
            var _a, _b;
            // 检查是否是网络相关错误
            if (event.reason &&
                (((_a = event.reason.message) === null || _a === void 0 ? void 0 : _a.includes('Loading chunk')) || ((_b = event.reason.message) === null || _b === void 0 ? void 0 : _b.includes('Failed to fetch')) || event.reason.code === 'ECONNABORTED')) {
                console.warn('网络请求失败，可能是版本更新导致:', event.reason);
                this.handleResourceError();
            }
        });
    }
    /**
     * 处理资源加载错误
     */
    async handleResourceError(element) {
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
                }
                catch (error) {
                    console.error('Resource error callback error:', error);
                }
            });
        }
    }
    /**
     * 开始定期检查版本
     */
    startVersionCheck() {
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
    stopVersionCheck() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }
    /**
     * 检查是否有新版本
     */
    async checkForUpdate() {
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
        }
        catch (error) {
            console.warn('版本检查失败:', error);
            // 如果检查失败，可能是网络问题或新版本导致的路径变化
            // 尝试简单的连通性测试
            try {
                await fetch('/', { method: 'HEAD', cache: 'no-cache' });
            }
            catch (connectError) {
                // 连接失败，可能需要更新
                this.notifyUpdate('network-error');
                return true;
            }
        }
        finally {
            this.isChecking = false;
        }
        return false;
    }
    /**
     * 通过检查package.json来判断更新（主要方式）
     */
    async checkVersionByPackage() {
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
                    const packageData = {
                        version: remoteVersion,
                        etag: etag || undefined,
                        lastModified: lastModified || undefined,
                        checkTime: Date.now()
                    };
                    localStorage.setItem('app_package_info', JSON.stringify(packageData));
                    return false;
                }
                const localPackageInfo = JSON.parse(storedPackageInfo);
                // 检查各种变化情况
                const hasVersionChange = remoteVersion && remoteVersion !== localPackageInfo.version;
                const hasEtagChange = etag && etag !== localPackageInfo.etag;
                const hasLastModifiedChange = lastModified && lastModified !== localPackageInfo.lastModified;
                // 如果有任何变化，说明应用已更新或重新部署
                if (hasVersionChange || hasEtagChange || hasLastModifiedChange) {
                    // 更新本地存储
                    const updatedPackageData = {
                        version: remoteVersion,
                        etag: etag || undefined,
                        lastModified: lastModified || undefined,
                        checkTime: Date.now()
                    };
                    localStorage.setItem('app_package_info', JSON.stringify(updatedPackageData));
                    // 根据变化类型确定提示原因
                    const reason = hasVersionChange ? 'version-change' : 'redeploy';
                    this.notifyUpdate(reason);
                    return true;
                }
            }
        }
        catch (error) {
            console.warn('无法获取package.json:', error);
        }
        return false;
    }
    /**
     * 通过检查index.html来判断更新（备选方式）
     */
    async checkVersionByIndex() {
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
                    if (etag)
                        localStorage.setItem('app_index_etag', etag);
                    if (lastModified)
                        localStorage.setItem('app_index_last_modified', lastModified);
                    return false;
                }
                // 检查是否有变化
                const hasUpdate = (etag && etag !== storedEtag) || (lastModified && lastModified !== storedLastModified);
                if (hasUpdate) {
                    // 更新存储的值
                    if (etag)
                        localStorage.setItem('app_index_etag', etag);
                    if (lastModified)
                        localStorage.setItem('app_index_last_modified', lastModified);
                    this.notifyUpdate('redeploy');
                    return true;
                }
            }
        }
        catch (error) {
            console.warn('无法检查index.html:', error);
        }
        return false;
    }
    /**
     * 通知有新版本更新
     */
    notifyUpdate(reason = 'unknown') {
        console.log('检测到应用更新, 原因:', reason);
        this.onUpdateCallbacks.forEach((callback) => {
            try {
                callback(reason);
            }
            catch (error) {
                console.error('Update callback error:', error);
            }
        });
    }
    /**
     * 注册更新回调
     */
    onUpdate(callback) {
        if (typeof callback === 'function') {
            this.onUpdateCallbacks.push(callback);
        }
    }
    /**
     * 注册资源错误回调
     */
    onResourceError(callback) {
        if (typeof callback === 'function') {
            this.onResourceErrorCallbacks.push(callback);
        }
    }
    /**
     * 移除回调
     */
    removeCallback(callback) {
        const updateIndex = this.onUpdateCallbacks.indexOf(callback);
        if (updateIndex > -1) {
            this.onUpdateCallbacks.splice(updateIndex, 1);
        }
        const errorIndex = this.onResourceErrorCallbacks.indexOf(callback);
        if (errorIndex > -1) {
            this.onResourceErrorCallbacks.splice(errorIndex, 1);
        }
    }
    /**
     * 销毁检测器
     */
    destroy() {
        this.stopVersionCheck();
        this.onUpdateCallbacks = [];
        this.onResourceErrorCallbacks = [];
    }
    /**
     * 手动设置开发模式
     */
    setDevelopmentMode(isDev) {
        this.isLocalDevelopment = isDev;
        if (isDev) {
            console.log('手动设置为开发模式，停止版本检测');
            this.stopVersionCheck();
        }
        else {
            console.log('手动设置为生产模式，重新启动版本检测');
            this.init();
        }
    }
    /**
     * 获取当前是否为开发环境
     */
    isDevelopment() {
        return this.isLocalDevelopment;
    }
    /**
     * 刷新页面
     */
    reload() {
        // 清除缓存并刷新
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then((registrations) => {
                registrations.forEach((registration) => registration.unregister());
                setTimeout(() => window.location.reload(), 100);
            });
        }
        else {
            window.location.reload();
        }
    }
}

class UpdateNotification {
    constructor(options = {}, events = {}) {
        this.container = null;
        this.isVisible = false;
        this.refreshing = false;
        this.laterTimestamp = 0;
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
    init() {
        this.createContainer();
        this.bindEvents();
    }
    createContainer() {
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
    bindEvents() {
        if (!this.container)
            return;
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
    show(reason = 'unknown', forceUpdate = false) {
        // 检查是否在稍后提醒间隔内
        const now = Date.now();
        if (reason !== 'resource-error' && this.laterTimestamp && now - this.laterTimestamp < this.options.laterInterval) {
            return;
        }
        if (!this.container)
            return;
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
    hide() {
        var _a, _b;
        if (!this.container)
            return;
        this.isVisible = false;
        this.refreshing = false;
        // 添加关闭动画
        if (this.container) {
            this.container.style.transition = 'all 0.3s ease';
            this.container.style.opacity = '0';
            this.container.style.transform = 'translate(-50%, -50%) scale(0.8)';
        }
        setTimeout(() => {
            var _a;
            const overlay = (_a = this.container) === null || _a === void 0 ? void 0 : _a.parentElement;
            if (overlay) {
                overlay.style.display = 'none';
            }
            if (this.container) {
                this.container.style.display = 'none';
            }
        }, 300);
        (_b = (_a = this.events).onClose) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    /**
     * 更新弹窗内容
     */
    updateContent(reason, forceUpdate) {
        if (!this.container)
            return;
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
          ${!isForceUpdate
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
            : ''}
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
    getContentByReason(reason, forceUpdate) {
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
    getErrorDetails(reason) {
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
    bindButtonEvents() {
        if (!this.container)
            return;
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
    handleRefresh() {
        var _a, _b, _c;
        this.refreshing = true;
        (_b = (_a = this.events).onRefresh) === null || _b === void 0 ? void 0 : _b.call(_a);
        // 更新按钮状态
        const refreshBtn = (_c = this.container) === null || _c === void 0 ? void 0 : _c.querySelector('.refresh-btn');
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
    handleLater() {
        var _a, _b;
        this.laterTimestamp = Date.now();
        this.hide();
        (_b = (_a = this.events).onLater) === null || _b === void 0 ? void 0 : _b.call(_a);
    }
    /**
     * 销毁通知组件
     */
    destroy() {
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
    isNotificationVisible() {
        return this.isVisible;
    }
}

/**
 * 创建版本检测器和更新通知的默认实例
 */
function createVersionUpdateDetector(detectorOptions = {}, notificationOptions = {}, notificationEvents = {}) {
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
var index = {
    VersionDetector,
    UpdateNotification,
    createVersionUpdateDetector
};

exports.UpdateNotification = UpdateNotification;
exports.VersionDetector = VersionDetector;
exports.createVersionUpdateDetector = createVersionUpdateDetector;
exports.default = index;
//# sourceMappingURL=index.js.map
