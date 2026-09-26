import React from "react";
import ProductGroup from "core/pages/product-grouping";

export default function ProductGrouping(props) {
  return (
    <div>
      <ProductGroup
        {...props}
        parentRoute={"/inventory-smart/store-eligibility-grouping"}
        prevScr={"/inventory-smart/store-eligibility-grouping"}
        application_code={1}
        application_name={"InventorySmart"}
      ></ProductGroup>
    </div>
  );
}
