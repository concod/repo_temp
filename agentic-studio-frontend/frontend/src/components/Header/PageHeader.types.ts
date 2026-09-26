export interface HeaderButton {
  id: string;
  label: string;
  type: 'primary' | 'secondary';
  size: 'large' | 'medium';
  onClick: () => void;
}

export interface PageHeaderProps {
  // Content
  title: string;
  description: string;
  
  // Search functionality
  searchPlaceholder?: string;
  searchQuery?: string;
  onSearch?: (query: string) => void; // Made optional
  onResetSearch?: () => void; // Made optional
  showSearchBar?: boolean; // New prop to control search bar visibility
  showResetButton?: boolean; // New prop to control reset button visibility
  
  // Buttons (flexible array)
  buttons: HeaderButton[];
  
  // Bottom section (completely generic)
  bottomSection?: React.ReactNode;
  showBottomSection?: boolean;
  
  // Custom styling
  className?: string;
  customStyles?: {
    header?: string;
    top?: string;
    content?: string;
    right?: string;
    bottom?: string;
  };
}
