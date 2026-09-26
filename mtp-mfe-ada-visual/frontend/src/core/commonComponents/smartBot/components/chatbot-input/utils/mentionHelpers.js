import { replaceSpecialCharacter } from "core/Utils/functions/utils";

/**
 * Parse mention text to extract filter and values
 * @param {string} mentionText - Text like "@Brand::Value1,Value2"
 * @returns {Object} { filterName, values }
 */
export const parseMentionText = (mentionText) => {
  if (!mentionText || !mentionText.startsWith("@")) return null;

  const withoutAt = mentionText.substring(1);
  const parts = withoutAt.split("::");

  if (parts.length === 1) {
    // Stage 1: Only filter name, no values yet
    return {
      filterName: parts[0],
      values: [],
      isComplete: false,
    };
  }

  if (parts.length === 2) {
    // Stage 2: Filter name with values
    const filterName = parts[0];
    const valuesString = parts[1];
    const values = valuesString
      .split(",")
      .map((v) => v.trim())
      .filter((v) => v && !v.startsWith("+"));

    return {
      filterName,
      values,
      isComplete: true,
    };
  }

  return null;
};

/**
 * Format mention for display in editor
 * @param {string} filterName - Name of the filter
 * @param {Array} values - Selected values
 * @param {number} maxVisible - Maximum visible values before +N
 * @returns {string} Formatted mention text like "@Brand::Value1,Value2,+3"
 */
export const formatMentionDisplay = (filterName, values, maxVisible = 3) => {
  if (!filterName) return "";

  if (!values || values.length === 0) {
    return `@${filterName}::`;
  }

  const visibleValues = values.slice(0, maxVisible);
  const hiddenCount = values.length - maxVisible;

  // Decode any special character codes for display purposes only.
  const displayVisibleValues = visibleValues.map((v) =>
    replaceSpecialCharacter(String(v))
  );

  let display = `@${filterName}::${displayVisibleValues.join(",")}`;

  return display;
};

/**
 * Format mention for sending (remove @ and ::, keep comma-separated values)
 * @param {string} filterName - Name of the filter
 * @param {Array} values - Selected values
 * @returns {string} Formatted text like "Brand: Value1, Value2, Value3"
 */
export const formatMentionForSending = (filterName, values) => {
  if (!filterName) return "";
  
  if (!values || values.length === 0) {
    return filterName;
  }

  return `${filterName}: ${values.join(", ")}`;
};

/**
 * Extract all complete mentions from text
 * @param {string} text - Full text content
 * @returns {Array} Array of mention objects
 */
export const extractMentionsFromText = (text) => {
  if (!text) return [];

  const mentionRegex = /@[\w\s]+::[^@\s]*/g;
  const matches = text.match(mentionRegex);

  if (!matches) return [];

  return matches
    .map((match) => parseMentionText(match))
    .filter((m) => m && m.isComplete);
};

/**
 * Check if mention is at stage 1 (filter selected, waiting for values)
 * @param {string} mentionText - Mention text
 * @returns {boolean}
 */
export const isMentionAwaitingValues = (mentionText) => {
  if (!mentionText) return false;
  return mentionText.includes("::") && mentionText.endsWith("::");
};

/**
 * Generate unique group ID for mention
 * @returns {string} Unique ID
 */
export const generateMentionGroupId = () => {
  return `mention-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Remove duplicates from array of options by value
 * @param {Array} options - Array of {label, value} objects
 * @returns {Array} Deduplicated array
 */
export const deduplicateOptions = (options) => {
  if (!Array.isArray(options)) return [];
  
  return options.filter(
    (opt, index, self) => index === self.findIndex((t) => t.value === opt.value)
  );
};

