import React, { useState } from 'react';
import { StoreButton } from '../StoreButton/StoreButton';
import './StoreCard.scss';
import NoData from "../../../../assets/No-Data-Theme-1.svg";


export interface StoreCardProps {
  title: string;
  tabs?: boolean;
  issuesCount?: number;
  summaryCount?: number;
  noData?: boolean;
  icon: React.ReactNode;
  content?: React.ReactNode;

  onTabChange?: (tab: 'issues' | 'summary') => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  title = '',
  icon,
  tabs = false,
  issuesCount = 0,
  summaryCount = 0,
  noData = true,
  content,
  onTabChange
}) => {
  const [activeTab, setActiveTab] = useState<'issues' | 'summary'>('issues');

  const handleTabClick = (tab: 'issues' | 'summary') => {
    setActiveTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  return (
    <div className="store-card">
      <div className="store-card__header">
        <div className="store-card__title-section">
          <div className="store-card__title-icon">
            {icon}
          </div>
          <div className="store-card__title-text">
            {title}
          </div>
        </div>
        <div className="store-card__right-section">
          {
            tabs && (
              <div className="store-card__tabs">
          <button
              className={`store-card__tab ${activeTab === 'summary' ? 'store-card__tab-active' : 'store-card__tab-not-selected'}`}
              onClick={() => handleTabClick('summary')}
              type="button"
            >
              Summary
              {summaryCount > 0 && (
                <span className="store-card__tab-badge">
                  {summaryCount}
                </span>
              )}
            </button>
            <button
              className={`store-card__tab ${activeTab === 'issues' ? 'store-card__tab-active' : 'store-card__tab-not-selected'}`}
              onClick={() => handleTabClick('issues')}
              type="button"
            >
              Issues
              {issuesCount > 0 && (
                <span className="store-card__tab-badge">
                  {issuesCount}
                </span>
              )}
            </button>
            
          </div>
            )
          }
          
          <div className="store-card__buttons">
            <StoreButton iconName="download"
            onClick={() => {}}
            />
            <StoreButton iconName="share"
            onClick={() => {}}
            />
          </div>
        </div>
      </div>
      <div className="store-card__content">
        {
          noData && (
            <div className="store-card__no-data">
                <img src={NoData} alt="No data" />
                <h4 className="store-card__no-data-title">No data available</h4>
                <p className="store-card__no-data-description">No data available for this store</p>
            </div>
          )
        }
        {
          !noData && (
            content
          )
        }
        
        {/* {activeTab === 'issues' && (
          <div className="store-card__content-section">
            <p>Issues content will be displayed here</p>
          </div>
        )}
        {activeTab === 'summary' && (
          <div className="store-card__content-section">
            <p>Summary content will be displayed here</p>
          </div>
        )} */}
      </div>
    </div>
  );
};
