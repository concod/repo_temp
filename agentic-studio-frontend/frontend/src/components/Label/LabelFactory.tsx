import React from 'react';
import Label from './Label';
import type { ReactNode } from 'react';

// Base props excluding variant, stroke, and icon (these are preset)
interface BaseLabelProps {
  children: ReactNode;
  className?: string;
  textClassName?: string;
  style?: React.CSSProperties;
}

// Factory function to create label presets
const createLabel = (
  variant: 'default' | 'subtle-purple' | 'subtle-orange' | 'subtle-green' | 'miscellaneous',
  stroke: boolean = false,
  icon: boolean = false
) => {
  const LabelComponent: React.FC<BaseLabelProps> = (props) => (
    <Label 
      variant={variant} 
      stroke={stroke} 
      icon={icon} 
      {...props} 
    />
  );
  
  // Set display name for debugging
  const variantName = variant.split('-').map(word => 
    word.charAt(0).toUpperCase() + word.slice(1)
  ).join('');
  
  const strokeSuffix = stroke ? 'Stroke' : '';
  const iconSuffix = icon ? 'Icon' : '';
  
  LabelComponent.displayName = `${variantName}${strokeSuffix}${iconSuffix}Label`;
  
  return LabelComponent;
};

// ================================
// DEFAULT LABELS
// ================================

// Default labels (outlined style)
export const DefaultLabel = createLabel('default', false, false);
export const DefaultStrokeLabel = createLabel('default', true, false);

// ================================
// SUBTLE PURPLE LABELS
// ================================

export const SubtlePurpleLabel = createLabel('subtle-purple', false, false);
export const SubtlePurpleIconLabel = createLabel('subtle-purple', false, true);

// ================================
// SUBTLE ORANGE LABELS
// ================================

export const SubtleOrangeLabel = createLabel('subtle-orange', false, false);
export const SubtleOrangeIconLabel = createLabel('subtle-orange', false, true);

// ================================
// SUBTLE GREEN LABELS
// ================================

export const SubtleGreenLabel = createLabel('subtle-green', false, false);
export const SubtleGreenIconLabel = createLabel('subtle-green', false, true);

// ================================
// MISCELLANEOUS LABELS
// ================================

export const MiscellaneousLabel = createLabel('miscellaneous', false, false);

// Export the factory function for custom combinations
export { createLabel };
