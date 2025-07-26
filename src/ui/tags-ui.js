import { AppState } from "../core/app-state.js";
import { UIManager } from "./ui-manager.js";
import { BulkProcessor } from "../features/bulk-processor.js";
import { FilterManager } from "../features/filter.js";
import { NotesManager } from "../features/notes.js";
import { StorageManager } from "../utils/storage.js";
import { TagManager } from "../features/tags.js";
import { Utils } from "../utils/utils.js";

export const TagsUI = {
  createCurrentAlertTagsSection() {
    const section = document.createElement("div");
    section.style.cssText = "display: flex; flex-direction: column; gap: 6px;";

    // Create horizontal container for input and tags
    const tagsContainer = document.createElement("div");
    tagsContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      background: #252526;
      min-height: 32px;
    `;

    const input = document.createElement("input");
    input.id = "tag-input";
    input.placeholder = "Add tag...";
    input.style.cssText = `
      flex: 0 0 120px;
      padding: 4px 6px;
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid #3c3c3c;
      border-radius: 3px;
      font-size: 11px;
      outline: none;
      box-sizing: border-box;
    `;

    const display = document.createElement("div");
    display.id = "current-tags-display";
    display.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      flex: 1;
      min-height: 24px;
      align-items: center;
    `;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        e.preventDefault();
        this.addTag(input.value.trim());
        input.value = "";
      }
    });

    tagsContainer.appendChild(input);
    tagsContainer.appendChild(display);

    section.appendChild(tagsContainer);

    return section;
  },

  createTagsSection() {
    const section = document.createElement("div");
    section.style.cssText = "display: flex; flex-direction: column; gap: 8px;";

    const title = document.createElement("div");
    title.textContent = "Tags";
    title.style.cssText = `
      font-weight: 500;
      color: #cccccc;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    `;

    const display = document.createElement("div");
    display.id = "current-tags-display";
    display.style.cssText = `
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      min-height: 24px;
      padding: 4px;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      background: #252526;
    `;

    const input = document.createElement("input");
    input.id = "tag-input";
    input.placeholder = "Add tag...";
    input.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
    `;

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        e.preventDefault();
        this.addTag(input.value.trim());
        input.value = "";
      }
    });

    section.appendChild(title);
    section.appendChild(display);
    section.appendChild(input);

    return section;
  },

  createFilterSection() {
    const section = document.createElement("div");
    section.style.cssText = "display: flex; flex-direction: column; gap: 6px;";

    // Combine hashtag toggle and logic buttons in one row
    const topRow = document.createElement("div");
    topRow.style.cssText =
      "display: flex; align-items: center; justify-content: space-between; gap: 8px;";

    const hashtagToggle = this.createHashtagToggle();
    const logicButtons = this.createLogicButtons();

    topRow.appendChild(hashtagToggle);
    topRow.appendChild(logicButtons);

    const filterDisplay = this.createFilterDisplay();
    const clearButton = this.createClearButton();
    const searchBox = this.createSearchBox();
    const tagsList = this.createTagsList();

    section.appendChild(topRow);
    section.appendChild(filterDisplay);
    section.appendChild(clearButton);
    section.appendChild(searchBox);
    section.appendChild(tagsList);

    return section;
  },

  createHashtagToggle() {
    const container = document.createElement("div");
    container.style.cssText = "display: flex; align-items: center; gap: 6px;";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = "includeHashtagsToggle";
    checkbox.checked = AppState.notepad.includeHashtags;
    checkbox.style.cssText = `
      width: 14px;
      height: 14px;
      accent-color: #0e639c;
      cursor: pointer;
    `;

    const label = document.createElement("label");
    label.htmlFor = "includeHashtagsToggle";
    label.textContent = "Include hashtags";
    label.style.cssText = `
      color: #cccccc;
      font-size: 11px;
      cursor: pointer;
      user-select: none;
    `;

    checkbox.addEventListener("change", (e) => {
      AppState.setIncludeHashtags(e.target.checked);
      this.updateTagsList();
      this.updateFilterDisplay();
    });

    container.appendChild(checkbox);
    container.appendChild(label);

    return container;
  },

  createLogicButtons() {
    const container = document.createElement("div");
    container.style.cssText = "display: flex; gap: 4px;";

    ["AND", "OR"].forEach((logic) => {
      const button = document.createElement("button");
      button.textContent = logic;
      button.style.cssText = `
        padding: 2px 6px;
        border: 1px solid #464647;
        background: ${AppState.notepad.filterLogic === logic ? "#0e639c" : "#2d2d30"};
        color: ${AppState.notepad.filterLogic === logic ? "#ffffff" : "#cccccc"};
        border-radius: 2px;
        cursor: pointer;
        font-size: 10px;
        font-family: inherit;
        font-weight: ${AppState.notepad.filterLogic === logic ? "bold" : "normal"};
      `;

      button.addEventListener("click", () => {
        AppState.setFilterLogic(logic);
        this.updateFilterDisplay();
      });

      container.appendChild(button);
    });

    return container;
  },

  createSearchBox() {
    const searchBox = document.createElement("input");
    searchBox.type = "text";
    searchBox.id = "tag-search-box";
    searchBox.placeholder = "Search tags...";
    searchBox.style.cssText = `
      width: 100%;
      padding: 6px 8px;
      background: #1e1e1e;
      color: #d4d4d4;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      font-size: 12px;
      outline: none;
      box-sizing: border-box;
    `;

    searchBox.addEventListener("input", (e) => {
      this.filterTagsList(e.target.value);
    });

    searchBox.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this.selectTopSearchResult();
      }
    });

    return searchBox;
  },

  selectTopSearchResult() {
    const searchBox = document.querySelector("#tag-search-box");
    if (!searchBox || !searchBox.value.trim()) return;

    const searchTerm = searchBox.value.toLowerCase();
    const notes = NotesManager.getAllNotes();
    const tagCounts = TagManager.getTagCounts(
      notes,
      AppState.notepad.includeHashtags,
    );
    const filters = AppState.notepad.selectedFilters;

    // Find the first unselected tag that matches the search term
    const matchingTag = Object.keys(tagCounts)
      .filter((tag) => !filters.includes(tag)) // Only consider unselected tags
      .filter((tag) => tag.toLowerCase().includes(searchTerm))
      .sort()[0]; // Get the first one alphabetically

    if (matchingTag) {
      // Add the tag to filters (we know it's not selected since we filtered it out)
      filters.push(matchingTag);
      AppState.setFilters(filters);

      // Clear the search box
      searchBox.value = "";

      // Update the display
      this.updateFilterDisplay();
    }
  },

  createFilterDisplay() {
    const display = document.createElement("div");
    display.id = "current-filter-display";
    display.style.cssText = `
      font-size: 12px;
      color: #569cd6;
      font-style: italic;
      min-height: 32px;
      padding: 4px;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      background: #252526;
    `;

    return display;
  },

  createClearButton() {
    const container = document.createElement("div");
    container.style.cssText = "display: flex; gap: 4px;";

    const clearButton = document.createElement("button");
    clearButton.textContent = "Clear All Filters";
    clearButton.style.cssText = `
      flex: 1;
      padding: 4px 8px;
      border: 1px solid #464647;
      background: #2d2d30;
      color: #cccccc;
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
    `;

    clearButton.addEventListener("click", () => {
      AppState.setFilters([]);
      this.updateFilterDisplay();
    });

    const enterButton = document.createElement("button");
    enterButton.textContent = "Enter Filter";
    enterButton.style.cssText = `
      flex: 1;
      padding: 4px 8px;
      border: 1px solid #464647;
      background: #0e639c;
      color: #ffffff;
      border-radius: 2px;
      cursor: pointer;
      font-size: 11px;
      font-family: inherit;
      font-weight: bold;
    `;

    enterButton.addEventListener("click", () => {
      this.enterFilter();
    });

    container.appendChild(clearButton);
    container.appendChild(enterButton);

    return container;
  },

  enterFilter() {
    const filters = AppState.notepad.selectedFilters;
    const logic = AppState.notepad.filterLogic;

    if (filters.length === 0) {
      UIManager.showBulkStatus("No filters selected");
      return;
    }

    if (!BulkProcessor.state.isProcessing) {
      UIManager.showBulkStatus("No bulk processing active");
      return;
    }

    const filteredIds = FilterManager.getFilteredAlertIds(
      filters,
      logic,
      AppState.notepad.includeHashtags,
    );

    if (filteredIds.length === 0) {
      UIManager.showBulkStatus("No alerts match the selected filters");
      return;
    }

    // Save this filter group to recent history
    this.saveRecentFilterGroup(filters, logic);

    // Load the first filtered alert
    const firstAlert = filteredIds[0];
    const firstIndex = BulkProcessor.state.alertIds.indexOf(firstAlert);

    if (firstIndex !== -1) {
      BulkProcessor.state.currentIndex = firstIndex;
      BulkProcessor.saveBulkAlerts();

      const elements = Utils.getRequiredElements();
      UIManager.loadAlertId(firstAlert, elements);

      const filterText = filters.join(` ${logic} `);
      UIManager.showBulkStatus(
        `[1/${filteredIds.length}] filtered by "${filterText}" ${firstAlert}`,
      );
    }
  },

  createTagsList() {
    const list = document.createElement("div");
    list.id = "available-tags-list";
    list.style.cssText = `
      display: flex;
      flex-direction: column;
      gap: 2px;
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      background: #252526;
      padding: 4px;
    `;

    return list;
  },

  async addTag(tagName) {
    const alertId = AppState.notepad.currentAlertId;
    if (!alertId || !tagName) return;

    const currentManualTags = await NotesManager.getManualTags(alertId);
    if (!currentManualTags.includes(tagName)) {
      currentManualTags.push(tagName);
      const noteText = document.querySelector("#notepad-textarea").value;
      await NotesManager.saveNote(alertId, noteText, currentManualTags);
      this.updateTagsDisplay();
      this.updateFilterDisplay();
    }
  },

  async removeTag(tagName) {
    const alertId = AppState.notepad.currentAlertId;
    if (!alertId) return;

    const currentManualTags = await NotesManager.getManualTags(alertId);
    const updatedManualTags = currentManualTags.filter((tag) => tag !== tagName);
    const noteText = document.querySelector("#notepad-textarea").value;
    await NotesManager.saveNote(alertId, noteText, updatedManualTags);
    this.updateTagsDisplay();
    this.updateFilterDisplay();
  },

  async updateTagsDisplay() {
    const display = document.querySelector("#current-tags-display");
    if (!display) return;

    display.innerHTML = "";

    const alertId = AppState.notepad.currentAlertId;
    if (alertId) {
      const manualTags = await NotesManager.getManualTags(alertId);
      const hashtagTags = await NotesManager.getHashtagTags(alertId);

      // Display manual tags
      manualTags.forEach((tag) => {
        const chip = this.createTagChip(tag, true, false);
        display.appendChild(chip);
      });

      // Display hashtag tags
      hashtagTags.forEach((tag) => {
        const chip = this.createTagChip(tag, false, true);
        display.appendChild(chip);
      });
    }
  },

  updateFilterDisplay() {
    const display = document.querySelector("#current-filter-display");
    const list = document.querySelector("#available-tags-list");

    if (!display || !list) return;

    // Update logic buttons
    const buttons = document.querySelectorAll("#notepad-panel button");
    buttons.forEach((btn) => {
      if (btn.textContent === "AND" || btn.textContent === "OR") {
        const isActive = btn.textContent === AppState.notepad.filterLogic;
        btn.style.background = isActive ? "#0e639c" : "#2d2d30";
        btn.style.color = isActive ? "#ffffff" : "#cccccc";
        btn.style.fontWeight = isActive ? "bold" : "normal";
      }
    });

    // Update filter display
    const filters = AppState.notepad.selectedFilters;
    if (filters.length > 0) {
      const filteredIds = FilterManager.getFilteredAlertIds(
        filters,
        AppState.notepad.filterLogic,
        AppState.notepad.includeHashtags,
      );

      // Create the main structure
      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = "font-weight: bold; margin-bottom: 4px;";
      headerDiv.textContent = `Active Filters (${AppState.notepad.filterLogic}): ${filteredIds.length} alerts`;

      const container = document.createElement("div");
      container.style.cssText = "display: flex; flex-wrap: wrap; gap: 4px;";

      // Create filter chips with proper event listeners
      filters.forEach((tag) => {
        const chip = this.createFilterChip(tag);
        container.appendChild(chip);
      });

      // Clear and rebuild display
      display.innerHTML = "";
      display.appendChild(headerDiv);
      display.appendChild(container);

      if (BulkProcessor.state.isProcessing) {
        const hintDiv = document.createElement("div");
        hintDiv.style.cssText =
          "font-size: 10px; color: #888; margin-top: 4px;";
        hintDiv.textContent = "Use Cmd+↑/↓ to navigate filtered alerts";
        display.appendChild(hintDiv);
      }
    } else {
      display.innerHTML = `
        <div style="color: #888; font-style: italic;">
          No filters active - click tags below to filter
        </div>
      `;
    }

    // Update tags list
    this.updateTagsList();
  },

  createFilterChip(tag) {
    const chip = document.createElement("span");
    chip.style.cssText = `
      background: #0e639c;
      color: white;
      padding: 2px 6px;
      border-radius: 12px;
      font-size: 10px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      user-select: none;
    `;

    const tagText = document.createElement("span");
    tagText.textContent = tag;

    const removeBtn = document.createElement("span");
    removeBtn.textContent = "×";
    removeBtn.style.cssText = `
      cursor: pointer;
      color: #ccc;
      font-weight: bold;
      font-size: 12px;
      padding: 0 2px;
      border-radius: 2px;
      transition: background-color 0.2s;
    `;

    removeBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.removeFromFilter(tag);
    });

    removeBtn.addEventListener("mouseenter", () => {
      removeBtn.style.backgroundColor = "rgba(255, 255, 255, 0.2)";
    });

    removeBtn.addEventListener("mouseleave", () => {
      removeBtn.style.backgroundColor = "transparent";
    });

    chip.appendChild(tagText);
    chip.appendChild(removeBtn);

    return chip;
  },

  updateTagsList() {
    const list = document.querySelector("#available-tags-list");
    if (!list) return;

    list.innerHTML = "";
    const notes = NotesManager.getAllNotes();
    const tagCounts = TagManager.getTagCounts(
      notes,
      AppState.notepad.includeHashtags,
    );
    const filters = AppState.notepad.selectedFilters;

    // Get search term
    const searchBox = document.querySelector("#tag-search-box");
    const searchTerm = searchBox ? searchBox.value.toLowerCase() : "";

    // Filter tags based on search AND exclude already selected filters
    const filteredTags = Object.entries(tagCounts)
      .filter(([tag]) => !filters.includes(tag)) // Only show unselected tags
      .filter(([tag]) => tag.toLowerCase().includes(searchTerm))
      .sort();

    // Add filtered tags
    filteredTags.forEach(([tag, count]) => {
      const item = this.createTagItem(tag, count, false); // Always false since we're only showing unselected
      list.appendChild(item);
    });

    // Add recent filter groups at the bottom
    this.addRecentFilterGroups(list);
  },

  filterTagsList(searchTerm) {
    this.updateTagsList();
  },

  addRecentFilterGroups(list) {
    const recentGroups = this.getRecentFilterGroups();

    if (recentGroups.length > 0) {
      // Add separator
      const separator = document.createElement("div");
      separator.style.cssText = `
        margin: 8px 0 4px 0;
        border-top: 1px solid #3c3c3c;
        padding-top: 8px;
      `;

      const title = document.createElement("div");
      title.textContent = "Recent Filter Groups";
      title.style.cssText = `
        font-size: 10px;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 4px;
      `;

      separator.appendChild(title);
      list.appendChild(separator);

      // Add recent groups
      recentGroups.forEach((group) => {
        const groupItem = this.createRecentGroupItem(group);
        list.appendChild(groupItem);
      });
    }
  },

  getRecentFilterGroups() {
    const recent = StorageManager.get("recent-filter-groups") || [];
    return recent.slice(0, 3); // Keep only last 3
  },

  saveRecentFilterGroup(filters, logic) {
    if (filters.length === 0) return;

    const group = {
      filters: [...filters],
      logic: logic,
      timestamp: Date.now(),
    };

    let recent = StorageManager.get("recent-filter-groups") || [];

    // Remove duplicate if exists
    recent = recent.filter(
      (r) =>
        !(
          r.filters.length === group.filters.length &&
          r.filters.every((f) => group.filters.includes(f)) &&
          r.logic === group.logic
        ),
    );

    // Add to beginning
    recent.unshift(group);

    // Keep only last 3
    recent = recent.slice(0, 3);

    StorageManager.set("recent-filter-groups", recent);
  },

  createRecentGroupItem(group) {
    const item = document.createElement("div");
    item.style.cssText = `
      padding: 6px 8px;
      margin: 2px 0;
      border: 1px solid #3c3c3c;
      border-radius: 4px;
      background: #252526;
      cursor: pointer;
      transition: background-color 0.2s;
    `;

    const content = document.createElement("div");
    content.style.cssText = "display: flex; flex-direction: column; gap: 2px;";

    const tagsRow = document.createElement("div");
    tagsRow.style.cssText =
      "display: flex; flex-wrap: wrap; gap: 2px; align-items: center;";

    // Add logic indicator
    const logicIndicator = document.createElement("span");
    logicIndicator.textContent = group.logic;
    logicIndicator.style.cssText = `
      font-size: 8px;
      color: #888;
      background: #1e1e1e;
      padding: 1px 3px;
      border-radius: 2px;
      margin-right: 4px;
    `;
    tagsRow.appendChild(logicIndicator);

    // Add tags
    group.filters.forEach((tag) => {
      const tagChip = document.createElement("span");
      tagChip.textContent = tag;
      tagChip.style.cssText = `
        font-size: 9px;
        color: #ccc;
        background: #3c3c3c;
        padding: 1px 4px;
        border-radius: 8px;
      `;
      tagsRow.appendChild(tagChip);
    });

    const timeRow = document.createElement("div");
    timeRow.style.cssText = "font-size: 8px; color: #666;";
    timeRow.textContent = this.formatRecentTime(group.timestamp);

    content.appendChild(tagsRow);
    content.appendChild(timeRow);
    item.appendChild(content);

    item.addEventListener("click", () => {
      AppState.setFilters([...group.filters]);
      AppState.setFilterLogic(group.logic);
      this.updateFilterDisplay();
    });

    item.addEventListener("mouseenter", () => {
      item.style.background = "#3c3c3c";
    });

    item.addEventListener("mouseleave", () => {
      item.style.background = "#252526";
    });

    return item;
  },

  formatRecentTime(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "just now";
  },

  createTagChip(tagName, removable = false, isHashtag = false) {
    const chip = document.createElement("div");
    chip.style.cssText = `
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 2px 6px;
      background: ${isHashtag ? "#28a745" : "#0e639c"};
      color: white;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      user-select: none;
    `;

    const text = document.createElement("span");
    text.textContent = isHashtag ? `#${tagName}` : tagName;
    chip.appendChild(text);

    if (removable) {
      const removeBtn = document.createElement("span");
      removeBtn.textContent = "×";
      removeBtn.style.cssText = `
        cursor: pointer;
        color: #ccc;
        font-weight: bold;
        font-size: 12px;
        line-height: 1;
        padding: 0 1px;
      `;
      removeBtn.addEventListener("click", () => this.removeTag(tagName));
      chip.appendChild(removeBtn);
    } else if (isHashtag) {
      const indicator = document.createElement("span");
      indicator.textContent = "🏷️";
      indicator.style.cssText =
        "font-size: 8px; opacity: 0.7; margin-left: 2px;";
      indicator.title = "Auto-detected from text";
      chip.appendChild(indicator);
    }

    return chip;
  },

  createTagItem(tag, count, isSelected) {
    const item = document.createElement("div");
    item.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 6px;
      border-radius: 2px;
      cursor: pointer;
      font-size: 12px;
      background: transparent;
      color: #d4d4d4;
      border: 1px solid transparent;
    `;

    const content = document.createElement("div");
    content.style.cssText = "display: flex; align-items: center; gap: 6px;";

    const tagText = document.createElement("span");
    tagText.textContent = tag;

    const tagCount = document.createElement("span");
    tagCount.textContent = count;
    tagCount.style.cssText = `
      color: #888;
      font-size: 10px;
    `;

    content.appendChild(tagText);
    content.appendChild(tagCount);
    item.appendChild(content);

    // Add click handler to add to filter
    item.addEventListener("click", () => {
      const filters = AppState.notepad.selectedFilters;
      filters.push(tag);
      AppState.setFilters(filters);
      this.updateFilterDisplay();
    });

    return item;
  },

  removeFromFilter(tag) {
    const filters = AppState.notepad.selectedFilters;
    const index = filters.indexOf(tag);

    if (index !== -1) {
      filters.splice(index, 1);
      AppState.setFilters(filters);
      this.updateFilterDisplay();
    }
  },

  toggleFilter(tag) {
    const filters = AppState.notepad.selectedFilters;
    const index = filters.indexOf(tag);

    if (index === -1) {
      filters.push(tag);
    } else {
      filters.splice(index, 1);
    }

    AppState.setFilters(filters);
    this.updateFilterDisplay();
  },
};
