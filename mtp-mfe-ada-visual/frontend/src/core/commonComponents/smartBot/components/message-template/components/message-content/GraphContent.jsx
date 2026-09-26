import { useRef } from "react";
import Charts from "core/Utils/charts";
import { Grid } from "@mui/material";
import CoreChart from "core/Utils/core-charts";

const GraphContent = ({ bodyText }) => {
  const { chartOptions } = bodyText || {};
  const chartRef = useRef(null);

  const handleChartRef = (ref) => {
    chartRef.current = ref;
  };

  if (!chartOptions) {
    return null;
  }

  const options = {
    ...chartOptions,
  };

  return (
    <Grid container>
      <Grid item xs={12}>
        <CoreChart options={options} handleChartRef={handleChartRef} />
      </Grid>
    </Grid>
  );
};

export default GraphContent; 