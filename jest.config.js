// jest.config.js
module.exports = {
  preset: 'ts-jest',
  // Use jsdom for tests involving React components/DOM manipulation
  // Keep 'node' for pure backend tests if needed by separating configs or using @jest-environment docblock
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'], // Look for tests in the src directory
  testMatch: [
    '**/__tests__/**/*.+(ts|tsx|js)',
    '**/?(*.)+(spec|test).+(ts|tsx|js)'
  ],
  transform: {
    // eslint-disable-next-line no-useless-escape
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
  moduleNameMapper: {
    // Handle module aliases (if you have them in tsconfig.json)
    // Example: '@components/(.*)': '<rootDir>/src/components/$1'
    // Handle CSS module mocks or other non-JS imports if needed
    '\\.(css|scss|sass)$': 'identity-obj-proxy', // Example: mocks CSS Modules
  },
  // Setup file to import jest-dom matchers
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'], // Point to a setup file
  clearMocks: true, // Automatically clear mock calls and instances between every test
  collectCoverage: true, // Enable coverage collection
  coverageDirectory: "coverage", // Directory where coverage reports will be generated
  coverageProvider: "v8", // Use v8 engine for coverage
}; 