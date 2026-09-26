import React from "react";
import { Grid } from "@mui/material";

import Calendar from "./Calendar";
import globalStyles from "core/Styles/globalStyles";

const renderComponent = (props) => {
  switch (props.type) {
    case "dateRange":
      return <Calendar {...props} />;
    default:
      break;
  }
};

const CustomFilter = ({ staticFilters, isGroup, ...props }) => {
  const globalClasses = globalStyles();

  return isGroup ? (
    <Grid container alignItems="center">
      {staticFilters.map((staticFilter) => renderComponent(staticFilter))}
    </Grid>
  ) : (
    <div className={globalClasses.widthFitContent}>
      {staticFilters.map((staticFilter) =>
        renderComponent({ ...staticFilter, ...props })
      )}
    </div>
  );
};

export default CustomFilter;
