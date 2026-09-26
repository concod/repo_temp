import { useEffect, useMemo, useRef, useState } from "react";
import MicIcon from "coreAssets/chatbot/ChatBotMicIcon.svg";
import RefreshIcon from "coreAssets/chatbot/ChatBotRefreshIcon.svg";
import SendIcon from "coreAssets/chatbot/ChatBotSendIcon.svg";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ChatbotStopIcon from "coreAssets/chatbot/ChatbotStopIcon.svg";
import AddFilterIcon from "coreAssets/chatbot/addFilter.svg";
import FilterFolderIcon from "coreAssets/chatbot/filterFolder.svg";
import ClearFilterIcon from "coreAssets/chatbot/clearFilter.svg";
import { isEmpty } from "lodash";
import { Button, Select, Tooltip } from "impact-ui-v3";
import moment from "moment";
import DateRangePicker from "../../../dateRangePicker/index.jsx";
import FilterValueInput from "./components/FilterValueInput.jsx";
import "./chatbot.scss";

// Import utilities
import { fetchFilterValues, clearFilterValuesCache } from "./utils/apiHelpers.js";
import {
  getTextContent,
  getCursorPosition,
  findTextNodeAtPosition,
  createMentionSpan,
  createCountBadge,
  deleteTextRange,
  insertElementAtPosition,
  getAllMentions,
  removeMentionByGroupId,
  cleanupTooltips,
} from "./utils/domHelpers.js";
import {
  formatMentionDisplay,
  formatMentionForSending,
  isMentionAwaitingValues,
  deduplicateOptions,
} from "./utils/mentionHelpers.js";
import { useMentionState } from "./hooks/useMentionState.js";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { useSelector } from "react-redux";
import { extractSavedFilterData } from "../../utlis";

