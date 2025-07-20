import { describe, test, expect, beforeEach, vi } from "vitest";
import { FilterManager } from "../src/features/filter.js";
import { NotesManager } from "../src/features/notes.js";
import { TagManager } from "../src/features/tags.js";

// Mock dependencies
vi.mock("../src/features/notes.js", () => ({
  NotesManager: {
    getAllNotes: vi.fn(),
  },
}));

vi.mock("../src/features/tags.js", () => ({
  TagManager: {
    extractHashtagsFromText: vi.fn(() => []),
    mergeTags: vi.fn((manual, hashtag) => [
      ...(manual || []),
      ...(hashtag || []),
    ]),
  },
}));

describe("FilterManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getFilteredNotes", () => {
    test("should return all notes when no filter tags provided", () => {
      const mockNotes = {
        12345: { note: "Test note", tags: ["urgent"], alertType: "security" },
        67890: { note: "Another note", tags: ["normal"], alertType: "warning" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const result = FilterManager.getFilteredNotes([]);

      expect(result).toEqual(mockNotes);
    });

    test("should return all notes when filter tags is null", () => {
      const mockNotes = {
        12345: { note: "Test note", tags: ["urgent"], alertType: "security" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const result = FilterManager.getFilteredNotes(null);

      expect(result).toEqual(mockNotes);
    });

    test("should filter notes using AND logic", () => {
      const mockNotes = {
        12345: {
          note: "Test note",
          tags: ["urgent", "security"],
          alertType: "security",
        },
        67890: { note: "Another note", tags: ["urgent"], alertType: "warning" },
        11111: { note: "Third note", tags: ["security"], alertType: "info" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const result = FilterManager.getFilteredNotes(
        ["urgent", "security"],
        "AND",
      );

      expect(result).toEqual({
        12345: mockNotes["12345"],
      });
    });

    test("should filter notes using OR logic", () => {
      const mockNotes = {
        12345: {
          note: "Test note",
          tags: ["urgent", "security"],
          alertType: "security",
        },
        67890: { note: "Another note", tags: ["urgent"], alertType: "warning" },
        11111: { note: "Third note", tags: ["normal"], alertType: "info" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const result = FilterManager.getFilteredNotes(
        ["urgent", "security"],
        "OR",
      );

      expect(result).toEqual({
        12345: mockNotes["12345"],
        67890: mockNotes["67890"],
      });
    });

    test("should include hashtags from note text when enabled", () => {
      const mockNotes = {
        12345: {
          note: "Test note #urgent",
          tags: ["security"],
          alertType: "security",
        },
        67890: { note: "Another note", tags: ["urgent"], alertType: "warning" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);
      vi.mocked(TagManager.extractHashtagsFromText).mockReturnValue(["urgent"]);
      vi.mocked(TagManager.mergeTags).mockReturnValue(["security", "urgent"]);

      const result = FilterManager.getFilteredNotes(["urgent"], "AND", true);

      expect(result).toEqual({
        12345: mockNotes["12345"],
        67890: mockNotes["67890"],
      });

      expect(TagManager.extractHashtagsFromText).toHaveBeenCalledWith(
        "Test note #urgent",
      );
      expect(TagManager.mergeTags).toHaveBeenCalledWith(
        ["security"],
        ["urgent"],
      );
    });

    test("should not include hashtags when disabled", () => {
      const mockNotes = {
        12345: {
          note: "Test note #urgent",
          tags: ["security"],
          alertType: "security",
        },
        67890: { note: "Another note", tags: ["urgent"], alertType: "warning" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const result = FilterManager.getFilteredNotes(["urgent"], "AND", false);

      expect(result).toEqual({
        67890: mockNotes["67890"],
      });

      expect(TagManager.extractHashtagsFromText).not.toHaveBeenCalled();
    });

    test("should handle notes without tags property", () => {
      const mockNotes = {
        12345: { note: "Test note", alertType: "security" },
        67890: { note: "Another note", tags: ["urgent"], alertType: "warning" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      // Ensure mocks return empty arrays for note without hashtags
      vi.mocked(TagManager.extractHashtagsFromText).mockReturnValue([]);
      vi.mocked(TagManager.mergeTags).mockImplementation((manual, hashtag) => {
        const manualArray = manual || [];
        const hashtagArray = hashtag || [];
        return [...manualArray, ...hashtagArray];
      });

      const result = FilterManager.getFilteredNotes(["urgent"], "AND");

      expect(result).toEqual({
        67890: mockNotes["67890"],
      });
    });

    test("should handle legacy string format notes", () => {
      const mockNotes = {
        12345: "Old string note",
        67890: { note: "Another note", tags: ["urgent"], alertType: "warning" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const result = FilterManager.getFilteredNotes(["urgent"], "AND");

      expect(result).toEqual({
        67890: mockNotes["67890"],
      });
    });
  });

  describe("getFilteredAlertIds", () => {
    test("should return sorted alert IDs from filtered notes", () => {
      const mockNotes = {
        67890: { note: "Another note", tags: ["urgent"], alertType: "warning" },
        12345: { note: "Test note", tags: ["urgent"], alertType: "security" },
        99999: { note: "Third note", tags: ["urgent"], alertType: "info" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const result = FilterManager.getFilteredAlertIds(["urgent"]);

      expect(result).toEqual(["12345", "67890", "99999"]);
    });

    test("should return empty array when no notes match filter", () => {
      const mockNotes = {
        12345: { note: "Test note", tags: ["normal"], alertType: "security" },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const result = FilterManager.getFilteredAlertIds(["urgent"]);

      expect(result).toEqual([]);
    });

    test("should pass parameters correctly to getFilteredNotes", () => {
      const mockNotes = {
        12345: {
          note: "Test note",
          tags: ["urgent", "security"],
          alertType: "security",
        },
      };

      vi.mocked(NotesManager.getAllNotes).mockReturnValue(mockNotes);

      const spyGetFilteredNotes = vi.spyOn(FilterManager, "getFilteredNotes");

      FilterManager.getFilteredAlertIds(["urgent", "security"], "OR", false);

      expect(spyGetFilteredNotes).toHaveBeenCalledWith(
        ["urgent", "security"],
        "OR",
        false,
      );
    });
  });
});
