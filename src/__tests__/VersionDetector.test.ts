import { VersionDetector } from '../VersionDetector';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock fetch
global.fetch = jest.fn();

describe('VersionDetector', () => {
  let detector: VersionDetector;

  beforeEach(() => {
    jest.clearAllMocks();
    detector = new VersionDetector({
      skipInDevelopment: false,
      checkInterval: 1000
    });
  });

  afterEach(() => {
    detector.destroy();
  });

  test('should create instance', () => {
    expect(detector).toBeInstanceOf(VersionDetector);
  });

  test('should detect development environment', () => {
    // Mock localhost
    Object.defineProperty(window, 'location', {
      value: { hostname: 'localhost' },
      writable: true
    });

    const devDetector = new VersionDetector();
    expect(devDetector.isDevelopment()).toBe(true);
  });

  test('should register update callback', () => {
    const callback = jest.fn();
    detector.onUpdate(callback);

    // Simulate update
    detector['notifyUpdate']('version-change');
    expect(callback).toHaveBeenCalledWith('version-change');
  });

  test('should register resource error callback', () => {
    const callback = jest.fn();
    detector.onResourceError(callback);

    // Simulate resource error
    detector['handleResourceError']();
    expect(callback).toHaveBeenCalled();
  });

  test('should remove callback', () => {
    const callback = jest.fn();
    detector.onUpdate(callback);
    detector.removeCallback(callback);

    detector['notifyUpdate']('version-change');
    expect(callback).not.toHaveBeenCalled();
  });

  test('should set development mode', () => {
    detector.setDevelopmentMode(true);
    expect(detector.isDevelopment()).toBe(true);

    detector.setDevelopmentMode(false);
    expect(detector.isDevelopment()).toBe(false);
  });

  test('should check for update', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ version: '1.0.1' }),
      headers: {
        get: jest.fn().mockReturnValue('etag123')
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    localStorageMock.getItem.mockReturnValue(null);

    const result = await detector.checkForUpdate();
    expect(result).toBe(false); // First time should not trigger update
  });

  test('should detect version change', async () => {
    const mockResponse = {
      ok: true,
      json: () => Promise.resolve({ version: '1.0.2' }),
      headers: {
        get: jest.fn().mockReturnValue('etag456')
      }
    };

    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
    localStorageMock.getItem.mockReturnValue(
      JSON.stringify({
        version: '1.0.1',
        etag: 'etag123',
        checkTime: Date.now()
      })
    );

    const result = await detector.checkForUpdate();
    expect(result).toBe(true);
  });
});
