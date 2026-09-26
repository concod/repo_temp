import React from "react";
import ADAForecastDashboard from "modules/ada/pages-ada/MFP-Dashboard";

export default function ADAVisualMFPDashboard(props) {
  return (
    <div>
      <ADAForecastDashboard isRedirectedFromInventory={true} {...props} />
    </div>
  );
}
