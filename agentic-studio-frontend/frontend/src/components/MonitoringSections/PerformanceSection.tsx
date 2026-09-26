import React, { useState } from 'react';
import { StatCard } from '../StatCard';
import { LineChart, PieChart } from '../Charts';
import type { PerformanceSectionProps } from '../../types/api';
import { LogsModal } from '../Modal';

export const PerformanceSection: React.FC<PerformanceSectionProps> = ({
  charts,
  metrics,
  errorLogs
}) => {
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  
  // Charts are already calculated by backend
  const { labels, latency, throughput } = charts;

  return (
    <div className="dashboard-section">
      <h2 className="section-title headline-3">Performance & Reliability</h2>
      <div className="performance-grid">
        <StatCard
          icon="fa-tachometer-alt"
          iconClass="latency"
          title="Agent Latency"
          cardType="chart-card full-width"
        >
          <div className="metric-inline">
            p95: <span>{(metrics.p95Latency / 1000).toFixed(2)}s</span> • 
            p99: <span>{(metrics.p99Latency / 1000).toFixed(2)}s</span>
          </div>
          <div className="chart-container">
            <LineChart
              data={{
                labels: labels,
                datasets: [{
                  label: 'Latency (s)',
                  data: latency,
                  borderColor: '#6366F1',
                  backgroundColor: 'rgba(99,102,241,0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
            />
          </div>
        </StatCard>

        <StatCard
          icon="fa-chart-line"
          iconClass="throughput"
          title="Throughput"
          cardType="chart-card full-width"
        >
          <div className="metric-inline">
            RPM: <span>{metrics.rpm.toFixed(2)}</span>
          </div>
          <div className="chart-container">
            <LineChart
              data={{
                labels: labels,
                datasets: [{
                  label: 'Requests (count)',
                  data: throughput,
                  borderColor: '#06B6D4',
                  backgroundColor: 'rgba(6,182,212,0.1)',
                  fill: true,
                  tension: 0.4
                }]
              }}
            />
          </div>
        </StatCard>

        <StatCard
          icon="fa-chart-pie"
          iconClass="outcomes"
          title="Interaction Outcomes"
          cardType="chart-card half-width"
          onClick={() => setShowErrorLogs(true)}
        >
          <div className="chart-container" style={{ position: 'relative' }}>
            {metrics.totalInteractions > 0 ? (
              <PieChart
                data={{
                  labels: ['Success', 'Error'],
                  datasets: [{
                    data: [metrics.successRate, 100 - metrics.successRate],
                    backgroundColor: ['#10B981', '#EF4444'],
                    borderWidth: 0
                  }]
                }}
              />
            ) : (
              <div className="empty-state">
                <div className="empty-icon">--</div>
              </div>
            )}
          </div>
        </StatCard>

        {/* Lists - pre-calculated by backend */}
        <StatCard
          icon="fa-robot"
          iconClass="agents"
          title="Most Used Agents"
          cardType="list-card half-width"
        >
          <div className="scrollable-list">
            {metrics.mostUsedAgents?.length > 0 ? metrics.mostUsedAgents.map(([name, count], idx) => (
              <div key={idx} className="usage-item">
                <span>{name}</span><span className="usage-count">{count}</span>
              </div>
            )) : <div className="usage-item"><span>No data</span></div>}
          </div>
        </StatCard>

        <StatCard
          icon="fa-tools"
          iconClass="tools"
          title="Most Used Tools"
          cardType="list-card half-width"
        >
          <div className="scrollable-list">
            {metrics.mostUsedTools?.length > 0 ? metrics.mostUsedTools.map(([name, count], idx) => (
              <div key={idx} className="usage-item">
                <span>{name}</span><span className="usage-count">{count}</span>
              </div>
            )) : <div className="usage-item"><span>No data</span></div>}
          </div>
        </StatCard>

        <StatCard
          icon="fa-brain"
          iconClass="models"
          title="Most Used Models"
          cardType="list-card half-width"
        >
          <div className="scrollable-list">
            {metrics.mostUsedModels?.length > 0 ? metrics.mostUsedModels.map(([name, count], idx) => (
              <div key={idx} className="usage-item">
                <span>{name}</span><span className="usage-count">{count}</span>
              </div>
            )) : <div className="usage-item"><span>No data</span></div>}
          </div>
        </StatCard>

        {showErrorLogs && (
          <LogsModal onClose={() => setShowErrorLogs(false)} title="Error Logs" logs={errorLogs || []} />
        )}
      </div>
    </div>
  );
};