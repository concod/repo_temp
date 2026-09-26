import NavItem from './NavItem';
import { type ReactNode } from 'react';

export interface NavItemData {
  href: string;
  icon: ReactNode;
  title: string;
  isActive?: boolean;
  external?: boolean;
}

interface NavSectionProps {
  items: NavItemData[];
  isExpanded: boolean;
  className?: string;
}

const NavSection = ({ items, isExpanded, className = '' }: NavSectionProps) => {
  return (
    <ul className={`navigation--side__nav-section ${className}`}>
      {items.map((item) => (
        <NavItem
          key={item.href}
          href={item.href}
          icon={item.icon}
          title={item.title}
          isExpanded={isExpanded}
          isActive={item.isActive}
          external={item.external}
        />
      ))}
    </ul>
  );
};

export default NavSection;
