import React from 'react';
import './StoreTable.scss';
import type { PersonAnalysisItem, CategorySalesData } from '../../../../types/dashboard.types';
import { Badge } from '../../../../../../shared/packages/ui';

export interface StoreTableProps {
  data?: PersonAnalysisItem[] | CategorySalesData[];
  loading?: boolean;
}

// Type guard to check if data is PersonAnalysisItem
const isPersonAnalysisItem = (item: PersonAnalysisItem | CategorySalesData): item is PersonAnalysisItem => {
  return 'member_name' in item;
};

// Format currency
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

// Format percentage
const formatPercentage = (value: number): string => {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const StoreTable: React.FC<StoreTableProps> = ({ 
  data,
  loading = false
}) => {
  // Show loading state
  if (loading) {
    return (
      <div className="store-table__container">
        <div className="store-table__loading">Loading data...</div>
      </div>
    );
  }

  // Show empty state if no data
  if (!data || data.length === 0) {
    return (
      <div className="store-table__container">
        <div className="store-table__empty">No data available</div>
      </div>
    );
  }

  // Determine data type from first item
  const isPersonData = data.length > 0 && isPersonAnalysisItem(data[0]);

  // Render Person Analysis table
  if (isPersonData) {
    const personData = data as PersonAnalysisItem[];
    return (
      <div className="store-table__container">
        <div className="store-table__scroll-wrapper">
          <table className="store-table__table">
            <thead className="store-table__table-header">
              <tr>
                <th className="store-table__header-cell store-table__header-team">Team Member</th>
                <th className="store-table__header-cell store-table__header-count">Positive</th>
                <th className="store-table__header-cell store-table__header-count">Negative</th>
                <th className="store-table__header-cell store-table__header-count">Net Sentiment</th>
                <th className="store-table__header-cell store-table__header-count">Overall Sentiment</th>
              </tr>
            </thead>
            <tbody className="store-table__table-body">
              {personData.map((member, index) => (
                <tr key={member.member_name || index}>
                  <td className="store-table__team-name">{member.member_name}</td>
                  <td className="store-table__positive-count">{member.positive_count}</td>
                  <td className="store-table__negative-count">{member.negative_count}</td>
                  <td className="store-table__sentiment-score">
                    {member.avg_sentiment_score.toFixed(2)}
                  </td>
                  <td className="store-table__net-sentiment">{member.avg_sentiment_score > 0 ? <Badge text="Positive" className="positive" /> : <Badge text="Negative" className="negative" />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Render Category Sales Performance table
  const salesData = data as CategorySalesData[];
  return (
    <div className="store-table__container">
      <div className="store-table__scroll-wrapper">
        <table className="store-table__table">
          <thead className="store-table__table-header">
            <tr>
              <th className="store-table__header-cell store-table__header-team">Category</th>
              <th className="store-table__header-cell store-table__header-count">Net Sales</th>
              <th className="store-table__header-cell store-table__header-count">MoM %</th>
              <th className="store-table__header-cell store-table__header-count">YoY %</th>
              <th className="store-table__header-cell store-table__header-count">Rank</th>
            </tr>
          </thead>
          <tbody className="store-table__table-body">
            {salesData.map((category, index) => (
              <tr key={category.Category || index}>
                <td className="store-table__team-name">{category.Category}</td>
                <td className="store-table__net-sales">{formatCurrency(category.net_sales)}</td>
                <td className="store-table__wow">
                  {formatPercentage(category.wow_pct)}
                </td>
                <td className="store-table__sentiment-score">
                  {formatPercentage(category.yoy_pct)}
                </td>
                <td className="store-table__rank">{category.rank}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};