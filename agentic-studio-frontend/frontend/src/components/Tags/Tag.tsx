import React from 'react';
import type { ReactNode } from 'react';

interface TagProps {
  children: ReactNode;
  variant?: 'outline' | 'fill' | 'none';
  icon?: ReactNode;
  avatar?: string | ReactNode; // URL string or React component
  showClear?: boolean;
  className?: string;
}

const Tag: React.FC<TagProps> = ({
  children,
  variant = 'outline',
  icon,
  avatar,
  showClear = false,
  className = '',
}) => {
  const baseClass = 'tag';
  const variantClass = `${baseClass}--${variant}`;

  const tagClasses = [
    baseClass,
    variantClass,
    className
  ].filter(Boolean).join(' ');


  const renderAvatar = () => {
    if (!avatar) return null;
    
    if (typeof avatar === 'string') {
      return (
        <img 
          src={avatar} 
          alt="Avatar" 
          className="tag__avatar"
        />
      );
    }
    
    return <span className="tag__avatar">{avatar}</span>;
  };

  const renderIcon = () => {
    if (!icon) return null;
    return <span className="tag__icon">{icon}</span>;
  };

  const renderClear = () => {
    if (!showClear) return null;
    
    return (
      <span className="tag__clear">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path 
            d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5" 
            stroke="currentColor" 
            strokeWidth="1.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  };

  return (
    <div className={tagClasses}>
      {renderAvatar()}
      {renderIcon()}
      <span className="tag__text body-small">{children}</span>
      {renderClear()}
    </div>
  );
};

export default Tag;
