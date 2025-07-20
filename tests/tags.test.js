import { describe, test, expect, beforeEach } from "vitest";
import { TagManager } from "../src/features/tags.js";

describe("TagManager Module", () => {
  beforeEach(() => {
    // Reset any state if needed
  });

  describe("extractHashtagsFromText method", () => {
    test("should extract single hashtag", () => {
      const text = "This is a #test message";
      const hashtags = TagManager.extractHashtagsFromText(text);

      expect(hashtags).toEqual(["test"]);
    });

    test("should extract multiple hashtags", () => {
      const text = "This is a #test message with #multiple #hashtags";
      const hashtags = TagManager.extractHashtagsFromText(text);

      expect(hashtags).toEqual(["test", "multiple", "hashtags"]);
    });

    test("should extract hashtags with numbers and underscores", () => {
      const text = "Testing #tag_with_underscores and #tag123 and #test_2024";
      const hashtags = TagManager.extractHashtagsFromText(text);

      expect(hashtags).toEqual(["tag_with_underscores", "tag123", "test_2024"]);
    });

    test("should handle hashtags at beginning and end of text", () => {
      const text = "#start this is a message #end";
      const hashtags = TagManager.extractHashtagsFromText(text);

      expect(hashtags).toEqual(["start", "end"]);
    });

    test("should handle hashtags with mixed case", () => {
      const text = "Testing #CamelCase and #UPPERCASE and #lowercase";
      const hashtags = TagManager.extractHashtagsFromText(text);

      // Implementation automatically lowercases hashtags
      expect(hashtags).toEqual(["camelcase", "uppercase", "lowercase"]);
    });

    test("should handle duplicate hashtags", () => {
      const text = "Testing #duplicate and #duplicate again";
      const hashtags = TagManager.extractHashtagsFromText(text);

      // Implementation automatically removes duplicates
      expect(hashtags).toEqual(["duplicate"]);
    });

    test("should return empty array when no hashtags found", () => {
      const text = "This is a message without any hashtags";
      const hashtags = TagManager.extractHashtagsFromText(text);

      expect(hashtags).toEqual([]);
    });

    test("should handle empty or null input", () => {
      expect(TagManager.extractHashtagsFromText("")).toEqual([]);
      expect(TagManager.extractHashtagsFromText(null)).toEqual([]);
      expect(TagManager.extractHashtagsFromText(undefined)).toEqual([]);
    });

    test("should handle hashtags followed by punctuation", () => {
      const text = "Testing #hashtag, #another. #third! #fourth?";
      const hashtags = TagManager.extractHashtagsFromText(text);

      expect(hashtags).toEqual(["hashtag", "another", "third", "fourth"]);
    });

    test("should not extract incomplete hashtags", () => {
      const text = "Testing # incomplete and #valid hashtag";
      const hashtags = TagManager.extractHashtagsFromText(text);

      expect(hashtags).toEqual(["valid"]);
    });

    test("should handle hashtags in multiline text", () => {
      const text = `First line #tag1
      Second line #tag2
      Third line #tag3`;
      const hashtags = TagManager.extractHashtagsFromText(text);

      expect(hashtags).toEqual(["tag1", "tag2", "tag3"]);
    });
  });

  describe("mergeTags method", () => {
    test("should merge two arrays of tags", () => {
      const tags1 = ["tag1", "tag2"];
      const tags2 = ["tag3", "tag4"];
      const merged = TagManager.mergeTags(tags1, tags2);

      expect(merged).toEqual(["tag1", "tag2", "tag3", "tag4"]);
    });

    test("should remove duplicates when merging", () => {
      const tags1 = ["tag1", "tag2", "tag3"];
      const tags2 = ["tag2", "tag3", "tag4"];
      const merged = TagManager.mergeTags(tags1, tags2);

      expect(merged).toEqual(["tag1", "tag2", "tag3", "tag4"]);
    });

    test("should handle empty arrays", () => {
      expect(TagManager.mergeTags([], ["tag1", "tag2"])).toEqual([
        "tag1",
        "tag2",
      ]);
      expect(TagManager.mergeTags(["tag1", "tag2"], [])).toEqual([
        "tag1",
        "tag2",
      ]);
      expect(TagManager.mergeTags([], [])).toEqual([]);
    });

    test("should handle null or undefined inputs", () => {
      expect(TagManager.mergeTags(null, ["tag1"])).toEqual(["tag1"]);
      expect(TagManager.mergeTags(["tag1"], null)).toEqual(["tag1"]);
      expect(TagManager.mergeTags(undefined, ["tag1"])).toEqual(["tag1"]);
      expect(TagManager.mergeTags(["tag1"], undefined)).toEqual(["tag1"]);
      expect(TagManager.mergeTags(null, null)).toEqual([]);
    });

    test("should maintain order and remove duplicates", () => {
      const tags1 = ["a", "b", "c"];
      const tags2 = ["b", "c", "d"];
      const merged = TagManager.mergeTags(tags1, tags2);

      expect(merged).toEqual(["a", "b", "c", "d"]);
    });
  });

  describe("getTagCounts method", () => {
    test("should count occurrences of each tag from notes object", () => {
      const notes = {
        alert1: { tags: ["tag1", "tag2"] },
        alert2: { tags: ["tag1", "tag3"] },
        alert3: { tags: ["tag1", "tag2"] },
      };
      const counts = TagManager.getTagCounts(notes);

      expect(counts).toEqual({
        tag1: 3,
        tag2: 2,
        tag3: 1,
      });
    });

    test("should handle empty notes object", () => {
      const counts = TagManager.getTagCounts({});

      expect(counts).toEqual({});
    });

    test("should handle null or undefined input", () => {
      expect(TagManager.getTagCounts(null)).toEqual({});
      expect(TagManager.getTagCounts(undefined)).toEqual({});
    });

    test("should handle single note with tags", () => {
      const notes = {
        alert1: { tags: ["onlyTag"] },
      };
      const counts = TagManager.getTagCounts(notes);

      expect(counts).toEqual({
        onlyTag: 1,
      });
    });

    test("should handle case-sensitive tags", () => {
      const notes = {
        alert1: { tags: ["Tag"] },
        alert2: { tags: ["tag"] },
        alert3: { tags: ["TAG"] },
      };
      const counts = TagManager.getTagCounts(notes);

      expect(counts).toEqual({
        Tag: 1,
        tag: 1,
        TAG: 1,
      });
    });
  });

  describe("normalizeTag method", () => {
    test("should trim whitespace", () => {
      expect(TagManager.normalizeTag("  tag  ")).toBe("tag");
    });

    test("should convert to lowercase", () => {
      expect(TagManager.normalizeTag("TAG")).toBe("tag");
      expect(TagManager.normalizeTag("CamelCase")).toBe("camelcase");
    });

    test("should handle empty or null input", () => {
      expect(TagManager.normalizeTag("")).toBe("");
      expect(TagManager.normalizeTag(null)).toBe("");
      expect(TagManager.normalizeTag(undefined)).toBe("");
    });

    test("should handle tags with special characters", () => {
      expect(TagManager.normalizeTag("tag_with_underscores")).toBe(
        "tag_with_underscores",
      );
      expect(TagManager.normalizeTag("tag123")).toBe("tag123");
    });
  });

  describe("isValidTag method", () => {
    test("should return true for valid tags", () => {
      expect(TagManager.isValidTag("validTag")).toBe(true);
      expect(TagManager.isValidTag("tag123")).toBe(true);
      expect(TagManager.isValidTag("tag_with_underscores")).toBe(true);
      expect(TagManager.isValidTag("a")).toBe(true);
    });

    test("should return false for invalid tags", () => {
      expect(TagManager.isValidTag("")).toBe(false);
      expect(TagManager.isValidTag("   ")).toBe(false);
      expect(TagManager.isValidTag(null)).toBe(false);
      expect(TagManager.isValidTag(undefined)).toBe(false);
    });

    test("should return false for tags with special characters", () => {
      expect(TagManager.isValidTag("tag with spaces")).toBe(false);
      expect(TagManager.isValidTag("tag-with-hyphens")).toBe(false);
      expect(TagManager.isValidTag("tag.with.dots")).toBe(false);
      expect(TagManager.isValidTag("tag@symbol")).toBe(false);
    });

    test("should handle minimum length requirement", () => {
      expect(TagManager.isValidTag("")).toBe(false);
      expect(TagManager.isValidTag("a")).toBe(true);
    });
  });

  describe("integration tests", () => {
    test("should handle complete tag processing workflow", () => {
      const text =
        "This is a #test message with #multiple #hashtags and #test again";

      // Extract hashtags (implementation removes duplicates and lowercases)
      const hashtags = TagManager.extractHashtagsFromText(text);
      expect(hashtags).toEqual(["test", "multiple", "hashtags"]);

      // Get tag counts from notes object
      const notes = {
        alert1: { tags: hashtags, note: text },
      };
      const counts = TagManager.getTagCounts(notes);
      expect(counts).toEqual({
        test: 1,
        multiple: 1,
        hashtags: 1,
      });
    });

    test("should handle tag merging and normalization", () => {
      const tags1 = ["Tag1", "TAG2"];
      const tags2 = ["tag3", "TAG1"];

      // Normalize tags
      const normalizedTags1 = tags1.map((tag) => TagManager.normalizeTag(tag));
      const normalizedTags2 = tags2.map((tag) => TagManager.normalizeTag(tag));

      expect(normalizedTags1).toEqual(["tag1", "tag2"]);
      expect(normalizedTags2).toEqual(["tag3", "tag1"]);

      // Merge normalized tags
      const merged = TagManager.mergeTags(normalizedTags1, normalizedTags2);
      expect(merged).toEqual(["tag1", "tag2", "tag3"]);
    });

    test("should handle complex text with various hashtag patterns", () => {
      const complexText = `
        Working on #project_alpha with #team123
        Found #bug in #feature_beta! 
        Need to #fix ASAP #urgent
        #TODO: Review #code_quality
      `;

      const hashtags = TagManager.extractHashtagsFromText(complexText);
      // Implementation automatically lowercases hashtags
      expect(hashtags).toEqual([
        "project_alpha",
        "team123",
        "bug",
        "feature_beta",
        "fix",
        "urgent",
        "todo",
        "code_quality",
      ]);

      const notes = {
        alert1: { tags: hashtags, note: complexText },
      };
      const counts = TagManager.getTagCounts(notes);
      expect(Object.keys(counts)).toHaveLength(8);
      expect(counts["project_alpha"]).toBe(1);
    });
  });
});
