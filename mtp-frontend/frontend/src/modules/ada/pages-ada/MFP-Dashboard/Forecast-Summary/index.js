import React, { useEffect, useState, useRef, forwardRef } from "react";
import { useSelector } from "react-redux";

import {
  getFormattedChartFilters,
  getSelectedProductStoreFilters,
} from "modules/ada/utils-ada/utilityFunctions";
import { ACCORDION_TITLES } from "modules/ada/constants-ada/stringContants";
import DriverForecastTable from "../../Dashboard/driver-forecast-table";
import ForecastMultiplierWrapper from "../../Dashboard/edit-forecast/forecast-multiplier/forecastMultiplierWrapper";
import globalStyles from "core/Styles/globalStyles";

const ForecastSummaryWrapper = forwardRef((props, ref) => {
  const {
    activeKey,
    updateAllData,
    lastEditedDrivers,
    setLastEditedDrivers,
    selectedForecast,
  } = props;

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
        {ACCORDION_TITLES.summary}
      </h3>
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
      />
    </div>
  );
});

export default ForecastSummaryWrapper;
