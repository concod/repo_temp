import React, { useMemo } from 'react';
import { StatCard } from '../StatCard';
import { PieChart } from '../Charts';
import type { ClientAnalyticsSectionProps } from '../../types/api';

interface ExtendedClientAnalyticsSectionProps extends ClientAnalyticsSectionProps {
  onCountryClick?: (country: string) => void;
}

export const ClientAnalyticsSection: React.FC<ExtendedClientAnalyticsSectionProps> = ({
  clientAnalytics,
  clientAnalyticsLoading,
  onCountryClick
}) => {
  // Memoize stat cards configuration
  const statCards = useMemo(() => [
    {
      icon: 'fa-map-marker-alt',
      iconClass: 'location',
      title: 'Client Locations',
      cardType: 'chart-card half-width',
      renderContent: () => (
        <div className="chart-container">
          {clientAnalytics.length > 0 ? (
            <PieChart
              data={{
                labels: clientAnalytics.map(([country]) => country),
                datasets: [{
                  data: clientAnalytics.map(([, count]) => count),
                  backgroundColor: [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#6B7280', '#06B6D4', '#14B8A6', '#A78BFA', '#F97316'
                  ],
                  borderWidth: 0
                }]
              }}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">
                {clientAnalyticsLoading ? '...' : '--'}
              </div>
            </div>
          )}
        </div>
      )
    },
    {
      icon: 'fa-building',
      iconClass: 'clients',
      title: 'Client Locations List',
      cardType: 'list-card',
      renderContent: () => (
        <div className="scrollable-list">
          {clientAnalyticsLoading ? (
            <div className="usage-item">
              <span>Loading locations...</span>
              <span className="usage-count">...</span>
            </div>
          ) : clientAnalytics.length > 0 ? (
            clientAnalytics.map(([country, count], idx) => (
              <div 
                key={idx} 
                className="usage-item"
                style={{ 
                  cursor: onCountryClick ? 'pointer' : 'default',
                  transition: 'background-color 0.2s'
                }}
                onClick={onCountryClick ? () => onCountryClick(country) : undefined}
                onMouseEnter={onCountryClick ? (e) => e.currentTarget.style.backgroundColor = '#f8f9fa' : undefined}
                onMouseLeave={onCountryClick ? (e) => e.currentTarget.style.backgroundColor = 'transparent' : undefined}
              >
                <span>{country}</span>
                <span className="usage-count">{count}</span>
              </div>
            ))
          ) : (
            <div className="usage-item">
              <span>No data</span>
              <span className="usage-count">--</span>
            </div>
          )}
        </div>
      )
    }
  ], [clientAnalytics, clientAnalyticsLoading, onCountryClick]);

  return (
    <div className="dashboard-section">
      <h2 className="section-title headline-3">Client Analytics</h2>
      <div className="client-grid">
        {statCards.map((card, index) => (
          <StatCard
            key={index}
            icon={card.icon}
            iconClass={card.iconClass}
            title={card.title}
            cardType={card.cardType}
          >
            {card.renderContent()}
          </StatCard>
        ))}
      </div>
    </div>
  );
};