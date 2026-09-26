import React from "react";
import Select from "./select";
import Switch from "./switch-timeline";
import { Grid } from "@mui/material";

import Calendar from "./calendar";
import CompareWith from "./compare-with";

const renderComponent = (props, resetDate) => {
  switch (props.type) {
    case "dropdown":
      return <Select {...props} />;
    case "switchGroup":
      return <Switch {...props} />;
    case "dateRange":
      return <Calendar {...props} key={resetDate} />;
    case "compareWith":
      return <CompareWith {...props} />;
    default:
      break;
  }
};

const CustomFilter = ({ staticFilters, isGroup, resetDate }) => {
  return isGroup ? (
    <Grid container alignItems="center">
      {staticFilters.map((staticFilter) =>
        renderComponent(staticFilter, resetDate)
      )}
    </Grid>
  ) : (
    staticFilters.map((staticFilter) => renderComponent(staticFilter))
  );
};

export default CustomFilter;
