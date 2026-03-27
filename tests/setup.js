import { afterEach, beforeAll, vi } from "vitest";

beforeAll(() => {
  globalThis.ResizeObserver =
    globalThis.ResizeObserver ||
    class ResizeObserver {
      observe() {}
      disconnect() {}
    };

  globalThis.confirm = globalThis.confirm || (() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});