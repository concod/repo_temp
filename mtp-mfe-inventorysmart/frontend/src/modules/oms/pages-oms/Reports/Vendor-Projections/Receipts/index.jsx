import React from "react";
import VendorReceiptGraph from "./components/VendorReceiptGraph";
import VendorReceiptProjections from "./components/VendorReceiptProjections";
import VendorReceiptSkuProjections from "./components/VendorReceiptSkuProjections";

const VendorProjectionsReceipts = ({
  showProjectionCosts,
  displayType,
  setShowProjectionCosts,
  ...props
}) => {
  return (
    <div>
      <VendorReceiptGraph
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        showProjectionCosts={showProjectionCosts}
        setShowProjectionCosts={setShowProjectionCosts}
        setToggleHide={props.setToggleHide}
        setTorenderGraph={props.setTorenderGraph}
      />

      {!props.hideProjectionTable && (
        <VendorReceiptProjections
          hideGraphComponent={props.hideGraphComponent}
          selectedDates={props.selectedDates}
          enableDownload={props.enableDownload}
          showProjectionCosts={showProjectionCosts}
          displayType={displayType}
        />
      )}

      <VendorReceiptSkuProjections
        hideGraphComponent={props.hideGraphComponent}
        selectedDates={props.selectedDates}
        enableDownload={props.enableDownload}
        showProjectionCosts={showProjectionCosts}
        displayType={displayType}
      />
    </div>
  );
};

export default VendorProjectionsReceipts;
