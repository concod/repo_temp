import React, { useState, useMemo } from 'react';
import './TopComments.scss';
import type { StoreComments as StoreCommentsType } from '../../../../types/dashboard.types';
import { StoreButton } from '../StoreButton/StoreButton';
import SmileyIcon from '../../../../assets/smiley-blue.svg';
import ArrowUpGreen from '../../../../assets/arrowup-green.svg';
import ArrowDownRed from '../../../../assets/arrowdown-red.svg';

export interface TopCommentsProps {
  data?: StoreCommentsType;
  loading?: boolean;
}

type FilterType = 'all' | 'positive' | 'negative';

// Format date for display
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  };
  return date.toLocaleDateString('en-US', options);
};

export const TopComments: React.FC<TopCommentsProps> = ({ 
  data,
  loading = false
}) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  // Filter comments based on active filter
  const filteredComments = useMemo(() => {
    if (!data?.comments) return [];
    
    switch (activeFilter) {
      case 'positive':
        return data.comments.filter(c => c.sentiment_label === 'positive');
      case 'negative':
        return data.comments.filter(c => c.sentiment_label === 'negative');
      default:
        return data.comments;
    }
  }, [data?.comments, activeFilter]);

  // Get sentiment icon
  const getSentimentIcon = (sentiment: 'positive' | 'negative' | 'neutral') => {
    switch (sentiment) {
      case 'positive':
        return <img src={ArrowUpGreen} alt="Positive" className="top-comments__sentiment-icon" />;
      case 'negative':
        return <img src={ArrowDownRed} alt="Negative" className="top-comments__sentiment-icon" />;
      default:
        return <img src={SmileyIcon} alt="Neutral" className="top-comments__sentiment-icon top-comments__sentiment-icon--neutral" />;
    }
  };

  // Show loading state
  if (loading) {
    return (
      <div className="top-comments">
        <div className="top-comments__loading">Loading comments...</div>
      </div>
    );
  }

  // Show empty state if no data
  if (!data || !data.comments || data.comments.length === 0) {
    return (
      <div className="top-comments">
        <div className="top-comments__empty">No comments available</div>
      </div>
    );
  }

  return (
    <div className="top-comments">
      {/* Header */}
      <div className="top-comments__header">
        <div className="top-comments__title-section">
          <img src={SmileyIcon} alt="Comments" className="top-comments__title-icon" />
          <span className="top-comments__title">Top Comments</span>
        </div>
        
        <div className="top-comments__actions">
          {/* Filter Buttons */}
          <div className="top-comments__filters">
            <button
              className={`top-comments__filter-btn ${activeFilter === 'all' ? 'top-comments__filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('all')}
              type="button"
            >
              All
            </button>
            <button
              className={`top-comments__filter-btn ${activeFilter === 'positive' ? 'top-comments__filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('positive')}
              type="button"
            >
              Positive
            </button>
            <button
              className={`top-comments__filter-btn ${activeFilter === 'negative' ? 'top-comments__filter-btn--active' : ''}`}
              onClick={() => setActiveFilter('negative')}
              type="button"
            >
              Negative
            </button>
          </div>
          
          {/* Share Button */}
          <StoreButton iconName="share" onClick={() => {}} />
        </div>
      </div>

      {/* Comments List */}
      <div className="top-comments__list">
        {filteredComments.map((comment, index) => (
          <div 
            key={`${comment.comment_date}-${index}`} 
            className={`top-comments__card top-comments__card--${comment.sentiment_label}`}
          >
            <div className="top-comments__card-content">
              <p className="top-comments__comment-text">{comment.comment_text}</p>
              <div className="top-comments__meta">
                <span className="top-comments__date">{formatDate(comment.comment_date)}</span>
              </div>
            </div>
            <div className="top-comments__sentiment">
              {getSentimentIcon(comment.sentiment_label)}
            </div>
          </div>
        ))}
      </div>

      {/* Show more indicator if there are many comments */}
      {filteredComments.length > 5 && (
        <div className="top-comments__more">
          Showing {Math.min(filteredComments.length, 10)} of {filteredComments.length} comments
        </div>
      )}
    </div>
  );
};

