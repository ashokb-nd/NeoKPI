import { vi, beforeEach } from "vitest";

// Mock console methods for testing
const originalConsole = global.console;
global.console = {
  ...originalConsole,
  log: vi.fn(),
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
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
global.URL.createObjectURL = vi.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = vi.fn();

// Mock Blob
if (!global.Blob) {
  global.Blob = vi.fn().mockImplementation((content, options) => ({
    content,
    options,
    size: content ? content.join("").length : 0,
  }));
}

// Mock DOM methods
const mockQuerySelector = vi.fn();
const mockQuerySelectorAll = vi.fn(() => []);
const mockCreateElement = vi.fn();

// Override document methods
Object.defineProperty(document, "querySelector", {
  value: mockQuerySelector,
  writable: true,
  configurable: true,
});

Object.defineProperty(document, "querySelectorAll", {
  value: mockQuerySelectorAll,
  writable: true,
  configurable: true,
});

Object.defineProperty(document, "createElement", {
  value: mockCreateElement,
  writable: true,
  configurable: true,
});

// Mock activeElement property
let mockActiveElement = null;
Object.defineProperty(document, "activeElement", {
  get: () => mockActiveElement,
  set: (element) => {
    mockActiveElement = element;
  },
  configurable: true,
});

// Mock document.body
if (!document.body) {
  Object.defineProperty(document, "body", {
    value: {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
      innerHTML: "",
    },
    configurable: true,
    writable: true,
  });
}

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks();

  // Clear localStorage using the actual API (JSDOM provides real localStorage)
  localStorage.clear();

  mockActiveElement = null;

  // Reset DOM mocks
  mockQuerySelector.mockReturnValue(null);
  mockQuerySelectorAll.mockReturnValue([]);
  mockCreateElement.mockImplementation((tagName) => {
    const element = {
      tagName: tagName.toUpperCase(),
      style: {
        position: "",
        zIndex: "",
        setProperty: vi.fn(),
        getProperty: vi.fn(),
      },
      className: "",
      id: "",
      textContent: "",
      innerHTML: "",
      dataset: {},
      parentElement: null,
      value: "",
      checked: false,
      placeholder: "",
      name: "",
      type: "",
      files: [],
      disabled: false,
      classList: {
        add: vi.fn(),
        remove: vi.fn(),
        toggle: vi.fn(),
        contains: vi.fn(),
      },
      querySelector: vi.fn((selector) => {
        // Return mock elements for common selectors
        if (selector === "h3" || selector === "h4") {
          return (
            mockCreateElement.mock.results[0]?.value || mockCreateElement("h3")
          );
        }
        if (selector === "textarea") {
          const textarea = mockCreateElement("textarea");
          textarea.placeholder = "e.g., 679289778 679434984 679443707";
          textarea.focus = vi.fn();
          return textarea;
        }
        if (selector === "button") {
          return mockCreateElement("button");
        }
        if (selector === 'input[type="file"]') {
          const input = mockCreateElement("input");
          input.type = "file";
          return input;
        }
        if (selector === 'input[name="presignerUrl"]') {
          const input = mockCreateElement("input");
          input.name = "presignerUrl";
          input.value = "http://localhost:8080";
          return input;
        }
        if (selector === 'input[name="autoSaveNotes"]') {
          const input = mockCreateElement("input");
          input.name = "autoSaveNotes";
          input.type = "checkbox";
          input.checked = true;
          return input;
        }
        if (
          selector === 'input[name="showKeyboardHints"]' ||
          selector === 'input[name="enableFireworks"]'
        ) {
          const input = mockCreateElement("input");
          input.name = selector.match(/name="([^"]+)"/)?.[1] || "";
          input.type = "checkbox";
          input.checked = selector.includes("showKeyboard");
          return input;
        }
        if (selector === "label") {
          const label = mockCreateElement("label");
          // Mock the click functionality
          label.click = vi.fn(() => {
            const parentElement = label.parentElement;
            if (parentElement) {
              const checkbox = parentElement.querySelector(
                'input[type="checkbox"]',
              );
              if (checkbox) {
                checkbox.checked = !checkbox.checked;
              }
            }
          });
          return label;
        }
        if (selector === "input") {
          return mockCreateElement("input");
        }
        if (selector === 'input[type="checkbox"]') {
          const input = mockCreateElement("input");
          input.type = "checkbox";
          return input;
        }
        if (selector === "small") {
          const small = mockCreateElement("small");
          small.textContent = "Test description";
          return small;
        }
        if (selector.includes("flex-direction")) {
          const form = mockCreateElement("div");
          form.querySelectorAll = vi.fn(() => [
            mockCreateElement("input"),
            mockCreateElement("input"),
          ]);
          return form;
        }
        return null;
      }),
      querySelectorAll: vi.fn((selector) => {
        if (selector === "button") {
          return [mockCreateElement("button"), mockCreateElement("button")];
        }
        if (selector === "input") {
          return [mockCreateElement("input"), mockCreateElement("input")];
        }
        if (selector === "input, select") {
          return [mockCreateElement("input"), mockCreateElement("select")];
        }
        return [];
      }),
      setAttribute: vi.fn(),
      getAttribute: vi.fn(),
      addEventListener: vi.fn((event, handler) => {
        // Store event handlers for testing
        if (!element._eventHandlers) element._eventHandlers = {};
        if (!element._eventHandlers[event]) element._eventHandlers[event] = [];
        element._eventHandlers[event].push(handler);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn((event) => {
        // Simulate event dispatching
        if (element._eventHandlers && element._eventHandlers[event.type]) {
          const handlers = element._eventHandlers[event.type];
          if (Array.isArray(handlers)) {
            handlers.forEach((handler) => handler(event));
          } else if (typeof handlers === "function") {
            handlers(event);
          }
        }
      }),
      appendChild: vi.fn((child) => {
        child.parentElement = element;
      }),
      removeChild: vi.fn(),
      click: vi.fn(),
      focus: vi.fn(),
      blur: vi.fn(),
      getBoundingClientRect: vi.fn(() => ({
        left: 0,
        width: 100,
        top: 0,
        height: 50,
      })),
      // Video specific properties
      controls: false,
      paused: true,
      currentTime: 0,
      duration: 100,
      src: "",
      play: vi.fn(() => Promise.resolve()),
      pause: vi.fn(),
      requestFullscreen: vi.fn(),
    };

    // Special handling for modal creation to set styles
    if (tagName.toUpperCase() === "DIV") {
      // Simulate setting styles in createModal
      element.style.position = "fixed";
      element.style.zIndex = "10001";
      element.innerHTML = "kbd"; // For keyboard help tests
    }

    // Make properties actually assignable with proper getters/setters
    const properties = [
      "name",
      "value",
      "type",
      "checked",
      "placeholder",
      "id",
      "className",
      "innerHTML",
      "textContent",
    ];
    properties.forEach((prop) => {
      let internalValue = element[prop];
      Object.defineProperty(element, prop, {
        get: () => internalValue,
        set: (val) => {
          internalValue = val;
          // Update internal reference as well
          element["_" + prop] = val;
        },
        configurable: true,
        enumerable: true,
      });
    });

    // Special handling for dataset property
    const dataset = {};
    Object.defineProperty(element, "dataset", {
      get: () => dataset,
      set: (val) => Object.assign(dataset, val),
      configurable: true,
      enumerable: true,
    });

    return element;
  });
});
