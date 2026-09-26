import { useRef, useEffect } from 'react';
import HighchartsReact from 'highcharts-react-official';

/* eslint-disable import/order */
import Highcharts from 'highcharts/esm/highcharts.js';
import 'highcharts/esm/highcharts-more.js';
import 'highcharts/esm/highcharts-3d.js';
import 'highcharts/esm/modules/exporting.js';
import 'highcharts/esm/modules/export-data.js';
import 'highcharts/esm/modules/map.js';
import 'highcharts/esm/modules/pattern-fill.js';
import 'highcharts/esm/modules/treemap.js';
import 'highcharts/esm/modules/heatmap.js';
import 'highcharts/esm/modules/pareto.js';

// Set default Highcharts options
Highcharts.setOptions({
  lang: {
    decimalPoint: '.',
    thousandsSep: ',',
  },
});

/**
 * CoreChart Component
 * A simple wrapper around the Highcharts React component.
 * Directly passes the provided options to Highcharts.
 * 
 * @param {Object} props - Component props
 * @param {Object} props.options - Highcharts options configuration
 * @param {Function} [props.handleChartRef] - Optional callback to get a reference to the chart
 * @param {Object} [props.containerProps] - Optional props for the chart container
 * @returns {JSX.Element} Rendered chart component
 */
const CoreChart = (props) => {
  const { options, handleChartRef, containerProps = {} } = props;
  const chartRef = useRef(null);

  useEffect(() => {
    if (handleChartRef && chartRef && chartRef.current) {
      handleChartRef(chartRef.current);
    }
  }, [chartRef, handleChartRef]);

  // Create a new options object with credits disabled
  const chartOptions = {
    ...options,
    credits: options.credits || { enabled: false }
  };

  return (
    <div>
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
        ref={chartRef}
        {...containerProps}
      />
    </div>
  );
};

export default CoreChart; 