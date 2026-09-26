import React from "react";
import AdaDashboardComponent from "modules/ada/pages-ada/Dashboard";

export default function ADAVisual(props) {
  return (
    <div>
      <AdaDashboardComponent isRedirectedFromInventory={true} {...props} />
    </div>
  );
}
