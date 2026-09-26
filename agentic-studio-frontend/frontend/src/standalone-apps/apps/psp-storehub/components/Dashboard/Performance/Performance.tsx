import React, { useRef, useEffect, useState } from 'react';
import './Performance.scss';
import ShareIcon from '../../../assets/share-button.svg';
import DownloadIcon from '../../../assets/download-button.svg';
import { BubbleChart } from '../Charts';
import { NoData } from '../NoData';
import PerformanceIcon from "../../../assets/forecast.svg";
import type { PerformanceChart } from '../../../types/dashboard.types';

export interface DataPoint {
  x: number;
  y: number;
  z?: number; // Optional z value for bubble size
}



export interface PerformanceProps {
  data?: PerformanceChart;
  className?: string;
}

export const Performance: React.FC<PerformanceProps> = ({ data, className }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [chartHeight, setChartHeight] = useState<number>(300);

  const bubbleData: { x: number; y: number; z: number; name?: string }[] = (data && data.chart && Array.isArray(data.chart.dataPoints) && data.chart.dataPoints.length > 0)
    ? data.chart.dataPoints.map((point: any) => {
        if (Array.isArray(point)) {
          const x = Number(point[0]) ?? 0;
          const y = Number(point[1]) ?? 0;
          const nameOrZ = point[2];
          
          // If third element is a string, use it as name; otherwise use as z
          if (typeof nameOrZ === 'string') {
            return {
              x,
              y,
              z: 1, // Fixed size since we're using name instead
              name: nameOrZ
            };
          }
          
          const z = Number(nameOrZ) ?? 1;
          return { x, y, z };
        }

        // object shape { x, y, z, name }
        const x = Number(point.x ?? point[0]) ?? 0;
        const y = Number(point.y ?? point[1]) ?? 0;
        const z = Number(point.z ?? point[2]) ?? 1;
        return {
          x,
          y,
          z,
          name: point.name
        };
      }) : [];

  const hasData = bubbleData.length > 0;

  // Calculate chart height based on container
  useEffect(() => {
    const updateChartHeight = () => {
      if (chartContainerRef.current) {
        const height = chartContainerRef.current.clientHeight;
        setChartHeight(Math.max(height - 16, 250)); // Subtract padding, min 250px
      }
    };

    // Initial calculation
    const timeoutId = setTimeout(updateChartHeight, 0);
    
    // Use ResizeObserver for better accuracy
    let resizeObserver: ResizeObserver | null = null;
    if (chartContainerRef.current && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(updateChartHeight);
      resizeObserver.observe(chartContainerRef.current);
    } else {
      // Fallback to window resize
      window.addEventListener('resize', updateChartHeight);
    }

    return () => {
      clearTimeout(timeoutId);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', updateChartHeight);
      }
    };
  }, [hasData]);

  return (
    <div className={`performance-card ${className ?? ''}`}>
      <div className="performance-card__header">
        <div className="performance-card__title-section">
        <div className="performance-card__icon">
          <img src={PerformanceIcon} alt="Performance" />
        </div>
        <div className="performance-card__title">{data?.title || 'Performance'}</div>
        </div>
        
        <div className="performance-card__share">
          <img src={ShareIcon} alt="Share" />
          <img src={DownloadIcon} alt="Download" />
        </div>
      </div>
      
      {hasData ? (
        <div className="performance-card__chart" ref={chartContainerRef}>
          <BubbleChart
            data={bubbleData}
            options={{
              chart: { height: chartHeight },
              xAxis: { title: { text: data?.chart?.xAxisLabel || (data as any)?.xAxisLabel || '' } },
              yAxis: { title: { text: data?.chart?.yAxisLabel || (data as any)?.yAxisLabel || '' } }
            }}
          />
        </div>
      ) : (
        <NoData />
      )}
    </div>
  );
};
