import React, { type ReactNode } from 'react';
import Header from '../Header/Header';
import SideNavigation from '../Navigation/SideNavigation';
import { Breadcrumb } from '../Breadcrumb';
import Footer from '../Footer';

interface AppLayoutProps {
  children: ReactNode;
  showBreadcrumb?: boolean;
  breadcrumbProps?: {
    showHome?: boolean;
    className?: string;
  };
  className?: string;
  contentClassName?: string;
  bodyClassName?: string;
}

const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showBreadcrumb = true,
  breadcrumbProps = {},
  className = '',
  contentClassName = ''
}) => {
  return (
    <div className={`app-page ${className}`}>
      <SideNavigation />
      <div className={`app-content ${contentClassName}`}>
        <Header />
        {showBreadcrumb && (
          <div className="app-content__breadcrumb">
            <Breadcrumb 
              showHome={breadcrumbProps.showHome !== false}
              className={breadcrumbProps.className}
            />
          </div>
        )}
        <div className="app-content__body scrollbar-hidden">
          {children}
        </div>
        <Footer />
      </div>
    </div>
  );
};

export default AppLayout;
