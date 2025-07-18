import { vi, beforeEach } from 'vitest';

// Mock console methods for testing
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn()
};

// Mock alert and confirm
global.alert = vi.fn();
global.confirm = vi.fn(() => true);

// Mock fetch
global.fetch = vi.fn();

// Mock URL methods
if (!global.URL) {
  global.URL = {};
}
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
global.URL.revokeObjectURL = vi.fn();

// Mock Blob
if (!global.Blob) {
  global.Blob = vi.fn().mockImplementation((content, options) => ({
    content,
    options,
    size: content ? content.join('').length : 0
  }));
}

// Mock DOM methods 
const mockQuerySelector = vi.fn();
const mockQuerySelectorAll = vi.fn(() => []);
const mockCreateElement = vi.fn();

// Override document methods
Object.defineProperty(document, 'querySelector', {
  value: mockQuerySelector,
  writable: true,
  configurable: true
});

Object.defineProperty(document, 'querySelectorAll', {
  value: mockQuerySelectorAll,
  writable: true,
  configurable: true
});

Object.defineProperty(document, 'createElement', {
  value: mockCreateElement,
  writable: true,
  configurable: true
});

// Mock activeElement property
let mockActiveElement = null;
Object.defineProperty(document, 'activeElement', {
  get: () => mockActiveElement,
  set: (element) => { mockActiveElement = element; },
  configurable: true
});

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();
  
  // Clear localStorage using the actual API (JSDOM provides real localStorage)
  localStorage.clear();
  
  mockActiveElement = null;
  
  // Reset DOM mocks
  mockQuerySelector.mockReturnValue(null);
  mockQuerySelectorAll.mockReturnValue([]);
  mockCreateElement.mockImplementation((tagName) => ({
    tagName: tagName.toUpperCase(),
    style: {},
    className: '',
    id: '',
    textContent: '',
    innerHTML: '',
    dataset: {},
    setAttribute: vi.fn(),
    getAttribute: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    appendChild: vi.fn(),
    removeChild: vi.fn(),
    click: vi.fn(),
    focus: vi.fn(),
    blur: vi.fn()
  }));
});
