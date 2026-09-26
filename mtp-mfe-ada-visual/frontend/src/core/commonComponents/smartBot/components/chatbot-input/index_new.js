import MicIcon from "coreAssets/chatbot/ChatBotMicIcon.svg";
import RefreshIcon from "coreAssets/chatbot/ChatBotRefreshIcon.svg";
import SendIcon from "coreAssets/chatbot/ChatBotSendIcon.svg";
import ChatbotStopIcon from "coreAssets/chatbot/ChatbotStopIcon.svg";
import { Button, Select } from "impact-ui-v3";
import { useEffect, useRef, useState } from "react";
import "./chatbot.scss";

// Import utilities
import { fetchFilterValues } from "./utils/apiHelpers";
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
} from "./utils/domHelpers";
import {
  formatMentionDisplay,
  formatMentionForSending,
  isMentionAwaitingValues,
  deduplicateOptions,
} from "./utils/mentionHelpers";
import { useMentionState } from "./hooks/useMentionState";

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
  } = props;

  const editorRef = useRef(null);
  const selectRef = useRef(null);
  const [isFixed, setIsFixed] = useState(false);
  const [height, setHeight] = useState("auto");

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
    resetMentionState,
    initializeFilterSelection,
    transitionToValueSelection,
  } = mentionState;

  // Format filterOptions to ensure label-value structure
  const formattedFilterOptions = (() => {
    if (!filterOptions) return [];

    const labelCount = {};

    return filterOptions.map((option) => {
      let label = option.label || option.name || String(option);
      let value = option.value || label;

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
  })();

  /**
   * Detect @ mention and show dropdown
   */
  const detectMention = () => {
    if (!editorRef.current) return;

    const text = getTextContent(editorRef.current);
    const cursorPos = getCursorPosition(editorRef.current);
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(" ") || textAfterAt.includes("\n");

      if (!hasSpaceAfterAt) {
        // Check if this is @ new position or continuing
        const isNewPosition = mentionStartPos === null || mentionStartPos !== lastAtIndex;

        if (isNewPosition) {
          // Stage 1: Show filter selection dropdown
          initializeFilterSelection(lastAtIndex, formattedFilterOptions);
        }

        setMentionSearch(textAfterAt);
        return;
      }
    }

    // No valid @ mention found
    if (showMentionSelect && !isSelectOpen) {
      setShowMentionSelect(false);
    }
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
    insertStage1Mention(stage1Text, selectedOption.label);

    // Fetch values for Stage 2
    setIsLoadingValues(true);
    const valueOptions = await fetchFilterValues(filterConfig);
    setIsLoadingValues(false);

    // Transition to Stage 2: Value selection
    transitionToValueSelection(filterConfig, valueOptions);
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
   * Insert Stage 1 mention (@Filter::)
   */
  const insertStage1Mention = (text, filterName) => {
    if (mentionStartPos === null || !editorRef.current) return;

    const textNodeInfo = findTextNodeAtPosition(editorRef.current, mentionStartPos);
    if (!textNodeInfo.node) return;

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

    // Insert at position
    insertElementAtPosition(mentionSpan, textNodeInfo, editorRef.current);

    // Update input value
    setTimeout(() => {
      setInputValue(getTextContent(editorRef.current));
    }, 0);
  };

  /**
   * Insert Stage 2 mention (@Filter::Value1,Value2,+N)
   */
  const insertStage2Mention = () => {
    if (!selectedOptions.length || !editorRef.current || !selectedFilter) return;

    const MAX_VISIBLE = 3;

    // Remove existing Stage 1 mention
    removeMentionByGroupId(editorRef.current, currentMentionGroupId);

    // Get filter name from Stage 1 or selectedFilter
    const filterName = selectedFilter.label || selectedFilter.name;
    const values = selectedOptions.map((opt) => opt.label);

    // Determine if this filter is multi-select
    const isMulti = selectedFilter.isMulti !== false; // Default to true

    // Format mention text
    const mentionText = formatMentionDisplay(filterName, values, MAX_VISIBLE);
    
    // Find position to insert (where Stage 1 mention was)
    const textNodeInfo = findTextNodeAtPosition(editorRef.current, mentionStartPos);
    if (!textNodeInfo.node) return;

    // Create fragment
    const fragment = document.createDocumentFragment();

    // Create mention span
    const visibleValues = values.slice(0, MAX_VISIBLE);
    const hiddenValues = values.slice(MAX_VISIBLE);
    
    const mentionSpan = createMentionSpan(
      `@${filterName}::${visibleValues.join(",")}`,
      filterName,
      values,
      currentMentionGroupId,
      false // Stage 2
    );
    fragment.appendChild(mentionSpan);

    // Add count badge if needed
    if (hiddenValues.length > 0) {
      const countBadge = createCountBadge(hiddenValues.length, hiddenValues, currentMentionGroupId);
      fragment.appendChild(countBadge);
    }

    // Insert fragment
    const range = document.createRange();
    range.setStart(textNodeInfo.node, textNodeInfo.offset);
    range.insertNode(fragment);

    // Add space and set cursor
    const spaceNode = document.createTextNode("\u00A0");
    fragment.appendChild(spaceNode);

    const selection = window.getSelection();
    const newRange = document.createRange();
    newRange.setStartAfter(spaceNode);
    newRange.collapse(true);
    selection.removeAllRanges();
    selection.addRange(newRange);

    editorRef.current.focus();

    // Clean up
    resetMentionState();

    // Update input value
    setTimeout(() => {
      setInputValue(getTextContent(editorRef.current));
    }, 0);
  };

  /**
   * Handle input changes
   */
  const handleInput = () => {
    if (!editorRef.current) return;

    const text = getTextContent(editorRef.current);
    setInputValue(text);
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
      if (mention.stage === "2" && mention.values.length > 0) {
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
   * Handle send message
   */
  const handleSendMessage = () => {
    const formattedText = getFormattedTextForSending();
    if (!formattedText.trim()) return;

    setInputValue("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      editorRef.current.blur();
    }

    const newUserChat = {
      text: formattedText,
      role: "user",
      timestamp: new Date().toISOString(),
    };
    onSendIconClick?.(newUserChat, currentMode);
  };

  // Effect: Clear on empty input
  useEffect(() => {
    if (inputValue === "" && editorRef.current) {
      editorRef.current.innerHTML = "";
      setHeight("auto");
      setIsFixed(false);
      resetMentionState();
      cleanupTooltips();
    }
  }, [inputValue]);

  // Effect: Cleanup tooltips on unmount
  useEffect(() => {
    return () => {
      cleanupTooltips();
    };
  }, []);

  // Effect: Filter options based on search
  useEffect(() => {
    if (showMentionSelect && selectionStage === "filter") {
      const filtered = formattedFilterOptions.filter((option) =>
        option.label.toLowerCase().includes(mentionSearch.toLowerCase())
      );
      setCurrentOptions(filtered);
    }
  }, [showMentionSelect, mentionSearch, selectionStage]);

  // Effect: Watch for dropdown close
  useEffect(() => {
    if (prevIsOpenRef.current === true && isSelectOpen === false && showMentionSelect) {
      if (selectionStage === "values" && selectedOptions.length > 0) {
        // Insert Stage 2 mention
        insertStage2Mention();
      } else if (selectionStage === "filter") {
        // User closed without selecting - clean up
        resetMentionState();
      }
    }

    prevIsOpenRef.current = isSelectOpen;
  }, [isSelectOpen, showMentionSelect, selectionStage, selectedOptions]);

  // Effect: Click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showMentionSelect &&
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        editorRef.current &&
        !editorRef.current.contains(event.target)
      ) {
        setIsSelectOpen(false);
      }
    };

    if (showMentionSelect) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMentionSelect]);

  return (
    <div className="chat-input-container">
      <div
        className={`chat-input-wrapper ${isFixed ? "stacked" : ""} ${
          (!isFixed || inputValue === "") && !newChatScreen ? "empty" : ""
        } ${!newChatScreen && !isFixed ? "single-line-textarea" : ""}`}
        style={{ height }}
      >
        <div
          ref={editorRef}
          className="chat-input-editor"
          contentEditable={true}
          role="textbox"
          aria-label="Ask anything..."
          aria-multiline="true"
          data-placeholder="Ask anything..."
          onInput={handleInput}
          onKeyDown={(e) => {
            if (e.key === "Escape" && showMentionSelect) {
              e.preventDefault();
              if (selectionStage === "values" && selectedOptions.length > 0) {
                insertStage2Mention();
              } else {
                resetMentionState();
              }
              return;
            }

            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = getTextContent(editorRef.current);
              if (text.trim().length > 0 && !showMentionSelect) {
                handleSendMessage();
              }
            }
          }}
          onClick={detectMention}
          onKeyUp={detectMention}
          suppressContentEditableWarning={true}
        />

        {/* Mention Select Dropdown */}
        {showMentionSelect && currentOptions.length > 0 && (
          <div className="mention-select-wrapper" ref={selectRef}>
            <Select
              currentOptions={currentOptions}
              setCurrentOptions={setCurrentOptions}
              initialOptions={currentOptions}
              placeholder={
                selectionStage === "filter"
                  ? "Select a filter..."
                  : isLoadingValues
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
              isSelectAll={selectionStage === "values" ? isAllSelected : false}
              setIsSelectAll={setIsAllSelected}
              toggleSelectAll={selectionStage === "values"}
              isMulti={selectionStage === "values"}
              disabled={isLoadingValues}
            />
          </div>
        )}

        {/* Buttons */}
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
          <Button
            icon={!isStopIcon ? <SendIcon /> : <ChatbotStopIcon />}
            iconPlacement="left"
            size="large"
            type="default"
            variant="primary"
            onClick={!isStopIcon ? handleSendMessage : onStopIconClick}
            id="chat-input-send-button"
            className={isStopIcon ? "stop-icon-button" : ""}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatbotInput;

