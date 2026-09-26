import React from 'react';
import type { ReactNode } from 'react';

interface ButtonProps {
  children?: ReactNode;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'text';
  size?: 'sm' | 'md' | 'lg';
  format?: 'default' | 'withIcon' | 'iconOnly';
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

const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  format = 'default',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  iconPosition = 'left',
  onClick,
  type = 'button',
  className = '',
  height,
  width,
}) => {
  const baseClass = 'btn';
  const variantClass = `${baseClass}--${variant}`;
  const sizeClass = `${baseClass}--${size}`;
  const formatClass = format !== 'default' ? `${baseClass}--${format}` : '';
  const fullWidthClass = fullWidth ? `${baseClass}--full-width` : '';
  const disabledClass = (disabled || loading) ? `${baseClass}--disabled` : '';
  const loadingClass = loading ? `${baseClass}--loading` : '';

  const buttonClasses = [
    baseClass,
    variantClass,
    sizeClass,
    formatClass,
    fullWidthClass,
    disabledClass,
    loadingClass,
    className
  ].filter(Boolean).join(' ');

  const handleClick = () => {
    if (!disabled && !loading && onClick) {
      onClick();
    }
  };

  // Helper function to normalize dimension values
  const normalizeDimension = (value: string | number | undefined): string | undefined => {
    if (value === undefined) return undefined;
    if (typeof value === 'number') return `${value}px`;
    return value;
  };

  // Create inline styles for custom dimensions
  const customStyles: React.CSSProperties = {
    ...(height && { height: normalizeDimension(height) }),
    ...(width && { width: normalizeDimension(width) }),
  };

  const renderContent = () => {
    if (loading) {
      return (
        <>
          <div className="btn__spinner">
            <svg className="btn__spinner-icon" viewBox="0 0 24 24">
              <circle
                className="btn__spinner-circle"
                cx="12"
                cy="12"
                r="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeDasharray="32"
                strokeDashoffset="32"
              />
            </svg>
          </div>
          {format !== 'iconOnly' && <span className="btn__text">{children}</span>}
        </>
      );
    }

    // Icon only format
    if (format === 'iconOnly') {
      return icon ? <span className="btn__icon">{icon}</span> : null;
    }

    // With icon format
    if (format === 'withIcon') {
      return (
        <>
          {icon && iconPosition === 'left' && (
            <span className="btn__icon btn__icon--left">{icon}</span>
          )}
          <span className="btn__text">{children}</span>
          {icon && iconPosition === 'right' && (
            <span className="btn__icon btn__icon--right">{icon}</span>
          )}
        </>
      );
    }

    // Default format
    return <span className="btn__text">{children}</span>;
  };

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      onClick={handleClick}
      style={customStyles}
    >
      {renderContent()}
    </button>
  );
};

export default Button;
