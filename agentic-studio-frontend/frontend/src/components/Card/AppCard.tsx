import React from 'react';
import { DefaultStrokeLabel } from "../Label";
import star from "../../assets/images/card-star-group.svg"

/**
 * Props interface for AppCard component
 */
export interface AppCardProps {
  /** Card title/name */
  title: string;
  /** Card description */
  description: string;
  /** Array of tags to display */
  tags: string[];
  /** URL to open when card is clicked */
  link: string;
  /** Optional feedback count (defaults to 10) */
  feedbackCount?: number;
  /** Optional author name */
  authorName?: string;
  /** Optional gradient index for background styling (0-based, cycles through 4 gradients) */
  gradientIndex?: number;
}

/**
 * AppCard Component
 * Displays an interactive card with title, description, tags, and click-to-open functionality
 */
const AppCard: React.FC<AppCardProps> = ({ 
  title, 
  description, 
  tags, 
  link, 
  feedbackCount = 10,
  authorName = "Ajun Ravi",
  gradientIndex = 0
}) => {
  /**
   * Handle card click - opens link in new tab
   */
  const handleCardClick = () => {
    if (link) {
      window.open(link, '_blank', 'noopener,noreferrer');
    }
  };

  /**
   * Get gradient background based on index (cycles through 4 gradients)
   */
  const getGradientBackground = () => {
    const gradientNumber = (gradientIndex % 4) + 1;
    return `var(--card-background-gradient-${gradientNumber})`;
  };


  return (
    <div 
      className="app-card"
      onClick={handleCardClick}
      tabIndex={0}
      role="button"
      aria-label={`Open ${title} in new tab`}
      style={{ 
        cursor: link ? 'pointer' : 'default',
        background: getGradientBackground()
      }}
    >
        <div className="app-card__body">
            <div className="app-card__body-header">
                <span className="app-card__body-header-title body-medium--medium" title={title}>
                  {title}
                </span>
                <div className="app-card__body-header-feedback">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="12" viewBox="0 0 16 14" fill="none">
                        <path d="M10.1187 0.0841185C8.925 -0.256506 7.67812 0.434118 7.3375 1.62787L7.15938 2.25287C7.04375 2.65912 6.83438 3.03412 6.55 3.34662L4.94688 5.10912C4.66875 5.41537 4.69062 5.89037 4.99687 6.16849C5.30312 6.44662 5.77813 6.42474 6.05625 6.11849L7.65938 4.35599C8.1 3.87162 8.42188 3.29349 8.6 2.66537L8.77812 2.04037C8.89062 1.64349 9.30625 1.41224 9.70625 1.52474C10.1062 1.63724 10.3344 2.05287 10.2219 2.45287L10.0437 3.07787C9.86562 3.69974 9.58437 4.28724 9.2125 4.81224C9.05 5.04037 9.03125 5.34037 9.15938 5.59037C9.2875 5.84037 9.54375 5.99662 9.825 5.99662H14C14.275 5.99662 14.5 6.22162 14.5 6.49662C14.5 6.70912 14.3656 6.89349 14.175 6.96537C13.9438 7.05287 13.7688 7.24662 13.7094 7.48724C13.65 7.72787 13.7125 7.98099 13.875 8.16537C13.9531 8.25287 14 8.36849 14 8.49662C14 8.74037 13.825 8.94349 13.5938 8.98724C13.3375 9.03724 13.1219 9.21537 13.0312 9.46224C12.9406 9.70912 12.9812 9.98412 13.1438 10.1904C13.2094 10.2747 13.25 10.381 13.25 10.4997C13.25 10.7091 13.1187 10.8935 12.9312 10.9654C12.5719 11.106 12.3781 11.4935 12.4812 11.8654C12.4937 11.906 12.5 11.9529 12.5 11.9997C12.5 12.2747 12.275 12.4997 12 12.4997H8.95312C8.55937 12.4997 8.17188 12.3841 7.84375 12.1654L5.91563 10.881C5.57188 10.6497 5.10625 10.7435 4.875 11.0904C4.64375 11.4372 4.7375 11.8997 5.08437 12.131L7.0125 13.4154C7.5875 13.7997 8.2625 14.0029 8.95312 14.0029H12C13.0844 14.0029 13.9656 13.1404 14 12.0654C14.4563 11.6997 14.75 11.1372 14.75 10.5029C14.75 10.3622 14.7344 10.2279 14.7094 10.0966C15.1906 9.73099 15.5 9.15287 15.5 8.50287C15.5 8.29974 15.4688 8.10287 15.4125 7.91849C15.775 7.54974 16 7.04974 16 6.49662C16 5.39349 15.1062 4.49662 14 4.49662H11.1156C11.2625 4.17162 11.3875 3.83412 11.4844 3.49037L11.6625 2.86537C12.0031 1.67162 11.3125 0.424744 10.1187 0.0841185ZM1 4.99662C0.446875 4.99662 0 5.44349 0 5.99662V12.9966C0 13.5497 0.446875 13.9966 1 13.9966H3C3.55312 13.9966 4 13.5497 4 12.9966V5.99662C4 5.44349 3.55312 4.99662 3 4.99662H1Z" fill="#228C54"/>
                    </svg>
                    <span className="app-card__body-header-feedback-text">
                      {feedbackCount}
                    </span>
                </div>
            </div>
            <div 
              className="app-card__body-desc body-small" 
              title={description}
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minHeight: '48px',
              }}
            >
              {description}
            </div>
            <div className="app-card__body-tags">
                {tags.map((tag, index) => (
                  <DefaultStrokeLabel key={index} textClassName="body-small">
                    {tag}
                  </DefaultStrokeLabel>
                ))}
            </div>
            <div className="app-card__body-author">
                <span className="app-card__body-author-name body-small">
                  created by {authorName}
                </span>
            </div>
        </div>
        <div className="app-card__stars">
            <img src={star} alt="star" />
        </div>
    </div>);
};

export default AppCard;