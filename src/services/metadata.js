import { CONFIG } from "../config/constants.js";
import { Utils } from "../utils/utils.js";
import { createAppDatabase } from "../utils/indexdb-manager.js";

// ========================================
// METADATA MANAGER
// ========================================
export const MetadataManager = {
  db: null,

  // Helper function to normalize alert IDs to strings
  normalizeAlertId(alertId) {
    if (alertId === null || alertId === undefined) {
      Utils.log("Warning: alertId is null or undefined");
      return null;
    }
    // Convert to string and trim whitespace
    const normalized = String(alertId).trim();
    if (!normalized) {
      Utils.log("Warning: alertId is empty after normalization");
      return null;
    }
    return normalized;
  },

  async init() {
    this.db = createAppDatabase();
    await this.db.init();
    this.interceptDashRequests();
    Utils.log(
      "Metadata manager initialized - intercepting Dash requests and IndexedDB",
    );
  },

  interceptDashRequests() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const url = args[0];
      const options = args[1];

      // Only intercept Dash update component requests
      if (
        url.includes("/_dash-update-component") &&
        options?.method === "POST"
      ) {
        const response = await originalFetch(...args);

        // Clone response to read without consuming the original
        // Handle both real responses and test mocks
        let clone;
        if (response && typeof response.clone === "function") {
          clone = response.clone();
        } else {
          // For tests or cases where clone is not available, use the original response
          clone = response;
        }

        try {
          const responseData = await clone.json();

          // Check if this response contains any metadata components
          const hasMetadataComponent =
            responseData?.response &&
            (responseData.response["debug-alert-details-div"] ||
              responseData.response["debug_alert_details_div"] ||
              responseData.response["debug_alert_details"]);

          if (hasMetadataComponent) {
            await MetadataManager.processResponse(responseData);
          }
        } catch (error) {
          // Silently ignore JSON parsing errors (empty responses are normal)
        }

        return response;
      }

      // For all other requests, proceed normally
      return originalFetch(...args);
    };
  },

  async processResponse(responseData) {
    try {
      // Check for the metadata component - try both hyphenated and underscored versions
      const possibleKeys = [
        "debug-alert-details-div", // Original hyphenated version
        "debug_alert_details_div", // Underscored version
        "debug_alert_details", // Shortened underscored version
      ];

      for (const key of possibleKeys) {
        if (responseData?.response?.[key]?.data) {
          const data = responseData.response[key].data;

          if (data.alert_id && (data.metadata_path || data.summaryPath)) {
            const metadataUrl = data.metadata_path || data.summaryPath;
            await this.storeMetadataUrl(data.alert_id, metadataUrl);
            Utils.log(`🎯 Captured metadata URL for alert ${data.alert_id}`);
            break;
          }
        }
      }
    } catch (error) {
      Utils.log(`Error extracting metadata from response: ${error.message}`);
    }
  },

  async storeMetadataUrl(alertId, metadataPath) {
    try {
      if (!this.db) await this.init();

      // Normalize alertId to string
      const normalizedAlertId = this.normalizeAlertId(alertId);
      if (!normalizedAlertId) {
        throw new Error(`Invalid alertId: ${alertId}`);
      }

      const urlData = {
        alertId: normalizedAlertId,
        url: metadataPath,
        timestamp: new Date().toISOString(),
        downloaded: false,
      };

      // Check if already exists
      const existing = await this.db.get(
        CONFIG.DATABASE.STORES.METADATA_URLS,
        normalizedAlertId,
      );
      if (!existing) {
        await this.db.put(CONFIG.DATABASE.STORES.METADATA_URLS, urlData);
        Utils.log(
          `Stored metadata URL for alert ${normalizedAlertId} in IndexedDB`,
        );
      }
    } catch (error) {
      Utils.log(`Error storing metadata URL in IndexedDB: ${error.message}`);
      throw error;
    }
  },

  async getMetadataUrl(alertId) {
    try {
      if (!this.db) await this.init();

      // Normalize alertId to string
      const normalizedAlertId = this.normalizeAlertId(alertId);
      if (!normalizedAlertId) {
        Utils.log(`Invalid alertId: ${alertId}. Cannot retrieve metadata URL.`);
        return null;
      }

      const result = await this.db.get(
        CONFIG.DATABASE.STORES.METADATA_URLS,
        normalizedAlertId,
      );
      return result?.url || null;
    } catch (error) {
      Utils.log(`Error getting metadata URL from IndexedDB: ${error.message}`);
      return null;
    }
  },

  async getAllMetadataUrls() {
    try {
      if (!this.db) await this.init();

      const result = await this.db.getAll(CONFIG.DATABASE.STORES.METADATA_URLS);
      return result;
    } catch (error) {
      Utils.log(
        `Error getting all metadata URLs from IndexedDB: ${error.message}`,
      );
      throw error;
    }
  },

  /**
   * Get metadata content for a specific alert ID from IndexedDB.
   * 
   * @async
   * @param {string} alertId - Alert identifier
   * @returns {Promise<Object|null>} Parsed metadata content or null if not found
   */
  async getMetadata(alertId) {
    try {
      if (!this.db) await this.init();

      // Normalize alertId to string
      const normalizedAlertId = this.normalizeAlertId(alertId);
      if (!normalizedAlertId) {
        Utils.log(`Invalid alertId: ${alertId}. Cannot retrieve metadata.`);
        return null;
      }

      // Get metadata from IndexedDB
      const cachedMetadata = await this.db.get(
        CONFIG.DATABASE.STORES.METADATA,
        normalizedAlertId,
      );

      if (!cachedMetadata) {
        Utils.log(`No metadata found for alert ID: ${normalizedAlertId}`);
        return null;
      }

      // Try to parse as JSON if the content looks like JSON
      const content = cachedMetadata.content;
      if (content && (content.trim().startsWith("{") || content.trim().startsWith("["))) {
        try {
          return JSON.parse(content);
        } catch (e) {
          Utils.log(`Failed to parse metadata as JSON for alert ${normalizedAlertId}: ${e.message}`);
          // Return raw content if JSON parsing fails
          return { content };
        }
      }

      // Return raw content wrapped in an object if it's not JSON
      return content ? { content } : null;

    } catch (error) {
      Utils.log(`Error getting metadata for alert ${alertId}: ${error.message}`);
      return null;
    }
  },

  async downloadMetadata(alertId) {
    try {
      if (!this.db) await this.init();

      // Normalize alertId to string
      const normalizedAlertId = this.normalizeAlertId(alertId);
      if (!normalizedAlertId) {
        Utils.log(`Invalid alertId: ${alertId}. Cannot download metadata.`);
        return null;
      }

      // First check if we have the metadata content in IndexedDB
      const cachedMetadata = await this.db.get(
        CONFIG.DATABASE.STORES.METADATA,
        normalizedAlertId,
      );
      if (cachedMetadata) {
        console.log(
          "🔍 Found cached metadata in IndexedDB for alertId:",
          normalizedAlertId,
        );
        return cachedMetadata.content;
      }

      // Get URL from IndexedDB
      const metadataUrl = await this.getMetadataUrl(normalizedAlertId);

      console.log("🔍 downloadMetadata called for alertId:", normalizedAlertId);
      console.log("🔍 metadataUrl:", metadataUrl);

      if (!metadataUrl) {
        Utils.log(`No metadata URL found for alert ID: ${normalizedAlertId}`);
        return null;
      }

      // Download fresh metadata
      console.log("🔍 About to call getSignedUrl with url:", metadataUrl);
      const signedUrl = await this.getSignedUrl(metadataUrl);

      if (!signedUrl) {
        throw new Error(
          "Failed to get signed URL - check if S3 presigner server is running",
        );
      }

      // Download the metadata file
      const response = await fetch(signedUrl);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const content = await response.text();

      // Store in IndexedDB
      await this.storeMetadataInIndexedDB(
        normalizedAlertId,
        content,
        metadataUrl,
      );

      // Process the metadata
      this.processMetadata(normalizedAlertId, content);

      return content;
    } catch (error) {
      Utils.log(
        `Error downloading metadata for alert ${alertId}: ${error.message}`,
      );
      return null;
    }
  },

  async getSignedUrl(s3Url) {
    try {
      // Debug logging
      console.log("🔍 getSignedUrl called with:", s3Url);

      if (!s3Url) {
        console.error("❌ s3Url is empty or undefined!");
        return null;
      }

      const requestBody = {
        url: s3Url,
      };

      console.log(
        "📤 Sending request to presigner:",
        CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL,
      );
      console.log("📤 Request body:", requestBody);

      const response = await fetch(CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error(`Presigner server error: ${response.status}`);
      }

      const data = await response.json();
      console.log("📥 Presigner response:", data);
      return data.presigned_url;
    } catch (error) {
      // Check if it's a network error (server not running)
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        Utils.log(
          `Presigner server not running on ${CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL}`,
        );
        // Note: UIManager is imported in index.js, so we can't use it here directly
        // This will be handled by the caller
      } else {
        Utils.log(`Error getting signed URL: ${error.message}`);
      }
      return null;
    }
  },

  processMetadata(alertId, content) {
    try {
      Utils.log(`Processing metadata for alert ID: ${alertId}`);

      // Try to parse as JSON if it looks like JSON
      if (content.trim().startsWith("{") || content.trim().startsWith("[")) {
        try {
          const jsonData = JSON.parse(content);
          // TODO: Add specific metadata processing logic here
        } catch (e) {
          // Handle as text content
        }
      }

      // TODO: Add specific metadata processing logic here
    } catch (error) {
      Utils.log(
        `Error processing metadata for alert ${alertId}: ${error.message}`,
      );
    }
  },

  // Store metadata content in IndexedDB
  async storeMetadataInIndexedDB(alertId, content, metadataUrl) {
    try {
      if (!this.db) await this.init();

      // Normalize alertId to string
      const normalizedAlertId = this.normalizeAlertId(alertId);
      if (!normalizedAlertId) {
        throw new Error(`Invalid alertId: ${alertId}`);
      }

      const metadataData = {
        alertId: normalizedAlertId,
        content,
        url: metadataUrl,
        timestamp: new Date().toISOString(),
        size: content ? content.length : 0,
      };

      await this.db.put(CONFIG.DATABASE.STORES.METADATA, metadataData);
      Utils.log(
        `Stored metadata content for alert ${normalizedAlertId} in IndexedDB`,
      );

      // Also update the URL record to mark as downloaded
      const urlRecord = await this.db.get(
        CONFIG.DATABASE.STORES.METADATA_URLS,
        normalizedAlertId,
      );
      if (urlRecord) {
        urlRecord.downloaded = true;
        await this.db.put(CONFIG.DATABASE.STORES.METADATA_URLS, urlRecord);
      }
    } catch (error) {
      Utils.log(`Error storing metadata in IndexedDB: ${error.message}`);
      throw error;
    }
  },

  // Helper method to download metadata for current alert
  async downloadCurrentMetadata() {
    const elements = Utils.getRequiredElements();
    const alertId = elements.input?.value.trim();

    if (!alertId) {
      // Note: UIManager is imported in index.js, so we can't use it here directly
      Utils.log("No alert ID found");
      return;
    }

    Utils.log(`Downloading metadata for alert ${alertId}...`);

    const content = await this.downloadMetadata(alertId);

    if (content) {
      Utils.log(`Metadata downloaded successfully for alert ${alertId}`);

      // Also download as JSON file
      await this.downloadMetadataAsFile(alertId, content);
      Utils.log(`JSON file download initiated for alert ${alertId}`);
    } else {
      Utils.log(`Failed to download metadata for alert ${alertId}`);
    }

    return content;
  },

  // Download metadata content as a JSON file
  // along with some additional metadata
  async downloadMetadataAsFile(alertId, content) {
    try {
      // Create metadata object with additional info
      const metadataObject = {
        alertId: alertId,
        downloadedAt: new Date().toISOString(),
        url: await this.getMetadataUrl(alertId),
        content: content,
        contentType: this.detectContentType(content),
      };

      // Convert to JSON
      const jsonContent = JSON.stringify(metadataObject, null, 2);

      // Create filename with date
      const today = new Date().toISOString().split("T")[0];
      const filename = `metadata-alert-${alertId}-${today}.json`;

      Utils.log(`Attempting to download file: ${filename}`);

      // Create and download file with improved method
      const blob = new Blob([jsonContent], {
        type: "application/json;charset=utf-8;",
      });

      // Try using the newer showSaveFilePicker API if available
      if ("showSaveFilePicker" in window) {
        await this.downloadWithFilePicker(blob, filename);
      } else {
        // Fallback to traditional method
        this.downloadWithLink(blob, filename);
      }

      Utils.log(`Downloaded metadata file for alert ${alertId}`);
    } catch (error) {
      // Check if user cancelled the download
      if (error.name === "AbortError" || error.message.includes("aborted")) {
        Utils.log(`File download cancelled by user for alert ${alertId}`);
        return; // Don't treat cancellation as an error
      }

      Utils.log(`Error downloading metadata file: ${error.message}`);
      throw error;
    }
  },

  // Modern file download using File System Access API
  async downloadWithFilePicker(blob, filename) {
    try {
      const fileHandle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [
          {
            description: "JSON files",
            accept: { "application/json": [".json"] },
          },
        ],
      });

      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      Utils.log("File saved successfully using File System Access API");
    } catch (error) {
      // Check if user cancelled the file picker
      if (error.name === "AbortError" || error.message.includes("aborted")) {
        Utils.log("File save cancelled by user");
        throw error; // Re-throw to prevent fallback download
      }

      Utils.log(
        `File picker failed, falling back to link method: ${error.message}`,
      );
      this.downloadWithLink(blob, filename);
    }
  },

  // Traditional file download using anchor tag
  downloadWithLink(blob, filename) {
    try {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      // Set attributes
      link.href = url;
      link.download = filename;
      link.style.display = "none";

      // Add to DOM, click, and remove
      document.body.appendChild(link);

      // Force click with user gesture
      setTimeout(() => {
        link.click();

        // Clean up after a delay
        setTimeout(() => {
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }, 100);
      }, 10);

      Utils.log("File download initiated using anchor tag method");
    } catch (error) {
      Utils.log(`Link download failed: ${error.message}`);
      throw error;
    }
  },

  // Detect if content is JSON, text, etc.
  detectContentType(content) {
    if (!content) return "empty";

    const trimmed = content.trim();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        JSON.parse(trimmed);
        return "json";
      } catch (e) {
        return "text";
      }
    }

    return "text";
  },

  // Get stats about stored metadata
  async getStats() {
    try {
      if (!this.db) await this.init();

      // Get URL stats
      const allUrls = await this.db.getAll(
        CONFIG.DATABASE.STORES.METADATA_URLS,
      );

      // Get metadata stats
      const allMetadata = await this.db.getAll(CONFIG.DATABASE.STORES.METADATA);

      const total = allUrls.length;
      const downloaded = allUrls.filter((item) => item.downloaded).length;
      const totalSize = allMetadata.reduce(
        (sum, item) => sum + (item.size || 0),
        0,
      );

      return {
        total,
        downloaded,
        pending: total - downloaded,
        totalSizeBytes: totalSize,
        totalSizeKB: Math.round(totalSize / 1024),
        totalSizeMB: Math.round(totalSize / (1024 * 1024)),
        cachedEntries: allMetadata.length,
      };
    } catch (error) {
      Utils.log(`Error getting IndexedDB stats: ${error.message}`);
      throw error;
    }
  },

  // Clean up old metadata entries to prevent storage bloat
  async cleanupOldEntries(maxEntries = 1000, maxAgeInDays = 30) {
    try {
      if (!this.db) await this.init();

      const urlsDeleted = await this.db.cleanup(
        CONFIG.DATABASE.STORES.METADATA_URLS,
        {
          maxEntries,
          maxAgeInDays,
          timestampField: "timestamp",
        },
      );

      const metadataDeleted = await this.db.cleanup(
        CONFIG.DATABASE.STORES.METADATA,
        {
          maxEntries,
          maxAgeInDays,
          timestampField: "timestamp",
        },
      );

      Utils.log(
        `Cleaned up ${urlsDeleted} URL entries and ${metadataDeleted} metadata entries`,
      );
      return urlsDeleted + metadataDeleted;
    } catch (error) {
      Utils.log(`Error cleaning up IndexedDB: ${error.message}`);
      throw error;
    }
  },

  // Clear all metadata from IndexedDB
  async clearAll() {
    try {
      if (!this.db) await this.init();

      await this.db.clear(CONFIG.DATABASE.STORES.METADATA_URLS);
      await this.db.clear(CONFIG.DATABASE.STORES.METADATA);

      Utils.log("Cleared all metadata from IndexedDB");
      return true;
    } catch (error) {
      Utils.log(`Error clearing IndexedDB: ${error.message}`);
      throw error;
    }
  },

  // Delete entire IndexedDB database
  async deleteDatabase() {
    try {
      if (this.db) {
        await this.db.deleteDatabase();
        this.db = null;
      }
      return true;
    } catch (error) {
      Utils.log(`Error deleting IndexedDB database: ${error.message}`);
      throw error;
    }
  },
};
