// ========================================
// APPLICATION STATE
// ========================================
export const AppState = {
  notepad: {
    isOpen: false,
    currentAlertId: null,
    selectedFilters: [],
    filterLogic: "AND",
    includeHashtags: true,
  },

  setCurrentAlert(alertId) {
    this.notepad.currentAlertId = alertId;
  },

  toggleNotepad() {
    this.notepad.isOpen = !this.notepad.isOpen;
  },

  setFilters(filters) {
    this.notepad.selectedFilters = filters;
  },

  setFilterLogic(logic) {
    this.notepad.filterLogic = logic;
  },

  setIncludeHashtags(include) {
    this.notepad.includeHashtags = include;
  },
};
