import { useRef, useEffect } from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';
import HighchartsMore from 'highcharts/highcharts-more';
import Highcharts3D from 'highcharts/highcharts-3d';
import HighchartsExporting from 'highcharts/modules/exporting';
import HighchartsExportData from 'highcharts/modules/export-data';
import HighchartsMap from 'highcharts/modules/map';
import HighchartsPatternFill from 'highcharts/modules/pattern-fill';
import HighchartsTreeMap from 'highcharts/modules/treemap';
import HighchartsHeatmap from 'highcharts/modules/heatmap';
import HighchartPareto from 'highcharts/modules/pareto';

// Initialize highcharts modules
HighchartsMore(Highcharts);
Highcharts3D(Highcharts);
HighchartsExporting(Highcharts);
HighchartsExportData(Highcharts);
HighchartsMap(Highcharts);
HighchartsPatternFill(Highcharts);
HighchartsTreeMap(Highcharts);
HighchartsHeatmap(Highcharts);
HighchartPareto(Highcharts);

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