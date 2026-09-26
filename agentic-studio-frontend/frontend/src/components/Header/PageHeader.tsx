import React from 'react';
import { PrimaryMediumButton, SecondaryMediumButton, PrimarySmallButton, SecondarySmallButton } from '../Button';
import { SearchInput } from '../Input';
import resetIcon from '../../assets/images/reset.svg';
import type { PageHeaderProps, HeaderButton } from './PageHeader.types';

const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  searchPlaceholder = 'Search...',
  searchQuery = '',
  onSearch,
  onResetSearch,
  showSearchBar = true, // Default to true
  showResetButton = true, // Default to true
  buttons = [],
  bottomSection,
  showBottomSection = false,
  className = '',
  customStyles = {}
}) => {
  
  const renderButton = (button: HeaderButton) => {
    const key = button.id;
    
    // Use small buttons by default for compact design, aligned with navigation
    if (button.type === 'primary' && button.size === 'large') {
      return (
        <PrimaryMediumButton key={key} onClick={button.onClick}>
          {button.label}
        </PrimaryMediumButton>
      );
    }
    
    if (button.type === 'secondary' && button.size === 'large') {
      return (
        <SecondaryMediumButton key={key} onClick={button.onClick}>
          {button.label}
        </SecondaryMediumButton>
      );
    }
    
    if (button.type === 'primary' && button.size === 'medium') {
      return (
        <PrimarySmallButton key={key} onClick={button.onClick}>
          {button.label}
        </PrimarySmallButton>
      );
    }
    
    if (button.type === 'secondary' && button.size === 'medium') {
      return (
        <SecondarySmallButton key={key} onClick={button.onClick}>
          {button.label}
        </SecondarySmallButton>
      );
    }
    
    // Fallback - use small buttons for compact design aligned with 11px navigation
    return (
      <PrimarySmallButton key={key} onClick={button.onClick}>
        {button.label}
      </PrimarySmallButton>
    );
  };

  return (
    <div className={`page-header ${className} ${customStyles.header || ''}`}>
      <div className={`page-header__top ${customStyles.top || ''}`}>
        <div className={`page-header__top-content ${customStyles.content || ''}`}>
          <span className="headline-5 page-header__top-content-title">{title}</span>
          <span className="body-small page-header__top-content-description">
            {description}
          </span>
        </div>
        <div className={`page-header__top-right ${customStyles.right || ''}`}>
          {showSearchBar && onSearch && (
            <SearchInput 
              placeholder={searchPlaceholder}
              onSearch={onSearch}
              onChange={onSearch}
              value={searchQuery}
            />
          )}
          {showResetButton && onResetSearch && (
            <div 
              className="page-header__top-right-reset" 
              onClick={onResetSearch} 
              style={{ cursor: 'pointer' }}
            >
              <img src={resetIcon} alt="Reset search" />
            </div>
          )}
          {buttons.map(renderButton)}
        </div>
      </div>
      
      {showBottomSection && bottomSection && (
        <div className={`page-header__bottom ${customStyles.bottom || ''}`}>
          {bottomSection}
        </div>
      )}
    </div>
  );
};

export default PageHeader;
