import React, { useMemo } from 'react';
import './StoreDetails.scss';
import ShareIcon from '../../../assets/share-button.svg';
import DownloadIcon from '../../../assets/download-button.svg';
import StoreDetailsIcon from "../../../assets/store-details-icon.svg";
import { BarChart } from '../Charts/BarChart';
import { useDashboardStore } from '../../../store/dashboardStore';

export interface StoreDetailsProps {
  className?: string;
}

export const StoreDetails: React.FC<StoreDetailsProps> = ({ className }) => {
  const { allStores } = useDashboardStore();

  // Transform allStores data into bar chart format
  const chartConfig = useMemo(() => {
    if (!allStores || !allStores.stores || allStores.stores.length === 0) {
      // Fallback to empty/default config if no data
      return {
        categories: [],
        series: [],
        stacked: true,
        showDataLabels: true,
        legendReversed: true,
        yAxisTitle: '',
        height: 280
      };
    }

    // Filter out stores that have no sentiment data (all values are 0, null, or undefined)
    const storesWithData = allStores.stores.filter(store => {
      const positive = store.sentimentBreakdown?.positive ?? 0;
      const neutral = store.sentimentBreakdown?.neutral ?? 0;
      const negative = store.sentimentBreakdown?.negative ?? 0;
      // Keep store if at least one sentiment value is greater than 0
      return (positive > 0) || (neutral > 0) || (negative > 0);
    });

    // If no stores have data, return empty config
    if (storesWithData.length === 0) {
      return {
        categories: [],
        series: [],
        stacked: true,
        showDataLabels: true,
        legendReversed: true,
        yAxisTitle: '',
        height: 280
      };
    }

    // Extract store names as categories (bars) from filtered stores
    const categories = storesWithData.map(store => store.name);
    

    const positiveData = storesWithData.map(store => store.sentimentBreakdown?.positive ?? 0);
    const neutralData = storesWithData.map(store => store.sentimentBreakdown?.neutral ?? 0);
    const negativeData = storesWithData.map(store => store.sentimentBreakdown?.negative ?? 0);


    const barHeight = 25;
    const gap = 24;
    const numberOfStores = storesWithData.length;
    const calculatedHeight = numberOfStores * (barHeight + gap) + 80; // 80px for padding/margins

    return {
      categories,
      series: [
        {
          name: 'Positive',
          data: positiveData
        },
        {
          name: 'Neutral',
          data: neutralData
        },
        {
          name: 'Negative',
          data: negativeData
        }
      ],
      stacked: true,
      showDataLabels: true,
      legendReversed: true,
      yAxisTitle: '',
      height: calculatedHeight
    };
  }, [allStores]);

  // Additional Highcharts options for bar sizing and spacing
  const barOptions = useMemo(() => {
    if (!allStores || !allStores.stores || allStores.stores.length === 0) {
      return {};
    }

    // Filter stores with data (same logic as chartConfig)
    const storesWithData = allStores.stores.filter(store => {
      const positive = store.sentimentBreakdown?.positive ?? 0;
      const neutral = store.sentimentBreakdown?.neutral ?? 0;
      const negative = store.sentimentBreakdown?.negative ?? 0;
      return (positive > 0) || (neutral > 0) || (negative > 0);
    });

    if (storesWithData.length === 0) {
      return {};
    }

    return {
      legend: {
        enabled: false // Hide legend in chart, we'll render it separately
      },
      tooltip: {
        enabled: false // Disable tooltips to prevent any hover effects
      },
      plotOptions: {
        bar: {
          pointWidth: 25, // Bar height of 25px
          pointPadding: 24 / 25, // Gap of 24px between bars (relative to bar width)
          groupPadding: 0, // No additional group padding
          stacking: 'normal' as const, // Ensure stacking is enabled
          states: {
            hover: {
              enabled: false // Disable hover effect
            },
            inactive: {
              opacity: 1 // Keep full opacity when not hovered
            }
          },
          dataLabels: {
            enabled: true, // Enable data labels
            style: {
              fontSize: '10px',
              fontWeight: 'bold',
              textOutline: 'none',
              color: '#333333'
            },
            formatter: function(this: any): string {
              // Show the value on each segment
              const value = this.y as number;
              return value > 0 ? String(value+'%') : '';
            }
          }
        }
      }
    };
  }, [allStores]);

  // Legend items for fixed legend
  const legendItems = [
    { name: 'Positive', color: 'rgba(205, 229, 147, 0.85)' },
    { name: 'Neutral', color: 'rgba(180, 206, 238, 0.85)' },
    { name: 'Negative', color: 'rgba(237, 153, 152, 0.85)' }
  ];

  return (
    <div className={`store-details-card ${className ?? ''}`}>
      <div className="store-details-card__header">
        <div className="store-details-card__title-section">
          <div className="store-details-card__icon">
            <img src={StoreDetailsIcon} alt="Store Details" />
          </div>
          <div className="store-details-card__title">Store Details</div>
        </div>
        
        <div className="store-details-card__share">
          <img src={ShareIcon} alt="Share" />
          <img src={DownloadIcon} alt="Download" />
        </div>
      </div>
      <div className="store-details-card__content">
        <div className="store-details-card__chart">
          <BarChart
            config={chartConfig}
            options={barOptions}
            className="store-details-card__chart-container"
          />
        </div>
        <div className="store-details-card__legend">
          {legendItems.map((item) => (
            <div key={item.name} className="store-details-card__legend-item">
              <span 
                className="store-details-card__legend-color" 
                style={{ backgroundColor: item.color }}
              />
              <span className="store-details-card__legend-label">{item.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

