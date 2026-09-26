import React, { useState } from "react";
import VendorOrderGraph from "./components/VendorOrderGraph";
import VendorOrderProjections from "./components/VendorOrderProjections";
import VendorOrderSkuProjections from "./components/VendorOrderSkuProjections";

const VendorProjectionsOrders = (props) => {
  const [showProjectionCosts, setShowProjectionCosts] = useState(false);

  return (
    <div>
      <VendorOrderGraph
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        showProjectionCosts={showProjectionCosts}
        setShowProjectionCosts={setShowProjectionCosts}
      />

      <VendorOrderProjections
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        enableDownload={props.enableDownload}
        showProjectionCosts={showProjectionCosts}
      />

      <VendorOrderSkuProjections
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        enableDownload={props.enableDownload}
        showProjectionCosts={showProjectionCosts}
      />
    </div>
  );
};

export default VendorProjectionsOrders;
