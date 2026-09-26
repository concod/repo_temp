import React from "react";
import VendorForecastGraph from "./components/VendorForecastGraph";
import VendorForecastProjections from "./components/VendorForecastProjections";
import VendorForecastSkuProjections from "./components/VendorForecastSkuProjections";

const VendorProjectionsForecast = ({
  showProjectionCosts,
  displayType,
  setShowProjectionCosts,
  ...props
}) => {
  return (
    <div>
      <VendorForecastGraph
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        showProjectionCosts={showProjectionCosts}
        setShowProjectionCosts={setShowProjectionCosts}
        setToggleHide={props.setToggleHide}
        setTorenderGraph={props.setTorenderGraph}
      />

      {!props.hideProjectionTable && (
        <VendorForecastProjections
          hideGraphComponent={props.hideGraphComponent}
          selectedDates={props.selectedDates}
          enableDownload={props.enableDownload}
          showProjectionCosts={showProjectionCosts}
          displayType={displayType}
        />
      )}

      <VendorForecastSkuProjections
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        enableDownload={props.enableDownload}
        showProjectionCosts={showProjectionCosts}
        displayType={displayType}
      />
    </div>
  );
};

export default VendorProjectionsForecast;
