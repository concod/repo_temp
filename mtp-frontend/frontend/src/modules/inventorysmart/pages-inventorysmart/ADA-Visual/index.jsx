import AdaDashboard from "modules/ada/pages-ada/Dashboard";
import React from "react";

export default function ADAVisual(props) {
  return (
    <div>
      <AdaDashboard isRedirectedFromInventory={true} {...props} />
    </div>
  );
}
