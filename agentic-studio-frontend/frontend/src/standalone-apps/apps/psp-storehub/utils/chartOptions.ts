import type * as Highcharts from 'highcharts';

/**
 * Chart options utility for PSP-StoreHub
 * Provides optimized, reusable configurations for Highcharts
 */

// Common theme configuration
const CHART_THEME = {
  colors: ['#48ACB2', '#A5889E'],
  fontFamily: 'Arial, Helvetica, sans-serif',
  backgroundColor: '#FFFFFF',
  textColor: '#333333',
  gridLineColor: '#E0E0E0',
  borderColor: '#CCCCCC'
};

/**
 * Base chart configuration options
 */
export const getBaseChartOptions = (): Partial<Highcharts.Options> => ({
  chart: {
    backgroundColor: CHART_THEME.backgroundColor,
    style: {
      fontFamily: CHART_THEME.fontFamily
    }
  },
  colors: CHART_THEME.colors,
  credits: {
    enabled: false
  },
  legend: {
    align: 'center',
    verticalAlign: 'bottom',
    borderWidth: 0
  },
  tooltip: {
    shared: true,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderColor: CHART_THEME.borderColor,
    borderRadius: 8,
    shadow: true,
    style: {
      fontSize: '12px'
    }
  },
  responsive: {
    rules: [{
      condition: {
        maxWidth: 500
      },
      chartOptions: {
        legend: {
          layout: 'horizontal',
          align: 'center',
          verticalAlign: 'bottom'
        }
      }
    }]
  }
});

/**
 * Column Chart Options Configuration
 */
export interface ColumnChartConfig {
  title?: string;
  subtitle?: string;
  categories: string[];
  series: {
    name: string;
    data: number[];
    color?: string;
  }[];
  yAxisTitle?: string;
  xAxisTitle?: string;
  tooltipSuffix?: string;
  stacked?: boolean;
  showDataLabels?: boolean;
  height?: number;
}

/**
 * Generate optimized column chart options
 */
export const getColumnChartOptions = (config: ColumnChartConfig): Highcharts.Options => {
  const {
    title,
    subtitle,
    categories,
    series,
    yAxisTitle = '',
    xAxisTitle = '',
    tooltipSuffix = '',
    stacked = false,
    showDataLabels = false,
    height
  } = config;

  const baseOptions = getBaseChartOptions();

  return {
    ...baseOptions,
    chart: {
      ...baseOptions.chart,
      type: 'column',
      height: height
    },
    title: {
      text: title,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: CHART_THEME.textColor
      }
    },
    subtitle: {
      text: subtitle,
      align: 'left',
      style: {
        fontSize: '14px',
        color: '#666666'
      }
    },
    xAxis: {
      categories: categories,
      crosshair: true,
      title: {
        text: xAxisTitle,
        style: {
          fontSize: '12px',
          fontWeight: '500'
        }
      },
      labels: {
        style: {
          fontSize: '11px'
        }
      },
      accessibility: {
        description: xAxisTitle || 'Categories'
      },
      gridLineWidth: 0
    },
    yAxis: {
      min: 0,
      title: {
        text: yAxisTitle,
        style: {
          fontSize: '12px',
          fontWeight: '500'
        }
      },
      labels: {
        style: {
          fontSize: '11px'
        }
      },
      gridLineWidth: 0
    },
    tooltip: {
      ...baseOptions.tooltip,
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b>' + tooltipSuffix + '<br/>',
      valueSuffix: tooltipSuffix
    },
    plotOptions: {
      column: {
        pointPadding: 0.2,
        borderWidth: 0,
        borderRadius: 4,
        stacking: stacked ? 'normal' : undefined,
        dataLabels: {
          enabled: showDataLabels,
          style: {
            fontSize: '10px',
            fontWeight: 'bold',
            textOutline: 'none'
          }
        }
      }
    },
    series: series.map(s => ({
      type: 'column',
      name: s.name,
      data: s.data,
      color: s.color
    }))
  };
};

/**
 * Generate optimized line chart options
 */
export interface LineChartConfig {
  title?: string;
  subtitle?: string;
  categories: string[];
  series: {
    name: string;
    data: (number | null)[];
    color?: string;
    lineWidth?: number;
  }[];
  yAxisTitle?: string;
  xAxisTitle?: string;
  tooltipSuffix?: string;
  height?: number;
}

