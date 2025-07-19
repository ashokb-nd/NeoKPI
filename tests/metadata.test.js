import { describe, test, expect, beforeEach, afterEach, vi } from "vitest";
import { MetadataManager } from "../src/services/metadata.js";

// Mock dependencies
vi.mock("../src/config/constants.js", () => ({
  CONFIG: {
    S3_PRESIGNER: {
      LOCAL_SERVER_URL: "http://localhost:3000/presign"
    }
  }
}));

vi.mock("../src/utils/utils.js", () => ({
  Utils: {
    log: vi.fn(),
    getRequiredElements: vi.fn(() => ({
      input: { value: "12345" }
    }))
  }
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
  cleanup: vi.fn()
};

vi.mock("../src/utils/indexdb-manager.js", () => ({
  createAppDatabase: vi.fn(() => mockIndexedDBManager)
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
            metadata_path: "s3://bucket/path/metadata.json"
          }
        }
      }
    };
    
    // Spy on the storeMetadataUrl method instead
    const storeUrlSpy = vi.spyOn(MetadataManager, 'storeMetadataUrl').mockResolvedValue(true);
    
    MetadataManager.processResponse(responseData);
    
    expect(storeUrlSpy).toHaveBeenCalledWith("12345", "s3://bucket/path/metadata.json");
    
    storeUrlSpy.mockRestore();
  });
});
