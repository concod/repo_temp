import React from 'react';
import './NoData.scss';
import NoDataIcon from '../../../assets/No-Data-Theme-2.svg';

export interface NoDataProps {
  title?: string;
  description?: string;
  className?: string;
}

export const NoData: React.FC<NoDataProps> = ({ 
  title = 'No data available',
  description = 'No data available for this store',
  className = ''
}) => {
  return (
    <div className={`no-data ${className}`}>
      <img src={NoDataIcon} alt="No data" />
      <h4 className="no-data__title">{title}</h4>
      <p className="no-data__description">{description}</p>
    </div>
  );
};

