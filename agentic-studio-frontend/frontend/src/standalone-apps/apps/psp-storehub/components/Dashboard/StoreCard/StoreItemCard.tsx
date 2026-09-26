import React from 'react';
import './StoreItemCard.scss';
import type {Store } from "../../../types/dashboard.types";
import { Badge } from '../../../../../shared/packages/ui';



export interface StoreCardProps {
  store: Store;
  onClick?: (storeId: string) => void;
  variant?: 'modal' | 'grid';
  className?: string;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  onClick,
  variant = 'grid',
  className = ''
}) => {
  const handleClick = () => {
    if (onClick) {
      onClick(store.id);
    }
  };

  const cardClassName = `store-item-card store-item-card--${variant} ${className}`.trim();

  // Get the stats value (currently hardcoded, but can be made dynamic later)
  const getStatsValueClass = (direction: 'up' | 'down' | 'neutral' | null) => {
    return direction==='up' ? 'store-item-card__content-stats-value--high' : direction==='down' ? 'store-item-card__content-stats-value--low' : 'store-item-card__content-stats-value--neutral';
  };

  return (
    <div
      className={cardClassName}
      onClick={handleClick}
      style={{ cursor: onClick ? "pointer" : "default" }}
    >
      <div className="store-item-card__header">
        <div className="store-item-card__header-left">
          <h4 className="store-item-card__name">{store.name}</h4>
          <div className="store-item-card__location">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="10"
              height="10"
              viewBox="0 0 10 10"
              fill="none"
            >
              <path
                d="M4.99984 4.99992C4.5415 4.99992 4.1665 4.62492 4.1665 4.16659C4.1665 3.70825 4.5415 3.33325 4.99984 3.33325C5.45817 3.33325 5.83317 3.70825 5.83317 4.16659C5.83317 4.62492 5.45817 4.99992 4.99984 4.99992ZM7.49984 4.24992C7.49984 2.73742 6.39567 1.66659 4.99984 1.66659C3.604 1.66659 2.49984 2.73742 2.49984 4.24992C2.49984 5.22492 3.31234 6.51659 4.99984 8.05825C6.68734 6.51659 7.49984 5.22492 7.49984 4.24992ZM4.99984 0.833252C6.74984 0.833252 8.33317 2.17492 8.33317 4.24992C8.33317 5.63325 7.22067 7.27075 4.99984 9.16659C2.779 7.27075 1.6665 5.63325 1.6665 4.24992C1.6665 2.17492 3.24984 0.833252 4.99984 0.833252Z"
                fill="#7A8294"
              />
            </svg>
            <span>{store.location.label}</span>
          </div>
        </div>
        {variant === "modal" && (
          <div className="store-item-card__header-stats">
            <div className="store-item-card__content-stats-label">NRR : </div>
            <div
              className={`store-item-card__content-stats-value ${getStatsValueClass(
                store.kpiDeltas.nrr.direction
              )}`}
            >
              {store.kpiDeltas.nrr.value || "No Data"}
            </div>
            <div className="store-item-card__content-stats-divider"></div>
            <div className="store-item-card__content-stats-label">REVV : </div>
            <div
              className={`store-item-card__content-stats-value ${getStatsValueClass(
                store.kpiDeltas.revv.direction
              )}`}
            >
              {store.kpiDeltas.revv.value || "No Data"}
            </div>
          </div>
        )}
      </div>

      {variant !== "modal" && (
        <div className="store-item-card__content">
          <div className="store-item-card__content-stats">
            <div className="store-item-card__content-stats-label">NRR : </div>
            <div
              className={`store-item-card__content-stats-value ${getStatsValueClass(
                store.kpiDeltas.nrr.direction
              )}`}
            >
              {" "}
              {store.kpiDeltas.nrr.value || "No Data"}
            </div>
            <div className="store-item-card__content-stats-divider"></div>
            <div className="store-item-card__content-stats-label">REVV : </div>
            <div
              className={`store-item-card__content-stats-value ${getStatsValueClass(
                store.kpiDeltas.revv.direction
              )}`}
            >
              {store.kpiDeltas.revv.value || "No Data"}
            </div>
          </div>
        </div>
      )}

      {store.tags.length > 0 &&
        store.tags[0] &&
        store.tags[0].themes.length > 0 && (
          <div className="store-item-card__footer">
            <div className="store-item-card__content-comments">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="11"
                height="11"
                viewBox="0 0 11 11"
                fill="none"
              >
                <path
                  d="M4.875 7.04167H5.95833V8.125H4.875V7.04167ZM4.875 2.70833H5.95833V5.95833H4.875V2.70833ZM5.41667 0C2.42125 0 0 2.4375 0 5.41667C0 6.85326 0.570683 8.23101 1.5865 9.24683C2.08949 9.74981 2.68662 10.1488 3.3438 10.421C4.00098 10.6932 4.70534 10.8333 5.41667 10.8333C6.85326 10.8333 8.23101 10.2627 9.24683 9.24683C10.2627 8.23101 10.8333 6.85326 10.8333 5.41667C10.8333 4.70534 10.6932 4.00098 10.421 3.3438C10.1488 2.68662 9.74981 2.08949 9.24683 1.5865C8.74384 1.08352 8.14672 0.684532 7.48954 0.412319C6.83236 0.140106 6.12799 0 5.41667 0ZM5.41667 9.75C4.2674 9.75 3.16519 9.29345 2.35254 8.4808C1.53988 7.66814 1.08333 6.56594 1.08333 5.41667C1.08333 4.2674 1.53988 3.16519 2.35254 2.35254C3.16519 1.53988 4.2674 1.08333 5.41667 1.08333C6.56594 1.08333 7.66814 1.53988 8.4808 2.35254C9.29345 3.16519 9.75 4.2674 9.75 5.41667C9.75 6.56594 9.29345 7.66814 8.4808 8.4808C7.66814 9.29345 6.56594 9.75 5.41667 9.75Z"
                  fill="#1F2B4D"
                />
              </svg>
              <span className="store-item-card__content-comments-label">
                Top Issue :
              </span>
              {variant === "modal" ? (
                // Modal variant: Show all themes as badges
                store.tags.flatMap((tag, tagIndex) =>
                  tag.themes.map((theme, themeIndex) => (
                    <Badge
                      key={`${tagIndex}-${themeIndex}`}
                      text={theme.value}
                      className={`store-item-card__content-comments-badge-${theme.type}`}
                    />
                  ))
                )
              ) : (
                // Grid variant: Show only first theme as text
                // <span className='store-item-card__content-comments-value'>{store.tags[0].themes[0].value}</span>
                <Badge
                  key={`${store.tags[0].themes[0].value}`}
                  text={store.tags[0].themes[0].value}
                  className={`store-item-card__content-comments-badge-${store.tags[0].themes[0].type}`}
                />
              )}
            </div>
          </div>
        )}
    </div>
  );
};

