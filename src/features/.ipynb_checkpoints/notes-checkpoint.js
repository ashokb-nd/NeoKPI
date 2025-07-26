import { CONFIG } from "../config/constants.js";
import { Utils } from "../utils/utils.js";
import { TagManager } from "./tags.js";
import { createAppDatabase } from "../utils/indexdb-manager.js";

export const NotesManager = {
  db: null,
  storeName: CONFIG.DATABASE.STORES.NOTES,

  async init() {
    if (!this.db) {
      this.db = createAppDatabase();
      await this.db.init();
      Utils.log("Notes manager initialized with IndexedDB");
    }
  },

  async getAllNotes() {
    await this.init();
    return await this.db.getAll(this.storeName);
  },

  async getNote(alertId) {
    await this.init();
    const notes = await this.db.getAllByIndex(
      this.storeName,
      "alertId",
      alertId,
    );
    if (notes.length > 0) {
      return notes[0].content;
    }
    return "";
  },

  async getTags(alertId) {
    await this.init();
    const notes = await this.db.getAllByIndex(
      this.storeName,
      "alertId",
      alertId,
    );
    if (notes.length > 0) {
      return notes[0].tags || [];
    }
    return [];
  },

  async saveNote(alertId, note, manualTags = []) {
    if (!alertId) return false;

    await this.init();

    const hashtagTags = TagManager.extractHashtagsFromText(note);
    const allTags = TagManager.mergeTags(manualTags, hashtagTags);
    const alertType = Utils.getCurrentAlertType() || "unknown";

    if (note.trim() || allTags.length > 0) {
      // Check if note already exists
      const existingNotes = await this.db.getAllByIndex(
        this.storeName,
        "alertId",
        alertId,
      );

      const noteData = {
        alertId,
        content: note.trim(),
        tags: allTags,
        category: alertType,
        timestamp: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      if (existingNotes.length > 0) {
        // Update existing note
        noteData.id = existingNotes[0].id;
        noteData.createdAt = existingNotes[0].createdAt;
        await this.db.put(this.storeName, noteData);
      } else {
        // Create new note
        noteData.createdAt = new Date().toISOString();
        await this.db.add(this.storeName, noteData);
      }
    } else {
      // Delete note if empty
      await this.deleteNote(alertId);
    }

    return true;
  },

  async deleteNote(alertId) {
    if (!alertId) return false;

    await this.init();

    // Delete from IndexedDB
    const existingNotes = await this.db.getAllByIndex(
      this.storeName,
      "alertId",
      alertId,
    );
    for (const note of existingNotes) {
      await this.db.delete(this.storeName, note.id);
    }

    return true;
  },

  async clearAllNotes() {
    await this.init();

    // Clear IndexedDB
    await this.db.clear(this.storeName);

    return true;
  },

  // Get notes with pagination
  async getNotesPage(page = 1, pageSize = 50) {
    const notes = await this.getAllNotes();
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;

    return {
      notes: notes.slice(startIndex, endIndex),
      total: notes.length,
      page,
      pageSize,
      totalPages: Math.ceil(notes.length / pageSize),
    };
  },

  async exportToCsv() {
    const notes = await this.getAllNotes();

    if (notes.length === 0) {
      alert("No notes to export");
      return;
    }

    const csvContent = this.generateCsvContent(notes);
    this.downloadCsv(csvContent);
  },

  generateCsvContent(notes) {
    const headers = ["Alert ID", "Alert Type", "Notes", "Tags", "Timestamp"];
    const rows = notes.map((note) => [
      note.alertId,
      note.category || "unknown",
      note.content || "",
      (note.tags || []).join(", "),
      note.timestamp || "",
    ]);

    return [headers, ...rows]
      .map((row) =>
        row.map((field) => `"${String(field).replace(/"/g, '""')}"`),
      )
      .join("\n");
  },

  downloadCsv(csvContent) {
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `alert-debug-notes-${new Date().toISOString().split("T")[0]}.csv`,
    );
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  async importFromCsv(csvContent) {
    try {
      const rows = this.parseCsvContent(csvContent);

      if (rows.length < 2) {
        throw new Error(
          "CSV file must contain at least a header and one data row",
        );
      }

      return await this.processImportedRows(rows);
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        imported: 0,
        updated: 0,
        skipped: 0,
        alertIds: [],
      };
    }
  },

  async processImportedRows(rows) {
    await this.init();

    const headers = rows[0];
    const columnIndices = this.getColumnIndices(headers);

    if (columnIndices.alertIdIndex === -1) {
      throw new Error('CSV must contain an "Alert ID" column');
    }

    const result = {
      imported: 0,
      updated: 0,
      skipped: 0,
      alertIds: [],
    };

    // Process data rows (skip header)
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];

      try {
        const alertId = values[columnIndices.alertIdIndex]?.trim();

        if (!alertId) {
          result.skipped++;
          continue;
        }

        const noteData = this.createNoteDataFromRow(values, columnIndices);

        // Check if note already exists in IndexedDB
        const existingNotes = await this.db.getAllByIndex(
          this.storeName,
          "alertId",
          alertId,
        );
        const wasExisting = existingNotes.length > 0;

        const indexedDBNote = {
          alertId,
          content: noteData.note || "",
          tags: noteData.tags || [],
          category: noteData.alertType || "unknown",
          timestamp: noteData.timestamp || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (wasExisting) {
          // Update existing note
          indexedDBNote.id = existingNotes[0].id;
          indexedDBNote.createdAt = existingNotes[0].createdAt;
          await this.db.put(this.storeName, indexedDBNote);
          result.updated++;
        } else {
          // Create new note
          indexedDBNote.createdAt = new Date().toISOString();
          await this.db.add(this.storeName, indexedDBNote);
          result.imported++;
        }

        result.alertIds.push(alertId);
      } catch (error) {
        console.warn(`Error parsing CSV row ${i + 1}: ${error.message}`);
        result.skipped++;
      }
    }

    return {
      success: true,
      message: `Import completed: ${result.imported} new notes, ${result.updated} updated, ${result.skipped} skipped`,
      ...result,
    };
  },

  getColumnIndices(headers) {
    return {
      alertIdIndex: headers.findIndex((h) =>
        h.toLowerCase().includes("alert id"),
      ),
      alertTypeIndex: headers.findIndex((h) =>
        h.toLowerCase().includes("alert type"),
      ),
      notesIndex: headers.findIndex((h) => h.toLowerCase().includes("notes")),
      tagsIndex: headers.findIndex((h) => h.toLowerCase().includes("tags")),
      timestampIndex: headers.findIndex((h) =>
        h.toLowerCase().includes("timestamp"),
      ),
    };
  },

  createNoteDataFromRow(values, columnIndices) {
    return {
      note: values[columnIndices.notesIndex]?.trim() || "",
      alertType: values[columnIndices.alertTypeIndex]?.trim() || "unknown",
      tags: values[columnIndices.tagsIndex]
        ? values[columnIndices.tagsIndex]
            .split(",")
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0)
        : [],
      timestamp:
        values[columnIndices.timestampIndex]?.trim() ||
        new Date().toISOString(),
    };
  },

  parseCsvContent(csvContent) {
    const rows = [];
    let currentRow = [];
    let currentField = "";
    let inQuotes = false;
    let i = 0;

    while (i < csvContent.length) {
      const char = csvContent[i];

      if (char === '"') {
        if (inQuotes && csvContent[i + 1] === '"') {
          // Escaped quote - add a single quote to the field
          currentField += '"';
          i += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          i++;
        }
      } else if (char === "," && !inQuotes) {
        // Field separator - end current field
        currentRow.push(currentField);
        currentField = "";
        i++;
      } else if ((char === "\n" || char === "\r") && !inQuotes) {
        // End of row (handle both \n and \r\n)
        if (char === "\r" && csvContent[i + 1] === "\n") {
          i++; // Skip the \n in \r\n
        }

        // Add the last field and complete the row
        currentRow.push(currentField);
        if (
          currentRow.length > 0 &&
          currentRow.some((field) => field.trim() !== "")
        ) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        i++;
      } else {
        // Regular character - add to current field
        currentField += char;
        i++;
      }
    }

    // Handle the last field and row if we ended without a newline
    if (currentField !== "" || currentRow.length > 0) {
      currentRow.push(currentField);
      if (
        currentRow.length > 0 &&
        currentRow.some((field) => field.trim() !== "")
      ) {
        rows.push(currentRow);
      }
    }

    return rows;
  },

  // IndexedDB-specific methods
  async getStats() {
    await this.init();
    try {
      const stats = await this.db.getStats(this.storeName);
      const allNotes = await this.db.getAll(this.storeName);

      const categories = {};
      allNotes.forEach((note) => {
        categories[note.category] = (categories[note.category] || 0) + 1;
      });

      const tagStats = {};
      allNotes.forEach((note) => {
        if (note.tags) {
          note.tags.forEach((tag) => {
            tagStats[tag] = (tagStats[tag] || 0) + 1;
          });
        }
      });

      return {
        ...stats,
        categories,
        totalCategories: Object.keys(categories).length,
        tagStats,
        totalUniqueTags: Object.keys(tagStats).length,
      };
    } catch (error) {
      Utils.log(`Error getting notes stats: ${error.message}`);
      return {
        count: 0,
        categories: {},
        totalCategories: 0,
        tagStats: {},
        totalUniqueTags: 0,
      };
    }
  },

  async searchNotes(searchTerm, options = {}) {
    await this.init();
    try {
      const allNotes = await this.db.getAll(this.storeName);
      const searchLower = searchTerm.toLowerCase();

      return allNotes.filter((note) => {
        const contentMatch = note.content.toLowerCase().includes(searchLower);
        const tagsMatch =
          note.tags &&
          note.tags.some((tag) => tag.toLowerCase().includes(searchLower));
        const categoryMatch = note.category.toLowerCase().includes(searchLower);
        const alertIdMatch = note.alertId.toLowerCase().includes(searchLower);

        if (options.searchInTags && !options.searchInContent) {
          return tagsMatch;
        }
        if (options.searchInContent && !options.searchInTags) {
          return contentMatch;
        }

        return contentMatch || tagsMatch || categoryMatch || alertIdMatch;
      });
    } catch (error) {
      Utils.log(`Error searching notes: ${error.message}`);
      return [];
    }
  },

  async getNotesByCategory(category) {
    await this.init();
    try {
      return await this.db.getAllByIndex(this.storeName, "category", category);
    } catch (error) {
      Utils.log(`Error getting notes by category: ${error.message}`);
      return [];
    }
  },

  async getNotesByTag(tag) {
    await this.init();
    try {
      const allNotes = await this.db.getAll(this.storeName);
      return allNotes.filter((note) => note.tags && note.tags.includes(tag));
    } catch (error) {
      Utils.log(`Error getting notes by tag: ${error.message}`);
      return [];
    }
  },

  async cleanup(options = {}) {
    await this.init();
    try {
      const deletedCount = await this.db.cleanup(this.storeName, {
        maxEntries: options.maxEntries || 10000,
        maxAgeInDays: options.maxAgeInDays || 365,
        timestampField: "timestamp",
      });
      return deletedCount;
    } catch (error) {
      Utils.log(`Error cleaning up notes: ${error.message}`);
      throw error;
    }
  },
};
