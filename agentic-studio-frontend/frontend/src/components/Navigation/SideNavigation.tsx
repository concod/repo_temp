import { useState } from 'react';
import logo from '../../assets/images/ia-logo.png';
import logoIcon from '../../assets/images/ia-icon.svg';
import expandedArrow from '../../assets/images/arrow-expanded.svg';
import collapsedArrow from '../../assets/images/arrow-collapsed.svg';
import NavSection, { type NavItemData } from './NavSection';
import { getNavigationItems } from '../../config/routes';

const McpIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
    <circle cx="10" cy="4" r="2.1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="4.5" cy="15.5" r="2.1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <circle cx="15.5" cy="15.5" r="2.1" stroke="currentColor" strokeWidth="1.5" fill="none" />
    <path d="M10 6.1V10M10 10L5.7 13.7M10 10L14.3 13.7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
  </svg>
);

const SideNavigation = () => {
  const [expanded, setExpanded] = useState(true);
  
  const toggleNavBar = () => {
    setExpanded(!expanded);
  };

  // Pass the auth token to the MCP app so the user is auto-authenticated there.
  const authToken = localStorage.getItem('authToken');
  const mcpUrl = authToken
    ? `https://mcp.impact-agents.ai/?auth_token=${encodeURIComponent(authToken)}`
    : 'https://mcp.impact-agents.ai/';

  // Get navigation items from centralized route configuration
  const mainNavItems: NavItemData[] = [
    ...getNavigationItems('main').map(route => ({
      href: route.path,
      icon: route.icon!,
      title: route.title,
    })),
    {
      href: mcpUrl,
      icon: <McpIcon />,
      title: 'MCP',
      external: true,
    },
  ];

  // const supportNavItems = getNavigationItems('support').map(route => ({
  //   href: route.path,
  //   icon: route.icon!,
  //   title: route.title,
  // }));

  return (
    <div className={`navigation--side ${expanded ? 'navigation--side--expanded' : 'navigation--side--collapsed'}`}>
      <div className="navigation--side__header">
        <div className="navigation--side__header-logo">
          <img 
            src={expanded ? logo : logoIcon} 
            alt="logo" 
            className={expanded ? 'logo--expanded' : 'logo--collapsed'}
          />
        </div>
        <div className="navigation--side__header-arrow">
          <img 
            src={expanded ? expandedArrow : collapsedArrow} 
            alt="toggle arrow" 
            onClick={toggleNavBar}
          />
        </div>
      </div>
      
      <nav className="navigation--side__content">
        <NavSection 
          items={mainNavItems} 
          isExpanded={expanded} 
          className={expanded ? 'navigation--side__nav-section--main' : 'navigation--side__nav-section--collapsed'}
        />
        
        {/* <NavSection 
          items={supportNavItems} 
          isExpanded={expanded} 
          className="navigation--side__nav-section--support"
        /> */}
      </nav>
    </div>
  );
};

export default SideNavigation;