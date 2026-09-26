import { useRef } from "react";
import Charts from "core/Utils/charts";
import { Grid } from "@mui/material";
import CoreChart from "core/Utils/core-charts";
import { useStyles } from "../../../../styling";

const GraphContent = ({ bodyText }) => {
  const { chartOptions, title } = bodyText || {};
  const classes = useStyles();
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
      {Boolean(title?.length) && (
        <Grid item xs={12}>
          <div
            className={`${classes.chatbotText} ${classes.boldText} ${classes.combinedBlockHeaderTitle}`}
          >
            {title}
          </div>
        </Grid>
      )}
      <Grid item xs={12}>
        <CoreChart options={options} handleChartRef={handleChartRef} />
      </Grid>
    </Grid>
  );
};

export default GraphContent; 