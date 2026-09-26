import { useState, useEffect, useCallback } from "react";
import { Select } from "impact-ui-v3";
import {
  areArraysDifferent,
  getRangeBetweenSelected,
} from "./product-filter-utils";
import { debounce } from "lodash";

const ProductFilter = ({
  attributeData, // Filter config for the current attribute
  fetchOrUpdateOptions, // Function to fetch options for this filter
  setSelectedOptions, // Function to set selected values in parent state
  isDisabled,
}) => {
  const [isOpen, setIsOpen] = useState(false); // Dropdown open/close state
  const [isLoading, setIsLoading] = useState(false); // Loading state during API call
  const [tempSelectedOptions, setTempSelectedOptions] = useState([]); // Local selection
  const [searchString, setSearchString] = useState(""); // Search input

  // Sync internal selection with external updates
  useEffect(() => {
    setTempSelectedOptions(attributeData.selectedOptions);
  }, [attributeData.options]);

  // Fetch options only once when dropdown opens
  const onDropdownOpen = async () => {
    setIsOpen(true);
    if (attributeData.options.length > 0) return;
    try {
      setIsLoading(true);
      await fetchOrUpdateOptions({ attributeData, setYearWeek: false });
    } catch (error) {
      console.log("error", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle select all toggle
  const onSelectAll = (e) => {
    if (e.target.checked) {
      setTempSelectedOptions(attributeData.options);
    } else {
      setTempSelectedOptions([]);
    }
  };

  // Clear all selections
  const onClearAll = () => {
    setTempSelectedOptions([]);
    if (!isOpen) {
      setSelectedOptions([], attributeData);
    }
  };

  // Update parent only if selection changed on dropdown close
  const onDropdownClose = useCallback(() => {
    if (
      areArraysDifferent(tempSelectedOptions, attributeData.selectedOptions)
    ) {
      const range = getRangeBetweenSelected(
        attributeData.options,
        tempSelectedOptions
      );
      setSelectedOptions(range, attributeData);
    }
    setSearchString(""); // Reset search input
    setIsOpen(false);
  }, [tempSelectedOptions, attributeData]);

  // Update internal selection
  const handleSelectedOptions = (options) => {
    setTempSelectedOptions(options);
  };

  // Debounce search input
  const debouncedSetSearchString = useCallback(
    debounce((value) => {
      setSearchString(value);
    }, 300),
    []
  );

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      debouncedSetSearchString.cancel();
    };
  }, []);

  // Handle search input change
  const handleSearch = (e) => {
    debouncedSetSearchString(e.target.value);
  };

  // Filter options based on search
  const filteredOptions = attributeData.options.filter((option) => {
    const labelString = String(option?.label ?? "").toLowerCase();
    return labelString.includes(searchString.toLowerCase());
  });

  // Check if all options are selected
  const isSelectedAll =
    attributeData.options.length === tempSelectedOptions.length;

  return (
    <Select
      currentOptions={filteredOptions}
      isDisabled={isDisabled}
      isMulti={true}
      isWithSearch={true}
      isLoading={isLoading}
      handleChange={() => {}}
      initialOptions={[]}
      isCloseWhenClickOutside
      toggleSelectAll
      label={attributeData.label}
      labelOrientation="top"
      name={attributeData.attribute_name}
      isClearable
      onClearAll={onClearAll}
      isOpen={isOpen}
      onDropdownClose={onDropdownClose}
      onDropdownOpen={onDropdownOpen}
      onMenuScrollToBottom={() => {}}
      onSearch={handleSearch}
      placeholder="select.."
      selectedOptions={tempSelectedOptions || []}
      setCurrentOptions={() => {}}
      setIsOpen={() => {}}
      onSelectAll={onSelectAll}
      isSelectAll={isSelectedAll}
      setIsSelectAll={() => {}}
      setSelectedOptions={handleSelectedOptions}
    />
  );
};

export default ProductFilter;
