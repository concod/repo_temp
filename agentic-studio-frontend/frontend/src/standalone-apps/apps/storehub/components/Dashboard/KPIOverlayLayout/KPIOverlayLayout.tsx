import React from 'react';
import { useOverlayStore } from '../../../store/overlayStore';
import { ColumnChart } from '../Charts/ColumnChart';
import { LineChart } from '../Charts/LineChart';
import type { DetailChart } from '../../../types/dashboard.types';
import netSalesComp from '../../../assets/NSC_icon.svg';
import revvOverallScore from '../../../assets/ROS_icon.svg';
import nrrAuditAverage from '../../../assets/NAA_icon.svg';
import laborSph from '../../../assets/LS_icon.svg';
import './KPIOverlayLayout.scss';
import { Summary } from '../Summary';

export const KPIOverlayLayout = () => {
  const { selectedKPI, closeOverlay } = useOverlayStore();

  // Check if we should render a column chart for NRR Audit Average
  const shouldUseColumnChart = () => {
    return selectedKPI?.metricKey === 'nrr_audit_avg' || 
           selectedKPI?.title?.toLowerCase().includes('nrr audit');
  };

  // Transform DetailChart to Column Chart config
  const getColumnConfig = (chart: DetailChart | undefined) => {
    if (!chart || !chart.series || chart.series.length === 0) {
      return {
        title: selectedKPI?.detail?.title || 'NRR Audit Average',
        categories: [],
        series: []
      };
    }

    const categories = chart.series[0]?.data?.map(point => {
      return point.quarter_label || '';
    }) || [];

    const seriesData = chart.series.map(seriesItem => ({
      name: seriesItem.label,
      data: seriesItem.data.map(point => point.revenue ?? point.score ?? 0),
      color: seriesItem.id === 'nrr_score' ? '#3649C6' : undefined
    }));

    return {
      categories,
      series: seriesData,
      yAxisTitle: chart.yAxisLabel || 'Score',
      xAxisTitle: chart.xAxisLabel || 'Week',
      tooltipSuffix: '%',
      showDataLabels: false,
      height: 400
    };
  };

  // Transform DetailChart to Line Chart config
  const getLineConfig = (chart: DetailChart | undefined) => {
    if (!chart || !chart.series || chart.series.length === 0) {
      return {
        title: selectedKPI?.detail?.title || 'Chart',
        categories: [],
        series: []
      };
    }

    // Find the series with the most data points to derive categories
    const longestSeries = chart.series.reduce((longest, current) => {
      return (current.data?.length || 0) > (longest.data?.length || 0) ? current : longest;
    }, chart.series[0]);

    // Format week_start_original dates consistently for display (fallback to week_start)
    const categories = longestSeries?.data?.map(point => {
      const dateValue = point.week_start_original;
      if (!dateValue) return '';
      const date = new Date(dateValue);
      // Format as "YYYY-MM-DD" to ensure consistent display
      return date.toISOString().split('T')[0];
    }) || [];
    
    const seriesData = chart.series.map((seriesItem, index) => {
      const colors = ['#48ACB2', '#A5889E'];
      const lineWidths: (number | undefined)[] = [1, undefined]; // First line 1px, others use default
      
      return {
        name: seriesItem.label,
        data: seriesItem.data.map(point => point.revenue ?? point.score ?? null),
        color: colors[index],
        lineWidth: lineWidths[index]
      };
    });

    return {
      categories,
      series: seriesData,
      yAxisTitle: chart.yAxisLabel || 'Value',
      xAxisTitle: chart.xAxisLabel || 'Weeks (Start date)',
      tooltipSuffix: '',
      height: 400
    };
  };

  // Get icon based on title (same logic as MetricCard)
  const getIcon = () => {
    const title = selectedKPI?.title || '';
    switch(title){
      case "Net Sales Comp (Weekly)":
      case "Net Sales Comp (Monthly)":
      case "Net Sales Comp (QTD)": 
        return <img src={netSalesComp} alt="Net Sales Comp" />;
      case "REVV overall score":
      case "REVV Overall Score": 
        return <img src={revvOverallScore} alt="REVV Overall Score" />;
      case "NRR audit average":
      case "NRR Audit Average": 
        return <img src={nrrAuditAverage} alt="NRR Audit Average" />;
      case "Labor SPH (Sales Per Hour)": 
        return <img src={laborSph} alt="Labor SPH (Sales Per Hour)" />;
      default: 
        return (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z"/>
          </svg>
        );
    }
  };

  // Get value class based on direction (same logic as MetricCard)
  const getValueClass = (direction: 'up' | 'down' | 'neutral' | 'flat') => {
    return direction === 'up' ? 'metric-label-positive' : 
           direction === 'down' ? 'metric-label-negative' : 
           'metric-label-neutral'; // 'neutral' and 'flat' both use neutral styling
  };

  // Format metric value (same logic as MetricCard)
  const formatMetricValue = (value: string | number | null, isPercentage: boolean = false) => {
    if (value === null || value === undefined) return 'No Data';
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return 'No Data';
    const formattedValue = numValue >= 0 ? `+${numValue}` : `${numValue}`;
    return isPercentage ? `${formattedValue}%` : formattedValue;
  };

  // Format the main KPI value based on unit
  const formatKPIValue = (value: number | null | undefined, unit: string | undefined): string => {
    if (value === null || value === undefined) return 'No Data';
    
    switch (unit) {
      case 'thousand_usd':
        return `$${value.toFixed(2)}K`;
      case 'million_usd':
        return `$${value.toFixed(2)}M`;
      case 'percent':
        return `${value.toFixed(1)}%`;
      case 'points':
        return value.toFixed(2);
      case 'usd':
        return `$${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      default:
        return String(value);
    }
  };

  const isPercentage = selectedKPI?.title?.toLowerCase().includes('comp') || 
                       selectedKPI?.title?.toLowerCase().includes('sales') || 
                       false;

  return (
    <div className="kpi-overlay-layout">
      <div className="kpi-overlay-layout__header">
        <h5 className="kpi-overlay-layout__title">{selectedKPI?.title || 'Metric Details'}</h5>
        <button className="kpi-overlay-layout__close" onClick={closeOverlay} aria-label="Close overlay">
        <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M10 1.00714L8.99286 0L5 3.99286L1.00714 0L0 1.00714L3.99286 5L0 8.99286L1.00714 10L5 6.00714L8.99286 10L10 8.99286L6.00714 5L10 1.00714Z" fill="#60697D"/>
        </svg>
        </button>
      </div>
      <div className="kpi-overlay-layout__body">
        <div className="kpi-overlay-layout__body-content">
          {/* Icon */}
          <div className="kpi-overlay-layout__icon">
            {getIcon()}
          </div>

          {/* Content */}
          <div className="kpi-overlay-layout__content">
            {/* Title */}
            <div className="kpi-overlay-layout__content-heading">
              <h3 className="kpi-overlay-layout__content-title">{selectedKPI?.title || 'Metric'}</h3>
            </div>

            {/* Value */}
            <div className="kpi-overlay-layout__content-value">
              <div className="kpi-overlay-layout__content-number">{formatKPIValue(selectedKPI?.value, selectedKPI?.unit)}</div>
              <div className="kpi-overlay-layout__content-metadata">
                {selectedKPI?.metrics && selectedKPI.metrics.length > 0 ? (
                  selectedKPI.metrics.map((metric, index) => (
                    <React.Fragment key={index}>
                      <div className="kpi-overlay-layout__wow-label">{metric.label} :</div>
                      <div className={`kpi-overlay-layout__wow-value ${getValueClass(metric.direction)}`}>
                        {formatMetricValue(metric.value, isPercentage)}
                      </div>
                    </React.Fragment>
                  ))
                ) : null}
              </div>
            </div>
          </div>

        </div>
        {selectedKPI?.detail?.chart ? (
          shouldUseColumnChart() ? (
            <ColumnChart config={getColumnConfig(selectedKPI.detail.chart)} className="kpi-overlay-layout__chart" />
          ) : (
            <LineChart config={getLineConfig(selectedKPI.detail.chart)} className="kpi-overlay-layout__chart" />
          )
        ) : (
          <p>No data available</p>
        )}
      </div>
      <Summary labelTag="Ai Summary" summaryItems={selectedKPI?.detail?.aiInsight?.items?.map(item => item.text) || []} />
    </div>
  );
};