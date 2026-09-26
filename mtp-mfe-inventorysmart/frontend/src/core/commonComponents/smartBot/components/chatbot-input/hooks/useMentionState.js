import { useState, useRef } from "react";
import { generateMentionGroupId } from "../utils/mentionHelpers.js";

/**
 * Custom hook to manage mention state
 * @returns {Object} Mention state and setters
 */
export const useMentionState = () => {
  // Dropdown visibility
  const [showMentionSelect, setShowMentionSelect] = useState(false);
  const [isSelectOpen, setIsSelectOpen] = useState(false);

  // Current mention being edited
  const [mentionStartPos, setMentionStartPos] = useState(null);
  const [mentionSearch, setMentionSearch] = useState("");
  const [currentMentionGroupId, setCurrentMentionGroupId] = useState(null);

  // Selection stage: "filter" or "values"
  const [selectionStage, setSelectionStage] = useState("filter");
  const [selectedFilter, setSelectedFilter] = useState(null);

  // Options for dropdown
  const [currentOptions, setCurrentOptions] = useState([]);
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [isAllSelected, setIsAllSelected] = useState(false);

  // Loading state for API calls
  const [isLoadingValues, setIsLoadingValues] = useState(false);

  // Ref for tracking previous open state
  const prevIsOpenRef = useRef(isSelectOpen);

  /**
   * Reset all mention state
   */
  const resetMentionState = () => {
    setShowMentionSelect(false);
    setIsSelectOpen(false);
    setMentionStartPos(null);
    setMentionSearch("");
    setCurrentMentionGroupId(null);
    setSelectionStage("filter");
    setSelectedFilter(null);
    setCurrentOptions([]);
    setSelectedOptions([]);
    setIsAllSelected(false);
    setIsLoadingValues(false);
  };

  /**
   * Initialize new mention (Stage 1: Filter selection)
   * @param {number} position - Position where @ was typed
   * @param {Array} filterOptions - Available filters
   */
  const initializeFilterSelection = (position, filterOptions) => {
    const newGroupId = generateMentionGroupId();
    setCurrentMentionGroupId(newGroupId);
    setMentionStartPos(position);
    setSelectionStage("filter");
    setSelectedFilter(null);
    setCurrentOptions(filterOptions || []);
    setSelectedOptions([]);
    setMentionSearch("");
    setShowMentionSelect(true);
    setIsSelectOpen(true);
  };

  /**
   * Transition to value selection (Stage 2: Value selection)
   * @param {Object} filter - Selected filter configuration
   * @param {Array} valueOptions - Available values for this filter
   */
  const transitionToValueSelection = (filter, valueOptions) => {
    setSelectionStage("values");
    setSelectedFilter(filter);
    setCurrentOptions(valueOptions || []);
    setSelectedOptions([]);
    setMentionSearch("");
    setShowMentionSelect(true);
    setIsSelectOpen(true);
  };

  return {
    // State
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

    // Setters
    setShowMentionSelect,
    setIsSelectOpen,
    setMentionStartPos,
    setMentionSearch,
    setCurrentMentionGroupId,
    setSelectionStage,
    setSelectedFilter,
    setCurrentOptions,
    setSelectedOptions,
    setIsAllSelected,
    setIsLoadingValues,

    // Actions
    resetMentionState,
    initializeFilterSelection,
    transitionToValueSelection,
  };
};

