import React from 'react';
import { ColumnChart } from './ColumnChart';
import type { TimeSeriesDataPoint } from '../../../types/dashboard.types';

interface NRRAuditChartProps {
    data: TimeSeriesDataPoint[];
    title?: string;
    className?: string;
}

/**
 * NRR Audit Average Column Chart
 * Specialized component for displaying NRR audit metrics
 */
export const NRRAuditChart: React.FC<NRRAuditChartProps> = ({ 
    data, 
    title = 'NRR Audit Average',
    className 
}) => {
    // Transform API data to chart format
    const categories = data.map(point => {
        // Format date for display (e.g., "Oct 8" or "Week of Oct 8")
        // Use week_start_original if available, fallback to week_start
        const dateValue = point.week_start_original;
        if (!dateValue) return '';
        const date = new Date(dateValue);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const values = data.map(point => point.score || 0);

    const config = {
        title,
        subtitle: 'Weekly performance overview',
        categories,
        series: [{
            name: 'NRR Score',
            data: values,
            color: '#3649C6'
        }],
        yAxisTitle: 'Score',
        xAxisTitle: 'Week',
        tooltipSuffix: ' pts',
        showDataLabels: false,
        height: 400
    };

    return <ColumnChart config={config} className={className} />;
};