const ChatbotInput = (props) => {
  const {
    newChatScreen,
    inputValue,
    setInputValue,
    isStopIcon,
    handleMicClick,
    handleRefresh,
    onSendIconClick,
    onStopIconClick,
    currentMode,
    filterOptions,
    onSaveClick,
    savedFilterSets,
    onFilterSetSelect,
    onTriggerRefresh,
    selectedFilterSet,
    onClearFilterSet,
    answerMode,
    setAnswerMode,
  } = props;

  const editorRef = useRef(null);
  const selectRef = useRef(null);
  const filterSetSelectRef = useRef(null);
  const [showFilterSetMenu, setShowFilterSetMenu] = useState(false);
  const [isFilterSetMenuOpen, setIsFilterSetMenuOpen] = useState(false);
  const dateRangePickerRef = useRef(null);
  const chatInputContainerRef = useRef(null);
  const [isFixed, setIsFixed] = useState(false);
  const [height, setHeight] = useState("auto");
  const [showAnswerModeMenu, setShowAnswerModeMenu] = useState(false);
  const answerModeRef = useRef(null);
  const [hasMentionsInEditor, setHasMentionsInEditor] = useState(false);
  const isInsertingMentionRef = useRef(false);
  const isTransitioningStageRef = useRef(false);
  const shouldClearCacheRef = useRef(false);
  const allFilterValuesRef = useRef([]);
  const windowStartRef = useRef(0);
  const INITIAL_DISPLAY_COUNT = 500;
  const LOAD_MORE_COUNT = 100;
  const chatbotContext = useSelector((state) => state.smartBotReducer.chatbotContext);
  
  // Date range picker state
  const [showDateRangePicker, setShowDateRangePicker] = useState(false);
  const [dateRangeStartPos, setDateRangeStartPos] = useState(null);
  const [dateRangeStartDate, setDateRangeStartDate] = useState(null);
  const [dateRangeEndDate, setDateRangeEndDate] = useState(null);
  const [dateRangeFocusedInput, setDateRangeFocusedInput] = useState(null);
  
  // Dropdown position state
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });

  // Use mention state hook
  const mentionState = useMentionState();
  const {
    showMentionSelect,
    isSelectOpen,
    mentionStartPos,
    mentionSearch,
    currentMentionGroupId,
    selectionStage,
    selectedFilter,
    currentOptions,
    selectedOptions,
    isAllSelected,
    isLoadingValues,
    prevIsOpenRef,
    setShowMentionSelect,
    setIsSelectOpen,
    setMentionSearch,
    setCurrentOptions,
    setSelectedOptions,
    setIsAllSelected,
    setIsLoadingValues,
    setSelectionStage,
    setSelectedFilter,
    resetMentionState,
    initializeFilterSelection,
    transitionToValueSelection,
  } = mentionState;

  // Format filterOptions to ensure label-value structure
  const formattedFilterOptions = useMemo(() => {
    if (!filterOptions) return [];

    const labelCount = {};

    return filterOptions.map((option) => {
      const rawLabel = option.label || option.name || String(option);
      const value = option.value ?? rawLabel;
      // Decode special character placeholders only for the label shown
      // to the user. The underlying value (used in payloads) remains
      // unchanged so that backend continues to receive the ia_char codes.
      const label = replaceSpecialCharacter(rawLabel);

      // Handle duplicate labels
      if (labelCount[label]) {
        labelCount[label]++;
        const uniqueLabel = `${label} (${labelCount[label]})`;
        return {
          ...option,
          label: uniqueLabel,
          value: `${value}-${labelCount[label]}`,
        };
      } else {
        labelCount[label] = 1;
        return {
          ...option,
          label,
          value,
        };
      }
    });
  }, [filterOptions]);

  /**
   * Find the "@" character in the DOM by searching for it or finding the mention span
   */
  const findAtSymbolInDOM = () => {
    if (!editorRef.current) return null;

    // Get all mention spans to exclude them from search (for Stage 1)
    const allMentions = getAllMentions(editorRef.current);
    const mentionElements = new Set(allMentions.map(m => m.element).filter(Boolean));

    // Helper to check if a node is inside a mention span
    const isInsideMention = (node) => {
      let parent = node.parentNode;
      while (parent && parent !== editorRef.current) {
        if (mentionElements.has(parent)) {
          return true;
        }
        parent = parent.parentNode;
      }
      return false;
    };

    // Search for the last "@" in the editor that's NOT inside a mention span
    const walker = document.createTreeWalker(
      editorRef.current,
      NodeFilter.SHOW_TEXT,
      null
    );

    let lastAtNode = null;
    let lastAtIndex = -1;
    let node;
    
    // Find all "@" symbols that are not inside mention spans
    while (node = walker.nextNode()) {
      // Skip if this text node is inside a mention span (unless it's the current one)
      if (isInsideMention(node)) {
        // Only include if it's the current mention group
        if (currentMentionGroupId) {
          const parentMention = allMentions.find(m => 
            m.element && m.element.contains(node)
          );
          if (parentMention && parentMention.groupId !== currentMentionGroupId) {
            continue; // Skip mentions from other groups
          }
      } else {
          continue; // Skip all mentions in Stage 1
        }
      }

      const atIndex = node.textContent.lastIndexOf("@");
      if (atIndex !== -1) {
        lastAtNode = node;
        lastAtIndex = atIndex;
      }
    }

    if (lastAtNode && lastAtIndex !== -1) {
      const range = document.createRange();
      range.setStart(lastAtNode, lastAtIndex);
      range.setEnd(lastAtNode, lastAtIndex + 1);
      const rect = range.getBoundingClientRect();
      // Only return if we got a valid rect
      if (rect.width > 0 && rect.height > 0) {
        return rect;
      }
    }

    return null;
  };

  /**
   * Calculate and set dropdown position based on cursor/@ position
   * Positions dropdown 5px to the left and 5px above the "@" text
   */
  const updateDropdownPosition = (position) => {
    if (!editorRef.current) return;

    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      if (!editorRef.current) return;

      let rect = null;

      // Priority 1: If we have a mention group ID (Stage 2), find the mention span
      if (currentMentionGroupId) {
        const allMentions = getAllMentions(editorRef.current);
        const currentMention = allMentions.find(m => m.groupId === currentMentionGroupId);
        if (currentMention && currentMention.element) {
          // Get the first text node inside the mention span (which should contain "@")
          const walker = document.createTreeWalker(
            currentMention.element,
            NodeFilter.SHOW_TEXT,
            null
          );
          const firstTextNode = walker.nextNode();
          if (firstTextNode && firstTextNode.textContent.includes("@")) {
            const range = document.createRange();
            const atIndex = firstTextNode.textContent.indexOf("@");
            range.setStart(firstTextNode, atIndex);
            range.setEnd(firstTextNode, atIndex + 1);
            rect = range.getBoundingClientRect();
        } else {
            // Use the mention span's bounding rect
            rect = currentMention.element.getBoundingClientRect();
          }
        }
      }

      // Priority 2: Use position-based approach if we have a position and no rect yet
      if (!rect && position !== null) {
        const textNodeInfo = findTextNodeAtPosition(editorRef.current, position);
        if (textNodeInfo.node) {
          const range = document.createRange();
          range.setStart(textNodeInfo.node, textNodeInfo.offset);
          range.collapse(true);
          rect = range.getBoundingClientRect();
          
          // Validate the rect - if it's at (0,0) or invalid, try DOM search
          if (rect.left === 0 && rect.top === 0 && rect.width === 0 && rect.height === 0) {
            rect = null;
          }
        }
      }

      // Priority 3: Fallback to DOM search for "@"
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        rect = findAtSymbolInDOM();
      }

      // If still no rect, return early
      if (!rect || (rect.width === 0 && rect.height === 0)) {
        console.warn("Could not find @ symbol position for dropdown", {
          rect,
          position,
          currentMentionGroupId,
          showMentionSelect,
          selectionStage,
          mentionStartPos
        });
        return;
      }

      // Debug log to verify we got valid coordinates
      if (rect.left === 0 && rect.top === 0 && rect.width > 0 && rect.height > 0) {
        console.warn("Got (0,0) position - this might be invalid", {
          rect,
          position,
          currentMentionGroupId
        });
      }

      const viewportHeight = window.innerHeight;
      const viewportWidth = window.innerWidth;
      const estimatedDropdownHeight = 300; // Approximate height of dropdown
      const estimatedDropdownWidth = 300; // Approximate width of dropdown

      // Get the input field container's position
      const container = editorRef.current.closest('.chat-input-container');
      const containerRect = container ? container.getBoundingClientRect() : null;

      // Calculate horizontal position: 5px to the left of "@" symbol
      let left = rect.left - 5;

      // Calculate vertical position: Just above the input field
      let top;
      if (containerRect) {
        // Position dropdown just above the bottom of the input field container
        // This ensures it's close to where the user is typing
        const preferredTop = containerRect.bottom - estimatedDropdownHeight - 10;
        
        // Check if there's enough space above the input field
        if (preferredTop >= 10) {
          // Enough space above - position it just above the input field
          top = preferredTop;
        } else {
          // Not enough space above - position it below the input field
          top = containerRect.bottom + 10;
          // Ensure it doesn't go off-screen at the bottom
          if (top + estimatedDropdownHeight > viewportHeight - 10) {
            // If it would go off-screen, position it at the top of viewport
            top = Math.max(10, viewportHeight - estimatedDropdownHeight - 10);
          }
        }
      } else {
        // Fallback: Position relative to "@" symbol
        // Position it above the symbol but keep it close
        top = rect.top - estimatedDropdownHeight - 10;
        
        // Ensure dropdown doesn't go off-screen vertically
        if (top < 10) {
          // If not enough space above, position below instead
          top = rect.bottom + 10;
          // But still ensure it doesn't go off-screen at the bottom
          if (top + estimatedDropdownHeight > viewportHeight - 10) {
            top = viewportHeight - estimatedDropdownHeight - 10;
          }
        }
      }

      // Ensure dropdown doesn't go off-screen horizontally
      if (left < 10) {
        left = 10; // 10px margin from left
      }
      if (left + estimatedDropdownWidth > viewportWidth - 10) {
        left = viewportWidth - estimatedDropdownWidth - 10; // 10px margin from right
      }

      setDropdownPosition({ top, left });
    });
  };

  /**
   * Check if cursor is inside or right after a mention span
   */
  const isCursorInsideOrAfterMention = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return false;
    
    let node = selection.getRangeAt(0).startContainer;
    
    // Walk up the DOM tree to check if we're inside a mention
    while (node && node !== editorRef.current) {
      if (node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement) {
        if (node.classList.contains('mention-highlight')) {
          return true;
        }
      }
      node = node.parentNode;
    }
    
    // Check if cursor is immediately after a mention span
    const range = selection.getRangeAt(0);
    const previousSibling = range.startContainer.previousSibling;
    if (previousSibling && previousSibling.nodeType === Node.ELEMENT_NODE && previousSibling instanceof HTMLElement) {
      if (previousSibling.classList.contains('mention-highlight')) {
        // Cursor is right after a mention span
        // Check if there's actual text after the space
        const offset = range.startOffset;
        const containerText = range.startContainer.textContent || "";
        
        // If we're at the start of the text node and it's just a space, we're right after mention
        if (offset <= 1 && containerText.trim() === "") {
          return true;
        }
      }
    }
    
    return false;
  };

  /**
   * Detect @ mention and show dropdown
   */
  const detectMention = () => {
    if (!editorRef.current) return;

    // Don't detect mentions when a saved filter set is selected
    if (selectedFilterSet) return;

    // Don't detect if we're currently inserting a mention
    if (isInsertingMentionRef.current) {
      return;
    }

    // Don't detect if cursor is inside or right after an existing mention
    if (isCursorInsideOrAfterMention()) {
      // Close any open dropdowns
      if (showMentionSelect) {
        setShowMentionSelect(false);
        setIsSelectOpen(false);
      }
      if (showDateRangePicker) {
        setShowDateRangePicker(false);
      }
      return;
    }

    const text = getTextContent(editorRef.current);
    const cursorPos = getCursorPosition(editorRef.current);
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      // Check if the "@" at lastAtIndex is inside a mention span
      // First, get all mentions and check if any mention contains this position
      const allMentions = getAllMentions(editorRef.current);
      let isPartOfMention = false;
      
      // Check each mention to see if the "@" position falls within it
      for (const mention of allMentions) {
        if (!mention.element) continue;
        
        // Get the range of this mention element
        const range = document.createRange();
        range.selectNodeContents(mention.element);
        
        // Get the position of the mention in the text
        const preMentionRange = range.cloneRange();
        preMentionRange.selectNodeContents(editorRef.current);
        preMentionRange.setEnd(range.startContainer, range.startOffset);
        const mentionStartPos = preMentionRange.toString().length;
        const mentionEndPos = mentionStartPos + mention.element.textContent.length;
        
        // Check if lastAtIndex falls within this mention's range
        if (lastAtIndex >= mentionStartPos && lastAtIndex < mentionEndPos) {
          isPartOfMention = true;
          break;
        }
      }
      
      // Also check if the "@" is inside a mention span by checking the DOM directly
      if (!isPartOfMention) {
        const textNodeInfo = findTextNodeAtPosition(editorRef.current, lastAtIndex);
        if (textNodeInfo.node) {
          // Walk up the DOM tree to check if we're inside a mention span
          let node = textNodeInfo.node;
          while (node && node !== editorRef.current) {
            if (node.nodeType === Node.ELEMENT_NODE && node instanceof HTMLElement) {
              if (node.classList.contains('mention-highlight')) {
                isPartOfMention = true;
                break;
              }
            }
            node = node.parentNode;
          }
        }
      }
      
      // If the "@" is part of an existing mention, ignore it and close any open dropdowns
      if (isPartOfMention) {
        if (showMentionSelect) {
          setShowMentionSelect(false);
          setIsSelectOpen(false);
        }
        if (showDateRangePicker) {
          setShowDateRangePicker(false);
        }
        // Reset mention state to prevent any lingering state
        resetMentionState();
        return;
      }

      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(" ") || textAfterAt.includes("\n");

      if (!hasSpaceAfterAt) {
        // Check if user typed "@time"
        if (textAfterAt.toLowerCase() === "time") {
          // Show date range picker instead of filter dropdown
          setShowDateRangePicker(true);
          setDateRangeStartPos(lastAtIndex);
          setDateRangeStartDate(null);
          setDateRangeEndDate(null);
          setDateRangeFocusedInput("startDate");
          // Update dropdown position
          updateDropdownPosition(lastAtIndex);
          // Close any open filter dropdowns
          if (showMentionSelect) {
            setShowMentionSelect(false);
            setIsSelectOpen(false);
          }
          return;
        }

        // If date range picker is open and user is typing something other than "time", close it
        if (showDateRangePicker && textAfterAt.toLowerCase() !== "time") {
          setShowDateRangePicker(false);
          setDateRangeStartPos(null);
          setDateRangeStartDate(null);
          setDateRangeEndDate(null);
          setDateRangeFocusedInput(null);
        }

        // Check if this is @ new position or continuing
        const isNewPosition = mentionStartPos === null || mentionStartPos !== lastAtIndex;

        if (isNewPosition) {
          // Reset any existing mention state before initializing new one
          // This ensures clean state when typing "@" after completing a previous mention
          if (mentionStartPos !== null || currentMentionGroupId !== null) {
            resetMentionState();
          }
          
          // Stage 1: Show filter selection dropdown
          initializeFilterSelection(lastAtIndex, formattedFilterOptions);
          // Update dropdown position
          updateDropdownPosition(lastAtIndex);
        }

        setMentionSearch(textAfterAt);
        return;
        } else {
        // Space or newline after @ - close date range picker if open
        if (showDateRangePicker) {
          setShowDateRangePicker(false);
          setDateRangeStartPos(null);
          setDateRangeStartDate(null);
          setDateRangeEndDate(null);
          setDateRangeFocusedInput(null);
        }
      }
    }

    // No valid @ mention found - close all mention-related dropdowns
    // This ensures dropdowns don't stay open when typing regular text
    if (showMentionSelect) {
      // Only close if we're not currently in a transition or inserting
      if (!isTransitioningStageRef.current && !isInsertingMentionRef.current) {
        // If we don't have an active mention position, definitely close
        if (mentionStartPos === null) {
          setShowMentionSelect(false);
          setIsSelectOpen(false);
          resetMentionState();
        } else {
          // We have a mention position, but check if cursor is still in valid position
          // If cursor is not inside or right after a mention, and we're not actively searching,
          // close the dropdown
          if (!isCursorInsideOrAfterMention() && mentionSearch === "") {
            setShowMentionSelect(false);
            setIsSelectOpen(false);
            resetMentionState();
          }
        }
      }
    }
    // Don't close date range picker here - it should only close on Apply button
  };

  /**
   * Handle filter selection (Stage 1)
   */
  const handleFilterSelection = async (selectedOption) => {
    if (!selectedOption || !editorRef.current) return;

    // Find the filter configuration
    const filterConfig = filterOptions.find(
      (f) => (f.label || f.name) === selectedOption.label || f.value === selectedOption.value
    );

    if (!filterConfig) return;

    // Insert Stage 1 mention (@Filter::)
    const stage1Text = `@${selectedOption.label}::`;
    insertStage1Mention(stage1Text, selectedOption.label, filterConfig);
  };

  /**
   * Handle value selection (Stage 2)
   */
  const handleValueSelection = (selectedOption) => {
    if (!selectedOption) return;

    // Handle both single and multi-select
    const newSelections = Array.isArray(selectedOption) ? selectedOption : [selectedOption];
    const validSelections = newSelections.filter((opt) => opt && opt.label);
    const uniqueSelections = deduplicateOptions(validSelections);

    setSelectedOptions(uniqueSelections);
  };

  /**
   * Extract existing Stage 2 mentions from editor for cascading filters
   * Only includes filters from the same dimension as the current filter
   * @param {string} currentDimension - The dimension of the current filter being selected
   * @returns {Array} Array of existing filter selections from the same dimension
   */
  const getExistingFilterSelections = (currentDimension) => {
    if (!editorRef.current) return [];

    const allMentions = getAllMentions(editorRef.current);
    
    // Filter only Stage 2 mentions (completed selections)
    // Exclude "time" filter from cascading (check both filterName and data-date-range attribute)
    // Only include filters from the same dimension as the current filter
    const stage2Mentions = allMentions.filter(
      (mention) => {
        // Skip if not Stage 2 or has no values
        if (mention.stage !== "2" || mention.values.length === 0) {
          return false;
        }
        
        // Exclude "time" filter - check both filterName and data-date-range attribute
        const isTimeFilter = 
          mention.filterName?.toLowerCase() === "time" ||
          mention.element?.getAttribute("data-date-range") === "true";
        
        if (isTimeFilter) {
          return false;
        }

        // Find the filter config to get dimension
        const filterConfig = filterOptions.find(
          (f) => (f.label || f.name) === mention.filterName
        );

        // Get dimension from filter config (default to "product" if not found)
        const mentionDimension = filterConfig?.dimension || "product";
        
        // Only include if dimension matches current dimension
        return mentionDimension === currentDimension;
      }
    );

    // Format for API payload
    return stage2Mentions.map((mention) => {
      // Find the filter config to get attribute name
      const filterConfig = filterOptions.find(
        (f) => (f.label || f.name) === mention.filterName
      );

      return {
        filterName: mention.filterName,
        attributeName:
          filterConfig?.column_name ||
          filterConfig?.attribute_name ||
          filterConfig?.name ||
          mention.filterName,
        values: mention.values,
        checkAll: mention.checkAll || false,
      };
    });
  };

  /**
   * Insert Stage 1 mention (@Filter::) and transition to Stage 2
   */
  const insertStage1Mention = async (text, filterName, filterConfig) => {
    if (mentionStartPos === null || !editorRef.current) return;

    // Set flag to prevent detection during insertion
    isInsertingMentionRef.current = true;

    const textNodeInfo = findTextNodeAtPosition(editorRef.current, mentionStartPos);
    if (!textNodeInfo.node) {
      isInsertingMentionRef.current = false;
      return;
    }

    // Delete @ and search text
    deleteTextRange(textNodeInfo, mentionSearch.length + 1);

    // Create mention span
    const mentionSpan = createMentionSpan(
      text,
      filterName,
      [],
      currentMentionGroupId,
      true // Stage 1
    );

    // Insert at position - this will also position the cursor
    insertElementAtPosition(mentionSpan, textNodeInfo, editorRef.current);

    // Force update input value immediately
    const updatedText = getTextContent(editorRef.current);
    setInputValue(updatedText);

    // Set flag to indicate we're transitioning stages (prevents premature cleanup)
    isTransitioningStageRef.current = true;

    // Use requestAnimationFrame to ensure DOM is updated before transitioning
    requestAnimationFrame(() => {
      
      // Get the current filter's dimension (default to "product" if not found)
      const currentDimension = filterConfig?.dimension || "product";
      
      // Get existing filter selections for cascading (only from same dimension)
      const existingFilters = getExistingFilterSelections(currentDimension);
      
      // If no existing filters and editor is essentially empty (only current Stage 1 mention), clear cache
      // This handles the case where new chat was started but cache wasn't cleared
      if (existingFilters.length === 0 && editorRef.current) {
        const allMentions = getAllMentions(editorRef.current);
        const stage2Mentions = allMentions.filter(m => m.stage === "2");
        if (stage2Mentions.length === 0) {
          // Editor is clean - clear cache to ensure fresh data
          clearFilterValuesCache();
        }
      }
      
      // Transition to Stage 2 with loading state
      setSelectionStage("values");
      setSelectedFilter(filterConfig);
      setCurrentOptions([]);
      setSelectedOptions([]);
      setShowMentionSelect(true);
      setIsSelectOpen(true);

      // Update dropdown position for Stage 2 (use the original @ position)
      if (mentionStartPos !== null) {
        updateDropdownPosition(mentionStartPos);
      }

      // Check if this filter needs API call for values
      // Only dropdown, autocompleteDropdown, and list types need API calls
      // All other types (TextField, sliderRange, rangePicker, etc.) get their config from the extra object
      const needsApiCall = 
        filterConfig.display_type === "dropdown" || 
        filterConfig.display_type === "autocompleteDropdown" ||
        filterConfig.display_type === "list" ||
        !filterConfig.display_type; // Default to dropdown if display_type is not specified

      if (needsApiCall) {
        // For dropdown types, fetch values from API
        setIsLoadingValues(true);
        
        // Clear inserting flag after a brief delay
        setTimeout(() => {
          isInsertingMentionRef.current = false;
          isTransitioningStageRef.current = false; // Clear transition flag
        }, 50);

        // Fetch values for Stage 2 (with existing filters for cascading)
        fetchFilterValues(filterConfig, existingFilters, filterOptions).then((valueOptions) => {
          setIsLoadingValues(false);
          const allValues = valueOptions || [];
          windowStartRef.current = 0;
          if (allValues.length > 2000) {
            allFilterValuesRef.current = allValues;
            setCurrentOptions(allValues.slice(0, INITIAL_DISPLAY_COUNT));
          } else {
            allFilterValuesRef.current = [];
            setCurrentOptions(allValues);
          }
          // Update dropdown position again after values are loaded (DOM might have shifted)
          if (mentionStartPos !== null) {
            updateDropdownPosition(mentionStartPos);
          }
        }).catch(error => {
          console.error("Error fetching filter values:", error);
          setIsLoadingValues(false);
        });
      } else {
        // For non-dropdown types (TextField, sliderRange, rangePicker, etc.), no API call needed
        setIsLoadingValues(false);
        setCurrentOptions([]); // No options needed for these types
        
        // Clear inserting flag after a brief delay
        setTimeout(() => {
          isInsertingMentionRef.current = false;
          isTransitioningStageRef.current = false; // Clear transition flag
        }, 50);
      }
    });
  };

  /**
   * Insert Stage 2 mention (@Filter::Value1,Value2,+N)
   */
  const insertStage2Mention = () => {

    if (!selectedOptions.length || !editorRef.current || !selectedFilter) {
      return;
    }

    // Set flag to prevent detection during insertion
    isInsertingMentionRef.current = true;

    const MAX_VISIBLE = 3;

    // Find the Stage 1 mention element BEFORE removing it
    const stage1Mention = editorRef.current.querySelector(
      `.mention-highlight[data-group-id="${currentMentionGroupId}"][data-stage="1"]`
    );
    
    if (!stage1Mention) {
      console.error("Stage 1 mention not found! Looking for group ID:", currentMentionGroupId);
      isInsertingMentionRef.current = false;
      return;
    }

    // Get the parent node BEFORE removing
    const parentNode = stage1Mention.parentNode;
    
    // Create a temporary marker to hold the position
    const marker = document.createTextNode("");
    parentNode.insertBefore(marker, stage1Mention);

    // Remove existing Stage 1 mention
    removeMentionByGroupId(editorRef.current, currentMentionGroupId);

    // Get filter name from Stage 1 or selectedFilter
    const filterName = selectedFilter.label || selectedFilter.name;
    
    // Format values based on display_type
    let values = [];
    if (selectedFilter.display_type === "TextField") {
      // For TextField, extract string value from the option
      values = selectedOptions.map((opt) => {
        if (typeof opt === "string") return opt;
        return opt.label || opt.value || String(opt);
      });
    } else if (selectedFilter.display_type === "sliderRange") {
      // For sliderRange, format as the value or "min-max"
      values = selectedOptions.map((opt) => {
        if (typeof opt === "object" && opt.value !== undefined) {
          return String(opt.value);
        }
        return opt.label || String(opt.value || opt);
      });
    } else if (selectedFilter.display_type === "rangePicker") {
      // For rangePicker, values are already formatted as "StartDate to EndDate"
      values = selectedOptions.map((opt) => {
        if (typeof opt === "string") return opt;
        return opt.label || opt.value || String(opt);
      });
    } else if (selectedFilter.display_type === "BooleanField") {
      // For BooleanField, convert boolean to string
      values = selectedOptions.map((opt) => {
        if (typeof opt === "boolean") return String(opt);
        return opt.label || String(opt.value || opt);
      });
    } else {
      // Default: use the underlying option value so that backend
      // continues to receive the original (possibly encoded) string.
      values = selectedOptions.map((opt) => {
        if (typeof opt === "string") return opt;
        return opt.value ?? opt.label ?? String(opt);
      });
    }

    // Determine if this filter is multi-select
    const isMulti = selectedFilter.isMulti !== false; // Default to true

    const isCheckAll = isAllSelected && allFilterValuesRef.current.length > 0;

    // Format mention text (decoded for display only)
    const mentionText = formatMentionDisplay(filterName, values, MAX_VISIBLE);

    // Create fragment
    const fragment = document.createDocumentFragment();

    // Create mention span
    const visibleValues = values.slice(0, MAX_VISIBLE);
    const hiddenValues = values.slice(MAX_VISIBLE);
    const mentionSpan = createMentionSpan(
      mentionText,
      filterName,
      values,
      currentMentionGroupId,
      false, // Stage 2
      isCheckAll
    );
    fragment.appendChild(mentionSpan);

    // Add count badge if needed
    if (hiddenValues.length > 0) {
      const badgeCount = isCheckAll
        ? allFilterValuesRef.current.length - MAX_VISIBLE
        : hiddenValues.length;
      const countBadge = createCountBadge(badgeCount, hiddenValues, currentMentionGroupId);
      fragment.appendChild(countBadge);
    }

    // Add space to fragment
    const spaceNode = document.createTextNode("\u00A0");
    fragment.appendChild(spaceNode);

    // Insert fragment at marker position
    parentNode.insertBefore(fragment, marker);
    
    // Remove the marker
    parentNode.removeChild(marker);

    // Set cursor after the space (which is now in the DOM)
    const selection = window.getSelection();
    const newRange = document.createRange();
    newRange.setStart(spaceNode, 1); // Position at end of space
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Update input value
    const updatedText = getTextContent(editorRef.current);
    setInputValue(updatedText);

    // Clean up state
    resetMentionState();

    // Focus editor and clear inserting flag after state is cleaned
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
      // Clear the inserting flag
      isInsertingMentionRef.current = false;
    }, 50);
  };

  /**
   * Handle date range selection (confirms and inserts)
   */
  const handleDateRangeChange = (startDate, endDate) => {
    // Update state
    setDateRangeStartDate(startDate);
    setDateRangeEndDate(endDate);

    // Only insert if both dates are selected
    if (!startDate || !endDate || !editorRef.current || dateRangeStartPos === null) {
      return;
    }

    // Set flag to prevent detection during insertion
    isInsertingMentionRef.current = true;
    let tenantDateFormat = localStorage.getItem("tenantDateFormat");
    // Format dates as "StartDate to EndDate"
    const startDateStr = moment(startDate).format(tenantDateFormat || "MM-DD-YYYY");
    const endDateStr = moment(endDate).format(tenantDateFormat || "MM-DD-YYYY");
    const dateRangeText = `${startDateStr} to ${endDateStr}`;

    // Find the position where "@time" is
    const textNodeInfo = findTextNodeAtPosition(editorRef.current, dateRangeStartPos);
    if (!textNodeInfo.node) {
      isInsertingMentionRef.current = false;
      return;
    }

    // Delete "@time" text (5 characters: @ + "time")
    deleteTextRange(textNodeInfo, 5);

    // Create mention span for date range
    const dateRangeSpan = createMentionSpan(
      dateRangeText,
      "time",
      [dateRangeText],
      `date-range-${Date.now()}`,
      false // Not a filter mention
    );
    dateRangeSpan.setAttribute("data-date-range", "true");
    dateRangeSpan.setAttribute("data-start-date", startDateStr);
    dateRangeSpan.setAttribute("data-end-date", endDateStr);

    // Insert at position
    insertElementAtPosition(dateRangeSpan, textNodeInfo, editorRef.current);

    // Add space after
    const spaceNode = document.createTextNode("\u00A0");
    if (dateRangeSpan.nextSibling) {
      dateRangeSpan.parentNode.insertBefore(spaceNode, dateRangeSpan.nextSibling);
    } else {
      dateRangeSpan.parentNode.appendChild(spaceNode);
    }

    // Set cursor after the space
    const selection = window.getSelection();
    const newRange = document.createRange();
    newRange.setStart(spaceNode, 1);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    // Update input value
    const updatedText = getTextContent(editorRef.current);
    setInputValue(updatedText);

    // Close date range picker and reset state
    setShowDateRangePicker(false);
    setDateRangeStartPos(null);
    setDateRangeStartDate(null);
    setDateRangeEndDate(null);
    setDateRangeFocusedInput(null);

    // Clear inserting flag
    setTimeout(() => {
      isInsertingMentionRef.current = false;
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 50);
  };

  /**
   * Handle input changes
   */
  const handleInput = () => {
    if (!editorRef.current) return;

    const text = getTextContent(editorRef.current);
    setInputValue(text);

    // Track whether @ mentions exist in the editor
    const mentionCount = editorRef.current.querySelectorAll(".mention-highlight").length;
    setHasMentionsInEditor(mentionCount > 0);

    detectMention();

    // Adjust height
    const editorHeight = editorRef.current.scrollHeight;
    setIsFixed(editorHeight > 40);
  };

  /**
   * Handle mention selection based on stage
   */
  const handleMentionSelect = (selectedOption) => {
    if (selectionStage === "filter") {
      handleFilterSelection(selectedOption);
    } else {
      handleValueSelection(selectedOption);
    }
  };

  /**
   * Get formatted text for sending
   */
  const getFormattedTextForSending = () => {
    if (!editorRef.current) return "";

    const clone = editorRef.current.cloneNode(true);
    const allMentions = getAllMentions(clone);

    // Process each mention
    allMentions.forEach((mention) => {
      // Check if it's a date range mention
      const isDateRange = mention.element.getAttribute("data-date-range") === "true";
      
      if (isDateRange) {
        // Date range mention - use the text content directly (already formatted as "StartDate-EndDate")
        const dateRangeText = mention.element.textContent;
        const textNode = document.createTextNode(dateRangeText);
        mention.element.parentNode.replaceChild(textNode, mention.element);
      } else if (mention.stage === "2" && mention.values.length > 0) {
        // Get all values including hidden ones
        let allValues = [...mention.values];

        // Check for count badge
        const countBadge = clone.querySelector(
          `.mention-count-badge[data-group-id="${mention.groupId}"]`
        );
        if (countBadge) {
          const hiddenValues = JSON.parse(
            countBadge.getAttribute("data-hidden-values") || "[]"
          );
          allValues = [...allValues, ...hiddenValues];
          countBadge.remove();
        }

        // Format for sending
        const formattedText = formatMentionForSending(mention.filterName, allValues);
        const textNode = document.createTextNode(formattedText);
        mention.element.parentNode.replaceChild(textNode, mention.element);
      } else {
        // Stage 1 or incomplete mention - remove
        mention.element.remove();
      }
    });

    let text = clone.innerText || "";
    return text.replace(/\s+/g, " ").trim();
  };

  /**
   * Get text with mentions replaced by column_name format
   * Replaces mention labels with column_name (e.g., "Brand" -> "l0_name")
   * Returns text like: "l0_name: Coach, KateSpade l2_name: BAGS, COATS, what is..."
   */
  const getTextWithColumnNames = () => {
    if (!editorRef.current) return "";

    const clone = editorRef.current.cloneNode(true);
    const allMentions = getAllMentions(clone);

    // Process each mention and replace with column_name format
    allMentions.forEach((mention) => {
      // Skip date range mentions and incomplete mentions (Stage 1)
      const isDateRange = mention.element?.getAttribute("data-date-range") === "true";
      if (isDateRange || mention.stage !== "2" || mention.values.length === 0) {
        // For incomplete mentions or date ranges, just remove them
        if (mention.element) {
          mention.element.remove();
        }
        return;
      }

      // Find the filter config to get the column_name/attribute_name
      const filterConfig = filterOptions.find(
        (f) => (f.label || f.name) === mention.filterName
      );

      // Get attribute name (column_name, attribute_name, or name)
      const attributeName =
        filterConfig?.column_name ||
        filterConfig?.attribute_name ||
        filterConfig?.name ||
        mention.filterName;

      // Get all values including hidden ones from count badge
      let allValues = [...mention.values];

      // Check for count badge to get hidden values
      const countBadge = clone.querySelector(
        `.mention-count-badge[data-group-id="${mention.groupId}"]`
      );
      if (countBadge) {
        try {
          const hiddenValues = JSON.parse(
            countBadge.getAttribute("data-hidden-values") || "[]"
          );
          allValues = [...allValues, ...hiddenValues];
        } catch (e) {
          console.warn("Error parsing hidden values from count badge:", e);
        }
        // Remove the count badge
        countBadge.remove();
      }

      // Format as "column_name: value1, value2, ..."
      const valuesText = allValues.map((v) => String(v)).join(", ");
      const replacementText = `${attributeName}: ${valuesText}`;

      // Replace the mention element with the formatted text
      const textNode = document.createTextNode(replacementText);
      if (mention.element && mention.element.parentNode) {
        mention.element.parentNode.replaceChild(textNode, mention.element);
      }
    });

    // Remove any remaining mention spans (Stage 1, date ranges, etc.)
    const remainingMentions = clone.querySelectorAll(".mention-highlight");
    remainingMentions.forEach((span) => {
      span.remove();
    });

    // Remove any remaining count badges
    const countBadges = clone.querySelectorAll(".mention-count-badge");
    countBadges.forEach((badge) => {
      badge.remove();
    });

    // Get the final text content
    let text = clone.innerText || clone.textContent || "";
    // Clean up extra whitespace
    text = text.replace(/\s+/g, " ").trim();
    
    return text;
  };

  /**
   * Extract user explicit input from mentions
   * Returns an object with attribute names as keys and arrays of selected values as values
   * Format: { "l0_name": ["Coach", "KateSpade"], "l2_name": ["BAGS", "COATS", ...] }
   */
  const getUserExplicitInput = () => {
    if (!editorRef.current) return {};

    const allMentions = getAllMentions(editorRef.current);
    const userExplicitInput = {};

    // Process each Stage 2 mention (completed filter selections)
    allMentions.forEach((mention) => {
      // Skip date range mentions and incomplete mentions
      const isDateRange = mention.element?.getAttribute("data-date-range") === "true";
      if (isDateRange || mention.stage !== "2" || mention.values.length === 0) {
        return;
      }

      // Find the filter config to get the attribute name
      const filterConfig = filterOptions.find(
        (f) => (f.label || f.name) === mention.filterName
      );

      // Get attribute name (column_name, attribute_name, or name)
      const attributeName =
        filterConfig?.column_name ||
        filterConfig?.attribute_name ||
        filterConfig?.name ||
        mention.filterName;

      // Get all values including hidden ones from count badge
      let allValues = [...mention.values];

      // Check for count badge to get hidden values
      const countBadge = editorRef.current.querySelector(
        `.mention-count-badge[data-group-id="${mention.groupId}"]`
      );
      if (countBadge) {
        try {
          const hiddenValues = JSON.parse(
            countBadge.getAttribute("data-hidden-values") || "[]"
          );
          allValues = [...allValues, ...hiddenValues];
        } catch (e) {
          console.warn("Error parsing hidden values from count badge:", e);
        }
      }

      // Remove duplicates and ensure all values are strings
      const uniqueValues = [...new Set(allValues.map((v) => String(v)))];

      // Add to userExplicitInput object
      if (attributeName && uniqueValues.length > 0) {
        // If attribute already exists, merge values (shouldn't happen, but handle it)
        if (userExplicitInput[attributeName]) {
          userExplicitInput[attributeName] = [
            ...new Set([...userExplicitInput[attributeName], ...uniqueValues])
          ];
        } else {
          userExplicitInput[attributeName] = uniqueValues;
        }
      }
    });

    return userExplicitInput;
  };

  /**
   * Handle send message
   */
  const handleSendMessage = () => {
    // formattedText is used to show the user chat message in the UI.
    // Decode any ia_char placeholders here so the user sees the actual
    // special characters, while the structured payloads (userExplicitInput,
    // textWithColumnNames) still carry the original encoded values.
    const formattedText = replaceSpecialCharacter(getFormattedTextForSending());
    if (!formattedText.trim() && isEmpty(chatbotContext)) return;

    // Extract user explicit input from mentions
    const userExplicitInput = getUserExplicitInput();
    
    // Get text with mentions replaced by column names (only if there are any mentions in the editor)
    let textWithColumnNames = "";
    if (editorRef.current) {
      const hasMentions = editorRef.current.querySelectorAll(".mention-highlight").length > 0;
      if (hasMentions) {
        textWithColumnNames = getTextWithColumnNames();
      }
    }

    // If a saved filter set is selected, merge its filters into userExplicitInput
    // and textWithColumnNames in the same format as @ mentions
    if (selectedFilterSet?.saved_filter_preference) {
      const filterData = extractSavedFilterData(selectedFilterSet, formattedText, userExplicitInput);
      Object.assign(userExplicitInput, filterData.userExplicitInput);
      textWithColumnNames = filterData.textWithColumnNames || textWithColumnNames;
    }

    setInputValue("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      editorRef.current.blur();
    }

    const newUserChat = {
      text: formattedText,
      role: "user",
      timestamp: new Date().toISOString(),
      userExplicitInput: userExplicitInput,
    };
    
    // Add textWithColumnNames only if mentions were used
    if (textWithColumnNames) {
      newUserChat.textWithColumnNames = textWithColumnNames;
    }

    onSendIconClick?.(newUserChat, currentMode);
  };

  // Effect: Clear on empty input
  useEffect(() => {
    if (inputValue === "" && editorRef.current) {
      editorRef.current.innerHTML = "";
      setHeight("auto");
      setIsFixed(false);
      setHasMentionsInEditor(false);
      resetMentionState();
      cleanupTooltips();
      // Clear filter cache when input is cleared (new chat scenario)
      clearFilterValuesCache();
      shouldClearCacheRef.current = false; // Reset flag after clearing
    }
  }, [inputValue]);

  // Effect: Clear filter cache when new chat is started
  useEffect(() => {
    if (newChatScreen) {
      clearFilterValuesCache();
      shouldClearCacheRef.current = true; // Set flag to ensure cache stays clear
    }
  }, [newChatScreen]);

  // Effect: Clear cache on component mount if newChatScreen is true
  useEffect(() => {
    if (newChatScreen) {
      clearFilterValuesCache();
    }
    // Auto-focus editor on mount
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 100);
  }, []);

  // Effect: Re-focus editor when filter set changes (e.g. chip cleared)
  useEffect(() => {
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.focus();
      }
    }, 50);
  }, [selectedFilterSet]);

  // Effect: Cleanup tooltips on unmount
  useEffect(() => {
    return () => {
      cleanupTooltips();
    };
  }, []);

  // Effect: Update dropdown position when mention position changes or stage transitions
  useEffect(() => {
    if (showMentionSelect && mentionStartPos !== null) {
      // Use a small delay to ensure DOM is updated after stage transitions
      const timeoutId = setTimeout(() => {
        updateDropdownPosition(mentionStartPos);
      }, 0);
      return () => clearTimeout(timeoutId);
    }
  }, [showMentionSelect, mentionStartPos, selectionStage]);

  // Effect: Update date picker position when date range position changes
  useEffect(() => {
    if (showDateRangePicker && dateRangeStartPos !== null) {
      updateDropdownPosition(dateRangeStartPos);
    }
  }, [showDateRangePicker, dateRangeStartPos]);

  // Effect: Update position on scroll and resize
  useEffect(() => {
    const handleScroll = () => {
      if (showMentionSelect && mentionStartPos !== null) {
        updateDropdownPosition(mentionStartPos);
      }
      if (showDateRangePicker && dateRangeStartPos !== null) {
        updateDropdownPosition(dateRangeStartPos);
      }
    };

    const handleResize = () => {
      if (showMentionSelect && mentionStartPos !== null) {
        updateDropdownPosition(mentionStartPos);
      }
      if (showDateRangePicker && dateRangeStartPos !== null) {
        updateDropdownPosition(dateRangeStartPos);
      }
    };

    if (editorRef.current) {
      editorRef.current.addEventListener("scroll", handleScroll);
      window.addEventListener("scroll", handleScroll, true);
      window.addEventListener("resize", handleResize);
    }

    return () => {
      if (editorRef.current) {
        editorRef.current.removeEventListener("scroll", handleScroll);
      }
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [showMentionSelect, showDateRangePicker, mentionStartPos, dateRangeStartPos]);

  // Effect: Filter options based on search
  useEffect(() => {
    if (showMentionSelect && selectionStage === "filter") {
      const filtered = formattedFilterOptions.filter((option) =>
        option.label.toLowerCase().includes(mentionSearch.toLowerCase())
      );
      setCurrentOptions(filtered.length > 0 ? filtered : formattedFilterOptions);
    }
  }, [showMentionSelect, mentionSearch, selectionStage, formattedFilterOptions]);

  // Effect: Watch for dropdown close
  useEffect(() => {

    if (prevIsOpenRef.current === true && isSelectOpen === false && showMentionSelect) {
      // Don't handle close if we're transitioning stages
      if (isTransitioningStageRef.current) {
        prevIsOpenRef.current = isSelectOpen;
        return;
      }

      // Don't close if we're loading values
      if (isLoadingValues) {
        setIsSelectOpen(true); // Keep it open
        return;
      }

      
      // Don't auto-close for non-dropdown display types (they have Apply/Cancel buttons)
      // Only dropdown, autocompleteDropdown, and list types should auto-insert on close
      const isNonDropdownType = selectedFilter?.display_type && 
        selectedFilter.display_type !== "dropdown" &&
        selectedFilter.display_type !== "autocompleteDropdown" &&
        selectedFilter.display_type !== "list";
      
      if (isNonDropdownType) {
        // For non-dropdown types, don't auto-insert on close
        // User must click Apply button
        return;
      }
      
      if (selectionStage === "values" && selectedOptions.length > 0) {
        // Insert Stage 2 mention
        insertStage2Mention();
      } else if (selectionStage === "filter") {
        // User closed without selecting - clean up
        resetMentionState();
      } else if (selectionStage === "values" && selectedOptions.length === 0) {
        // User closed without selecting values - remove Stage 1 mention and clean up
        if (currentMentionGroupId && editorRef.current) {
          removeMentionByGroupId(editorRef.current, currentMentionGroupId);
        }
        resetMentionState();
      }
    }

    prevIsOpenRef.current = isSelectOpen;
  }, [isSelectOpen, showMentionSelect, selectionStage, selectedOptions, isLoadingValues, currentMentionGroupId, selectedFilter]);

  // Effect: Click outside handler (only for select dropdown, not date range picker)
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Handle select dropdown only
      if (
        showMentionSelect &&
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        editorRef.current &&
        !editorRef.current.contains(event.target)
      ) {
        setIsSelectOpen(false);
      }
      // Date range picker is handled by its Apply button, not click outside
    };

    if (showMentionSelect) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMentionSelect]);

  // Build filter set menu options with suboptions (for the + button dropdown)
  const filterSetMenuOptions = useMemo(() => {
    const filterSetChildren = [
      { label: "None (Default)", value: "__none__" },
      ...(savedFilterSets || []).map((f) => ({
        label: f.name || f.label,
        value: f.fuc_code || f.name || f.label,
      })),
    ];
    return [
      {
        children: filterSetChildren,
        label: "Filter Set",
        value: "filter_set",
      },
      {
        label: "Trigger Refresh",
        value: "__trigger_refresh__",
      },
    ];
  }, [savedFilterSets]);

  // Build selectedOptions for the filter set Select to highlight the currently selected filter
  const filterSetSelectedOptions = useMemo(() => {
    if (!selectedFilterSet) return {};
    const selectedValue = selectedFilterSet.fuc_code || selectedFilterSet.name || selectedFilterSet.label;
    return {
      label: "Filter Set",
      value: "filter_set",
      children: [{ label: selectedFilterSet.name || selectedFilterSet.label, value: selectedValue }],
    };
  }, [selectedFilterSet]);

  // Handle filter set menu selection
  const handleFilterSetMenuChange = (selectedOption) => {
    if (!selectedOption) return;
    if (selectedOption.value === "__trigger_refresh__") {
      onTriggerRefresh?.();
      setShowFilterSetMenu(false);
      setIsFilterSetMenuOpen(false);
      return;
    }

    // When a suboption is selected, impact-ui-v3 Select passes the parent
    // with the selected child in children array, e.g.:
    // { label: "Filter Set", value: "filter_set", children: [{ label: "mk47", value: "mk47" }] }
    const childOption =
      selectedOption.children && selectedOption.children.length > 0
        ? selectedOption.children[0]
        : selectedOption;

    if (childOption.value === "__none__") {
      onClearFilterSet?.();
      setShowFilterSetMenu(false);
      setIsFilterSetMenuOpen(false);
    } else {
      // A saved filter set was selected — match against savedFilterSets
      const filterSet = (savedFilterSets || []).find(
        (f) => (f.fuc_code || f.name || f.label) === childOption.value
      );
      onFilterSetSelect?.(filterSet || childOption);
      setShowFilterSetMenu(false);
      setIsFilterSetMenuOpen(false);
    }
  };

  // Click outside handler for filter set menu
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showFilterSetMenu &&
        filterSetSelectRef.current &&
        !filterSetSelectRef.current.contains(event.target)
      ) {
        setShowFilterSetMenu(false);
        setIsFilterSetMenuOpen(false);
      }
    };

    if (showFilterSetMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showFilterSetMenu]);

  // Click outside handler for answer mode dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (answerModeRef.current && !answerModeRef.current.contains(event.target)) {
        setShowAnswerModeMenu(false);
      }
    };

    if (showAnswerModeMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showAnswerModeMenu]);

  const ANSWER_MODE_OPTIONS = [
    { value: "fast", label: "Fast", description: "Speed over depth" },
    { value: "auto", label: "Deep Analysis", description: "Adapts depth, detail, and visuals" },
  ];

  const selectedModeOption = ANSWER_MODE_OPTIONS.find((opt) => opt.value === answerMode) || ANSWER_MODE_OPTIONS[0];

  return (
    <div
      className="chat-input-container"
      ref={chatInputContainerRef}
      onClick={(e) => {
        // Focus editor when clicking anywhere in the input container
        // unless clicking on a button or interactive element
        const target = /** @type {HTMLElement} */ (e.target);
        if (
          editorRef.current &&
          target.closest &&
          !target.closest("button") &&
          !target.closest(".chat-actions") &&
          !target.closest(".filter-set-trigger-wrapper") &&
          !target.closest(".filter-set-chip-clear") &&
          !target.closest(".mention-select-wrapper") &&
          !target.closest(".answer-mode-wrapper")
        ) {
          editorRef.current.focus();
        }
      }}
    >
      <div
        className={`chat-input-wrapper ${isFixed ? "stacked" : ""} ${selectedFilterSet ? "has-filter-selected" : ""} ${
          (!isFixed || inputValue === "") && !newChatScreen && !selectedFilterSet ? "empty" : ""
        } ${!newChatScreen && !isFixed && !selectedFilterSet ? "single-line-textarea" : ""}`}
        style={{ height }}
      >
        {/* Left: + button and filter chip */}
        <div className="chat-input-left-actions">
          <div className="filter-set-trigger-wrapper" ref={filterSetSelectRef}>
            <Tooltip title={hasMentionsInEditor || showMentionSelect ? "Cannot use filter set while @ mentions are active" : "Add filter set"}>
              <button
                type="button"
                className={`filter-set-plus-btn${hasMentionsInEditor || showMentionSelect ? " disabled" : ""}`}
                onClick={() => {
                  if (hasMentionsInEditor || showMentionSelect) return;
                  setShowFilterSetMenu(!showFilterSetMenu);
                  setIsFilterSetMenuOpen(!showFilterSetMenu);
                }}
              >
                <AddFilterIcon />
              </button>
            </Tooltip>
            {showFilterSetMenu && (
              <div className="filter-set-select-dropdown">
                <Select
                  currentOptions={filterSetMenuOptions}
                  setCurrentOptions={() => {}}
                  initialOptions={filterSetMenuOptions}
                  placeholder="Select..."
                  handleChange={handleFilterSetMenuChange}
                  isOpen={isFilterSetMenuOpen}
                  setIsOpen={setIsFilterSetMenuOpen}
                  selectedOptions={filterSetSelectedOptions}
                  setSelectedOptions={() => {}}
                  isCloseWhenClickOutside={false}
                  isWithSearch={false}
                  isMulti={false}
                  disabled={false}
                  isLoading={false}
                  emptyMessage="No options"
                />
              </div>
            )}
          </div>
          {selectedFilterSet && (
            <div className="filter-set-chip">
              <FilterFolderIcon className="filter-set-chip-icon" />
              <span className="filter-set-chip-label">
                {selectedFilterSet.name || selectedFilterSet.label}
              </span>
              <button
                type="button"
                className="filter-set-chip-clear"
                onClick={() => onClearFilterSet?.()}
              >
                <ClearFilterIcon />
              </button>
            </div>
          )}
        </div>

        {/* Editor */}
        <div
          ref={editorRef}
          className="chat-input-editor"
          contentEditable={true}
          tabIndex={0}
          role="textbox"
          aria-label="Ask anything..."
          aria-multiline="true"
          data-placeholder="Ask anything..."
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              // Don't handle Escape for date range picker - it has its own Cancel button
              if (showMentionSelect) {
                e.preventDefault();
                if (selectionStage === "values" && selectedOptions.length > 0) {
                  insertStage2Mention();
                } else {
                  resetMentionState();
                }
                return;
              }
            }

            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = getTextContent(editorRef.current);
              // Don't send message if date range picker is open
              if (text.trim().length > 0 && !showMentionSelect && !showDateRangePicker) {
                handleSendMessage();
              }
            }
          }}
          onClick={detectMention}
          onKeyUp={detectMention}
          suppressContentEditableWarning={true}
        />

        {/* Right: action buttons */}
        <div className={`chat-actions ${isFixed ? "fixed" : ""}`}>
            {handleRefresh && (
            <Button
              icon={<RefreshIcon />}
              iconPlacement="left"
              size="large"
              type="default"
              variant="url"
              onClick={handleRefresh}
            />
          )}
          {handleMicClick && (
            <Button
              icon={<MicIcon />}
              iconPlacement="left"
              size="large"
              type="default"
              variant="tertiary"
              onClick={handleMicClick}
            />
          )}
          {onSaveClick && (
            <Tooltip title="Save Chat">
              <Button
                icon={<SaveOutlinedIcon />}
                iconPlacement="left"
                size="large"
                type="default"
                variant="tertiary"
                onClick={onSaveClick}
                id="chat-input-save-button"
              />
            </Tooltip>
          )}
          <div className="answer-mode-wrapper" ref={answerModeRef}>
            <button
              type="button"
              className="answer-mode-trigger"
              onClick={() => setShowAnswerModeMenu(!showAnswerModeMenu)}
            >
              <span className="answer-mode-trigger-label">{selectedModeOption.label}</span>
              <svg
                className={`answer-mode-trigger-chevron ${showAnswerModeMenu ? "open" : ""}`}
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
              >
                <path d="M3 7.5L6 4.5L9 7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showAnswerModeMenu && (
              <div className="answer-mode-dropdown">
                {ANSWER_MODE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`answer-mode-option ${answerMode === option.value ? "selected" : ""}`}
                    onClick={() => {
                      setAnswerMode(option.value);
                      setShowAnswerModeMenu(false);
                    }}
                  >
                    <div className="answer-mode-option-check">
                      {answerMode === option.value && (
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                          <path d="M2.5 7L5.5 10L11.5 4" stroke="#5C6BC0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <div className="answer-mode-option-content">
                      <span className="answer-mode-option-label">{option.label}</span>
                      <span className="answer-mode-option-desc">{option.description}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <Button
            icon={!isStopIcon ? <SendIcon /> : <ChatbotStopIcon />}
            iconPlacement="left"
            size="large"
            type="default"
            variant="primary"
            onClick={() => {
              !isStopIcon ? handleSendMessage() : onStopIconClick()
            }}
            id="chat-input-send-button"
            className={isStopIcon ? "stop-icon-button" : ""}
          />
        </div>

        {/* Mention Select Dropdown */}
        {showMentionSelect && (
          <div 
            className="mention-select-wrapper" 
            ref={selectRef}
            style={{
              position: "fixed",
              bottom: `${chatInputContainerRef.current?.clientHeight+34}px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 10000,
            }}
          >
            {selectionStage === "filter" ? (
              // Stage 1: Filter selection - always use Select
              <Select
                currentOptions={currentOptions.length > 0 ? currentOptions : []}
                setCurrentOptions={setCurrentOptions}
                initialOptions={currentOptions.length > 0 ? currentOptions : []}
                placeholder="Select a filter..."
                handleChange={handleMentionSelect}
                isOpen={isSelectOpen}
                setIsOpen={setIsSelectOpen}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
                isCloseWhenClickOutside={false}
                isWithSearch={true}
                isMulti={false}
                disabled={false}
                isLoading={false}
                emptyMessage="No filters available"
              />
            ) : selectionStage === "values" && selectedFilter?.display_type && 
                selectedFilter.display_type !== "dropdown" && 
                selectedFilter.display_type !== "autocompleteDropdown" &&
                selectedFilter.display_type !== "list" ? (
              // Stage 2: Value selection with custom display_type - use FilterValueInput
              <div style={{ 
                background: "white", 
                padding: "16px", 
                borderRadius: "8px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                minWidth: "300px",
                maxWidth: "400px"
              }}>
                <FilterValueInput
                  filterConfig={selectedFilter}
                  value={
                    selectedOptions.length > 0 
                      ? (selectedFilter.display_type === "TextField" 
                          ? (typeof selectedOptions[0] === "string" 
                              ? selectedOptions[0] 
                              : selectedOptions[0]?.label || selectedOptions[0]?.value || "")
                          : selectedFilter.display_type === "sliderRange"
                          ? (selectedOptions[0]?.value !== undefined 
                              ? { value: Number(selectedOptions[0].value), range_min: selectedFilter.range_min || selectedFilter.extra?.min || 0, range_max: selectedFilter.range_max || selectedFilter.extra?.max || 100 }
                              : (typeof selectedOptions[0] === "object" && selectedOptions[0].value !== undefined
                                  ? selectedOptions[0]
                                  : { value: Number(selectedOptions[0]?.value || selectedOptions[0]?.label || 0), range_min: selectedFilter.range_min || selectedFilter.extra?.min || 0, range_max: selectedFilter.range_max || selectedFilter.extra?.max || 100 }))
                          : selectedOptions[0])
                      : (selectedFilter.display_type === "sliderRange" 
                          ? { value: selectedFilter.range_min || selectedFilter.extra?.min || 0, range_min: selectedFilter.range_min || selectedFilter.extra?.min || 0, range_max: selectedFilter.range_max || selectedFilter.extra?.max || 100 }
                          : "")
                  }
                  onChange={(newValue) => {
                    // Handle value change based on display_type
                    if (selectedFilter.display_type === "TextField") {
                      // For TextField, newValue is a string
                      setSelectedOptions([{ label: String(newValue), value: String(newValue) }]);
                    } else if (selectedFilter.display_type === "sliderRange") {
                      // For sliderRange, newValue is an object with value property
                      const sliderValue = typeof newValue === "object" && newValue.value !== undefined 
                        ? Number(newValue.value) 
                        : (typeof newValue === "number" ? newValue : Number(newValue));
                      // Store as object to preserve range info
                      setSelectedOptions([{ 
                        label: String(sliderValue), 
                        value: sliderValue,
                        range_min: newValue.range_min || selectedFilter.range_min || selectedFilter.extra?.min || 0,
                        range_max: newValue.range_max || selectedFilter.range_max || selectedFilter.extra?.max || 100
                      }]);
                    } else if (selectedFilter.display_type === "rangePicker") {
                      // For rangePicker, newValue is an array [startDate, endDate]
                      if (Array.isArray(newValue) && newValue[0] && newValue[1]) {
                        const startDate = moment(newValue[0]).format("MM-DD-YYYY");
                        const endDate = moment(newValue[1]).format("MM-DD-YYYY");
                        const dateRangeText = `${startDate} to ${endDate}`;
                        setSelectedOptions([{ label: dateRangeText, value: dateRangeText }]);
                      }
                    } else if (selectedFilter.display_type === "BooleanField") {
                      // For BooleanField, newValue is a boolean
                      setSelectedOptions([{ label: String(newValue), value: newValue }]);
                    } else {
                      // Default: handle as object or array
                      setSelectedOptions(Array.isArray(newValue) ? newValue : [newValue]);
                    }
                  }}
                  options={currentOptions}
                  isLoading={isLoadingValues}
                  isMulti={selectedFilter?.is_multiple_selection || selectedFilter?.isMulti}
                  selectedOptions={selectedOptions}
                  setSelectedOptions={setSelectedOptions}
                />
                <div style={{ marginTop: "12px", display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <button
                    onClick={() => {
                      if (selectedOptions.length > 0) {
                        insertStage2Mention();
                      } else {
                        resetMentionState();
                      }
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#7C5CB1",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => {
                      resetMentionState();
                    }}
                    style={{
                      padding: "8px 16px",
                      background: "#f5f5f5",
                      color: "#333",
                      border: "none",
                      borderRadius: "4px",
                      cursor: "pointer"
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              // Stage 2: Value selection with dropdown - use Select
              <Select
                currentOptions={currentOptions.length > 0 ? currentOptions : []}
                setCurrentOptions={setCurrentOptions}
                initialOptions={currentOptions.length > 0 ? currentOptions : []}
                placeholder={
                  isLoadingValues
                    ? "Loading values..."
                    : "Select values..."
                }
                handleChange={handleMentionSelect}
                isOpen={isSelectOpen}
                setIsOpen={setIsSelectOpen}
                selectedOptions={selectedOptions}
                setSelectedOptions={setSelectedOptions}
                isCloseWhenClickOutside={false}
                isWithSearch={true}
                onMenuScrollToBottom={() => {
                  const allValues = allFilterValuesRef.current;
                  if (allValues.length > 0 && currentOptions.length < allValues.length) {
                    const nextCount = Math.min(currentOptions.length + LOAD_MORE_COUNT, allValues.length);
                    const nextOptions = allValues.slice(0, nextCount);
                    setCurrentOptions(nextOptions);
                    if (isAllSelected) {
                      setSelectedOptions(nextOptions);
                    }
                  }
                }}
                onSelectAll={(e) => {
                  if (e && e.target.checked) {
                    setSelectedOptions([...currentOptions]);
                    setIsAllSelected(true);
                  } else {
                    setSelectedOptions([]);
                    setIsAllSelected(false);
                  }
                }}
                customPlaceholderAfterSelect={
                  isAllSelected && allFilterValuesRef.current.length > 0
                    ? allFilterValuesRef.current.length
                    : null
                }
                isSelectAll={!isLoadingValues ? isAllSelected : false}
                setIsSelectAll={setIsAllSelected}
                toggleSelectAll={!isLoadingValues}
                isMulti={selectedFilter?.is_multiple_selection !== false}
                disabled={isLoadingValues}
                isLoading={isLoadingValues}
                emptyMessage={isLoadingValues ? "Loading values..." : "No options available"}
              />
            )}
          </div>
        )}

        {/* Date Range Picker */}
        {showDateRangePicker && (
          <div 
            className="mention-select-wrapper" 
            ref={dateRangePickerRef}
            style={{
              position: "fixed",
              top: `680px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 10000,
            }}
          >
            <DateRangePicker
              // disableType="disableOnlyPast"
              startDate={dateRangeStartDate}
              endDate={dateRangeEndDate}
              focusedInput={dateRangeFocusedInput}
              onDatesChange={handleDateRangeChange}
              onFocusChange={setDateRangeFocusedInput}
            />
          </div>
        )}

      </div>
    </div>
  );
};

export default ChatbotInput;

