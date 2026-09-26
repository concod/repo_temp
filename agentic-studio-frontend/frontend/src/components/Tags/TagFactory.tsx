
import Tag from './Tag';
import type { ReactNode } from 'react';

// Common props interface for all tag variants
interface BaseTagProps {
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
  avatar?: string | ReactNode;
}

// Factory function to create tag variants
export const createTag = (
  variant: 'outline' | 'fill' | 'none',
  features: {
    showClear?: boolean;
    hasIcon?: boolean;
    hasAvatar?: boolean;
  } = {}
) => {
  return (props: BaseTagProps) => (
    <Tag
      variant={variant}
      showClear={features.showClear}
      icon={features.hasIcon ? props.icon : undefined}
      avatar={features.hasAvatar ? props.avatar : undefined}
      {...props}
    />
  );
};

// ================================
// OUTLINE TAGS
// ================================

export const OutlineTag = createTag('outline');
export const OutlineTagWithClear = createTag('outline', { showClear: true });
export const OutlineTagWithIcon = createTag('outline', { hasIcon: true });
export const OutlineTagWithIconAndClear = createTag('outline', { hasIcon: true, showClear: true });
export const OutlineTagWithAvatar = createTag('outline', { hasAvatar: true });
export const OutlineTagWithAvatarAndClear = createTag('outline', { hasAvatar: true, showClear: true });

// ================================
// FILL TAGS
// ================================

export const FillTag = createTag('fill');
export const FillTagWithClear = createTag('fill', { showClear: true });
export const FillTagWithIcon = createTag('fill', { hasIcon: true });
export const FillTagWithIconAndClear = createTag('fill', { hasIcon: true, showClear: true });
export const FillTagWithAvatar = createTag('fill', { hasAvatar: true });
export const FillTagWithAvatarAndClear = createTag('fill', { hasAvatar: true, showClear: true });

// ================================
// NONE TAGS (NO BORDER)
// ================================

export const NoneTag = createTag('none');
export const NoneTagWithIcon = createTag('none', { hasIcon: true });
export const NoneTagWithClear = createTag('none', { showClear: true });
export const NoneTagWithIconAndClear = createTag('none', { hasIcon: true, showClear: true });
