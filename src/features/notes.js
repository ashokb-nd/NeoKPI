import { CONFIG } from '../config/constants.js';
import { Utils } from '../utils/utils.js';
import { StorageManager } from '../utils/storage.js';
import { TagManager } from './tags.js';

export const NotesManager = {
  getAllNotes() {
    return StorageManager.get(CONFIG.STORAGE_KEYS.NOTES) || {};
  },

  getNote(alertId) {
    const notes = this.getAllNotes();
    const noteData = notes[alertId];
    
    // Handle legacy string format
    if (typeof noteData === 'string') {
      return noteData;
    }
    
    return noteData ? noteData.note : '';
  },

  getTags(alertId) {
    const notes = this.getAllNotes();
    const noteData = notes[alertId];
    
    // Handle legacy string format
    if (typeof noteData === 'string') {
      return [];
    }
    
    return noteData ? (noteData.tags || []) : [];
  },

  saveNote(alertId, note, manualTags = []) {
    if (!alertId) return false;

    const notes = this.getAllNotes();
    const hashtagTags = TagManager.extractHashtagsFromText(note);
    const allTags = TagManager.mergeTags(manualTags, hashtagTags);
    const alertType = Utils.getCurrentAlertType() || 'unknown';
    
    if (note.trim() || allTags.length > 0) {
      notes[alertId] = {
        note: note.trim(),
        tags: allTags,
        alertType: alertType,
        timestamp: new Date().toISOString()
      };
    } else {
      delete notes[alertId];
    }
    
    return StorageManager.set(CONFIG.STORAGE_KEYS.NOTES, notes);
  },

  deleteNote(alertId) {
    if (!alertId) return false;

    const notes = this.getAllNotes();
    delete notes[alertId];
    return StorageManager.set(CONFIG.STORAGE_KEYS.NOTES, notes);
  },

  clearAllNotes() {
    return StorageManager.remove(CONFIG.STORAGE_KEYS.NOTES);
  },

  // Get notes with pagination
  getNotesPage(page = 1, pageSize = 50) {
    const notes = this.getAllNotes();
    const entries = Object.entries(notes);
    const startIndex = (page - 1) * pageSize;
    const endIndex = startIndex + pageSize;
    
    return {
      notes: entries.slice(startIndex, endIndex),
      total: entries.length,
      page,
      pageSize,
      totalPages: Math.ceil(entries.length / pageSize)
    };
  },

  exportToCsv() {
    const notes = this.getAllNotes();
    const entries = Object.entries(notes);
    
    if (entries.length === 0) {
      alert('No notes to export');
      return;
    }
    
    const csvContent = this.generateCsvContent(entries);
    this.downloadCsv(csvContent);
  },

  generateCsvContent(entries) {
    const headers = ['Alert ID', 'Alert Type', 'Notes', 'Tags', 'Timestamp'];
    const rows = entries.map(([alertId, noteData]) => {
      // Handle legacy format
      if (typeof noteData === 'string') {
        return [alertId, 'unknown', noteData, '', ''];
      }
      
      return [
        alertId,
        noteData.alertType || 'unknown',
        noteData.note || '',
        (noteData.tags || []).join(', '),
        noteData.timestamp || ''
      ];
    });
    
    return [headers, ...rows]
      .map(row => row.map(field => `"${String(field).replace(/"/g, '""')}"`))
      .join('\n');
  },

  downloadCsv(csvContent) {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `alert-debug-notes-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  importFromCsv(csvContent) {
    try {
      const rows = this.parseCsvContent(csvContent);
      
      if (rows.length < 2) {
        throw new Error('CSV file must contain at least a header and one data row');
      }
      
      return this.processImportedRows(rows);
    } catch (error) {
      return {
        success: false,
        message: `Import failed: ${error.message}`,
        imported: 0,
        updated: 0,
        skipped: 0,
        alertIds: []
      };
    }
  },

  processImportedRows(rows) {
    const headers = rows[0];
    const columnIndices = this.getColumnIndices(headers);
    
    if (columnIndices.alertIdIndex === -1) {
      throw new Error('CSV must contain an "Alert ID" column');
    }
    
    const existingNotes = this.getAllNotes();
    const result = {
      imported: 0,
      updated: 0,
      skipped: 0,
      alertIds: []
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
        const wasExisting = existingNotes.hasOwnProperty(alertId);
        
        existingNotes[alertId] = noteData;
        result.alertIds.push(alertId);
        
        if (wasExisting) {
          result.updated++;
        } else {
          result.imported++;
        }
      } catch (error) {
        console.warn(`Error parsing CSV row ${i + 1}: ${error.message}`);
        result.skipped++;
      }
    }
    
    // Save the updated notes
    if (StorageManager.set(CONFIG.STORAGE_KEYS.NOTES, existingNotes)) {
      return {
        success: true,
        message: `Import completed: ${result.imported} new notes, ${result.updated} updated, ${result.skipped} skipped`,
        ...result
      };
    } else {
      throw new Error('Failed to save imported notes');
    }
  },

  getColumnIndices(headers) {
    return {
      alertIdIndex: headers.findIndex(h => h.toLowerCase().includes('alert id')),
      alertTypeIndex: headers.findIndex(h => h.toLowerCase().includes('alert type')),
      notesIndex: headers.findIndex(h => h.toLowerCase().includes('notes')),
      tagsIndex: headers.findIndex(h => h.toLowerCase().includes('tags')),
      timestampIndex: headers.findIndex(h => h.toLowerCase().includes('timestamp'))
    };
  },

  createNoteDataFromRow(values, columnIndices) {
    return {
      note: values[columnIndices.notesIndex]?.trim() || '',
      alertType: values[columnIndices.alertTypeIndex]?.trim() || 'unknown',
      tags: values[columnIndices.tagsIndex] ? 
        values[columnIndices.tagsIndex].split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : 
        [],
      timestamp: values[columnIndices.timestampIndex]?.trim() || new Date().toISOString()
    };
  },

  parseCsvContent(csvContent) {
    const rows = [];
    let currentRow = [];
    let currentField = '';
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
      } else if (char === ',' && !inQuotes) {
        // Field separator - end current field
        currentRow.push(currentField);
        currentField = '';
        i++;
      } else if ((char === '\n' || char === '\r') && !inQuotes) {
        // End of row (handle both \n and \r\n)
        if (char === '\r' && csvContent[i + 1] === '\n') {
          i++; // Skip the \n in \r\n
        }
        
        // Add the last field and complete the row
        currentRow.push(currentField);
        if (currentRow.length > 0 && currentRow.some(field => field.trim() !== '')) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentField = '';
        i++;
      } else {
        // Regular character - add to current field
        currentField += char;
        i++;
      }
    }
    
    // Handle the last field and row if we ended without a newline
    if (currentField !== '' || currentRow.length > 0) {
      currentRow.push(currentField);
      if (currentRow.length > 0 && currentRow.some(field => field.trim() !== '')) {
        rows.push(currentRow);
      }
    }
    
    return rows;
  }
};
