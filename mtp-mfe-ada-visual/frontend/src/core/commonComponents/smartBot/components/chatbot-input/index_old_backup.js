import MicIcon from "coreAssets/chatbot/ChatBotMicIcon.svg";
import RefreshIcon from "coreAssets/chatbot/ChatBotRefreshIcon.svg";
import SendIcon from "coreAssets/chatbot/ChatBotSendIcon.svg";
import ChatbotStopIcon from "coreAssets/chatbot/ChatbotStopIcon.svg";
import { Button, Select, Tooltip } from "impact-ui-v3";
import { useEffect, useRef, useState } from "react";
import chatbotFilterConfig from "../../temp.js";
import "./chatbot.scss";

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
    filterOptions
  } = props;
  const editorRef = useRef(null);
  const selectRef = useRef(null);
  const [isFixed, setIsFixed] = useState(false);
  const [height, setHeight] = useState("auto");
  const MAX_HEIGHT = 142;

  // Format filterOptions to ensure label-value structure with unique labels
  const formattedFilterOptions = (() => {
    if (!filterOptions) return [];
    
    const labelCount = {};
    
    return filterOptions.map((option) => {
      let label;
      let value;
      
      if (option.value && option.label) {
        label = option.label;
        value = option.value;
      } else {
        // If only label exists or structure is different, format it
        label = option.label || option.name || option.text || String(option);
        value = label;
      }
      
      // Track label occurrences
      if (labelCount[label]) {
        labelCount[label]++;
        // Append serial number to make it unique
        const uniqueLabel = `${label} (${labelCount[label]})`;
        return {
          label: uniqueLabel,
          value: `${value}-${labelCount[label]}`,
        };
      } else {
        labelCount[label] = 1;
        return {
          label: label,
          value: value,
        };
      }
    });
  })();
  
  // Mention functionality state
  const [showMentionSelect, setShowMentionSelect] = useState(false);
  const [mentionStartPos, setMentionStartPos] = useState(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [currentOptions, setCurrentOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isSelectOpen, setIsSelectOpen] = useState(false);
  const [isAllSelected, setIsAllSelected] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [insertedMentions, setInsertedMentions] = useState([]);
  const [pendingSelections, setPendingSelections] = useState([]);
  const [currentMentionGroupId, setCurrentMentionGroupId] = useState(null);

  // Get plain text from contenteditable div
  const getTextContent = () => {
    if (!editorRef.current) return "";
    return editorRef.current.innerText || "";
  };

  // Get currently inserted mentions from DOM (excluding count badge)
  const getCurrentMentions = () => {
    if (!editorRef.current) return [];
    const mentionSpans = editorRef.current.querySelectorAll('.mention-highlight:not(.mention-count-badge)');
    return Array.from(mentionSpans).map(span => ({
      value: span.getAttribute('data-mention'),
      label: span.textContent.replace('@', ''),
      element: span,
      groupId: span.getAttribute('data-group-id')
    }));
  };

  // Get mentions from a specific group
  const getMentionsFromGroup = (groupId) => {
    if (!editorRef.current || !groupId) return [];
    const allMentions = getCurrentMentions();
    return allMentions.filter(m => m.groupId === groupId);
  };

  // Check if we're at the exact position where a mention group starts
  const getMentionGroupAtPosition = (position) => {
    if (!editorRef.current) return null;
    
    const allMentions = getCurrentMentions();
    const groupIds = new Set();
    
    // Find all mentions at or near this position
    for (const mention of allMentions) {
      const mentionElement = mention.element;
      if (!mentionElement) continue;
      
      // Get the position of this mention in the text
      let elementPos = 0;
      let found = false;
      
      const findElementPosition = (node, targetElement) => {
        if (node === targetElement) {
          found = true;
          return true;
        }
        if (node.nodeType === Node.TEXT_NODE) {
          if (!found) {
            elementPos += node.textContent.length;
          }
        } else {
          for (let child of node.childNodes) {
            if (findElementPosition(child, targetElement)) return true;
          }
        }
        return false;
      };
      
      findElementPosition(editorRef.current, mentionElement);
      
      // Check if this mention is at the exact position
      if (elementPos === position) {
        groupIds.add(mention.groupId);
      }
    }
    
    // Return the first group ID found at this position, or null
    return groupIds.size > 0 ? Array.from(groupIds)[0] : null;
  };

  // Get cursor position in contenteditable
  const getCursorPosition = () => {
    const selection = window.getSelection();
    if (!selection.rangeCount) return 0;
    
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(editorRef.current);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    
    return preCaretRange.toString().length;
  };

  // Set cursor position
  const setCursorPos = (pos) => {
    const selection = window.getSelection();
    const range = document.createRange();
    
    let charCount = 0;
    let nodeStack = [editorRef.current];
    let node, foundNode, foundOffset;

    while (!foundNode && nodeStack.length > 0) {
      node = nodeStack.pop();
      
      if (node.nodeType === Node.TEXT_NODE) {
        const nextCharCount = charCount + node.length;
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

  // Detect @ mention and filter options
  const detectMention = () => {
    const text = getTextContent();
    const cursorPos = getCursorPosition();
    
    const textBeforeCursor = text.slice(0, cursorPos);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      const hasSpaceAfterAt = textAfterAt.includes(" ") || textAfterAt.includes("\n");

      if (!hasSpaceAfterAt) {
        // Check if this is a new "@" position or continuing to type at the same one
        const isNewPosition = mentionStartPos === null || mentionStartPos !== lastAtIndex;
        
        if (isNewPosition) {
          // New @ position - create new group and reset selections
          const newGroupId = `mention-group-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          setCurrentMentionGroupId(newGroupId);
          setMentionStartPos(lastAtIndex);
          setSelectedOptions([]);
          setPendingSelections([]);
        }
        // else: same position, keep existing group and selections
        
        setMentionSearch(textAfterAt);
        setShowMentionSelect(true);
        setIsSelectOpen(true);
        return;
      }
    }

    // No valid @ mention found - close dropdown but don't clear everything yet
    // (user might still be typing)
    if (showMentionSelect && !isSelectOpen) {
      // Only clear if dropdown is already closed
      setShowMentionSelect(false);
    }
  };

  // Handle mention selection (just store, don't insert yet)
  const handleMentionSelect = (selectedOption) => {
    if (selectedOption) {
      // Handle both single select (object) and multi-select (array)
      const newSelections = Array.isArray(selectedOption) ? selectedOption : [selectedOption];
      
      // Filter out any invalid options and remove duplicates by value
      const validNewSelections = newSelections.filter(opt => opt && opt.label);
      
      // Remove duplicates based on value
      const uniqueSelections = validNewSelections.filter((opt, index, self) =>
        index === self.findIndex(t => t.value === opt.value)
      );
      
      // Store pending selections
      setPendingSelections(uniqueSelections);
      setSelectedOptions(uniqueSelections);
    }
  };

  // Actually insert mentions into the editor
  const insertPendingMentions = () => {
    if (mentionStartPos === null || !editorRef.current) return;
    
    // If no selections, just close
    if (pendingSelections.length === 0) {
      // Remove the @ text
      const selection = window.getSelection();
      let currentPos = 0;
      let targetNode = null;
      let targetOffset = 0;
      
      const findPosition = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
          const nodeLength = node.textContent.length;
          if (currentPos + nodeLength >= mentionStartPos) {
            targetNode = node;
            targetOffset = mentionStartPos - currentPos;
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
      
      findPosition(editorRef.current);
      
      if (targetNode && targetNode.textContent) {
        const deleteRange = document.createRange();
        deleteRange.setStart(targetNode, targetOffset);
        deleteRange.setEnd(targetNode, Math.min(targetOffset + mentionSearch.length + 1, targetNode.textContent.length));
        deleteRange.deleteContents();
      }
      
      // Clean up
      setShowMentionSelect(false);
      setIsSelectOpen(false);
      setMentionStartPos(null);
      setMentionSearch("");
      setPendingSelections([]);
      setSelectedOptions([]);
      setCurrentMentionGroupId(null);
      return;
    }
    
    const MAX_VISIBLE_MENTIONS = 3;
    
    // Check if this group already has mentions inserted (for re-editing scenario)
    const existingGroupMentions = currentMentionGroupId ? getMentionsFromGroup(currentMentionGroupId) : [];
    
    // Remove existing mentions from the same group (only if they exist)
    if (existingGroupMentions.length > 0) {
      existingGroupMentions.forEach(mention => {
        if (mention.element && mention.element.parentNode) {
          const nextSibling = mention.element.nextSibling;
          mention.element.remove();
          // Remove space after it
          if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE && nextSibling.textContent === '\u00A0') {
            nextSibling.remove();
          }
        }
      });
      
      // Remove existing +N badge from this group
      const badges = editorRef.current.querySelectorAll('.mention-count-badge');
      badges.forEach(badge => {
        if (badge.getAttribute('data-group-id') === currentMentionGroupId) {
          const nextSibling = badge.nextSibling;
          badge.remove();
          if (nextSibling && nextSibling.nodeType === Node.TEXT_NODE && nextSibling.textContent === '\u00A0') {
            nextSibling.remove();
          }
        }
      });
    }
    
    // Determine visible vs hidden mentions
    const visibleMentions = pendingSelections.slice(0, MAX_VISIBLE_MENTIONS);
    const hiddenMentions = pendingSelections.slice(MAX_VISIBLE_MENTIONS);
    
    // Insert the mentions at the current position
    const selection = window.getSelection();
    
    // Find the text node and position where @ starts
    let currentPos = 0;
    let targetNode = null;
    let targetOffset = 0;
    
    const findPosition = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const nodeLength = node.textContent.length;
        if (currentPos + nodeLength >= mentionStartPos) {
          targetNode = node;
          targetOffset = mentionStartPos - currentPos;
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
    
    findPosition(editorRef.current);
    
    if (targetNode && targetNode.textContent) {
      // Delete the @ and search text
      const deleteRange = document.createRange();
      deleteRange.setStart(targetNode, targetOffset);
      deleteRange.setEnd(targetNode, Math.min(targetOffset + mentionSearch.length + 1, targetNode.textContent.length));
      deleteRange.deleteContents();
      
      // Create a document fragment to hold new mentions
      const fragment = document.createDocumentFragment();
      let lastElement = null;
      
      // Insert visible mentions with group ID
      visibleMentions.forEach((option, index) => {
        const mentionSpan = document.createElement('span');
        mentionSpan.className = 'mention-highlight';
        mentionSpan.contentEditable = 'false';
        mentionSpan.setAttribute('data-mention', option.value);
        mentionSpan.setAttribute('data-group-id', currentMentionGroupId);
        mentionSpan.textContent = `@${option.label}`;
        
        fragment.appendChild(mentionSpan);
        
        const spaceNode = document.createTextNode('\u00A0');
        fragment.appendChild(spaceNode);
        lastElement = spaceNode;
      });
      
      // Add +N badge if there are hidden mentions
      if (hiddenMentions.length > 0) {
        const countBadge = document.createElement('span');
        countBadge.className = 'mention-highlight mention-count-badge';
        countBadge.contentEditable = 'false';
        countBadge.setAttribute('data-hidden-count', String(hiddenMentions.length));
        countBadge.setAttribute('data-hidden-mentions', JSON.stringify(hiddenMentions.map(m => m.label)));
        countBadge.setAttribute('data-group-id', currentMentionGroupId);
        countBadge.textContent = `+${hiddenMentions.length}`;
        
        // Add hover tooltip functionality
        countBadge.addEventListener('mouseenter', (e) => {
          const tooltip = document.createElement('div');
          tooltip.className = 'mention-tooltip';
          tooltip.innerHTML = hiddenMentions.map(m => `@${m.label}`).join('<br/>');
          document.body.appendChild(tooltip);
          
          const tooltipHeight = tooltip.offsetHeight;
          const rect = countBadge.getBoundingClientRect();
          
          tooltip.style.left = `${rect.left}px`;
          tooltip.style.top = `${rect.top - tooltipHeight - 8}px`;
          
          countBadge.setAttribute('data-tooltip-id', Date.now().toString());
        });
        
        countBadge.addEventListener('mouseleave', (e) => {
          const tooltips = document.querySelectorAll('.mention-tooltip');
          tooltips.forEach(t => t.remove());
        });
        
        fragment.appendChild(countBadge);
        
        const spaceNode = document.createTextNode('\u00A0');
        fragment.appendChild(spaceNode);
        lastElement = spaceNode;
      }
      
      // Insert new mentions
      deleteRange.insertNode(fragment);
      
      // Set cursor after the last inserted element
      if (lastElement && lastElement.parentNode) {
        const newRange = document.createRange();
        newRange.setStartAfter(lastElement);
        newRange.collapse(true);
        selection.removeAllRanges();
        selection.addRange(newRange);
        
        editorRef.current?.focus();
      }
    }
    
    // Clean up
    setShowMentionSelect(false);
    setIsSelectOpen(false);
    setMentionStartPos(null);
    setMentionSearch("");
    setPendingSelections([]);
    setSelectedOptions([]);
    setCurrentMentionGroupId(null);
    
    // Update parent input value
    setTimeout(() => {
      setInputValue(getTextContent());
    }, 0);
  };

  useEffect(() => {
    if (inputValue === "" && editorRef.current) {
      editorRef.current.innerHTML = "";
      setHeight("auto");
      setIsFixed(false);
      setShowMentionSelect(false);
      setIsSelectOpen(false);
      setPendingSelections([]);
      setSelectedOptions([]);
      setCurrentMentionGroupId(null);
      
      // Clean up any tooltips
      const tooltips = document.querySelectorAll('.mention-tooltip');
      tooltips.forEach(t => t.remove());
    }
  }, [inputValue]);

  // Cleanup tooltips on unmount
  useEffect(() => {
    return () => {
      const tooltips = document.querySelectorAll('.mention-tooltip');
      tooltips.forEach(t => t.remove());
    };
  }, []);

  // Sync currentOptions with the computed filtered options
  useEffect(() => {
    if (showMentionSelect) {
      const filtered = formattedFilterOptions.filter((option) =>
        option.label.toLowerCase().includes(mentionSearch.toLowerCase())
      );
      setCurrentOptions(filtered);
    }
  }, [showMentionSelect, mentionSearch]);

  // Watch for dropdown close and insert mentions
  const prevIsOpenRef = useRef(isSelectOpen);
  
  useEffect(() => {
    // Check if dropdown just closed (was open, now closed)
    if (prevIsOpenRef.current === true && isSelectOpen === false && showMentionSelect) {
      // Dropdown was closed, insert pending mentions
      if (pendingSelections.length > 0 && mentionStartPos !== null) {
        insertPendingMentions();
      } else {
        // Just close if no selections
        setShowMentionSelect(false);
        setMentionStartPos(null);
        setMentionSearch("");
      }
    }
    
    // Update ref for next comparison
    prevIsOpenRef.current = isSelectOpen;
  }, [isSelectOpen, showMentionSelect, pendingSelections, mentionStartPos, mentionSearch]);

  // Handle click outside to close mention select
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        showMentionSelect &&
        selectRef.current &&
        !selectRef.current.contains(event.target) &&
        editorRef.current &&
        !editorRef.current.contains(event.target)
      ) {
        // Close the select dropdown
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

  // Get formatted text for sending (replace mentions with comma-separated values)
  const getFormattedTextForSending = () => {
    if (!editorRef.current) return "";
    
    // Clone the editor to manipulate
    const clone = editorRef.current.cloneNode(true);
    
    // Get all unique group IDs
    const allMentions = Array.from(clone.querySelectorAll('.mention-highlight:not(.mention-count-badge)'));
    const groupIds = [...new Set(allMentions.map(span => span.getAttribute('data-group-id')))];
    
    // Process each group
    groupIds.forEach(groupId => {
      const groupMentions = clone.querySelectorAll(`.mention-highlight:not(.mention-count-badge)[data-group-id="${groupId}"]`);
      const groupLabels = Array.from(groupMentions).map(span => span.textContent.replace('@', ''));
      
      // Get hidden mentions from count badge for this group
      const countBadge = clone.querySelector(`.mention-count-badge[data-group-id="${groupId}"]`);
      if (countBadge) {
        const hiddenMentionsJson = countBadge.getAttribute('data-hidden-mentions');
        if (hiddenMentionsJson) {
          try {
            const hiddenLabels = JSON.parse(hiddenMentionsJson);
            groupLabels.push(...hiddenLabels);
          } catch (e) {
            console.error('Error parsing hidden mentions:', e);
          }
        }
        // Remove the count badge
        countBadge.remove();
      }
      
      // Replace all mentions in this group with comma-separated text
      groupMentions.forEach((span, index) => {
        if (index === 0 && groupLabels.length > 0) {
          // Replace first mention with all comma-separated labels from this group
          const textNode = document.createTextNode(groupLabels.join(', '));
          span.parentNode.replaceChild(textNode, span);
        } else {
          // Remove other mention spans from this group
          span.remove();
        }
      });
    });
    
    // Get final text and clean up extra spaces
    let text = clone.innerText || "";
    return text.replace(/\s+/g, ' ').trim();
  };

  const handleSendMessage = () => {
    const formattedText = getFormattedTextForSending();
    if (!formattedText.trim()) return;
    
    setInputValue("");
    if (editorRef.current) {
      editorRef.current.innerHTML = "";
      editorRef.current.blur();
    }
    
    let newUserChat = {
      text: formattedText,
      role: "user",
      timestamp: new Date().toISOString(),
    };
    onSendIconClick?.(newUserChat, currentMode);
  };

  const handleStopIconClick = () => {
    onStopIconClick?.(currentMode);
  };

  // Calculate filtered options synchronously based on mention search
  const getMentionFilteredOptions = () => {
    if (!showMentionSelect) return [];
    
    return formattedFilterOptions.filter((option) =>
      option.label.toLowerCase().includes(mentionSearch.toLowerCase())
    );
  };

  const mentionOptionsToShow = getMentionFilteredOptions();

  // Handle input changes in contenteditable
  const handleInput = () => {
    const text = getTextContent();
    setInputValue(text);
    detectMention();
    
    // Adjust height based on content
    if (editorRef.current) {
      const editorHeight = editorRef.current.scrollHeight;
      if (editorHeight > 40) {
        setIsFixed(true);
      } else {
        setIsFixed(false);
      }
    }
  };

  return (
    <div className="chat-input-container">
      <div
        className={`chat-input-wrapper ${isFixed ? "stacked" : ""} ${
          (!isFixed || inputValue === "") && !newChatScreen ? "empty" : ""
        } ${!newChatScreen && !isFixed ? "single-line-textarea" : ""}`}
        style={{ height: height }}
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
            // Close mention select on Escape and insert pending mentions
            if (e.key === "Escape" && showMentionSelect) {
              e.preventDefault();
              insertPendingMentions();
              return;
            }
            
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              const text = getTextContent();
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
        {showMentionSelect && mentionOptionsToShow.length > 0 && (
          <div className="mention-select-wrapper" ref={selectRef}>
            <Select
              currentOptions={currentOptions}
              setCurrentOptions={setCurrentOptions}
              initialOptions={mentionOptionsToShow}
              placeholder="Select a filter..."
              handleChange={(selectedOption) => handleMentionSelect(selectedOption)}
              isOpen={isSelectOpen}
              setIsOpen={setIsSelectOpen}
              selectedOptions={selectedOptions}
              setSelectedOptions={setSelectedOptions}
              isCloseWhenClickOutside={false}
              isWithSearch={true}
              isSelectAll={isAllSelected}
              setIsSelectAll={setIsAllSelected}
              toggleSelectAll={true}
              isMulti={true}
            />
          </div>
        )}

        {/* Buttons */}
        <div className={`chat-actions ${isFixed ? "fixed" : ""} `}>
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
              className=""
              icon={<MicIcon />}
              iconPlacement="left"
              size="large"
              type="default"
              variant="tertiary"
              onClick={handleMicClick}
            />
          )}
          <Button
            icon={
              !isStopIcon ? (
                <SendIcon />
              ) : (
                <ChatbotStopIcon />
              )
            }
            iconPlacement="left"
            size="large"
            type="default"
            variant="primary"
            onClick={!isStopIcon ? handleSendMessage : handleStopIconClick}
            id="chat-input-send-button"
            className={isStopIcon ? "stop-icon-button" : ""}
          />
        </div>
      </div>
    </div>
  );
};

export default ChatbotInput;
