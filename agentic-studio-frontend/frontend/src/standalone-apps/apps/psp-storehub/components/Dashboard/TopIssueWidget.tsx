import React from 'react';
import { motion } from 'framer-motion';

interface TopIssueWidgetProps {
  theme: string;
  percentage: number;
  description: string;
}

export const TopIssueWidget: React.FC<TopIssueWidgetProps> = ({
  theme,
  percentage,
  description
}) => {
  return (
    <motion.div
      className="top-issue-widget"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.4 }}
    >
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">
            Top Negative Customer Theme
          </h3>
          <span className="widget-subtitle">Most frequent customer concern</span>
        </div>
      </div>
      
      <div className="widget-content">
        <div className="issue-theme">
          <span className="theme-name">{theme}</span>
          <div className="theme-stats">
            <span className="percentage">{percentage}%</span>
            <span className="description">{description}</span>
          </div>
        </div>
        
        <div className="issue-visual">
          <div className="progress-ring">
            <svg width="80" height="80" viewBox="0 0 80 80">
              <circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="var(--color-border)"
                strokeWidth="8"
              />
              <motion.circle
                cx="40"
                cy="40"
                r="30"
                fill="none"
                stroke="var(--color-danger)"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 30}`}
                strokeDashoffset={`${2 * Math.PI * 30 * (1 - percentage / 100)}`}
                initial={{ strokeDashoffset: `${2 * Math.PI * 30}` }}
                animate={{ strokeDashoffset: `${2 * Math.PI * 30 * (1 - percentage / 100)}` }}
                transition={{ duration: 1, delay: 0.5 }}
              />
            </svg>
            <div className="ring-center">
              <span className="ring-percentage">{percentage}%</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
