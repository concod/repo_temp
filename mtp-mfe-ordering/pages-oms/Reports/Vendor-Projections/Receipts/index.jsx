import React, { useState } from "react";
import InfoBanner from "../InfoBanner/InfoBanner";
import VendorReceiptGraph from "./components/VendorReceiptGraph";
import VendorReceiptProjections from "./components/VendorReceiptProjections";
import VendorReceiptSkuProjections from "./components/VendorReceiptSkuProjections";

const VendorProjectionsReceipts = ({ showProjectionCosts, displayType, setShowProjectionCosts, ...props }) => {
  // const [showProjectionCosts, setShowProjectionCosts] = useState(false);
  // const [displayType, setDisplayType] = useState("unit");

  // const handleDisplayTypeChange = (newDisplayType) => {
  //   setDisplayType(newDisplayType);
  // };

  return (
    <div>
      {/* <InfoBanner /> */}
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
