import { NotesManager } from './notes.js';
import { TagManager } from './tags.js';

// ========================================
// FILTER MANAGER
// ========================================
export const FilterManager = {
  getFilteredNotes(filterTags, logic = 'AND', includeHashtags = true) {
    if (!filterTags || filterTags.length === 0) {
      return NotesManager.getAllNotes();
    }
    
    const notes = NotesManager.getAllNotes();
    const filtered = {};
    
    Object.entries(notes).forEach(([alertId, noteData]) => {
      if (noteData && typeof noteData === 'object') {
        let alertTags = noteData.tags || [];
        
        // Include hashtags from note text if enabled
        if (includeHashtags && noteData.note) {
          const hashtagTags = TagManager.extractHashtagsFromText(noteData.note);
          alertTags = TagManager.mergeTags(alertTags, hashtagTags);
        }
        
        // If there are no tags, don't match any filter
        if (alertTags.length === 0) {
          return;
        }
        
        let matches = false;
        
        if (logic === 'AND') {
          matches = filterTags.every(tag => alertTags.includes(tag));
        } else {
          matches = filterTags.some(tag => alertTags.includes(tag));
        }
        
        if (matches) {
          filtered[alertId] = noteData;
        }
      }
    });
    
    return filtered;
  },

  getFilteredAlertIds(filterTags, logic = 'AND', includeHashtags = true) {
    const filteredNotes = this.getFilteredNotes(filterTags, logic, includeHashtags);
    return Object.keys(filteredNotes).sort();
  }
};
