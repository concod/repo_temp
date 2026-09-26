import React, { useEffect, useState, forwardRef } from "react";
import { useSelector } from "react-redux";
import {
  getFormattedChartFilters,
  getSelectedProductStoreFilters,
} from "modules/ada/utils-ada/utilityFunctions";
import { useTranslation } from "impact-ui-v3";
import Chart from "../../Dashboard/chart";

const ForecastVisualWrapper = forwardRef((props, ref) => {
  const {
    activeKey,
    updateAllData,
    showScenario,
    showRedirectToADAButton,
    hidePastHistoricData,
    activeChildHierarchyKey,
    lastEditedDrivers,
    counterOnEditHierarchyChange,
    parentControlledVal,
    refreshChartDataCounter,
    isRedirectedFromInventory,
    isChartLabelFiltersHidden,
  } = props;

  const { t } = useTranslation();
  const [payload, setPayload] = useState([]);

  const adaReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
  );

  const [clientMFPConfig, setClientMFPConfig] = useState(
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp || {}
  );

  useEffect(() => {
    setClientMFPConfig(
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
    );
  }, [adaReducer?.clientConfig]);

  useEffect(() => {
    let selected = getSelectedProductStoreFilters(adaReducer);
    let selectedPayload = getFormattedChartFilters(adaReducer, selected);
    setPayload(selectedPayload);
  }, []);

  return (
    <div>
      <h3 style={{ marginBottom: "1rem", fontWeight: "500" }}>
        {t("ada.accordionTitles.visual")}
      </h3>
      <Chart
        customStyleChartContainer={{ padding: "1rem" }}
        showScenario={showScenario}
        activeKey={activeKey}
        activeChildHierarchyKey={activeChildHierarchyKey}
        lastEditedDrivers={lastEditedDrivers}
        counterOnEditHierarchyChange={counterOnEditHierarchyChange}
        parentControlledVal={parentControlledVal}
        tabKey={"IA"}
        hideChartFilters={true}
        isChartLabelFiltersHidden={isChartLabelFiltersHidden}
        hideChartKPI={true}
        showRedirectToADAButton={showRedirectToADAButton}
        hidePastHistoricData={hidePastHistoricData}
        refreshChartDataCounter={refreshChartDataCounter}
        isRedirectedFromInventory={isRedirectedFromInventory}
        isCalledFromMFPDashboard={true}
        {...clientMFPConfig}
        ref={{ ref }}
      />
    </div>
  );
});

export default ForecastVisualWrapper;
