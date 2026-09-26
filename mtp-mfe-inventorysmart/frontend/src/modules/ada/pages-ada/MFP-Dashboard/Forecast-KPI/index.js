import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import ForecastKPIMatrix from "./ForecastKPIMatrix";
import {
  getFormattedChartFilters,
  getSelectedProductStoreFilters,
} from "modules/ada/utils-ada/utilityFunctions";
import { ACCORDION_TITLES } from "modules/ada/constants-ada/stringContants";

const ForecastKPIWrapper = ({ activeKey, updateAllData }) => {
  const [payload, setPayload] = useState([]);

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  useEffect(() => {
    if (adaReducer?.isFiltersValid) {
      let selected = getSelectedProductStoreFilters(adaReducer);
      let selectedPayload = getFormattedChartFilters(adaReducer, selected);
      setPayload(selectedPayload);
    }
  }, [adaReducer?.isFiltersValid, adaReducer?.product]);

  return (
    <div style={{ marginBottom: "2rem" }}>
      <h3 style={{ margin: "2rem 0 1rem 0", fontWeight: "500" }}>
        {ACCORDION_TITLES.kpi}
      </h3>
      <ForecastKPIMatrix selectedPayload={payload} />
    </div>
  );
};

export default ForecastKPIWrapper;
