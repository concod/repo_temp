import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useOverlayStore } from "../../../store/overlayStore";
import { NoData } from "../NoData";
import { StoreCard } from "../StoreCard";
import "./StoreOverlayLayout.scss";

export const StoreOverlayLayout: React.FC = () => {
  const { stores, storesTitle, closeOverlay } = useOverlayStore();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleStoreClick = (storeId?: string) => {
    // Navigate to the store deep dive page and pass selected store id in state
    navigate("/apps/store-data-analyst/store-deep-dive", {
      state: { selectedStoreId: storeId },
    });
    // close the overlay after navigation
    closeOverlay();
  };

  // Filter stores based on search query (name only)
  const filteredStores = useMemo(() => {
    if (!searchQuery.trim()) return stores;

    const query = searchQuery.toLowerCase();
    return stores.filter((store) => store.name.toLowerCase().includes(query));
  }, [stores, searchQuery]);

  return (
    <div className="store-overlay-layout">
      <div className="store-overlay-layout__header">
        <h5 className="store-overlay-layout__title">
          {storesTitle}{" "}
          {stores.length > 0 && (
            <span className="store-overlay-layout__count">{stores.length}</span>
          )}
        </h5>
        <div className="store-overlay-layout__actions">
          <div className="store-overlay-layout__search-input-wrapper">
            <svg
              className="store-overlay-layout__search-icon"
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
            >
              <path
                d="M7.33333 12.6667C10.2789 12.6667 12.6667 10.2789 12.6667 7.33333C12.6667 4.38781 10.2789 2 7.33333 2C4.38781 2 2 4.38781 2 7.33333C2 10.2789 4.38781 12.6667 7.33333 12.6667Z"
                stroke="#7A8294"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M14 14L11.1 11.1"
                stroke="#7A8294"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <input
              type="text"
              className="store-overlay-layout__search-input"
              placeholder="Search by store name"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            className="store-overlay-layout__close"
            onClick={closeOverlay}
            aria-label="Close overlay"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
            >
              <path
                d="M10 1.00714L8.99286 0L5 3.99286L1.00714 0L0 1.00714L3.99286 5L0 8.99286L1.00714 10L5 6.00714L8.99286 10L10 8.99286L6.00714 5L10 1.00714Z"
                fill="#60697D"
              />
            </svg>
          </button>
        </div>
      </div>

      <div className="store-overlay-layout__body">
        {filteredStores.length === 0 ? (
          <NoData
            title={
              stores.length === 0
                ? "No stores data available"
                : "No stores found"
            }
            description={
              stores.length === 0
                ? "No stores available for this district"
                : "Try adjusting your search criteria"
            }
          />
        ) : (
          <div className="store-overlay-layout__list">
            {filteredStores.map((store) => (
              <StoreCard
                key={store.id}
                store={store}
                variant="modal"
                className="store-overlay-layout__store-card"
                onClick={handleStoreClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
