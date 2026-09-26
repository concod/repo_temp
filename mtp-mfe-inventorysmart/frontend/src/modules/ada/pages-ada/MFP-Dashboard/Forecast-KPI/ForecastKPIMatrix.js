import React, { useState } from "react";
import { useSelector } from "react-redux";

import ChartBellCurve from "assets/chartBellCurve.svg";
import IAForeCast from "assets/IAForeCast.svg";
import Percentage from "assets/Percentage.svg";

import LoadingOverlay from "core/Utils/Loader/loader";
import { useGraphKpi } from "../../Dashboard/chart/GraphKpi/useGraphKpi";
import { isNumber } from "modules/ada/utils-ada/utilityFunctions";
import { useStyles } from "../../ada-styles";
import { Grid } from "@mui/material";
import colours from "core/Styles/colours";

const ForecastKPIMatrix = ({ selectedPayload, activeKey, updateAllData }) => {
  const classes = useStyles();

  const [loader, setLoader] = useState(false);
  const forecastKPIData = useGraphKpi(selectedPayload, false, true);

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const getXweeks = () => {
    let weeks;
    if (adaReducer?.historicDropDownSelectedWeeks) {
      weeks = adaReducer.historicDropDownSelectedWeeks.label;
    }
    return weeks;
  };

  const renderForecastData = (data) => {
    let formattedData = (data * 100)?.toFixed(2);
    if (isNumber(formattedData)) {
      return `${formattedData}%`;
    }
    return "-";
  };

  return (
    <LoadingOverlay loader={loader}>
      {forecastKPIData ? (
        <div className={classes.forecastKpiContainer}>
          <h5 className={classes.forecastKpiDescription}>
            <span> Forecast Accuracy Over last {getXweeks() || "1 week"}</span>
          </h5>
          <Grid container>
            <Grid item sm={12} md={3.5} className={classes.forecastKpiItem}>
              <div
                className={classes.forecastKpiIcon}
                style={{ background: colours.lightMint }}
              >
                <IAForeCast className="img-fluid" />
              </div>
              <div className={classes.forecastKpiLabel}>
                <p>IA Recommended forecast</p>
                <h3>
                  {renderForecastData(
                    forecastKPIData?.IA_recommended_forecast_accuracy
                  )}
                </h3>
              </div>
            </Grid>
            <Grid item sm={12} md={3.5} className={classes.forecastKpiItem}>
              <div
                className={classes.forecastKpiIcon}
                style={{ background: colours.firstSnow }}
              >
                <ChartBellCurve className="img-fluid" />
              </div>
              <div className={classes.forecastKpiLabel}>
                <p>Final Forecast</p>
                <h3>
                  {renderForecastData(forecastKPIData?.final_forecast_accuracy)}
                </h3>
              </div>
            </Grid>
            <Grid
              item
              sm={12}
              md={5}
              className={classes.forecastKpiItem}
              style={{ border: "none" }}
            >
              <div
                className={classes.forecastKpiIcon}
                style={{ background: colours.seashellPeach }}
              >
                <Percentage className="img-fluid" />
              </div>
              <div className={classes.forecastKpiLabel}>
                <p>
                  % of products with final forecast having same/better Accuracy:
                </p>
                <h3>
                  {renderForecastData(forecastKPIData?.final_forecast_better)}
                </h3>
              </div>
            </Grid>
          </Grid>
        </div>
      ) : (
        ""
      )}
    </LoadingOverlay>
  );
};

export default ForecastKPIMatrix;
