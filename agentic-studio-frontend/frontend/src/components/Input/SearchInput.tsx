import React, { useState } from 'react';
import searchIcon from "../../assets/images/search.svg";

export interface SearchInputProps {
  /** Placeholder text for the input */
  placeholder?: string;
  /** Current search value (controlled mode) */
  value?: string;
  /** Default value (uncontrolled mode) */
  defaultValue?: string;
  /** Callback fired when the search value changes */
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback fired when search is submitted (Enter key or form submit) */
  onSearch?: (value: string) => void;
  /** Disable the search input */
  disabled?: boolean;
  /** Name attribute for form control */
  name?: string;
  /** ID for the search input */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Width of the search input */
  width?: string | number;
}

const SearchInput: React.FC<SearchInputProps> = ({
  placeholder = "Search...",
  value,
  defaultValue = "",
  onChange,
  onSearch,
  disabled = false,
  name,
  id,
  className = "",
  'aria-label': ariaLabel,
  autoFocus = false,
  width = "172px"
}) => {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue);
  
  // Determine if component is controlled or uncontrolled
  const isControlled = value !== undefined;
  const searchValue = isControlled ? value : internalValue;

  // Handle input change
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalValue(newValue);
    }
    
    // Call onChange callback if provided
    if (onChange) {
      onChange(newValue, event);
    }
  };

  // Handle form submission or Enter key
  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && onSearch) {
      event.preventDefault();
      onSearch(searchValue);
    }
  };

  // Generate unique ID if not provided
  const inputId = id || `search-input-${Math.random().toString(36).substr(2, 9)}`;

  // Handle width prop - convert number to px
  const inputWidth = typeof width === 'number' ? `${width}px` : width;

  return (
    <div 
      className={`search-input ${className} ${disabled ? 'disabled' : ''}`}
      style={{ width: inputWidth }}
    >
      <div className="search-input-wrapper">
        <img 
          src={searchIcon} 
          alt="Search" 
          className="search-icon"
        />
        <input 
          type="text"
          id={inputId}
          name={name}
          value={searchValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className="body-medium search-input-field"
          aria-label={ariaLabel || `Search ${placeholder.toLowerCase()}`}
        />
      </div>
    </div>
  );
};

export default SearchInput;
