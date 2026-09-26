import React, { useState, forwardRef, useEffect, useRef } from 'react';
import './Dropdown.scss';

export interface DropdownOption {
  value: string | number;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface DropdownProps {
  /** Dropdown label text */
  label?: string;
  /** Placeholder text when no option is selected */
  placeholder?: string;
  /** Current selected value (controlled mode) */
  value?: string | number;
  /** Default selected value (uncontrolled mode) */
  defaultValue?: string | number;
  /** Array of options to display */
  options?: DropdownOption[];
  /** Callback fired when selection changes */
  onChange?: (value: string | number, option: DropdownOption) => void;
  /** Callback fired when dropdown opens */
  onOpen?: () => void;
  /** Callback fired when dropdown closes */
  onClose?: () => void;
  /** Disable the dropdown */
  disabled?: boolean;
  /** Show error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Name attribute for form control */
  name?: string;
  /** ID for the dropdown */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Custom width */
  width?: string | number;
  /** Custom height */
  height?: string | number;
  /** Accessibility label */
  'aria-label'?: string;
  /** Required field */
  required?: boolean;
  /** Enable multi-select mode */
  multiSelect?: boolean;
  /** Selected values in multi-select mode (controlled) */
  selectedValues?: (string | number)[];
  /** Default selected values (uncontrolled) */
  defaultSelectedValues?: (string | number)[];
  /** Callback for multi-select changes */
  onMultiChange?: (values: (string | number)[], options: DropdownOption[]) => void;
  /** Maximum visible tags before showing overflow */
  maxVisibleTags?: number;
}

const Dropdown = forwardRef<HTMLDivElement, DropdownProps>(({
  label,
  placeholder = "Select",
  value,
  defaultValue,
  options = [],
  onChange,
  onOpen,
  onClose,
  disabled = false,
  error = false,
  errorMessage,
  id,
  className = "",
  width,
  height,
  'aria-label': ariaLabel,
  required = false,
  multiSelect = false,
  selectedValues,
  defaultSelectedValues,
  onMultiChange,
  maxVisibleTags = 3
}, ref) => {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [internalSelectedValues, setInternalSelectedValues] = useState<(string | number)[]>(defaultSelectedValues || []);
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showExpandedTags, setShowExpandedTags] = useState(false);
  
  // Ref for click outside detection
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // Click outside detection
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        if (isOpen) {
          setIsOpen(false);
          setSearchTerm('');
          if (onClose) {
            onClose();
          }
        }
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);
  
  // Determine if component is controlled or uncontrolled
  const isControlled = multiSelect ? selectedValues !== undefined : value !== undefined;
  const selectedValue = isControlled ? value : internalValue;
  const currentSelectedValues = multiSelect 
    ? (isControlled ? selectedValues || [] : internalSelectedValues)
    : [];

  // Find selected option(s)
  const selectedOption = multiSelect ? null : options.find(option => option.value === selectedValue);
  const selectedOptions = multiSelect 
    ? options.filter(option => currentSelectedValues.includes(option.value))
    : [];

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle dropdown toggle
  const handleToggle = () => {
    if (disabled) return;
    
    const newIsOpen = !isOpen;
    setIsOpen(newIsOpen);
    
    if (newIsOpen && onOpen) {
      onOpen();
    } else if (!newIsOpen && onClose) {
      setSearchTerm(''); // Clear search when closing
      onClose();
    }
  };

  // Handle search input change
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // Handle option selection
  const handleOptionSelect = (option: DropdownOption) => {
    if (option.disabled) return;
    
    if (multiSelect) {
      // Multi-select logic
      const newSelectedValues = currentSelectedValues.includes(option.value)
        ? currentSelectedValues.filter(val => val !== option.value) // Remove if already selected
        : [...currentSelectedValues, option.value]; // Add if not selected
      
      // Update internal state if uncontrolled
      if (!isControlled) {
        setInternalSelectedValues(newSelectedValues);
      }
      
      // Call multi-select callback
      if (onMultiChange) {
        const newSelectedOptions = options.filter(opt => newSelectedValues.includes(opt.value));
        onMultiChange(newSelectedValues, newSelectedOptions);
      }
      
      // Don't close dropdown in multi-select mode
    } else {
      // Single-select logic (existing)
      if (!isControlled) {
        setInternalValue(option.value);
      }
      
      // Close dropdown and clear search
      setIsOpen(false);
      setSearchTerm('');
      
      // Call callbacks
      if (onChange) {
        onChange(option.value, option);
      }
      if (onClose) {
        onClose();
      }
    }
  };

  // Handle tag removal in multi-select mode
  const handleTagRemove = (valueToRemove: string | number) => {
    if (!multiSelect) return;
    
    const newSelectedValues = currentSelectedValues.filter(val => val !== valueToRemove);
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalSelectedValues(newSelectedValues);
    }
    