export const getLineChartOptions = (config: LineChartConfig): Highcharts.Options => {
  const {
    title,
    subtitle,
    categories,
    series,
    yAxisTitle = '',
    xAxisTitle = '',
    tooltipSuffix = '',
    height
  } = config;

  const baseOptions = getBaseChartOptions();

  return {
    ...baseOptions,
    chart: {
      ...baseOptions.chart,
      type: 'line',
      height: height
    },
    title: {
      text: title,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: CHART_THEME.textColor
      }
    },
    subtitle: {
      text: subtitle,
      align: 'left',
      style: {
        fontSize: '14px',
        color: '#666666'
      }
    },
    xAxis: {
      categories: categories,
      crosshair: true,
      title: {
        text: xAxisTitle,
        style: {
          fontSize: '12px',
          fontWeight: '500'
        }
      },
      labels: {
        style: {
          fontSize: '11px'
        }
      },
      gridLineWidth: 0
    },
    yAxis: {
      title: {
        text: yAxisTitle,
        style: {
          fontSize: '12px',
          fontWeight: '500'
        }
      },
      labels: {
        style: {
          fontSize: '11px'
        },
        formatter: function() {
          const value = this.value as number;
          if (value >= 1000) {
            const kValue = value / 1000;
            // If it's a whole number, show without decimals
            return kValue % 1 === 0 ? `${kValue}k` : `${kValue.toFixed(1)}k`;
          }
          return value.toString();
        }
      },
      gridLineWidth: 0
    },
    tooltip: {
      ...baseOptions.tooltip,
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b>' + tooltipSuffix + '<br/>',
      valueSuffix: tooltipSuffix
    },
    plotOptions: {
      series: {
        label: {
          connectorAllowed: false
        },
        marker: {
          enabled: false
        }
      }
    },
    series: series.map(s => ({
      type: 'spline',
      name: s.name,
      data: s.data,
      color: s.color,
      ...(s.lineWidth !== undefined && { lineWidth: s.lineWidth })
    }))
  };
};

/**
 * Bar Chart Options Configuration
 */
export interface BarChartConfig {
  title?: string;
  subtitle?: string;
  categories: string[];
  series: {
    name: string;
    data: number[];
    color?: string;
  }[];
  yAxisTitle?: string;
  xAxisTitle?: string;
  tooltipSuffix?: string;
  stacked?: boolean;
  showDataLabels?: boolean;
  height?: number;
  legendReversed?: boolean;
}

/**
 * Generate optimized bar chart options
 */
export const getBarChartOptions = (config: BarChartConfig): Highcharts.Options => {
  const {
    title,
    subtitle,
    categories,
    series,
    yAxisTitle = '',
    xAxisTitle = '',
    tooltipSuffix = '',
    stacked = false,
    showDataLabels = false,
    height,
    legendReversed = false
  } = config;

  const baseOptions = getBaseChartOptions();

  // Bar chart specific colors
  const barChartColors = [
    "rgba(205, 229, 147, 0.85)",
    "rgba(180, 206, 238, 0.85)",
    "rgba(237, 153, 152, 0.85)"
  ];

  return {
    ...baseOptions,
    colors: barChartColors,
    chart: {
      ...baseOptions.chart,
      type: 'bar',
      height: height
    },
    title: {
      text: title,
      align: 'left',
      style: {
        fontSize: '18px',
        fontWeight: '600',
        color: CHART_THEME.textColor
      }
    },
    subtitle: {
      text: subtitle,
      align: 'left',
      style: {
        fontSize: '14px',
        color: '#666666'
      }
    },
    xAxis: {
      categories: categories,
      crosshair: true,
      title: {
        text: xAxisTitle,
        style: {
          fontSize: '12px',
          fontWeight: '500'
        }
      },
      labels: {
        style: {
          fontSize: '11px'
        }
      },
      gridLineWidth: 0
    },
    yAxis: {
      min: 0,
      title: {
        text: yAxisTitle,
        style: {
          fontSize: '12px',
          fontWeight: '500'
        }
      },
      labels: {
        style: {
          fontSize: '11px'
        }
      },
      gridLineWidth: 0
    },
    legend: {
      ...baseOptions.legend,
      reversed: legendReversed
    },
    tooltip: {
      ...baseOptions.tooltip,
      headerFormat: '<b>{point.key}</b><br/>',
      pointFormat: '<span style="color:{series.color}">{series.name}</span>: <b>{point.y:.2f}</b>' + tooltipSuffix + '<br/>',
      valueSuffix: tooltipSuffix
    },
    plotOptions: {
      bar: {
        pointPadding: 0.2,
        borderWidth: 0,
        borderRadius: 4,
        stacking: stacked ? 'normal' : undefined,
        dataLabels: {
          enabled: showDataLabels,
          style: {
            fontSize: '10px',
            fontWeight: 'bold',
            textOutline: 'none'
          }
        }
      }
    },
    series: series.map(s => ({
      type: 'bar',
      name: s.name,
      data: s.data,
      color: s.color
    }))
  };
};

/**
 * NRR Audit Average specific chart configuration
 * Can be customized based on specific requirements
 */
export const getNRRAuditColumnChartOptions = (
  categories: string[],
  data: number[],
  title: string = 'NRR Audit Average'
): Highcharts.Options => {
  return getColumnChartOptions({
    title,
    subtitle: 'Weekly performance overview',
    categories,
    series: [{
      name: 'NRR Score',
      data,
      color: '#3649C6'
    }],
    yAxisTitle: 'Score',
    xAxisTitle: 'Week',
    tooltipSuffix: ' pts',
    showDataLabels: false,
    
  });
};

