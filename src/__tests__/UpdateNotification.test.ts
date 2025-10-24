import { UpdateNotification } from '../UpdateNotification';

// Mock DOM
Object.defineProperty(document, 'body', {
  value: {
    appendChild: jest.fn(),
    removeChild: jest.fn()
  },
  writable: true
});

describe('UpdateNotification', () => {
  let notification: UpdateNotification;

  beforeEach(() => {
    // Reset DOM mocks
    jest.clearAllMocks();

    // Mock createElement
    const mockElement = {
      style: {},
      innerHTML: '',
      addEventListener: jest.fn(),
      querySelector: jest.fn(),
      parentElement: {
        style: {},
        addEventListener: jest.fn()
      }
    };

    jest.spyOn(document, 'createElement').mockReturnValue(mockElement as any);
    jest.spyOn(document, 'querySelector').mockReturnValue(mockElement as any);
  });

  afterEach(() => {
    if (notification) {
      notification.destroy();
    }
  });

  test('should create instance', () => {
    notification = new UpdateNotification();
    expect(notification).toBeInstanceOf(UpdateNotification);
  });

  test('should show notification', () => {
    notification = new UpdateNotification();
    notification.show('version-change');
    expect(notification.isNotificationVisible()).toBe(true);
  });

  test('should hide notification', () => {
    notification = new UpdateNotification();
    notification.show('version-change');
    notification.hide();
    expect(notification.isNotificationVisible()).toBe(false);
  });

  test('should handle refresh event', () => {
    const onRefresh = jest.fn();
    notification = new UpdateNotification({}, { onRefresh });

    // Mock button click
    const mockButton = {
      addEventListener: jest.fn((event, callback) => {
        if (event === 'click') {
          callback();
        }
      }),
      disabled: false,
      textContent: ''
    };

    notification['container'] = {
      querySelector: jest.fn().mockReturnValue(mockButton)
    } as any;

    notification.show('version-change');
    // Simulate button click
    mockButton.addEventListener('click', () => {
      notification['handleRefresh']();
    });

    expect(onRefresh).toHaveBeenCalled();
  });

  test('should handle later event', () => {
    const onLater = jest.fn();
    notification = new UpdateNotification({}, { onLater });

    notification.show('version-change');
    notification['handleLater']();

    expect(onLater).toHaveBeenCalled();
  });

  test('should respect later interval', () => {
    notification = new UpdateNotification({
      laterInterval: 1000 // 1 second
    });

    // First show
    notification.show('version-change');
    notification['handleLater']();

    // Try to show again immediately
    notification.show('version-change');
    expect(notification.isNotificationVisible()).toBe(false);
  });

  test('should show force update', () => {
    notification = new UpdateNotification();
    notification.show('resource-error', true);
    expect(notification.isNotificationVisible()).toBe(true);
  });
});
