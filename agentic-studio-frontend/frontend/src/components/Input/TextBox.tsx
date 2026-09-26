import React, { useState, forwardRef } from 'react';

export interface TextBoxProps {
  /** Input label text */
  label?: string;
  /** Placeholder text for the textarea */
  placeholder?: string;
  /** Current textarea value (controlled mode) */
  value?: string;
  /** Default value (uncontrolled mode) */
  defaultValue?: string;
  /** Callback fired when the textarea value changes */
  onChange?: (value: string, event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  /** Callback fired when textarea loses focus */
  onBlur?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  /** Callback fired when textarea gains focus */
  onFocus?: (event: React.FocusEvent<HTMLTextAreaElement>) => void;
  /** Disable the textarea */
  disabled?: boolean;
  /** Show error state */
  error?: boolean;
  /** Error message to display */
  errorMessage?: string;
  /** Name attribute for form control */
  name?: string;
  /** ID for the textarea */
  id?: string;
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
  /** Number of visible text lines */
  rows?: number;
  /** Number of visible character columns */
  cols?: number;
  /** Text wrapping behavior */
  wrap?: 'hard' | 'soft' | 'off';
  /** Resize behavior */
  resize?: 'none' | 'both' | 'horizontal' | 'vertical';
}

const TextBox = forwardRef<HTMLTextAreaElement, TextBoxProps>(({
  label,
  placeholder = "Enter text",
  value,
  defaultValue = "",
  onChange,
  onBlur,
  onFocus,
  disabled = false,
  error = false,
  errorMessage,
  name,
  id,
  className = "",
  width,
  height,
  'aria-label': ariaLabel,
  autoFocus = false,
  required = false,
  maxLength,
  minLength,
  rows,
  cols,
  wrap = 'soft',
  resize = 'vertical'
}, ref) => {
  // Internal state for uncontrolled mode
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  
  // Determine if component is controlled or uncontrolled
  const isControlled = value !== undefined;
  const textareaValue = isControlled ? value : internalValue;

  // Handle textarea change
  const handleChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
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
  const handleFocus = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true);
    if (onFocus) {
      onFocus(event);
    }
  };

  // Handle blur
  const handleBlur = (event: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false);
    if (onBlur) {
      onBlur(event);
    }
  };

  // Generate unique ID if not provided
  const textareaId = id || `textbox-${Math.random().toString(36).substr(2, 9)}`;
  const labelId = `${textareaId}-label`;
  const errorId = `${textareaId}-error`;

  // Determine textarea state for styling
  const getTextareaState = () => {
    if (disabled) return 'disabled';
    if (error) return 'error';
    if (isFocused) return 'selected';
    return 'default';
  };

  // Handle custom dimensions for wrapper
  const wrapperStyles: React.CSSProperties = {};
  if (width) {
    wrapperStyles.width = typeof width === 'number' ? `${width}px` : width;
  }

  // Handle custom dimensions for textarea field
  const fieldStyles: React.CSSProperties = {};
  if (height) {
    fieldStyles.height = typeof height === 'number' ? `${height}px` : height;
  }
  
  // Handle resize style
  if (resize) {
    fieldStyles.resize = resize;
  }

  return (
    <div 
      className={`textbox-wrapper ${className} ${getTextareaState()}`}
      style={wrapperStyles}
    >
      {/* Label */}
      {label && (
        <label 
          htmlFor={textareaId}
          id={labelId}
          className={`textbox-label body-small--medium`}
        >
          {label}
          {required && <span className="textbox-required">*</span>}
        </label>
      )}
      
      {/* Textarea Field */}
      <div className="textbox-container">
        <textarea
          ref={ref}
          id={textareaId}
          name={name}
          value={textareaValue}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          required={required}
          maxLength={maxLength}
          minLength={minLength}
          rows={rows}
          cols={cols}
          wrap={wrap}
          className={`textbox-field ${getTextareaState()}`}
          aria-label={ariaLabel || label}
          aria-labelledby={label ? labelId : undefined}
          aria-describedby={error && errorMessage ? errorId : undefined}
          aria-invalid={error}
          style={fieldStyles}
        />
      </div>

      {/* Error Message */}
      {error && errorMessage && (
        <div 
          id={errorId}
          className="textbox-error"
          role="alert"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
});

TextBox.displayName = 'TextBox';

export default TextBox;
