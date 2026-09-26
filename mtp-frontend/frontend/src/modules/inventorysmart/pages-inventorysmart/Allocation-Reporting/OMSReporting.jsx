import { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Tab, Tabs } from "@mui/material";
import { ALLOCATION_REPORT_OMS_SUBTAB } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import VendorProjections from "./Vendor-Projections";
import DropShip from "./Drop-Ship";
import ExpediteOrders from "./Expedite-Orders";
import LateOrders from "./Late-Orders";
import OmsFutureReceiptsReports from "./Oms-Future-Receipts-Reports";
import { omsTabModulePermissionMap } from "./config/tabConfig";
import { getTabItemVisibility } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import ForescastAccuracy from "./Forescast-Accuracy";

const OMSReporting = (props) => {
  const {
    inventorysmartScreenConfig,
    inventorysmartModulesPermission,
    module,
  } = props;

  const [selectedSubTab, setSelectedSubTab] = useState(null);
  const [tabsList, setTabsList] = useState([]);

  useEffect(() => {
    const newTabsList = ALLOCATION_REPORT_OMS_SUBTAB.map((tabOption) => {
      if (
        props.inventorysmartScreenConfig?.inventorysmart_allocation_report?.drillDown?.hidden?.includes(
          tabOption.value
        )
      ) {
        return null;
      }

      const { value } = tabOption;
      const tabPermissions = omsTabModulePermissionMap[value];
      const displayFlag = getTabItemVisibility(
        inventorysmartModulesPermission[module],
        tabPermissions
      );

      if (!displayFlag) {
        return null;
      }

      return <Tab {...tabProps(tabOption)} />;
    });

    setTabsList(newTabsList);
  }, [inventorysmartScreenConfig, inventorysmartModulesPermission, module]);

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
        return <VendorProjections key="vendor_projections" {...props} />;
      case "drop_ship":
        return <DropShip key="drop_ship" {...props} />;
      case "expedite_orders":
        return <ExpediteOrders key="expedite_orders" {...props} />;
      case "late_orders":
        return <LateOrders key="late_orders" {...props} />;
      case "future_receipts_reports":
        return (
          <OmsFutureReceiptsReports key="future_receipts_reports" {...props} />
        );
      case "forecast_accuracy" :
        return <ForescastAccuracy key="forecast_accuracy" {...props}/>   
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
        {tabsList}
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
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
  };
};

export default connect(mapStateToProps, null)(OMSReporting);
