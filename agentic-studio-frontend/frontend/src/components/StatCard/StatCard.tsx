import React, { type ReactNode } from 'react';

export interface StatCardProps {
  icon: string;
  iconClass: string;
  title: string;
  value?: string | number;
  detail?: string;
  children?: ReactNode;
  className?: string;
  cardType?: string;
  onClick?: () => void;
}

const StatCard: React.FC<StatCardProps> = ({
  icon,
  iconClass,
  title,
  value,
  detail,
  children,
  className = '',
  cardType = 'default',
  onClick
}) => {
  const cardClasses = [
    'stat-card',
    cardType,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={cardClasses}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {/* Card Header */}
      <div className="stat-card-header">
        <div className={`stat-icon ${iconClass}`}>
          <i className={`fas ${icon}`}></i>
        </div>
        <h3>{title}</h3>
      </div>
      
      {/* Card Body */}
      <div className="stat-card-body">
        {value !== undefined && (
          <p className="stat-value">{value}</p>
        )}
        {detail && (
          <span className="stat-detail">{detail}</span>
        )}
        {children}
      </div>
    </div>
  );
};

export default StatCard;
