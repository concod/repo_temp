import React from 'react';
import './PriorityActionGrid.scss';
import ShareIcon from "../../../assets/share-button.svg";
import { useOverlayStore } from '../../../store/overlayStore';
import StoreIcon from "../../../assets/store-icon.png";
import { StoreCard } from '../StoreCard';
import type { Store } from '../../../types/dashboard.types';

interface PriorityActionGridProps {
  onStoreClick?: (storeId: string) => void;
  stores?: Store[];
  title?: string;
  subtitle?: string;
}

export const PriorityActionGrid: React.FC<PriorityActionGridProps> = ({ 
  onStoreClick, 
  stores = [], 
  title = "Top Priority Stores"
}) => {
  const { openStoresOverlay } = useOverlayStore();
  const displayItems = stores.slice(0, 4);

  const handleViewStores = () => {
    openStoresOverlay(stores, title);
  };

  return (
    <div className="priority-action-grid">
      <div className="grid-header">
        <div className="grid-title-section">
          <div className="grid-title-text">
            <div className="grid-title-icon">
              <img src={StoreIcon} alt="Store Icon" />
            </div>
            <h3 className="grid-title">{title}</h3>   
          </div>
        </div>
        
        <div className="grid-actions">
          <button 
            className="grid-actions__button"
            onClick={handleViewStores}
          >
            View Stores
          </button>
          <img src={ShareIcon} alt="Share" />
        </div>
      </div>

      <div className="grid-content">
        {displayItems.length === 0 ? (
          <div className="no-stores">
            <p>No priority stores data available</p>
          </div>
        ) : (
          <div className="stores-grid">
            {displayItems.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                onClick={onStoreClick}
                variant="grid"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
