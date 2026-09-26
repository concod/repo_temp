import React, { useState, useCallback } from 'react';
import { Select } from 'impact-ui-v3';
import { STORE_DETAIL_PANEL_OPTIONS } from '../utils';

const SortSelect = ({ onSortChange, value }) => {
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [currentOptions, setCurrentOptions] = useState(STORE_DETAIL_PANEL_OPTIONS);

  // Find the option that matches the value prop - no local state, fully controlled
  const sortOption = STORE_DETAIL_PANEL_OPTIONS.find(opt => opt.value === value) || STORE_DETAIL_PANEL_OPTIONS[0] || null;

  const handleSetCurrentOptions = useCallback((opts) => {
    setCurrentOptions(opts);
  }, []);

  const handleSetSelectedOptions = useCallback((opts) => {
    // Don't update local state - let parent control via value prop
    if (onSortChange) {
      onSortChange(opts);
    }
  }, [onSortChange]);

  const handleChange = useCallback((selected, event, index) => {
    // Don't update local state - let parent control via value prop
    if (onSortChange) {
      onSortChange(selected);
    }
  }, [onSortChange]);

  return (
    <Select
      isOpen={isSortOpen}
      setIsOpen={setIsSortOpen}
      isWithSearch={false}
      label="Source"
      labelOrientation="left"
      isClearable={false}
      isMulti={false}
      placeholder="Select"
      initialOptions={STORE_DETAIL_PANEL_OPTIONS}
      currentOptions={currentOptions}
      setCurrentOptions={handleSetCurrentOptions}
      selectedOptions={sortOption}
      setSelectedOptions={handleSetSelectedOptions}
      handleChange={handleChange}
      width="164px"
      minWidth="164px"
    />
  );
};

export default SortSelect;