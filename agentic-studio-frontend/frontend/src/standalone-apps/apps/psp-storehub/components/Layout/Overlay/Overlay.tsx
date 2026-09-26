import React, { useEffect } from 'react';
import { useOverlayStore } from '../../../store/overlayStore';
import { KPIOverlayLayout } from '../../Dashboard/KPIOverlayLayout';
import { StoreOverlayLayout } from '../../Dashboard/StoreOverlayLayout';
import './Overlay.scss';

export const Overlay: React.FC = () => {
  const { isOpen, overlayType, closeOverlay } = useOverlayStore();

  // Handle ESC key to close overlay
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeOverlay();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEsc);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEsc);
      document.body.style.overflow = '';
    };
  }, [isOpen, closeOverlay]);

  if (!isOpen) return null;

  return (
    <div className="overlay" onClick={closeOverlay}>
      <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
        {overlayType === 'kpi' && <KPIOverlayLayout />}
        {overlayType === 'stores' && <StoreOverlayLayout />}
      </div>
    </div>
  );
};

