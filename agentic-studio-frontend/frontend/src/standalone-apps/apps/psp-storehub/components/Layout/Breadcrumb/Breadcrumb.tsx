import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './Breadcrumb.scss';
import logo from '../../../assets/psp-horizontal-logo.png';

interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  showHome?: boolean;
}

const navigationMap: Record<string, string> = {
  '/apps/psp-storehub/dashboard': 'Command Center',
  '/apps/psp-storehub/chat': 'Conversational Co-Pilot',
  '/apps/psp-storehub/store-deep-dive': 'Store Deep Dive',
  '/apps/psp-storehub/settings': 'Settings',
  '/apps/psp-storehub/help': 'Help & Support',
};

export const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  items, 
  showHome = true 
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Generate breadcrumb items from current path if not provided
  const getBreadcrumbItems = (): BreadcrumbItem[] => {
    if (items) return items;

    // const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbItems: BreadcrumbItem[] = [];

    // Add home if requested
    if (showHome) {
      breadcrumbItems.push({
        label: 'Home',
        path: '/apps/psp-storehub/dashboard',
        isActive: false
      });
    }

    // Get current page name from navigation map
    const currentPageName = navigationMap[location.pathname];
    if (currentPageName) {
      breadcrumbItems.push({
        label: currentPageName,
        isActive: true
      });
    }

    return breadcrumbItems;
  };

  const breadcrumbItems = getBreadcrumbItems();

  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.path && !item.isActive) {
      navigate(item.path);
    }
  };

  const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="8" height="9" viewBox="0 0 8 9" fill="none">
      <path d="M1 7.75H2.5V5.25C2.5 5.10833 2.54792 4.98958 2.64375 4.89375C2.73958 4.79792 2.85833 4.75 3 4.75H5C5.14167 4.75 5.26042 4.79792 5.35625 4.89375C5.45208 4.98958 5.5 5.10833 5.5 5.25V7.75H7V3.25L4 1L1 3.25V7.75ZM0 7.75V3.25C0 3.09167 0.0354167 2.94167 0.10625 2.8C0.177083 2.65833 0.275 2.54167 0.4 2.45L3.4 0.2C3.575 0.0666667 3.775 0 4 0C4.225 0 4.425 0.0666667 4.6 0.2L7.6 2.45C7.725 2.54167 7.82292 2.65833 7.89375 2.8C7.96458 2.94167 8 3.09167 8 3.25V7.75C8 8.025 7.90208 8.26042 7.70625 8.45625C7.51042 8.65208 7.275 8.75 7 8.75H5C4.85833 8.75 4.73958 8.70208 4.64375 8.60625C4.54792 8.51042 4.5 8.39167 4.5 8.25V5.75H3.5V8.25C3.5 8.39167 3.45208 8.51042 3.35625 8.60625C3.26042 8.70208 3.14167 8.75 3 8.75H1C0.725 8.75 0.489583 8.65208 0.29375 8.45625C0.0979167 8.26042 0 8.025 0 7.75Z" fill="#60697D"/>
    </svg>
  );

  const ArrowIcon = () => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width="16" 
      height="16" 
      viewBox="0 0 16 16" 
      fill="none"
    >
      <path 
        d="M6 12L10 8L6 4" 
        stroke="currentColor" 
        strokeWidth="1.5" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
    </svg>
  );

  if (breadcrumbItems.length === 0) return null;

  return (
   <div className="breadcrumb-container">
    <div className="breadcrumb-logo">
      <div className="breadcrumb-logo-icon">
        <img src={logo} alt="logo" />
      </div>
    </div>
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <ol className="breadcrumb__list">
        {breadcrumbItems.map((item, index) => (
          <li key={index} className="breadcrumb__item">
            {index === 0 && showHome && item.label === 'Home' ? (
              // Show only HomeIcon for home item
              <button
                className="breadcrumb__link breadcrumb__home-button"
                onClick={() => handleItemClick(item)}
                aria-current={item.isActive ? 'page' : undefined}
                aria-label="Home"
              >
                <HomeIcon />
              </button>
            ) : (
              // Show regular text/button for other items
              item.path && !item.isActive ? (
                <button
                  className="breadcrumb__link"
                  onClick={() => handleItemClick(item)}
                  aria-current={item.isActive ? 'page' : undefined}
                >
                  {item.label}
                </button>
              ) : (
                <span 
                  className={`breadcrumb__text ${item.isActive ? 'breadcrumb__text--active' : ''}`}
                  aria-current={item.isActive ? 'page' : undefined}
                >
                  {item.label}
                </span>
              )
            )}
            
            {index < breadcrumbItems.length - 1 && (
              <span className="breadcrumb__separator" aria-hidden="true">
                <ArrowIcon />
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
   </div>
    
  );
};
