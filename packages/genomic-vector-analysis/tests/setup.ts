/**
 * Jest Test Setup
 * Configures test environment and global settings
 */

// Suppress console warnings during tests (optional)
const originalWarn = console.warn;
const originalError = console.error;

beforeAll(() => {
  // Optionally suppress WASM-related warnings in tests
  console.warn = (...args: any[]) => {
    if (args[0]?.includes?.('WASM')) {
      return; // Suppress WASM warnings
    }
    originalWarn(...args);
  };

  console.error = (...args: any[]) => {
    if (args[0]?.includes?.('WASM')) {
      return; // Suppress WASM errors
    }
    originalError(...args);
  };
});

afterAll(() => {
  console.warn = originalWarn;
  console.error = originalError;
});

// Set test timeout
jest.setTimeout(30000);

// Mock environment variables if needed
process.env.NODE_ENV = 'test';
