import { CONFIG } from "../config/constants.js";

export const TagManager = {
  HASHTAG_REGEX: CONFIG.TAGS.HASHTAG_REGEX,

  extractHashtagsFromText(text) {
    if (!text) return [];

    const hashtags = [];
    let match;

    while ((match = this.HASHTAG_REGEX.exec(text)) !== null) {
      const tag = match[1].toLowerCase();
      if (tag && !hashtags.includes(tag)) {
        hashtags.push(tag);
      }
    }

    return hashtags;
  },

  mergeTags(manualTags, hashtagTags) {
    const tags1 = manualTags || [];
    const tags2 = hashtagTags || [];
    const uniqueTags = new Set([...tags1, ...tags2]);
    return Array.from(uniqueTags);
  },

  getTagCounts(notes, includeHashtags = true) {
    if (!notes || typeof notes !== "object") {
      return {};
    }

    const tagCounts = {};

    Object.values(notes).forEach((noteData) => {
      if (noteData && typeof noteData === "object") {
        let allTags = noteData.tags || [];

        // Include hashtags from note text if enabled
        if (includeHashtags && noteData.note) {
          const hashtagTags = this.extractHashtagsFromText(noteData.note);
          allTags = this.mergeTags(allTags, hashtagTags);
        }

        allTags.forEach((tag) => {
          tagCounts[tag] = (tagCounts[tag] || 0) + 1;
        });
      }
    });

    return tagCounts;
  },

  getAllTags(notes) {
    const allTags = new Set();

    Object.values(notes).forEach((noteData) => {
      if (noteData && typeof noteData === "object" && noteData.tags) {
        noteData.tags.forEach((tag) => allTags.add(tag));
      }
    });

    return Array.from(allTags).sort();
  },

  // Validate tag name
  isValidTag(tag) {
    if (!tag || typeof tag !== "string") {
      return false;
    }
    const trimmed = tag.trim();
    return (
      trimmed.length > 0 && !/[\s\-\.]/.test(trimmed) && !/[@#]/.test(trimmed)
    );
  },

  // Clean and normalize tag
  normalizeTag(tag) {
    if (!tag || typeof tag !== "string") {
      return "";
    }
    return tag.trim().toLowerCase().replace(/\s+/g, "-");
  },
};
