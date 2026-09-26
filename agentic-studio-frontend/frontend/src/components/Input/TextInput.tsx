import React, { useState, forwardRef } from 'react';

export interface TextInputProps {
  /** Input label text */
  label?: string;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Current input value (controlled mode) */
  value?: string;
  /** Default value (uncontrolled mode) */
  defaultValue?: string;
  /** Callback fired when the input value changes */
  onChange?: (value: string, event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Callback fired when input loses focus */
  onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Callback fired when input gains focus */
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  /** Callback fired when a key is pressed */
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  /** Disable the input */
  disabled?: boolean;
  /** Show error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Name attribute for form control */
  name?: string;
  /** ID for the input */
  id?: string;
  /** Input type */
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
  /** Additional CSS classes */
  className?: string;
  /** Custom width */
  width?: string | number;
  /** Custom height */
  height?: string | number;
  /** Accessibility label */
  'aria-label'?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Required field */
  required?: boolean;
  /** Maximum length */
  maxLength?: number;
  /** Minimum length */
  minLength?: number;
}

const TextInput = forwardRef<HTMLInputElement, TextInputProps>(({
  label,
  placeholder = "Enter text",
  value,
  defaultValue = "",
  onChange,
  onBlur,
  onFocus,
  onKeyDown,
  disabled = false,
  error = false,
  errorMessage,
  name,
  id,
  type = 'text',
  className = "",
  width,
  height,
  'aria-label': ariaLabel,
  autoFocus = false,
  required = false,
  maxLength,
  minLength
}, ref) => {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  
  // Determine if component is controlled or uncontrolled
  const isControlled = value !== undefined;
  const inputValue = isControlled ? value : internalValue;

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

  // Handle focus
  const handleFocus = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(event);
    }
  };

  // Handle blur
  const handleBlur = (event: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(event);
    }
  };

  // Generate unique ID if not provided
  const inputId = id || `text-input-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${inputId}-label`;
  const errorId = `${inputId}-error`;

  // Determine input state for styling
  const getInputState = () => {
    if (disabled) return 'disabled';
    if (error) return 'error';
    if (isFocused) return 'selected';
    return 'default';
  };

  // Handle custom dimensions
  const customStyles: React.CSSProperties = {};
  if (width) {
    customStyles.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height) {
    customStyles.height = typeof height === 'number' ? `${height}px` : height;
  }

  return (
    <div 
      className={`text-input-wrapper ${className} ${getInputState()}`}
      style={customStyles}
    >
      {/* Label */}
      {label && (
        <label 
          htmlFor={inputId}
          id={labelId}
          className={`text-input-label body-small--medium`}
        >
          {label}
          {required && <span className="text-input-required">*</span>}
        </label>
      )}
      
      {/* Input Field */}
      <div className="text-input-container">
        <input
          ref={ref}
          type={type}
          id={inputId}
          name={name}
          value={inputValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          className={`text-input-field ${getInputState()}`}
          aria-label={ariaLabel || label}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={error && errorMessage ? errorId : undefined}
          aria-invalid={error}
        />
      </div>

      {/* Error Message */}
      {error && errorMessage && (
        <div 
          id={errorId}
          className="text-input-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
});

TextInput.displayName = 'TextInput';

export default TextInput;
