import { createAppDatabase } from '../utils/indexdb-manager.js';
import { Utils } from '../utils/utils.js';

// ========================================
// NOTES MANAGER - Using IndexedDB Utility
// ========================================
export const NotesManager = {
  db: null,
  storeName: 'notes',

  async init() {
    this.db = createAppDatabase();
    await this.db.init();
    Utils.log('Notes manager initialized with IndexedDB');
  },

  // Create a new note
  async createNote(alertId, content, category = 'general') {
    try {
      const note = {
        alertId,
        content,
        category,
        timestamp: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await this.db.add(this.storeName, note);
      Utils.log(`Created note for alert ${alertId}`);
      return result;
    } catch (error) {
      Utils.log(`Error creating note: ${error.message}`);
      throw error;
    }
  },

  // Get all notes for an alert
  async getNotesForAlert(alertId) {
    try {
      return await this.db.getAllByIndex(this.storeName, 'alertId', alertId);
    } catch (error) {
      Utils.log(`Error getting notes for alert ${alertId}: ${error.message}`);
      return [];
    }
  },

  // Get notes by category
  async getNotesByCategory(category) {
    try {
      return await this.db.getAllByIndex(this.storeName, 'category', category);
    } catch (error) {
      Utils.log(`Error getting notes by category ${category}: ${error.message}`);
      return [];
    }
  },

  // Update a note
  async updateNote(noteId, updates) {
    try {
      const existingNote = await this.db.get(this.storeName, noteId);
      if (!existingNote) {
        throw new Error(`Note ${noteId} not found`);
      }

      const updatedNote = {
        ...existingNote,
        ...updates,
        updatedAt: new Date().toISOString()
      };

      await this.db.put(this.storeName, updatedNote);
      Utils.log(`Updated note ${noteId}`);
      return updatedNote;
    } catch (error) {
      Utils.log(`Error updating note ${noteId}: ${error.message}`);
      throw error;
    }
  },

  // Delete a note
  async deleteNote(noteId) {
    try {
      await this.db.delete(this.storeName, noteId);
      Utils.log(`Deleted note ${noteId}`);
    } catch (error) {
      Utils.log(`Error deleting note ${noteId}: ${error.message}`);
      throw error;
    }
  },

  // Get all notes
  async getAllNotes() {
    try {
      return await this.db.getAll(this.storeName);
    } catch (error) {
      Utils.log(`Error getting all notes: ${error.message}`);
      return [];
    }
  },

  // Search notes by content
  async searchNotes(searchTerm) {
    try {
      const allNotes = await this.getAllNotes();
      return allNotes.filter(note => 
        note.content.toLowerCase().includes(searchTerm.toLowerCase())
      );
    } catch (error) {
      Utils.log(`Error searching notes: ${error.message}`);
      return [];
    }
  },

  // Get statistics
  async getStats() {
    try {
      const stats = await this.db.getStats(this.storeName);
      const allNotes = await this.getAllNotes();
      
      const categories = {};
      allNotes.forEach(note => {
        categories[note.category] = (categories[note.category] || 0) + 1;
      });

      return {
        ...stats,
        categories,
        totalCategories: Object.keys(categories).length
      };
    } catch (error) {
      Utils.log(`Error getting notes stats: ${error.message}`);
      return { count: 0, categories: {}, totalCategories: 0 };
    }
  },

  // Cleanup old notes
  async cleanup(options = {}) {
    try {
      const deletedCount = await this.db.cleanup(this.storeName, {
        maxEntries: options.maxEntries || 1000,
        maxAgeInDays: options.maxAgeInDays || 90,
        timestampField: 'timestamp'
      });
      return deletedCount;
    } catch (error) {
      Utils.log(`Error cleaning up notes: ${error.message}`);
      throw error;
    }
  },

  // Clear all notes
  async clearAll() {
    try {
      await this.db.clear(this.storeName);
      Utils.log('Cleared all notes');
    } catch (error) {
      Utils.log(`Error clearing notes: ${error.message}`);
      throw error;
    }
  }
};
