import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { getBreadcrumbLabel } from '../../config/routes';
import { HomeIcon } from '../Navigation/navigationData';

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

interface BreadcrumbProps {
  className?: string;
  showHome?: boolean;
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ 
  className = '', 
  showHome = true
}) => {
  const location = useLocation();

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const pathSegments = location.pathname.split('/').filter(segment => segment !== '');
    const breadcrumbs: BreadcrumbItem[] = [];

    // Add home breadcrumb if showHome is true and we're not on home page
    if (showHome && location.pathname !== '/' && location.pathname !== '/home') {
      breadcrumbs.push({
        label: 'Home',
        path: '/home',
        isActive: false
      });
    }

    // Generate breadcrumbs for each path segment
    let currentPath = '';
    const filteredSegments = pathSegments.filter(segment => 
      !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(segment)
    );
    
    filteredSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const isLast = index === filteredSegments.length - 1;
      
      // Get label from route configuration or format segment
      let label = getBreadcrumbLabel(currentPath);
      if (!label) {
        // Format segment: replace hyphens with spaces and capitalize
        label = segment
          .split('-')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
      }

      breadcrumbs.push({
        label,
        path: currentPath,
        isActive: isLast
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // Don't render if no breadcrumbs or only one item (current page)
  if (breadcrumbs.length <= 1 && !showHome) {
    return null;
  }

  return (
    <nav className={`breadcrumb ${className}`} aria-label="Breadcrumb">
      <ol className="breadcrumb__list">
        {breadcrumbs.map((crumb, index) => (
          <li key={crumb.path} className="breadcrumb__item">
            {crumb.isActive ? (
              <span className="breadcrumb__current body-medium" aria-current="page">
                {crumb.label}
              </span>
            ) : (
              <Link 
                to={crumb.path} 
                className="breadcrumb__link"
                aria-label={`Navigate to ${crumb.label}`}
              >
                {index === 0 && showHome && crumb.label === 'Home' ? (
                  <span className="breadcrumb__home-icon">
                    <HomeIcon />
                  </span>
                ) : (
                  crumb.label
                )}
              </Link>
            )}
            {index < breadcrumbs.length - 1 && (
              <span className="breadcrumb__separator" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path 
                    d="M6 4L10 8L6 12" 
                    stroke="currentColor" 
                    strokeWidth="1.5" 
                    strokeLinecap="round" 
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};

export default Breadcrumb;
