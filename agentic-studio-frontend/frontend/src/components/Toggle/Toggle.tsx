import React, { useState } from 'react';

// SVG Components for different states
const DefaultToggleSVG: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="16" viewBox="0 0 28 16" fill="none">
    <g filter="url(#filter0_i_default)">
      <g clipPath="url(#clip0_default)">
        <rect width="28" height="16" rx="8" fill="#EAEAEA"/>
        <g filter="url(#filter1_ddd_default)">
          <rect x="1" y="1" width="14" height="14" rx="7" fill="#FEFEFF"/>
        </g>
        <rect x="5.5" y="5.5" width="5" height="5" rx="2.5" stroke="#C3C8D4"/>
      </g>
    </g>
    <defs>
      <filter id="filter0_i_default" x="0" y="0" width="28" height="16" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset/>
        <feGaussianBlur stdDeviation="0.5"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.2 0"/>
        <feBlend mode="normal" in2="shape" result="effect1_innerShadow_default"/>
      </filter>
      <filter id="filter1_ddd_default" x="-1" y="0" width="18" height="18" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_default"/>
        <feOffset/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_default"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="effect1_dropShadow_default" result="effect2_dropShadow_default"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset/>
        <feGaussianBlur stdDeviation="0.5"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
        <feBlend mode="normal" in2="effect2_dropShadow_default" result="effect3_dropShadow_default"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_default" result="shape"/>
      </filter>
      <clipPath id="clip0_default">
        <rect width="28" height="16" rx="8" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

const ActiveToggleSVG: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="16" viewBox="0 0 28 16" fill="none">
    <g filter="url(#filter0_i_active)">
      <g clipPath="url(#clip0_active)">
        <rect width="28" height="16" rx="8" fill="#A93BFF"/>
        <g filter="url(#filter1_ddd_active)">
          <rect x="13" y="1" width="14" height="14" rx="7" fill="#FEFEFF"/>
        </g>
        <rect x="19.5" y="5.5" width="1" height="5" rx="0.5" stroke="#A93BFF"/>
      </g>
    </g>
    <defs>
      <filter id="filter0_i_active" x="0" y="0" width="28" height="16" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset/>
        <feGaussianBlur stdDeviation="0.5"/>
        <feComposite in2="hardAlpha" operator="arithmetic" k2="-1" k3="1"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0"/>
        <feBlend mode="normal" in2="shape" result="effect1_innerShadow_active"/>
      </filter>
      <filter id="filter1_ddd_active" x="11" y="0" width="18" height="18" filterUnits="userSpaceOnUse" colorInterpolationFilters="sRGB">
        <feFlood floodOpacity="0" result="BackgroundImageFix"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feMorphology radius="1" operator="dilate" in="SourceAlpha" result="effect1_dropShadow_active"/>
        <feOffset/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
        <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow_active"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset dy="1"/>
        <feGaussianBlur stdDeviation="1"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.25 0"/>
        <feBlend mode="normal" in2="effect1_dropShadow_active" result="effect2_dropShadow_active"/>
        <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0" result="hardAlpha"/>
        <feOffset/>
        <feGaussianBlur stdDeviation="0.5"/>
        <feComposite in2="hardAlpha" operator="out"/>
        <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0"/>
        <feBlend mode="normal" in2="effect2_dropShadow_active" result="effect3_dropShadow_active"/>
        <feBlend mode="normal" in="SourceGraphic" in2="effect3_dropShadow_active" result="shape"/>
      </filter>
      <clipPath id="clip0_active">
        <rect width="28" height="16" rx="8" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

// Toggle Component Interface
export interface ToggleProps {
  /** Current toggle state */
  checked?: boolean;
  /** Default checked state (for uncontrolled mode) */
  defaultChecked?: boolean;
  /** Callback fired when the toggle state changes */
  onChange?: (checked: boolean, event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Disable the toggle */
  disabled?: boolean;
  /** Name attribute for form control */
  name?: string;
  /** ID for the toggle input */
  id?: string;
  /** Additional CSS classes */
  className?: string;
  /** Accessibility label */
  'aria-label'?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  name,
  id,
  className = '',
  'aria-label': ariaLabel
}) => {
  // Internal state for uncontrolled mode
  const [internalChecked, setInternalChecked] = useState(defaultChecked);
  
  // Determine if component is controlled or uncontrolled
  const isControlled = checked !== undefined;
  const toggleState = isControlled ? checked : internalChecked;

  // Handle toggle change
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newChecked = event.target.checked;
    
    // Update internal state if uncontrolled
    if (!isControlled) {
      setInternalChecked(newChecked);
    }
    
    // Call onChange callback if provided
    if (onChange) {
      onChange(newChecked, event);
    }
  };

  // Handle keyboard interaction
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      if (!disabled) {
        const syntheticEvent = {
          target: { checked: !toggleState },
          currentTarget: { checked: !toggleState }
        } as React.ChangeEvent<HTMLInputElement>;
        handleChange(syntheticEvent);
      }
    }
  };

  // Generate unique ID if not provided
  const toggleId = id || `toggle-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className={`toggle-wrapper ${className} ${disabled ? 'disabled' : ''}`}>
      {/* Hidden input for form control */}
      <input
        type="checkbox"
        id={toggleId}
        name={name}
        checked={toggleState}
        onChange={handleChange}
        disabled={disabled}
        className="toggle-input"
        aria-label={ariaLabel}
      />
      
      {/* Visual toggle */}
      <label 
        htmlFor={toggleId}
        className={`toggle ${toggleState ? 'active' : 'default'} ${disabled ? 'disabled' : ''}`}
        onKeyDown={handleKeyDown}
        tabIndex={disabled ? -1 : 0}
        role="switch"
        aria-checked={toggleState}
        aria-disabled={disabled}
      >
        <div className="toggle-track">
          {toggleState ? <ActiveToggleSVG /> : <DefaultToggleSVG />}
        </div>
      </label>
    </div>
  );
};

export default Toggle;
