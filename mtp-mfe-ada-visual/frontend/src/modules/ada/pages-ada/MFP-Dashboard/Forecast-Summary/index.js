import React, { useEffect, useState, useRef, forwardRef } from "react";
import { useSelector } from "react-redux";

import {
  getFormattedChartFilters,
  getSelectedProductStoreFilters,
} from "modules/ada/utils-ada/utilityFunctions";
import { useTranslation } from "impact-ui-v3";
import DriverForecastTable from "../../Dashboard/driver-forecast-table";
import ForecastMultiplierWrapper from "../../Dashboard/edit-forecast/forecast-multiplier/forecastMultiplierWrapper";
import globalStyles from "core/Styles/globalStyles";
import { Button } from "impact-ui-v3";
import { makeStyles } from "@mui/styles";

const ForecastSummaryWrapper = forwardRef((props, ref) => {
  const {
    activeKey,
    updateAllData,
    lastEditedDrivers,
    setLastEditedDrivers,
    selectedForecast,
    cardContainer,
  } = props;

  const classes = useStyles();
  const { t } = useTranslation();

  const globalClasses = globalStyles();

  const [payload, setPayload] = useState([]);

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  useEffect(() => {
    let selected = getSelectedProductStoreFilters(adaReducer);
    let selectedPayload = getFormattedChartFilters(adaReducer, selected);
    setPayload(selectedPayload);
  }, []);

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3 style={{ marginBottom: "1rem", fontWeight: "500" }}>
        {t("ada.accordionTitles.summary")}
      </h3>
      {/* <div className={classes.forecastManagementBtn}>
        <h3 style={{ marginBottom: "1rem", fontWeight: "500" }}>
          {ACCORDION_TITLES.summary}
        </h3>
        <Button
          variant="primary"

          // onClick={() => ref.onSaveRef.current && ref.onSaveRef.current()}
        >
          Forecast Management
        </Button>
      </div> */}
      <ForecastMultiplierWrapper
        activeKey={activeKey}
        key={activeKey}
        ref={ref}
        lastEditedDrivers={lastEditedDrivers}
        allowEdit={false}
        showIAData={false}
        showOriginalIAForecast={true}
        showScenario={false}
        id={"adjusted"}
        selectedForecast={selectedForecast}
        tabKey={"adjusted"}
        isCalledFromMFPDashboard={true}
        showIARecommended={"adjusted"}
        isSummaryTable={true}
        cardContainer={cardContainer}
      />
    </div>
  );
});

export default ForecastSummaryWrapper;

const useStyles = makeStyles(() => ({
  forecastManagementBtn: {
    display: "flex",
    justifyContent: "space-between",
    margin: "1rem",
  },
}));
