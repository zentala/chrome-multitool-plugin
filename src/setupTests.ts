// src/setupTests.ts
import { vi } from 'vitest'; // Import vi

// Import original jest-dom matchers
import '@testing-library/jest-dom';

// Remove unused import
// import * as RealAdapterModule from '../services/ai/GoogleAIAdapter'; // Import type info

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

// Mock implementation for chrome.runtime.sendMessage
const sendMessageMock = vi.fn((message, callback) => {
  // Default mock: Immediately call callback if provided (for sync behavior)
  // For async behavior, tests need to manually resolve the promise or mock implementation
  if (callback) {
    // Simulate async callback for testing
    // setTimeout(() => callback({ success: true, mockResponse: 'mocked response' }), 0);
    // Or return a default mock response immediately
    // callback({ success: true, mockResponse: 'mocked response' });
  }
  // Return a promise for async message handling
  return Promise.resolve({ success: true, mockResponse: 'mocked response' });
});

// Mock implementation for chrome.storage.local
const storageLocalMock = {
  get: vi.fn().mockResolvedValue({}), // Default mock resolves with empty object
  set: vi.fn().mockResolvedValue(undefined),
  remove: vi.fn().mockResolvedValue(undefined),
  clear: vi.fn().mockResolvedValue(undefined),
};

// Mock implementation for chrome.contextMenus
const contextMenusMock = {
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn((_menuItemId, callback) => { if (callback) callback(); }), // Call callback if provided
  removeAll: vi.fn((callback) => { if (callback) callback(); }),
  onClicked: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn().mockReturnValue(false),
  },
};

// Mock implementation for chrome.notifications
const notificationsMock = {
  create: vi.fn().mockResolvedValue('mock-notification-id'),
  update: vi.fn().mockResolvedValue(true),
  clear: vi.fn().mockResolvedValue(true),
  getAll: vi.fn().mockResolvedValue({}),
  getPermissionLevel: vi.fn().mockResolvedValue('granted'),
  onClicked: {
    addListener: vi.fn(),
    // ... other event listeners
  },
  // ... other notification events and methods
};

// Mock implementation for chrome.runtime
const runtimeMock = {
  sendMessage: sendMessageMock,
  onMessage: {
    addListener: vi.fn(),
    removeListener: vi.fn(),
    hasListener: vi.fn().mockReturnValue(false),
  },
  onInstalled: {
      addListener: vi.fn(),
      // ... other event listeners
  },
  getURL: vi.fn((path) => `chrome-extension://mock-id/${path}`),
  lastError: undefined, // Can be set in tests if needed
};

// Mock implementation for chrome.tabs (if needed by other parts)
const tabsMock = {
    create: vi.fn().mockResolvedValue({ id: 123 }),
    // ... other tab methods
};

// Use vi.stubGlobal to assign the mock to the global object
vi.stubGlobal('chrome', {
  runtime: runtimeMock,
  storage: {
    local: storageLocalMock,
    // sync: { ... } // Mock sync storage if needed
  },
  contextMenus: contextMenusMock,
  notifications: notificationsMock,
  tabs: tabsMock,
  // Add other needed chrome APIs here
});

// --- Mock Environment Variables for Tests --- //
// Remove the stubEnv for GEMINI_API_KEY as the library itself is mocked now

// Keep the AI Adapter mock using factory (or remove if fully handled in test file)
// vi.mock(...) - This should be removed if the mock was moved to index.test.ts

console.log('Setup file loaded with Chrome mocks and Env Var mock potentially removed.'); 