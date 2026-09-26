import React from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

export interface PieChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      data: number[];
      backgroundColor: string[];
      borderWidth?: number;
      borderColor?: string;
    }>;
  };
  options?: any;
  className?: string;
}

const PieChart: React.FC<PieChartProps> = ({ 
  data, 
  options = {}, 
  className = '' 
}) => {
  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 0,
    plugins: {
      legend: {
        labels: { 
          color: '#04112B',
          font: {
            size: 12,
            family: 'Poppins, sans-serif'
          }
        },
        position: 'bottom' as const
      },
      tooltip: {
        backgroundColor: 'rgba(4, 17, 43, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#8834FF',
        borderWidth: 1,
        cornerRadius: 8,
        callbacks: {
          label: function(context: any) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ${value} (${percentage}%)`;
          }
        }
      }
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins
    }
  };

  return (
    <div className={`pie-chart ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Pie data={data} options={mergedOptions} />
    </div>
  );
};

export default PieChart;
