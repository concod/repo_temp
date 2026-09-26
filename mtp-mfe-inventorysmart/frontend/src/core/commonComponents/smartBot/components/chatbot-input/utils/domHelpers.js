import { replaceSpecialCharacter } from "core/Utils/functions/utils";

/**
 * Get plain text content from contenteditable element
 * @param {HTMLElement} editorRef - Editor element
 * @returns {string} Plain text content
 */
export const getTextContent = (editorRef) => {
  if (!editorRef) return "";
  return editorRef.innerText || "";
};

/**
 * Get cursor position in contenteditable element
 * @param {HTMLElement} editorRef - Editor element
 * @returns {number} Cursor position as character offset
 */
export const getCursorPosition = (editorRef) => {
  if (!editorRef) return 0;
  
  const selection = window.getSelection();
  if (!selection.rangeCount) return 0;

  const range = selection.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(editorRef);
  preCaretRange.setEnd(range.endContainer, range.endOffset);

  return preCaretRange.toString().length;
};

/**
 * Set cursor position in contenteditable element
 * @param {HTMLElement} editorRef - Editor element
 * @param {number} pos - Position to set cursor
 */
export const setCursorPosition = (editorRef, pos) => {
  if (!editorRef) return;

  const selection = window.getSelection();
  const range = document.createRange();

  let charCount = 0;
  let nodeStack = [editorRef];
  let node, foundNode, foundOffset;

  while (!foundNode && nodeStack.length > 0) {
    node = nodeStack.pop();

    if (node.nodeType === Node.TEXT_NODE) {
      const textNode = node;
      const nextCharCount = charCount + (textNode.textContent?.length || 0);
      if (pos <= nextCharCount) {
        foundNode = node;
        foundOffset = pos - charCount;
        break;
      }
      charCount = nextCharCount;
    } else {
      for (let i = node.childNodes.length - 1; i >= 0; i--) {
        nodeStack.push(node.childNodes[i]);
      }
    }
  }

  if (foundNode) {
    range.setStart(foundNode, foundOffset);
    range.collapse(true);
    selection.removeAllRanges();
    selection.addRange(range);
  }
};

/**
 * Find text node and offset for a given position
 * @param {HTMLElement} editorRef - Editor element
 * @param {number} position - Character position
 * @returns {Object} { node, offset }
 */
export const findTextNodeAtPosition = (editorRef, position) => {
  if (!editorRef) return { node: null, offset: 0 };

  let currentPos = 0;
  let targetNode = null;
  let targetOffset = 0;

  const findPosition = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const nodeLength = node.textContent.length;
      if (currentPos + nodeLength >= position) {
        targetNode = node;
        targetOffset = position - currentPos;
        return true;
      }
      currentPos += nodeLength;
    } else {
      for (let child of node.childNodes) {
        if (findPosition(child)) return true;
      }
    }
    return false;
  };

  findPosition(editorRef);

  return { node: targetNode, offset: targetOffset };
};

/**
 * Create a mention span element
 * @param {string} text - Mention text to display
 * @param {string} filterName - Filter name
 * @param {Array} values - Selected values
 * @param {string} groupId - Unique group ID
 * @param {boolean} isStage1 - Whether this is stage 1 (filter only) or stage 2 (with values)
 * @returns {HTMLSpanElement} Mention span element
 */
export const createMentionSpan = (text, filterName, values, groupId, isStage1 = false, checkAll = false) => {
  const mentionSpan = document.createElement("span");
  mentionSpan.className = "mention-highlight";
  mentionSpan.contentEditable = "false";
  mentionSpan.setAttribute("data-group-id", groupId);
  mentionSpan.setAttribute("data-filter-name", filterName);
  mentionSpan.setAttribute("data-stage", isStage1 ? "1" : "2");
  
  if (values && values.length > 0) {
    mentionSpan.setAttribute("data-values", JSON.stringify(values));
  }

  if (checkAll) {
    mentionSpan.setAttribute("data-check-all", "true");
  }
  
  mentionSpan.textContent = text;

  return mentionSpan;
};

/**
 * Create +N count badge
 * @param {number} count - Hidden count
 * @param {Array} hiddenValues - Array of hidden value labels
 * @param {string} groupId - Unique group ID
 * @returns {HTMLSpanElement} Count badge element
 */
