// src/setupTests.ts
import { vi } from 'vitest'; // Import vi

// Import original jest-dom matchers
import '@testing-library/jest-dom';

// --- Workaround for Vitest/React 18 act warning --- //
if (typeof globalThis !== 'undefined') {
  // Revert to any for simplicity in test setup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
}
// Also ensure it's set on self/window if they exist in jsdom
if (typeof self !== 'undefined') {
  // Revert to any for simplicity in test setup
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (self as any).IS_REACT_ACT_ENVIRONMENT = true;
}
// ---------------------------------------------------- //

// --- Manual Chrome API Mocks using Vitest --- //

// Use vi.stubGlobal to assign the mock directly
vi.stubGlobal('chrome', {
  runtime: {
    sendMessage: vi.fn((message, callback) => {
      // Default implementation, can be overridden in tests
      if (callback) {
        // Simulate async response if callback is provided
        // setTimeout(() => callback({ success: true, mockResponse: 'mocked default response' }), 0);
      }
      // Return a promise for async usage
      return Promise.resolve({ success: true, mockResponse: 'mocked default response' });
    }),
    onMessage: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn().mockReturnValue(false),
    },
    onInstalled: {
        addListener: vi.fn(),
        // Mock other onInstalled properties if needed
    },
    getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
    lastError: undefined, // Start as undefined
    // Mock other necessary runtime properties
  },
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    sync: {
      get: vi.fn().mockImplementation((keys, callback) => {
        // Simpler Default Implementation 
        // This default implementation primarily supports the callback pattern.
        // Tests needing specific resolved values should use mockImplementation.
        const simpleResult = {}; // Always return empty by default via callback
        
        if (callback) {
            // Simulate async callback behavior with the default empty object
            // Tests needing specific data in callback MUST use mockImplementation
            setTimeout(() => callback(simpleResult), 0); 
        }
        // The promise resolution can be controlled by mockResolvedValue in tests
        // It might be disconnected from the callback value in this simple mock.
        return Promise.resolve(simpleResult); 
      }),
      set: vi.fn((items, callback) => {
        // Default mock: resolve promise, call callback if provided
        if (callback) {
          // Simulate async callback behavior
          setTimeout(() => callback(), 0);
        }
        return Promise.resolve();
      }),
      clear: vi.fn((callback) => {
        if (callback) {
          // Simulate async callback behavior
          setTimeout(() => callback(), 0);
        }
        return Promise.resolve();
      }),
      remove: vi.fn((keys, callback) => { // Added remove mock
         if (callback) {
             setTimeout(() => callback(), 0);
         }
         return Promise.resolve();
      }),
      // Mock other storage.sync properties if needed (e.g., QUOTA_BYTES)
    },
    // Mock storage.managed if needed
    managed: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
      clear: vi.fn().mockResolvedValue(undefined),
    },
    // Mock storage.session if needed (available in Manifest V3)
    session: {
        get: vi.fn().mockResolvedValue({}),
        set: vi.fn().mockResolvedValue(undefined),
        remove: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
    }
  },
  contextMenus: {
    create: vi.fn((createProperties, callback) => {
      if (callback) setTimeout(() => callback(), 0);
      // No return value needed based on types
    }),
    update: vi.fn((id, updateProperties, callback) => {
      if (callback) setTimeout(() => callback(), 0);
      // No return value needed based on types
    }),
    remove: vi.fn((menuItemId, callback) => {
      if (callback) setTimeout(() => callback(), 0);
      // No return value needed based on types
    }),
    removeAll: vi.fn((callback) => {
      if (callback) setTimeout(() => callback(), 0);
      // No return value needed based on types
    }),
    onClicked: {
      addListener: vi.fn(),
      removeListener: vi.fn(),
      hasListener: vi.fn().mockReturnValue(false),
    },
    // Mock other contextMenus properties if needed
  },
  notifications: {
    create: vi.fn((optionsOrId, optionsOrCallback, callback) => {
        const notificationId = typeof optionsOrId === 'string' ? optionsOrId : `mock-notification-${Date.now()}`;
        if (typeof optionsOrCallback === 'function') optionsOrCallback(notificationId);
        if (typeof callback === 'function') callback(notificationId);
        return Promise.resolve(notificationId);
    }),
    update: vi.fn().mockResolvedValue(true),
    clear: vi.fn().mockResolvedValue(true),
    getAll: vi.fn().mockResolvedValue({}),
    getPermissionLevel: vi.fn().mockResolvedValue('granted'),
    onClicked: {
      addListener: vi.fn(),
      // Mock other notification events if needed
    },
    // Mock other notification methods if needed
  },
  tabs: {
      create: vi.fn().mockResolvedValue({ id: 123, url: 'mock_url' }), // Added url for more complete mock
      query: vi.fn().mockResolvedValue([{ id: 123, url: 'mock_url', active: true, windowId: 1 }]), // Mock query result
      sendMessage: vi.fn().mockResolvedValue({ success: true, response: 'mock tab response' }), // Mock tabs.sendMessage
      // Mock other tabs methods/events if needed (e.g., onUpdated, executeScript)
  },
  // Mock other top-level chrome APIs if necessary (e.g., action, commands, i18n)
  action: { // Mock chrome.action (Manifest V3 badge API)
    setBadgeText: vi.fn().mockResolvedValue(undefined),
    setBadgeBackgroundColor: vi.fn().mockResolvedValue(undefined),
    // Mock other action methods/events if needed
  }
});

console.log('Setup file loaded with manual Chrome API mocks.');