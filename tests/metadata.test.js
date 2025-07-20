import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { MetadataManager } from "../src/services/metadata.js";

// Mock dependencies
vi.mock("../src/config/constants.js", () => ({
  CONFIG: {
    S3_PRESIGNER: {
      LOCAL_SERVER_URL: "http://localhost:3000/presign",
    },
    DATABASE: {
      NAME: "NeoKPIApp",
      VERSION: 1,
      STORES: {
        METADATA: "metadata",
        METADATA_URLS: "metadataUrls",
        NOTES: "notes",
        TAGS: "tags",
        SETTINGS: "settings",
      },
    },
  },
}));

// Import CONFIG for use in tests
import { CONFIG } from "../src/config/constants.js";

vi.mock("../src/utils/utils.js", () => ({
  Utils: {
    log: vi.fn(),
    getRequiredElements: vi.fn(() => ({
      input: { value: "12345" },
    })),
  },
}));

// Mock IndexedDB Manager
const mockIndexedDBManager = {
  init: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  add: vi.fn(),
  delete: vi.fn(),
  getAll: vi.fn(),
  getAllByIndex: vi.fn(),
  clear: vi.fn(),
  getStats: vi.fn(),
  cleanup: vi.fn(),
};

vi.mock("../src/utils/indexdb-manager.js", () => ({
  createAppDatabase: vi.fn(() => mockIndexedDBManager),
}));

