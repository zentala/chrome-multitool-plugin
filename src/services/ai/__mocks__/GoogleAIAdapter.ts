import { vi } from 'vitest';
// Remove unused type imports
// import { ParseCurrencyOutput, IAIAdapter, AIAdapterError } from '../../../interfaces/IAIAdapter';

// Create mock function for the method
export const mockParseCurrency = vi.fn();

// Mock the class implementation
export const MockGoogleAIAdapter = vi.fn(() => ({
  parseCurrency: mockParseCurrency,
  // Mock other methods if needed
}));

// Vitest needs the mock module to export the SAME name as the original class
export const GoogleAIAdapter = MockGoogleAIAdapter; 