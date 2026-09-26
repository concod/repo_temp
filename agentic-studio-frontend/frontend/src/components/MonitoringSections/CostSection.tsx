import React from 'react';
import { StatCard } from '../StatCard';
import { LineChart } from '../Charts';
import { formatCurrency } from '../../utils/dataProcessing';
import type { CostSectionProps } from '../../types/api';

export const CostSection: React.FC<CostSectionProps> = ({
  charts,
  metrics
}) => {
  // Use pre-calculated charts
  const { labels, cost, tokens } = charts;

  return (
    <div className="dashboard-section">
      <h2 className="section-title headline-3">Cost & Efficiency Governance</h2>
      <div className="cost-grid">
        <StatCard
          icon="fa-chart-area"
          iconClass="cost-trend"
          title="Cost Over Time"
          cardType="chart-card full-width"
        >
          <div className="chart-container">
            <LineChart
              data={{
                labels: labels,
                datasets: [{
                  label: 'Cost ($)',
                  data: cost,
                  borderColor: '#F59E0B',
                  backgroundColor: 'rgba(245,158,11,0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
              options={{
                scales: {
                  y: {
                    ticks: {
                      callback: (value: string | number) => '$' + Number(value).toFixed(2)
                    }
                  }
                }
              }}
            />
          </div>
        </StatCard>

        <StatCard
          icon="fa-coins"
          iconClass="tokens"
          title="Average Tokens per Interaction"
          cardType="chart-card full-width"
        >
          <div className="chart-container">
            <LineChart
              data={{
                labels: labels,
                datasets: [{
                  label: 'Avg Tokens',
                  data: tokens,
                  borderColor: '#EAB308',
                  backgroundColor: 'rgba(234,179,8,0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
            />
          </div>
        </StatCard>

        <StatCard
          icon="fa-robot"
          iconClass="agent-cost"
          title="Cost by Model"
          cardType="list-card half-width"
        >
          <div className="scrollable-list">
            {metrics.costByModel?.length > 0 ? (
              metrics.costByModel.map(([model, cost], idx) => (
                <div key={idx} className="usage-item">
                  <span>{model}</span>
                  <span className="usage-count">{formatCurrency(cost)}</span>
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
      </div>
    </div>
  );
};