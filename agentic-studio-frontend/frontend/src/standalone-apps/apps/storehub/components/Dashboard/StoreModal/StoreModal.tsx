import React, { useEffect, useState, useMemo } from 'react';
import './StoreModal.scss';
import type { Store } from '../../../types/dashboard.types';
import ShareIcon from '../../../assets/share-button.svg';
import DownloadIcon from '../../../assets/download-button.svg';
import { NoData } from '../NoData';

interface StoreModalProps {
  isOpen: boolean;
  onClose: () => void;
  stores?: Store[];
  onStoreClick?: (storeId: string) => void;
  title?: string;
}

export const StoreModal: React.FC<StoreModalProps> = ({
  isOpen,
  onClose,
  stores = [],
  onStoreClick,
  title = "All Stores"
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Handle ESC key to close modal
  useEffect(() => {
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
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
  }, [isOpen, onClose]);

  // Filter stores based on search query
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;
    
    const query = searchQuery.toLowerCase();
    return stores.filter(store => 
      store.name.toLowerCase().includes(query) ||
      store.location.label?.toLowerCase().includes(query) ||
      store.topIssue?.toLowerCase().includes(query) ||
      store.tags.some(tag => 
        tag.themes.some(theme => theme.value.toLowerCase().includes(query))
      )
    );
  }, [stores, searchQuery]);

  if (!isOpen) return null;

  const handleStoreClick = (storeId: string) => {
    onStoreClick?.(storeId);
    onClose();
  };

  // Format store ID to 4 digits (e.g., "0001")
  const formatStoreId = (id: string) => {
    const numId = parseInt(id, 10);
    if (isNaN(numId)) return id;
    return numId.toString().padStart(4, '0');
  };

  // Get trend arrow icon
  const getTrendIcon = (direction: 'up' | 'down' | 'neutral') => {
    if (direction === 'up') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 2L10 6H7V10H5V6H2L6 2Z" fill="#26734B"/>
        </svg>
      );
    } else if (direction === 'down') {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M6 10L2 6H5V2H7V6H10L6 10Z" fill="#AB3939"/>
        </svg>
      );
    }
    return null;
  };

  // Format metric value
  const formatMetricValue = (value: number, unit: string) => {
    return `${value}${unit}`;
  };

  return (
    <div className="store-modal-overlay" onClick={onClose}>
      <div className="store-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="store-modal-header">
          <div className="store-modal-title-section">
            <h3 className="store-modal-title">{title} {stores.length > 0 && <span className="store-modal-count">{stores.length}</span>}</h3>
          </div>
          <div className="store-modal-actions">
            <button className="store-modal-action-btn" aria-label="Download">
              <img src={DownloadIcon} alt="Download" />
            </button>
            <button className="store-modal-action-btn" aria-label="Share">
              <img src={ShareIcon} alt="Share" />
            </button>
            <button className="store-modal-close" onClick={onClose} aria-label="Close modal">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M15 5L5 15M5 5L15 15" stroke="#60697D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="store-modal-search">
          <div className="store-modal-search-input-wrapper">
            <svg className="store-modal-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z" stroke="#7A8294" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M14 14L11.1 11.1" stroke="#7A8294" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              className="store-modal-search-input"
              placeholder="Search by store name or issue"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="store-modal-body">
          {filteredStores.length === 0 ? (
            <NoData 
              title={stores.length === 0 ? "No stores data available" : "No stores found"}
              description={stores.length === 0 ? "No stores available for this district" : "Try adjusting your search criteria"}
            />
          ) : (
            <div className="store-modal-list">
              {filteredStores.map((store) => (
                <div 
                  key={store.id} 
                  className="store-modal-item"
                  onClick={() => handleStoreClick(store.id)}
                >
                  <div className="store-modal-item__header">
                    <div className="store-modal-item__id-name">
                      <span className="store-modal-item__id">{formatStoreId(store.id)}</span>
                      <span className="store-modal-item__name">{store.name}</span>
                    </div>
                    <div className="store-modal-item__location">
                      <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M4.99984 4.99992C4.5415 4.99992 4.1665 4.62492 4.1665 4.16659C4.1665 3.70825 4.5415 3.33325 4.99984 3.33325C5.45817 3.33325 5.83317 3.70825 5.83317 4.16659C5.83317 4.62492 5.45817 4.99992 4.99984 4.99992ZM7.49984 4.24992C7.49984 2.73742 6.39567 1.66659 4.99984 1.66659C3.604 1.66659 2.49984 2.73742 2.49984 4.24992C2.49984 5.22492 3.31234 6.51659 4.99984 8.05825C6.68734 6.51659 7.49984 5.22492 7.49984 4.24992ZM4.99984 0.833252C6.74984 0.833252 8.33317 2.17492 8.33317 4.24992C8.33317 5.63325 7.22067 7.27075 4.99984 9.16659C2.779 7.27075 1.6665 5.63325 1.6665 4.24992C1.6665 2.17492 3.24984 0.833252 4.99984 0.833252Z" fill="#7A8294"/>
                      </svg>
                      <span>{store.location.label}</span>
                    </div>
                  </div>
                  
                  <div className="store-modal-item__content">
                    <div className="store-modal-item__comments">
                      <span className="store-modal-item__comments-label">Top comments:</span>
                      {store.tags.length > 0 ? (
                        <>
                          <div className="store-modal-item__tags">
                            {store.tags.flatMap((tag, tagIndex) => 
                              tag.themes.map((theme, themeIndex) => (
                                <span key={`${tagIndex}-${themeIndex}`} className="store-modal-item__tag">{theme.value}</span>
                              ))
                            )}
                          </div>
                          <button 
                            className="store-modal-item__comment-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              // Handle comment button click
                            }}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path className="store-modal-item__comment-icon" d="M3.08643 0.380346C4.00006 0.00190768 5.00568 -0.09676 5.97559 0.0961662C6.94543 0.289112 7.83642 0.765104 8.53564 1.46433C9.23487 2.16356 9.71086 3.05454 9.90381 4.02439C10.0967 4.99429 9.99807 5.99992 9.61963 6.91355C9.24119 7.82714 8.60004 8.60781 7.77783 9.1572C6.95559 9.70661 5.98891 9.99998 5 9.99998C4.23923 9.99998 3.51636 9.82958 2.86914 9.5239L0.600586 9.98972C0.435953 10.0235 0.265323 9.97233 0.146484 9.85349C0.027646 9.73465 -0.0235308 9.56402 0.0102539 9.39939L0.476074 7.13035C0.170528 6.48331 0 5.76107 0 4.99997C3.77066e-07 4.01107 0.293367 3.04439 0.842773 2.22214C1.39217 1.39993 2.17283 0.75878 3.08643 0.380346ZM1 4.99997C1 5.66237 1.15997 6.28518 1.44385 6.83347C1.49648 6.93512 1.51276 7.0519 1.48975 7.16404L1.14209 8.8574L2.83594 8.51023L2.92041 8.50046C3.00536 8.49773 3.0902 8.51662 3.1665 8.55613C3.71477 8.83999 4.33808 8.99998 5 8.99998C5.79113 8.99998 6.56437 8.76518 7.22217 8.32566C7.87993 7.88615 8.39256 7.26159 8.69531 6.53074C8.99805 5.79987 9.07765 4.99559 8.92334 4.2197C8.769 3.44378 8.38802 2.73077 7.82861 2.17136C7.2692 1.61195 6.5562 1.23098 5.78027 1.07663C5.00439 0.922327 4.2001 1.00193 3.46924 1.30466C2.73838 1.60742 2.11382 2.12005 1.67432 2.77781C1.23479 3.4356 1 4.20885 1 4.99997Z"/>
                            </svg>
                          </button>
                        </>
                      ) : (
                        <span className="store-modal-item__no-issues">No issues Reported</span>
                      )}
                    </div>
                    
                    <div className="store-modal-item__metrics">
                      <div className="store-modal-item__metric">
                        <span className="store-modal-item__metric-label">NRR:</span>
                        <span className="store-modal-item__metric-value">{formatMetricValue(store.kpiDeltas.nrr.value, store.kpiDeltas.nrr.unit)}</span>
                        {getTrendIcon(store.kpiDeltas.nrr.direction)}
                      </div>
                      <div className="store-modal-item__metric">
                        <span className="store-modal-item__metric-label">REVV:</span>
                        <span className="store-modal-item__metric-value">{formatMetricValue(store.kpiDeltas.revv.value, store.kpiDeltas.revv.unit)}</span>
                        {getTrendIcon(store.kpiDeltas.revv.direction)}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};