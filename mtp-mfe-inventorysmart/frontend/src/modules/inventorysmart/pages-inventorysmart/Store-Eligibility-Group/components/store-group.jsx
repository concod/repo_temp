import React from "react";
import StoreGroup from "core/pages/store-grouping";

export default function storeEligibilityGroup(props) {
  return (
    <div>
      <StoreGroup
        {...props}
        parentRoute={"/inventory-smart/store-eligibility-grouping"}
        prevScr={"/inventory-smart/store-eligibility-grouping"}
        application_code={1}
        application_name={"InventorySmart"}
      ></StoreGroup>
    </div>
  );
}
