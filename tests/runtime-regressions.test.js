import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { MetadataManager } from "../src/services/metadata.js";
import { URLMonitor } from "../src/core/url-monitor.js";

describe("MetadataManager", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = window.fetch;
    MetadataManager.fetchInterceptorInstalled = false;
    MetadataManager.originalFetch = null;
  });

  afterEach(() => {
    window.fetch = originalFetch;
  });

  it("passes Request objects through the global fetch interceptor", async () => {
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      clone() {
        return this;
      },
      async json() {
        return {};
      },
    });

    window.fetch = fetchSpy;
    MetadataManager._interceptDashRequests();

    const request = new Request("https://analytics-kpis.netradyne.com/some-api");
    await window.fetch(request);

    expect(fetchSpy).toHaveBeenCalledWith(request);
  });
});

describe("URLMonitor", () => {
  let previousUrl;

  beforeEach(() => {
    previousUrl = window.location.href;
    URLMonitor.lastUrl = previousUrl;
    URLMonitor.onEnterAlertDebug = null;
    URLMonitor.onLeaveAlertDebug = null;
  });

  afterEach(() => {
    history.pushState({}, "", previousUrl);
    URLMonitor.lastUrl = previousUrl;
  });

  it("calls the leave callback when navigating away from alert-debug", () => {
    const onLeave = vi.fn();

    history.pushState({}, "", "/alert-debug");
    URLMonitor.lastUrl = window.location.href;
    URLMonitor.onLeaveAlertDebug = onLeave;

    history.pushState({}, "", "/dashboard");
    URLMonitor.checkURLChange();

    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("calls the enter callback when navigating into alert-debug", () => {
    const onEnter = vi.fn();

    history.pushState({}, "", "/dashboard");
    URLMonitor.lastUrl = window.location.href;
    URLMonitor.onEnterAlertDebug = onEnter;

    history.pushState({}, "", "/alert-debug?id=123");
    URLMonitor.checkURLChange();

    expect(onEnter).toHaveBeenCalledTimes(1);
  });
});