import React, { useMemo } from 'react';
import { StatCard } from '../StatCard';
import { formatCurrency } from '../../utils/dataProcessing';
import type { ExecutiveOverviewProps } from '../../types/api';

export const ExecutiveOverview: React.FC<ExecutiveOverviewProps> = ({
  metrics,
  fromDate,
  toDate
}) => {
  // Memoize health status calculation
  const healthStatus = useMemo(() => {
    const errorRate = 100 - metrics.successRate;
    const breachError = errorRate >= 2;
    const breachP95 = metrics.p95Latency >= 800;
    const breaches = [breachError, breachP95].filter(Boolean).length;
    
    return breaches >= 2 ? 'ALERT' : (breaches >= 1 ? 'WARN' : 'OK');
  }, [metrics.successRate, metrics.p95Latency]);

  const healthDetail = useMemo(
    () => `Success: ${metrics.successRate.toFixed(2)}%, P95: ${(metrics.p95Latency / 1000).toFixed(2)}s, P99: ${(metrics.p99Latency / 1000).toFixed(2)}s`,
    [metrics.successRate, metrics.p95Latency, metrics.p99Latency]
  );

  // Memoize stat cards configuration
  const statCards = useMemo(() => [
    {
      icon: 'fa-heartbeat',
      iconClass: 'health',
      title: 'Overall Agent Health',
      value: healthStatus,
      detail: healthDetail
    },
    {
      icon: 'fa-comments',
      iconClass: 'interactions',
      title: 'Total Interactions',
      value: metrics.interactions > 0 ? metrics.interactions.toString() : '--',
      detail: `From ${fromDate} to ${toDate}`
    },
    {
      icon: 'fa-dollar-sign',
      iconClass: 'cost',
      title: 'Total Cost',
      value: formatCurrency(metrics.totalCost),
      detail: `From ${fromDate} to ${toDate}`
    }
  ], [healthStatus, healthDetail, metrics.totalInteractions, metrics.totalCost, fromDate, toDate]);

  return (
    <div className="dashboard-section">
      <h2 className="section-title headline-3">Executive Overview</h2>
      <div className="stats-grid">
        {statCards.map((card, index) => (
          <StatCard
            key={index}
            icon={card.icon}
            iconClass={card.iconClass}
            title={card.title}
            value={card.value}
            detail={card.detail}
          />
        ))}
      </div>
    </div>
  );
};
