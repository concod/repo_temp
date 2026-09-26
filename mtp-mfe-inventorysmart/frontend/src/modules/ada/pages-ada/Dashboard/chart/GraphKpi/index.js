import React, { useState } from "react";
import { useSelector } from "react-redux";
import BarIcon from "assets/home/Group 13333.svg";
import Inventory2Outlined from "@mui/icons-material/Inventory2Outlined";
import { makeStyles } from "@mui/styles";
import { useGraphKpi } from "./useGraphKpi";
import { isNumber } from "modules/ada/utils-ada/utilityFunctions";

const GraphKpi = ({ selectedGraphFilters, id }) => {
  const graphKPIData = useGraphKpi(selectedGraphFilters, id === "IA");

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );
  const classes = useStyles();

  const getXweeks = () => {
    let weeks;
    if (adaReducer?.historicDropDownSelectedWeeks) {
      weeks = adaReducer.historicDropDownSelectedWeeks.label;
    }
    return weeks;
  };

  const renderForecastData = (data) => {
    if (data === null) {
      return "-";
    }

    let formattedData = (data * 100)?.toFixed(2);

    if (isNumber(formattedData)) {
      return `${formattedData} %`;
    }
    return "-";
  };

  return graphKPIData ? (
    <div className={classes.kpiHeading}>
      <div>
        <span> Forecast Accuracy Over last {getXweeks() || "1 week"}</span>
      </div>
      <div className={classes.kpiInfo}>
        <div className={classes.listItem}>
          <div className={classes.iconWrapper}>
            <BarIcon viewBox="0 0 18 18" />
          </div>
          <div className={classes.title}>
            {" "}
            IA Recommended Forecast:{" "}
            <span className={classes.foreCastNumber}>
              {" "}
              {renderForecastData(
                graphKPIData?.IA_recommended_forecast_accuracy
              )}{" "}
            </span>
          </div>
        </div>
        <div className={classes.listItem}>
          <div className={classes.iconWrapper}>
            <BarIcon viewBox="0 0 18 18" />
          </div>
          <div className={classes.title}>
            Final Forecast:
            <span className={classes.foreCastNumber}>
              {" "}
              {renderForecastData(graphKPIData?.final_forecast_accuracy)}
            </span>{" "}
          </div>
        </div>

        <div className={classes.listItem}>
          <div className={classes.iconWrapper}>
            <Inventory2Outlined color="primary" />
          </div>{" "}
          % of products with final forecast having same/better Accuracy:{" "}
          <span className={classes.foreCastNumber}>
            {" "}
            {renderForecastData(graphKPIData?.final_forecast_better)}
          </span>
        </div>
      </div>
    </div>
  ) : (
    ""
  );
};

export default GraphKpi;

const useStyles = makeStyles((theme) => ({
  kpiHeading: {
    marginTop: "1rem",
  },
  kpiInfo: {
    marginTop: "1rem",
    display: "flex",
    fontSize: "0.75rem",
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    marginRight: "1rem",
  },
  iconWrapper: {
    marginRight: "1rem",
  },
  foreCastNumber: {
    fontWeight: "bold",
    marginLeft: "0.25rem",
  },
  title: {
    borderRight: `1px solid ${theme.palette.background.infoBg}`,
    paddingRight: "0.5rem",
  },
}));
