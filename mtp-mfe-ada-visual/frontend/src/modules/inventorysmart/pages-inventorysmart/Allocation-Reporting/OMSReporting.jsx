import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Tab, Tabs } from "@mui/material";
import { ALLOCATION_REPORT_OMS_SUBTAB } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import VendorProjections from "./Vendor-Projections";
import DropShip from "./Drop-Ship";

const OMSReporting = (props) => {
  const [selectedSubTab, setSelectedSubTab] = useState(null);

  const handleSubTabChange = (event, newValue) => {
    setSelectedSubTab(newValue);
  };

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  const renderTabComponents = () => {
    switch (selectedSubTab) {
      case "vendor_projections":
        return <VendorProjections {...props} />;
      case "drop_ship":
        return <DropShip {...props} />;
      default:
        return;
    }
  };

  useEffect(() => {
    if (
      props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
        "vendor_projections"
      )
    ) {
      setSelectedSubTab("drop_ship");
    } else {
      setSelectedSubTab("vendor_projections");
    }
  }, [props.inventorysmartScreenConfig]);

  return (
    <>
      <Tabs
        value={selectedSubTab}
        onChange={handleSubTabChange}
        aria-label="allocation-reports-tab"
      >
        {ALLOCATION_REPORT_OMS_SUBTAB.map(
          (tabOption) =>
            !props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
              tabOption.value
            ) && <Tab {...tabProps(tabOption)} />
        )}
      </Tabs>
      {renderTabComponents()}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

export default connect(mapStateToProps, null)(OMSReporting);
