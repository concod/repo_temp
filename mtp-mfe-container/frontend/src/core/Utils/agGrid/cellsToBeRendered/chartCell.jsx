// Chart Icon cell renderer

import BarChart from "@mui/icons-material/BarChart";
import { useStyles } from "core/Utils/styles/assortSmartUsestyles";

const ChartCell = (props) => {
  const { onChartClick } = props;
  const classes = useStyles();
  return (
    <div
      onClick={() => {
        onChartClick(props);
      }}
    >
      <BarChart className={classes.iconBlue} />
    </div>
  );
};

export default ChartCell;