export const createCountBadge = (count, hiddenValues, groupId) => {
  const countBadge = document.createElement("span");
  countBadge.className = "mention-highlight mention-count-badge";
  countBadge.contentEditable = "false";
  countBadge.setAttribute("data-hidden-count", String(count));
  // Store the original (possibly encoded) values so that they can be sent
  // back to the backend without modification.
  countBadge.setAttribute("data-hidden-values", JSON.stringify(hiddenValues));
  countBadge.setAttribute("data-group-id", groupId);
  countBadge.textContent = `+${count}`;

  // Add hover tooltip
  countBadge.addEventListener("mouseenter", () => {
    const tooltip = document.createElement("div");
    tooltip.className = "mention-tooltip";
    // Show decoded values in the tooltip while keeping the stored
    // values (in data-hidden-values) unchanged for backend use.
    tooltip.innerHTML = hiddenValues
      .map((v) => replaceSpecialCharacter(String(v)))
      .join("<br/>");
    document.body.appendChild(tooltip);

    const tooltipHeight = tooltip.offsetHeight;
    const rect = countBadge.getBoundingClientRect();

    tooltip.style.left = `${rect.left}px`;
    tooltip.style.top = `${rect.top - tooltipHeight - 8}px`;
  });

  countBadge.addEventListener("mouseleave", () => {
    const tooltips = document.querySelectorAll(".mention-tooltip");
    tooltips.forEach((t) => t.remove());
  });

  return countBadge;
};

/**
 * Delete text range in contenteditable
 * @param {Object} textNodeInfo - { node, offset }
 * @param {number} length - Length of text to delete
 */
export const deleteTextRange = (textNodeInfo, length) => {
  const { node, offset } = textNodeInfo;
  if (!node || !node.textContent) return;

  const deleteRange = document.createRange();
  deleteRange.setStart(node, offset);
  deleteRange.setEnd(
    node,
    Math.min(offset + length, node.textContent.length)
  );
  deleteRange.deleteContents();
};

/**
 * Insert element at position and set cursor after it
 * @param {HTMLElement} element - Element to insert
 * @param {Object} textNodeInfo - { node, offset }
 * @param {HTMLElement} editorRef - Editor element
 */
export const insertElementAtPosition = (element, textNodeInfo, editorRef) => {
  const { node, offset } = textNodeInfo;
  if (!node || !node.parentNode) return;

  const selection = window.getSelection();
  const range = document.createRange();
  
  // Set range at the insertion point
  range.setStart(node, offset);
  range.collapse(true);

  // Insert the element
  range.insertNode(element);

  // Create space after element
  const spaceNode = document.createTextNode("\u00A0");
  
  // Insert space after the element
  if (element.nextSibling) {
    element.parentNode.insertBefore(spaceNode, element.nextSibling);
  } else {
    element.parentNode.appendChild(spaceNode);
  }

  // Set cursor after the space
  const newRange = document.createRange();
  newRange.setStart(spaceNode, 1); // Position at end of space
  newRange.collapse(true);
  
  selection.removeAllRanges();
  selection.addRange(newRange);

  // Focus editor
  if (editorRef) {
    editorRef.focus();
  }
};

/**
 * Get all mention elements from editor
 * @param {HTMLElement} editorRef - Editor element
 * @returns {Array} Array of mention objects
 */
export const getAllMentions = (editorRef) => {
  if (!editorRef) return [];

  const mentionSpans = editorRef.querySelectorAll(
    ".mention-highlight:not(.mention-count-badge)"
  );

  return Array.from(mentionSpans).map((span) => ({
    element: span,
    groupId: span.getAttribute("data-group-id"),
    filterName: span.getAttribute("data-filter-name"),
    stage: span.getAttribute("data-stage"),
    values: JSON.parse(span.getAttribute("data-values") || "[]"),
    checkAll: span.getAttribute("data-check-all") === "true",
    text: span.textContent,
  }));
};

/**
 * Remove mention elements by group ID
 * @param {HTMLElement} editorRef - Editor element
 * @param {string} groupId - Group ID to remove
 */
export const removeMentionByGroupId = (editorRef, groupId) => {
  if (!editorRef || !groupId) return;

  const mentions = editorRef.querySelectorAll(`[data-group-id="${groupId}"]`);
  mentions.forEach((mention) => {
    const nextSibling = mention.nextSibling;
    mention.remove();

    // Remove space after mention
    if (
      nextSibling &&
      nextSibling.nodeType === Node.TEXT_NODE &&
      nextSibling.textContent === "\u00A0"
    ) {
      nextSibling.remove();
    }
  });
};

/**
 * Clean up all tooltips
 */
export const cleanupTooltips = () => {
  const tooltips = document.querySelectorAll(".mention-tooltip");
  tooltips.forEach((t) => t.remove());
};

