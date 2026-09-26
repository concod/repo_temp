import React, { useState } from "react";
import VendorForecastGraph from "./components/VendorForecastGraph";
import VendorForecastProjections from "./components/VendorForecastProjections";
import VendorForecastSkuProjections from "./components/VendorForecastSkuProjections";

const VendorProjectionsForecast = (props) => {
  const [showProjectionCosts, setShowProjectionCosts] = useState(false);

  return (
    <div>
      <VendorForecastGraph
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        showProjectionCosts={showProjectionCosts}
        setShowProjectionCosts={setShowProjectionCosts}
      />

      <VendorForecastProjections
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        enableDownload={props.enableDownload}
        showProjectionCosts={showProjectionCosts}
      />

      <VendorForecastSkuProjections
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        enableDownload={props.enableDownload}
        showProjectionCosts={showProjectionCosts}
      />
    </div>
  );
};

export default VendorProjectionsForecast;
