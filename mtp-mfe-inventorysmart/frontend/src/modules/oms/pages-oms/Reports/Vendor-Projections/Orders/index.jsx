import React from "react";
import VendorOrderGraph from "./components/VendorOrderGraph";
import VendorOrderProjections from "./components/VendorOrderProjections";
import VendorOrderSkuProjections from "./components/VendorOrderSkuProjections";

const VendorProjectionsOrders = ({
  showProjectionCosts,
  displayType,
  setShowProjectionCosts,
  ...props
}) => {
  return (
    <div>
      <VendorOrderGraph
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        showProjectionCosts={showProjectionCosts}
        setShowProjectionCosts={setShowProjectionCosts}
        setToggleHide={props.setToggleHide}
        setTorenderGraph={props.setTorenderGraph}
      />

      {!props.hideProjectionTable && (
        <VendorOrderProjections
          hideGraphComponent={props.hideGraphComponent}
          selectedDates={props.selectedDates}
          enableDownload={props.enableDownload}
          showProjectionCosts={showProjectionCosts}
          displayType={displayType}
        />
      )}

      <VendorOrderSkuProjections
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        enableDownload={props.enableDownload}
        showProjectionCosts={showProjectionCosts}
        displayType={displayType}
      />
    </div>
  );
};

export default VendorProjectionsOrders;
