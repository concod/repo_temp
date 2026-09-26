import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export interface LineChartProps {
  data: {
    labels: string[];
    datasets: Array<{
      label: string;
      data: number[];
      borderColor: string;
      backgroundColor: string;
      fill?: boolean;
      tension?: number;
    }>;
  };
  options?: any;
  className?: string;
}

const LineChart: React.FC<LineChartProps> = ({ 
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
        }
      },
      tooltip: {
        backgroundColor: 'rgba(4, 17, 43, 0.95)',
        titleColor: '#FFFFFF',
        bodyColor: '#FFFFFF',
        borderColor: '#8834FF',
        borderWidth: 1,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        ticks: { 
          color: '#4B5767',
          font: {
            size: 11,
            family: 'Poppins, sans-serif'
          }
        },
        grid: { 
          color: '#E5E7E9',
          borderColor: '#C3C8D4'
        }
      },
      y: {
        ticks: { 
          color: '#4B5767',
          font: {
            size: 11,
            family: 'Poppins, sans-serif'
          }
        },
        grid: { 
          color: '#E5E7E9',
          borderColor: '#C3C8D4'
        }
      }
    },
    elements: {
      point: {
        radius: 3,
        hoverRadius: 6,
        backgroundColor: '#8834FF',
        borderColor: '#FFFFFF',
        borderWidth: 2
      }
    }
  };

  const mergedOptions = {
    ...defaultOptions,
    ...options,
    plugins: {
      ...defaultOptions.plugins,
      ...options.plugins
    },
    scales: {
      ...defaultOptions.scales,
      ...options.scales
    }
  };

  return (
    <div className={`line-chart ${className}`} style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Line data={data} options={mergedOptions} />
    </div>
  );
};

export default LineChart;