describe("MetadataManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MetadataManager.db = null;
    mockIndexedDBManager.init.mockResolvedValue(true);
  });

  test("should initialize IndexedDB manager", async () => {
    await MetadataManager.init();
    expect(mockIndexedDBManager.init).toHaveBeenCalled();
    expect(MetadataManager.db).toBe(mockIndexedDBManager);
  });

  test("should process response data", async () => {
    const responseData = {
      response: {
        "debug-alert-details-div": {
          data: {
            alert_id: "12345",
            metadata_path: "s3://bucket/path/metadata.json",
          },
        },
      },
    };

    // Spy on the storeMetadataUrl method instead
    const storeUrlSpy = vi
      .spyOn(MetadataManager, "storeMetadataUrl")
      .mockResolvedValue(true);

    // Now processResponse is async, so we need to await it
    await MetadataManager.processResponse(responseData);

    expect(storeUrlSpy).toHaveBeenCalledWith(
      "12345",
      "s3://bucket/path/metadata.json",
    );

    storeUrlSpy.mockRestore();
  });

  test("should store metadata URL in IndexedDB", async () => {
    const alertId = "12345";
    const metadataPath = "s3://bucket/path/metadata.json";

    // Mock that no existing entry exists
    mockIndexedDBManager.get.mockResolvedValue(null);
    mockIndexedDBManager.put.mockResolvedValue(true);

    await MetadataManager.storeMetadataUrl(alertId, metadataPath);

    expect(mockIndexedDBManager.get).toHaveBeenCalledWith(
      CONFIG.DATABASE.STORES.METADATA_URLS,
      alertId,
    );
    expect(mockIndexedDBManager.put).toHaveBeenCalledWith(
      CONFIG.DATABASE.STORES.METADATA_URLS,
      expect.objectContaining({
        alertId,
        url: metadataPath,
        downloaded: false,
        timestamp: expect.any(String),
      }),
    );
  });

  test("should retrieve metadata URL from IndexedDB", async () => {
    const alertId = "12345";
    const expectedUrl = "s3://bucket/path/metadata.json";

    // Mock the database response
    mockIndexedDBManager.get.mockResolvedValue({
      alertId,
      url: expectedUrl,
      timestamp: new Date().toISOString(),
      downloaded: false,
    });

    const result = await MetadataManager.getMetadataUrl(alertId);

    expect(mockIndexedDBManager.get).toHaveBeenCalledWith(
      CONFIG.DATABASE.STORES.METADATA_URLS,
      alertId,
    );
    expect(result).toBe(expectedUrl);
  });

  test("should return null when no metadata URL found", async () => {
    const alertId = "nonexistent";

    // Mock empty database response
    mockIndexedDBManager.get.mockResolvedValue(null);

    const result = await MetadataManager.getMetadataUrl(alertId);

    expect(mockIndexedDBManager.get).toHaveBeenCalledWith(
      CONFIG.DATABASE.STORES.METADATA_URLS,
      alertId,
    );
    expect(result).toBe(null);
  });

  test("should return null when metadata URL entry has no url field", async () => {
    const alertId = "12345";

    // Mock malformed database response
    mockIndexedDBManager.get.mockResolvedValue({
      alertId,
      timestamp: new Date().toISOString(),
      downloaded: false,
      // No url field
    });

    const result = await MetadataManager.getMetadataUrl(alertId);

    expect(result).toBe(null);
  });

  test("should handle IndexedDB errors gracefully in getMetadataUrl", async () => {
    const alertId = "12345";

    // Mock database error
    mockIndexedDBManager.get.mockRejectedValue(new Error("Database error"));

    const result = await MetadataManager.getMetadataUrl(alertId);

    expect(result).toBe(null);
  });

  test("should store and retrieve metadata URL - integration test", async () => {
    const alertId = "integration-test-123";
    const metadataPath = "s3://test-bucket/metadata.json";

    // Mock database interactions for store operation
    mockIndexedDBManager.get
      .mockResolvedValueOnce(null) // First call for existence check
      .mockResolvedValueOnce({
        // Second call for retrieval
        alertId,
        url: metadataPath,
        timestamp: expect.any(String),
        downloaded: false,
      });
    mockIndexedDBManager.put.mockResolvedValue(true);

    // Store the URL
    await MetadataManager.storeMetadataUrl(alertId, metadataPath);

    // Retrieve the URL
    const retrievedUrl = await MetadataManager.getMetadataUrl(alertId);

    expect(retrievedUrl).toBe(metadataPath);
  });

  test("should reproduce the real-world timing issue", async () => {
    const alertId = "680584272"; // Same alert ID from the logs
    const metadataPath = "s3://some-bucket/path.json";

    // Simulate the actual flow: processResponse -> storeMetadataUrl -> getMetadataUrl

    // Mock the response processing
    const responseData = {
      response: {
        "debug-alert-details-div": {
          data: {
            alert_id: alertId,
            metadata_path: metadataPath,
          },
        },
      },
    };

    // Set up mocks to simulate the actual behavior
    mockIndexedDBManager.get
      .mockResolvedValueOnce(null) // Store check: no existing entry
      .mockResolvedValueOnce(null); // Retrieve call: simulate the bug where it returns null

    mockIndexedDBManager.put.mockResolvedValue(true);

    // Process response (this calls storeMetadataUrl internally)
    await MetadataManager.processResponse(responseData);

    // Try to retrieve immediately (this is what's failing in real usage)
    const retrievedUrl = await MetadataManager.getMetadataUrl(alertId);

    // This should be the URL, but in the real bug it's null
    console.log("🔍 Test retrievedUrl:", retrievedUrl);

    // Verify the database calls were made correctly
    expect(mockIndexedDBManager.get).toHaveBeenCalledWith(
      CONFIG.DATABASE.STORES.METADATA_URLS,
      alertId,
    );
    expect(mockIndexedDBManager.put).toHaveBeenCalledWith(
      CONFIG.DATABASE.STORES.METADATA_URLS,
      expect.objectContaining({
        alertId,
        url: metadataPath,
      }),
    );
  });

  test("should verify actual storage mechanism - detect if put is failing", async () => {
    const alertId = "680584272";
    const metadataPath = "s3://some-bucket/path.json";

    // Create a storage spy to track what actually gets stored
    let storedData = null;
    mockIndexedDBManager.get.mockResolvedValue(null); // No existing entry
    mockIndexedDBManager.put.mockImplementation(async (store, data) => {
      console.log("🔍 PUT called with store:", store, "data:", data);
      storedData = data;
      return true;
    });

    // Test storing
    await MetadataManager.storeMetadataUrl(alertId, metadataPath);

    // Verify what was actually stored
    expect(storedData).not.toBeNull();
    expect(storedData.alertId).toBe(alertId);
    expect(storedData.url).toBe(metadataPath);

    console.log("🔍 Actually stored data:", storedData);
  });

  test("should verify retrieval uses correct stored data", async () => {
    const alertId = "680584272";
    const metadataPath = "s3://some-bucket/path.json";

    // First store the data
    mockIndexedDBManager.get.mockResolvedValueOnce(null); // No existing entry for store
    let actualStoredData = null;
    mockIndexedDBManager.put.mockImplementation(async (store, data) => {
      actualStoredData = data;
      return true;
    });

    await MetadataManager.storeMetadataUrl(alertId, metadataPath);

    // Now test retrieval with the actual stored data
    mockIndexedDBManager.get.mockResolvedValueOnce(actualStoredData);

    const retrievedUrl = await MetadataManager.getMetadataUrl(alertId);

    console.log("🔍 Stored data:", actualStoredData);
    console.log("🔍 Retrieved URL:", retrievedUrl);

    expect(retrievedUrl).toBe(metadataPath);
  });

  test("should fix the race condition - processResponse must wait for storage", async () => {
    const alertId = "680584272";
    const metadataPath = "s3://some-bucket/path.json";

    const responseData = {
      response: {
        "debug-alert-details-div": {
          data: {
            alert_id: alertId,
            metadata_path: metadataPath,
          },
        },
      },
    };

    let storageCompleted = false;
    mockIndexedDBManager.get.mockResolvedValue(null);
    mockIndexedDBManager.put.mockImplementation(async () => {
      // Simulate slow storage
      await new Promise((resolve) => setTimeout(resolve, 10));
      storageCompleted = true;
      return true;
    });

    // Process response (this should wait for storage to complete)
    await MetadataManager.processResponse(responseData);

    // Storage should be completed by now
    expect(storageCompleted).toBe(true);
  });

  test("normalizeAlertId should handle different input types", async () => {
    // Test string input
    expect(MetadataManager.normalizeAlertId("12345")).toBe("12345");

    // Test number input
    expect(MetadataManager.normalizeAlertId(12345)).toBe("12345");

    // Test string with whitespace
    expect(MetadataManager.normalizeAlertId("  12345  ")).toBe("12345");

    // Test null input
    expect(MetadataManager.normalizeAlertId(null)).toBe(null);

    // Test undefined input
    expect(MetadataManager.normalizeAlertId(undefined)).toBe(null);

    // Test empty string
    expect(MetadataManager.normalizeAlertId("")).toBe(null);

    // Test whitespace-only string
    expect(MetadataManager.normalizeAlertId("   ")).toBe(null);
  });

  test("should handle mixed key types consistently", async () => {
    const metadataUrl = "s3://test-bucket/metadata.json";

    // Store with number
    await MetadataManager.storeMetadataUrl(12345, metadataUrl);
    expect(mockIndexedDBManager.put).toHaveBeenCalledWith(
      CONFIG.DATABASE.STORES.METADATA_URLS,
      expect.objectContaining({
        alertId: "12345", // Should be normalized to string
        url: metadataUrl,
      }),
    );

    // Retrieve with string - should work
    mockIndexedDBManager.get.mockResolvedValue({ url: metadataUrl });
    const result = await MetadataManager.getMetadataUrl("12345");
    expect(result).toBe(metadataUrl);
    expect(mockIndexedDBManager.get).toHaveBeenCalledWith(
      CONFIG.DATABASE.STORES.METADATA_URLS,
      "12345", // Should be normalized to string
    );
  });
});
