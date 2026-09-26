import React from 'react';
import Button from './Button';
import type { ReactNode } from 'react';

// Base props excluding variant, size, and format (these are preset)
interface BaseButtonProps {
  children?: ReactNode;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  iconPosition?: 'left' | 'right';
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  height?: string | number;
  width?: string | number;
}

// Factory function to create button presets
const createButton = (
  variant: 'primary' | 'secondary' | 'tertiary' | 'text',
  size: 'sm' | 'md' | 'lg',
  format: 'default' | 'withIcon' | 'iconOnly' = 'default'
) => {
  const ButtonComponent: React.FC<BaseButtonProps> = (props) => (
    <Button 
      variant={variant} 
      size={size} 
      format={format} 
      {...props} 
    />
  );
  
  // Set display name for debugging
  ButtonComponent.displayName = `${variant.charAt(0).toUpperCase() + variant.slice(1)}${size.charAt(0).toUpperCase() + size.slice(1)}${format !== 'default' ? format.charAt(0).toUpperCase() + format.slice(1) : ''}Button`;
  
  return ButtonComponent;
};

// ================================
// PRIMARY BUTTONS
// ================================

// Primary Large Buttons
export const PrimaryLargeButton = createButton('primary', 'lg', 'default');
export const PrimaryLargeIconButton = createButton('primary', 'lg', 'withIcon');
export const PrimaryLargeIconOnlyButton = createButton('primary', 'lg', 'iconOnly');

// Primary Medium Buttons
export const PrimaryMediumButton = createButton('primary', 'md', 'default');
export const PrimaryMediumIconButton = createButton('primary', 'md', 'withIcon');
export const PrimaryMediumIconOnlyButton = createButton('primary', 'md', 'iconOnly');

// Primary Small Buttons
export const PrimarySmallButton = createButton('primary', 'sm', 'default');
export const PrimarySmallIconButton = createButton('primary', 'sm', 'withIcon');
export const PrimarySmallIconOnlyButton = createButton('primary', 'sm', 'iconOnly');

// ================================
// SECONDARY BUTTONS
// ================================

// Secondary Large Buttons
export const SecondaryLargeButton = createButton('secondary', 'lg', 'default');
export const SecondaryLargeIconButton = createButton('secondary', 'lg', 'withIcon');
export const SecondaryLargeIconOnlyButton = createButton('secondary', 'lg', 'iconOnly');

// Secondary Medium Buttons
export const SecondaryMediumButton = createButton('secondary', 'md', 'default');
export const SecondaryMediumIconButton = createButton('secondary', 'md', 'withIcon');
export const SecondaryMediumIconOnlyButton = createButton('secondary', 'md', 'iconOnly');

// Secondary Small Buttons
export const SecondarySmallButton = createButton('secondary', 'sm', 'default');
export const SecondarySmallIconButton = createButton('secondary', 'sm', 'withIcon');
export const SecondarySmallIconOnlyButton = createButton('secondary', 'sm', 'iconOnly');

// ================================
// TERTIARY BUTTONS
// ================================

// Tertiary Large Buttons
export const TertiaryLargeButton = createButton('tertiary', 'lg', 'default');
export const TertiaryLargeIconButton = createButton('tertiary', 'lg', 'withIcon');
export const TertiaryLargeIconOnlyButton = createButton('tertiary', 'lg', 'iconOnly');

// Tertiary Medium Buttons
export const TertiaryMediumButton = createButton('tertiary', 'md', 'default');
export const TertiaryMediumIconButton = createButton('tertiary', 'md', 'withIcon');
export const TertiaryMediumIconOnlyButton = createButton('tertiary', 'md', 'iconOnly');

// Tertiary Small Buttons
export const TertiarySmallButton = createButton('tertiary', 'sm', 'default');
export const TertiarySmallIconButton = createButton('tertiary', 'sm', 'withIcon');
export const TertiarySmallIconOnlyButton = createButton('tertiary', 'sm', 'iconOnly');

// ================================
// TEXT BUTTONS
// ================================

// Text Large Buttons
export const TextLargeButton = createButton('text', 'lg', 'default');
export const TextLargeIconButton = createButton('text', 'lg', 'withIcon');
export const TextLargeIconOnlyButton = createButton('text', 'lg', 'iconOnly');

// Text Medium Buttons
export const TextMediumButton = createButton('text', 'md', 'default');
export const TextMediumIconButton = createButton('text', 'md', 'withIcon');
export const TextMediumIconOnlyButton = createButton('text', 'md', 'iconOnly');

// Text Small Buttons
export const TextSmallButton = createButton('text', 'sm', 'default');
export const TextSmallIconButton = createButton('text', 'sm', 'withIcon');
export const TextSmallIconOnlyButton = createButton('text', 'sm', 'iconOnly');

// Export the factory function for custom combinations
export { createButton };
