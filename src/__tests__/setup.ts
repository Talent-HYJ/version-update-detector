// Jest setup file

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    hostname: 'example.com',
    href: 'https://example.com',
    reload: jest.fn()
  },
  writable: true
});

// Mock performance
Object.defineProperty(window, 'performance', {
  value: {
    timing: {
      navigationStart: Date.now(),
      loadEventEnd: Date.now() + 1000
    },
    getEntriesByType: jest.fn().mockReturnValue([
      {
        type: 'navigate'
      }
    ])
  },
  writable: true
});

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn((cb) => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock setTimeout
jest.useFakeTimers();
