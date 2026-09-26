import React from "react";
import VendorDelivery from "./components/vendor-delivery";
import VendorOrdering from "./components/vendor-ordering";
import TabsComponentScreen from "core/commonComponents/coreComponentScreen/TabsComponentScreen";

function VendorProduct(props) {
  const tabsComponentList = [
    {
      label: "Delivery",
      id: "vendor-delivery",
      TabPanel: <VendorDelivery />,
    },
    {
      label: "Ordering",
      id: "vendor-ordering",
      TabPanel: <VendorOrdering />,
    },
  ];
  return (
    <TabsComponentScreen
      pageLabel={"Vendor Product"}
      tabsComponentList={tabsComponentList}
    />
  );
}

export default VendorProduct;