    // Call multi-select callback
    if (onMultiChange) {
      const newSelectedOptions = options.filter(opt => newSelectedValues.includes(opt.value));
      onMultiChange(newSelectedValues, newSelectedOptions);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;
    
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        handleToggle();
        break;
      case 'Escape':
        if (isOpen) {
          setIsOpen(false);
          setSearchTerm('');
          if (onClose) onClose();
        }
        break;
    }
  };

  // Close dropdown function for manual closing
  const closeDropdown = () => {
    setIsOpen(false);
    setSearchTerm('');
    if (onClose) onClose();
  };

  // Generate unique ID if not provided
  const dropdownId = id || `dropdown-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${dropdownId}-label`;
  const errorId = `${dropdownId}-error`;

  // Handle custom dimensions
  const customStyles: React.CSSProperties = {};
  if (width) {
    customStyles.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height) {
    customStyles.height = typeof height === 'number' ? `${height}px` : height;
  }

  // Get display text
  const displayText = multiSelect 
    ? (currentSelectedValues.length > 0 ? `Selected (${currentSelectedValues.length})` : placeholder)
    : (selectedOption ? selectedOption.label : placeholder);

  return (
    <div 
      ref={dropdownRef}
      className={`dropdown-wrapper ${className} ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`}
      style={customStyles}
    >
      {/* Label */}
      {label && (
        <label 
          id={labelId}
          className={`dropdown-label body-small--medium`}
        >
          {label}
          {required && <span className="dropdown-required">*</span>}
        </label>
      )}
      
      {/* Dropdown Field */}
      <div 
        ref={ref}
        className={`dropdown-field ${disabled ? 'disabled' : ''} ${error ? 'error' : ''}`}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={label ? labelId : undefined}
        aria-label={ariaLabel || label}
        aria-describedby={error && errorMessage ? errorId : undefined}
        aria-invalid={error}
        aria-required={required}
      >
        <div className={`dropdown-content ${(!selectedOption && !multiSelect) || (multiSelect && currentSelectedValues.length === 0) ? 'placeholder' : ''}`}>
          {!multiSelect && selectedOption && selectedOption.icon && (
            <img src={selectedOption.icon} alt="" className="dropdown-option-icon" />
          )}
          <span className="dropdown-text">
            {displayText}
          </span>
        </div>
        
        {/* Dropdown Icons */}
        <div className="dropdown-icons">
          {/* Clear/Close Icon (X) */}
          {((multiSelect && currentSelectedValues.length > 0) || (!multiSelect && selectedOption)) && !disabled && (
            <button
              type="button"
              className="dropdown-clear"
              onClick={(e) => {
                e.stopPropagation();
                if (multiSelect) {
                  // Clear all selections in multi-select
                  if (!isControlled) {
                    setInternalSelectedValues([]);
                  }
                  if (onMultiChange) {
                    onMultiChange([], []);
                  }
                } else {
                  handleOptionSelect({ value: '', label: '' });
                }
              }}
              aria-label="Clear selection"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>
          )}
          
          {/* Dropdown Arrow */}
          <div className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Selected Tags for Multi-Select */}
      {multiSelect && currentSelectedValues.length > 0 && (
        <div className="dropdown-selected-tags">
          {(() => {
            const visibleTags = showExpandedTags ? selectedOptions : selectedOptions.slice(0, maxVisibleTags);
            const hasOverflow = selectedOptions.length > maxVisibleTags && !showExpandedTags;
            
            return (
              <>
                {visibleTags.map((option) => (
                  <div key={option.value} className="dropdown-tag">
                    <span className="dropdown-tag-text">{option.label}</span>
                    <button
                      type="button"
                      className="dropdown-tag-remove"
                      onClick={() => handleTagRemove(option.value)}
                      aria-label={`Remove ${option.label}`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <g clipPath="url(#clip0_1963_5144)">
                          <path d="M11.0846 3.739L10.2621 2.9165L7.0013 6.17734L3.74047 2.9165L2.91797 3.739L6.1788 6.99984L2.91797 10.2607L3.74047 11.0832L7.0013 7.82234L10.2621 11.0832L11.0846 10.2607L7.8238 6.99984L11.0846 3.739Z" fill="#4B5767"/>
                        </g>
                        <defs>
                          <clipPath id="clip0_1963_5144">
                            <rect width="14" height="14" fill="white"/>
                          </clipPath>
                        </defs>
                      </svg>
                    </button>
                  </div>
                ))}
                {hasOverflow && (
                  <div className="dropdown-overflow">
                    <button
                      type="button"
                      className="dropdown-overflow-btn"
                      onClick={() => setShowExpandedTags(true)}
                    >
                      ...
                    </button>
                  </div>
                )}
                {showExpandedTags && selectedOptions.length > maxVisibleTags && (
                  <div className="dropdown-collapse">
                    <button
                      type="button"
                      className="dropdown-collapse-btn"
                      onClick={() => setShowExpandedTags(false)}
                    >
                      Show less
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Dropdown Options */}
      {isOpen && (
        <div className="dropdown-options">
          {/* Search Input */}
          <div className="dropdown-search">
            <div className="dropdown-search-icon">
              <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 15 15" fill="none">
                <g clipPath="url(#clip0_1955_9703)">
                  <path d="M9.6875 8.75H9.19375L9.01875 8.58125C9.63125 7.86875 10 6.94375 10 5.9375C10 3.69375 8.18125 1.875 5.9375 1.875C3.69375 1.875 1.875 3.69375 1.875 5.9375C1.875 8.18125 3.69375 10 5.9375 10C6.94375 10 7.86875 9.63125 8.58125 9.01875L8.75 9.19375V9.6875L11.875 12.8062L12.8062 11.875L9.6875 8.75ZM5.9375 8.75C4.38125 8.75 3.125 7.49375 3.125 5.9375C3.125 4.38125 4.38125 3.125 5.9375 3.125C7.49375 3.125 8.75 4.38125 8.75 5.9375C8.75 7.49375 7.49375 8.75 5.9375 8.75Z" fill="#B4BAC7"/>
                </g>
                <defs>
                  <clipPath id="clip0_1955_9703">
                    <rect width="15" height="15" fill="white"/>
                  </clipPath>
                </defs>
              </svg>
            </div>
            <input
              type="text"
              className="dropdown-search-input"
              placeholder="Search here..."
              value={searchTerm}
              onChange={handleSearchChange}
              onClick={(e) => e.stopPropagation()}
            />
            {multiSelect && (
              <button
                type="button"
                className="dropdown-close-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  closeDropdown();
                }}
                aria-label="Close dropdown"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M9 3L3 9M3 3L9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            )}
          </div>

          {/* Select All / Clear for Multi-Select */}
          {multiSelect && (
            <div className="dropdown-select-all">
              <div className="dropdown-select-all-content">
                <div className="dropdown-checkbox-wrapper">
                  <input
                    type="checkbox"
                    id="select-all"
                    className="dropdown-checkbox"
                    checked={currentSelectedValues.length === filteredOptions.length && filteredOptions.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        // Select all filtered options
                        const allValues = filteredOptions.map(option => option.value);
                        if (!isControlled) {
                          setInternalSelectedValues(allValues);
                        }
                        if (onMultiChange) {
                          onMultiChange(allValues, filteredOptions);
                        }
                      } else {
                        // Clear all selections
                        if (!isControlled) {
                          setInternalSelectedValues([]);
                        }
                        if (onMultiChange) {
                          onMultiChange([], []);
                        }
                      }
                    }}
                  />
                  <label htmlFor="select-all" className="dropdown-checkbox-label">
                    Select all
                  </label>
                </div>
                <button
                  type="button"
                  className="dropdown-clear-all"
                  onClick={() => {
                    if (!isControlled) {
                      setInternalSelectedValues([]);
                    }
                    if (onMultiChange) {
                      onMultiChange([], []);
                    }
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
          
          {/* Options List */}
          {filteredOptions.map((option) => {
            const isSelected = multiSelect 
              ? currentSelectedValues.includes(option.value)
              : option.value === selectedValue;
            
            return (
              <div
                key={option.value}
                className={`dropdown-option ${option.disabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                onClick={() => handleOptionSelect(option)}
                role="option"
                aria-selected={isSelected}
              >
                <div className="dropdown-option-content">
                  {multiSelect ? (
                    <div className="dropdown-checkbox-wrapper">
                      <input
                        type="checkbox"
                        id={`option-${option.value}`}
                        className="dropdown-checkbox"
                        checked={isSelected}
                        onChange={() => {}} // Handled by parent onClick
                        onClick={(e) => e.stopPropagation()}
                      />
                      <label htmlFor={`option-${option.value}`} className="dropdown-checkbox-label">
                        {option.label}
                      </label>
                    </div>
                  ) : (
                    <>
                      {option.icon && (
                        <img src={option.icon} alt="" className="dropdown-option-icon" />
                      )}
                      <span className="dropdown-option-label">
                        {option.label}
                      </span>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          
          {/* No results message */}
          {filteredOptions.length === 0 && searchTerm && (
            <div className="dropdown-no-results">
              No results found
            </div>
          )}
        </div>
      )}

      {/* Error Message */}
      {error && errorMessage && (
        <div 
          id={errorId}
          className="dropdown-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
});

Dropdown.displayName = 'Dropdown';

export default Dropdown;

