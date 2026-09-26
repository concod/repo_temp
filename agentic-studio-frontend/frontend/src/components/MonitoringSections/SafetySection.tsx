import React, { useMemo, useState } from 'react';
import { StatCard } from '../StatCard';
import { LineChart, DoughnutChart } from '../Charts';
import type { SafetySectionProps } from '../../types/api';
import { LogsModal } from '../Modal';
// Button not needed — interactions handled via StatCard onClick

interface ChartCard {
  icon: string;
  iconClass: string;
  title: string;
  cardType: string;
  onClick?: () => void;
  renderChart: () => React.ReactNode;
}

export const SafetySection: React.FC<SafetySectionProps> = ({ safetyData, blockedLogs }) => {
  const [showBlocked, setShowBlocked] = useState(false);
  const closeBlocked = () => setShowBlocked(false);
  // Memoize chart cards configuration
  const chartCards = useMemo<ChartCard[]>(() => [
    {
      icon: 'fa-shield-alt',
      iconClass: 'safety-events',
      title: 'Safety Events Over Time',
      cardType: 'chart-card full-width',
      renderChart: () => (
        <LineChart
          data={{
            labels: safetyData.safetyEvents.labels,
            datasets: [{
              label: 'Safety Events',
              data: safetyData.safetyEvents.data,
              borderColor: '#10B981',
              backgroundColor: 'rgba(16,185,129,0.1)',
              fill: true,
              tension: 0.35
            }]
          }}
        />
      )
    },
    {
      icon: 'fa-exclamation-triangle',
      iconClass: 'refusals',
      title: 'Agent Refusals by Reason',
      cardType: 'chart-card half-width',
      // Clicking the StatCard opens the blocked logs modal
      onClick: () => setShowBlocked(true),
      renderChart: () => (
        <div style={{ position: 'relative' }}>
          {safetyData.refusals.labels.length > 0 ? (
            <DoughnutChart
              data={{
                labels: safetyData.refusals.labels,
                datasets: [{
                  data: safetyData.refusals.data,
                  // Swapped colors: Blocked (red) and Allowed (green) were reversed
                  backgroundColor: ['#10B981', '#EF4444', '#F59E0B', '#8834FF', '#06B6D4'],
                  borderWidth: 2,
                  borderColor: '#FFFFFF'
                }]
              }}
            />
          ) : (
            <div className="empty-state">
              <div className="empty-icon">--</div>
            </div>
          )}
        </div>
      )
    },
  ], [safetyData.safetyEvents, safetyData.refusals]);

  return (
    <div className="dashboard-section">
      <h2 className="section-title headline-3">AI Safety & Responsibility Guardrails</h2>
      <div className="safety-grid">
        {chartCards.map((card, index) => (
          <StatCard
            key={index}
            icon={card.icon}
            iconClass={card.iconClass}
            title={card.title}
            cardType={card.cardType}
            onClick={card.onClick}
          >
            <div className="chart-container">
              {card.renderChart()}
            </div>
          </StatCard>
        ))}

        <StatCard
          icon="fa-ban"
          iconClass="blocked-topics"
          title="Top Blocked Topics"
          cardType="list-card"
        >
          <div className="scrollable-list">
            {safetyData.blockedTopics.length > 0 ? (
              safetyData.blockedTopics.map(([topic, count], idx) => (
                <div key={idx} className="usage-item">
                  <span>{topic}</span>
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
        </StatCard>

        <StatCard
          icon="fa-search"
          iconClass="traceability"
          title="Traceability — Recent Request IDs"
          cardType="list-card"
        >
          <div className="scrollable-list">
            {safetyData.requests.length > 0 ? (
              safetyData.requests.map((request, idx) => (
                <div key={idx} className="request-item">
                  <div className="request-details">
                    <span className="request-id">{request.id}</span>
                    <span className="request-timestamp">{request.timestamp}</span>
                  </div>
                  <span className={`request-status ${request.status}`}>
                    {request.statusLabel}
                  </span>
                </div>
              ))
            ) : (
              <div className="usage-item">
                <span>No data</span>
                <span className="usage-count">--</span>
              </div>
            )}
          </div>
        </StatCard>
        {showBlocked && (
          <LogsModal onClose={closeBlocked} title="Blocked Logs" logs={blockedLogs || []} />
        )}
      </div>
    </div>
  );
};