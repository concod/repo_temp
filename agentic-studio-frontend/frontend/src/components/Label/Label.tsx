import React from 'react';
import type { ReactNode } from 'react';

interface LabelProps {
  children: ReactNode;
  variant?: 'default' | 'subtle-purple' | 'subtle-orange' | 'subtle-green' | 'miscellaneous';
  stroke?: boolean;
  icon?: boolean;
  className?: string;
  textClassName?: string;
  style?: React.CSSProperties;
}

const Label: React.FC<LabelProps> = ({
  children,
  variant = 'default',
  stroke = false,
  icon = false,
  className = '',
  textClassName = '',
  style,
}) => {
  const baseClass = 'label';
  const variantClass = `${baseClass}--${variant}`;
  const strokeClass = stroke ? `${baseClass}--stroke` : '';
  const iconClass = icon ? `${baseClass}--with-icon` : '';

  const labelClasses = [
    baseClass,
    variantClass,
    strokeClass,
    iconClass,
    className
  ].filter(Boolean).join(' ');

  // Standard dot icons for each variant
  const renderIcon = () => {
    if (!icon) return null;
    
    const iconColors = {
      'subtle-purple': '#A93BFF',
      'subtle-orange': '#FC9797',
      'subtle-green': '#228C54',
      'default': '#6B7280',
      'miscellaneous': '#EC4899'
    };

    return (
      <span className="label__icon">
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <circle cx="4" cy="4" r="4" fill={iconColors[variant]} />
        </svg>
      </span>
    );
  };

  // Extract fontSize from style to apply to text element for better specificity
  const { fontSize, ...containerStyle } = style || {};
  const textStyle = fontSize ? { fontSize } : {};

  return (
    <div className={labelClasses} style={containerStyle}>
      {renderIcon()}
      <span 
        className={`label__text ${textClassName}`.trim()} 
        style={textStyle}
      >
        {children}
      </span>
    </div>
  );
};

export default Label;
