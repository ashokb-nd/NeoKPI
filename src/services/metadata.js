import { CONFIG } from "../config/constants.js";
import { Utils } from "../utils/utils.js";
import { createAppDatabase } from "../utils/indexdb-manager.js";

// ========================================
// METADATA MANAGER
// ========================================
export const MetadataManager = {
  db: null,

  // ========================================
  // INITIALIZATION & SETUP
  // ========================================
  
  async init() {
    this.db = createAppDatabase();
    await this.db.init();
    this._interceptDashRequests();
    Utils.log("Metadata manager initialized - intercepting Dash requests and IndexedDB");
  },

  // ========================================
  // CORE PUBLIC API
  // ========================================

  /**
   * Get metadata for an alert. Tries cache first, then fetches from S3 if needed.
   * This is the main method used by AnnotationManager.
   */
  async getMetadata(alertId) {
    try {
      if (!this.db) await this.init();

      const normalizedId = this._normalizeAlertId(alertId);
      if (!normalizedId) return null;

      // Try cache first
      const cached = await this._getCachedMetadata(normalizedId);
      if (cached) return cached;

      // Fetch from S3 if not cached
      return await this._fetchAndCacheMetadata(normalizedId);
    } catch (error) {
      Utils.log(`Error getting metadata for alert ${alertId}: ${error.message}`);
      return null;
    }
  },

  // ========================================
  // HELPER METHODS
  // ========================================

  _normalizeAlertId(alertId) {
    if (alertId === null || alertId === undefined) {
      Utils.log("Warning: alertId is null or undefined");
      return null;
    }
    const normalized = String(alertId).trim();
    if (!normalized) {
      Utils.log("Warning: alertId is empty after normalization");
      return null;
    }
    return normalized;
  },

  async _getCachedMetadata(alertId) {
    const cached = await this.db.get(CONFIG.DATABASE.STORES.METADATA, alertId);
    if (cached) {
      Utils.log(`Found cached metadata for alert ID: ${alertId}`);
      return this._parseContent(cached.content);
    }
    return null;
  },

  async _fetchAndCacheMetadata(alertId) {
    Utils.log(`Metadata not cached for alert ${alertId}, fetching from S3...`);
    
    // Wait for metadata URL to be intercepted if not already available
    const metadataUrl = await this.getMetadataUrl(alertId, true, 5000);
    if (!metadataUrl) {
      Utils.log(`No metadata URL found for alert ID: ${alertId} after waiting`);
      return null;
    }

    const signedUrl = await this._getSignedUrl(metadataUrl);
    if (!signedUrl) {
      Utils.log(`Failed to get signed URL for metadata: ${metadataUrl}`);
      return null;
    }

    const response = await fetch(signedUrl);
    if (!response.ok) {
      Utils.log(`Failed to fetch metadata: HTTP ${response.status}`);
      return null;
    }

    const content = await response.text();
    await this._storeMetadata(alertId, content, metadataUrl);
    Utils.log(`Successfully fetched and cached metadata for alert ${alertId}`);
    
    return this._parseContent(content);
  },

  _parseContent(content) {
    if (!content) return null;
    
    if (content.trim().startsWith("{") || content.trim().startsWith("[")) {
      try {
        return JSON.parse(content);
      } catch (e) {
        Utils.log(`Failed to parse metadata as JSON: ${e.message}`);
        return { content };
      }
    }
    return { content };
  },

  // ========================================
  // DASH REQUEST INTERCEPTION
  // ========================================

  _interceptDashRequests() {
    const originalFetch = window.fetch;

    window.fetch = async function (...args) {
      const url = args[0];
      const options = args[1];

      if (url.includes("/_dash-update-component") && options?.method === "POST") {
        const response = await originalFetch(...args);
        const clone = response?.clone ? response.clone() : response;

        try {
          const responseData = await clone.json();
          const hasMetadataComponent = responseData?.response && 
            (responseData.response["debug-alert-details-div"] ||
             responseData.response["debug_alert_details_div"] ||
             responseData.response["debug_alert_details"]);

          if (hasMetadataComponent) {
            await MetadataManager._processResponse(responseData);
          }
        } catch (error) {
          // Silently ignore JSON parsing errors
        }

        return response;
      }

      return originalFetch(...args);
    };
  },

  async _processResponse(responseData) {
    try {
      const possibleKeys = [
        "debug-alert-details-div",
        "debug_alert_details_div", 
        "debug_alert_details"
      ];

      for (const key of possibleKeys) {
        const data = responseData?.response?.[key]?.data;
        if (data?.alert_id && (data.metadata_path || data.summaryPath)) {
          const metadataUrl = data.metadata_path || data.summaryPath;
          await this._storeMetadataUrl(data.alert_id, metadataUrl);
          Utils.log(`🎯 Captured metadata URL for alert ${data.alert_id}`);
          break;
        }
      }
    } catch (error) {
      Utils.log(`Error extracting metadata from response: ${error.message}`);
    }
  },

  // ========================================
  // DATABASE OPERATIONS
  // ========================================

  async _storeMetadataUrl(alertId, metadataPath) {
    const normalizedId = this._normalizeAlertId(alertId);
    if (!normalizedId) throw new Error(`Invalid alertId: ${alertId}`);

    const existing = await this.db.get(CONFIG.DATABASE.STORES.METADATA_URLS, normalizedId);
    if (!existing) {
      await this.db.put(CONFIG.DATABASE.STORES.METADATA_URLS, {
        alertId: normalizedId,
        url: metadataPath,
        timestamp: new Date().toISOString(),
        downloaded: false,
      });
      Utils.log(`Stored metadata URL for alert ${normalizedId}`);
    }
  },

  async _storeMetadata(alertId, content, metadataUrl) {
    const normalizedId = this._normalizeAlertId(alertId);
    if (!normalizedId) throw new Error(`Invalid alertId: ${alertId}`);

    await this.db.put(CONFIG.DATABASE.STORES.METADATA, {
      alertId: normalizedId,
      content,
      url: metadataUrl,
      timestamp: new Date().toISOString(),
      size: content?.length || 0,
    });

    // Mark URL as downloaded
    const urlRecord = await this.db.get(CONFIG.DATABASE.STORES.METADATA_URLS, normalizedId);
    if (urlRecord) {
      urlRecord.downloaded = true;
      await this.db.put(CONFIG.DATABASE.STORES.METADATA_URLS, urlRecord);
    }
  },

  // ========================================
  // S3 OPERATIONS
  // ========================================

  async _getSignedUrl(s3Url) {
    if (!s3Url) return null;

    try {
      const response = await fetch(CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: s3Url }),
      });

      if (!response.ok) {
        throw new Error(`Presigner server error: ${response.status}`);
      }

      const data = await response.json();
      return data.presigned_url;
    } catch (error) {
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        Utils.log(`Presigner server not running on ${CONFIG.S3_PRESIGNER.LOCAL_SERVER_URL}`);
      } else {
        Utils.log(`Error getting signed URL: ${error.message}`);
      }
      return null;
    }
  },

  // ========================================
  // PUBLIC UTILITY METHODS
  // ========================================

  async getMetadataUrl(alertId, waitForUrl = false, timeoutMs = 5000) {
    if (!this.db) await this.init();
    const normalizedId = this._normalizeAlertId(alertId);
    if (!normalizedId) return null;

    // Try to get URL immediately first
    const result = await this.db.get(CONFIG.DATABASE.STORES.METADATA_URLS, normalizedId);
    if (result?.url) return result.url;

    // If waitForUrl is false, return null immediately
    if (!waitForUrl) return null;

    // Wait for URL to be intercepted from Dash responses
    Utils.log(`Waiting for metadata URL to be intercepted for alert ${normalizedId}...`);
    
    const startTime = Date.now();
    while (Date.now() - startTime < timeoutMs) {
      // Check every 100ms
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const urlResult = await this.db.get(CONFIG.DATABASE.STORES.METADATA_URLS, normalizedId);
      if (urlResult?.url) {
        Utils.log(`✅ Metadata URL intercepted for alert ${normalizedId}`);
        return urlResult.url;
      }
    }

    Utils.log(`⏰ Timeout waiting for metadata URL for alert ${normalizedId}`);
    return null;
  },

  async getStats() {
    if (!this.db) await this.init();

    const allUrls = await this.db.getAll(CONFIG.DATABASE.STORES.METADATA_URLS);
    const allMetadata = await this.db.getAll(CONFIG.DATABASE.STORES.METADATA);

    const totalSize = allMetadata.reduce((sum, item) => sum + (item.size || 0), 0);

    return {
      total: allUrls.length,
      downloaded: allUrls.filter(item => item.downloaded).length,
      pending: allUrls.length - allUrls.filter(item => item.downloaded).length,
      totalSizeBytes: totalSize,
      totalSizeKB: Math.round(totalSize / 1024),
      cachedEntries: allMetadata.length,
    };
  },

  async clearAll() {
    if (!this.db) await this.init();
    await this.db.clear(CONFIG.DATABASE.STORES.METADATA_URLS);
    await this.db.clear(CONFIG.DATABASE.STORES.METADATA);
    Utils.log("Cleared all metadata from IndexedDB");
  },
};

