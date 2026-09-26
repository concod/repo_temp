import React from "react";
import { NO_DATA_FOUND } from "modules/ada/constants-ada/stringContants";
import { useStyles } from "../../ada-styles";
import NoDataFound from "assets/noDataFound.svg";

const NoDataFoundWrapper = () => {
  const classes = useStyles();

  return (
    <div className={classes.forecastNoDataContainer}>
      <div className={classes.forecastNoDataIcon}>
        <NoDataFound />
      </div>
      <h3 className={classes.forecastNoDataTitle}>{NO_DATA_FOUND.title}</h3>
      <p>{NO_DATA_FOUND.description}</p>
    </div>
  );
};

export default NoDataFoundWrapper;
