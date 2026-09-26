import { type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { isRouteActive } from '../../config/routes';

interface NavItemProps {
  href: string;
  icon: ReactNode;
  title: string;
  isExpanded: boolean;
  isActive?: boolean; // Optional override for active state
  external?: boolean; // Render as an external link (opens in a new tab)
}

const NavItem = ({ href, icon, title, isExpanded, isActive, external }: NavItemProps) => {
  const location = useLocation();

  // Automatically determine active state if not explicitly provided
  const active = external
    ? false
    : isActive !== undefined ? isActive : isRouteActive(href, location.pathname);

  const linkClassName = `navigation--side__nav-link ${active ? 'navigation--side__nav-link--active' : ''}`;
  const linkContent = (
    <>
      <span className="navigation--side__nav-icon">
        {icon}
      </span>
      {isExpanded && (
        <span className="navigation--side__nav-text">{title}</span>
      )}
    </>
  );

  return (
    <li className={isExpanded ? "navigation--side__nav-item" : "navigation--side__nav-item--collapsed"}>
      {external ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={linkClassName}
          data-title={title}
          title={!isExpanded ? title : ''}
        >
          {linkContent}
        </a>
      ) : (
        <Link
          to={href}
          className={linkClassName}
          data-title={title}
          title={!isExpanded ? title : ''}
        >
          {linkContent}
        </Link>
      )}
    </li>
  );
};

export default NavItem;
