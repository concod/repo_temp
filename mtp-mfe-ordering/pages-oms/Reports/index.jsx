import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Tabs } from "impact-ui-v3";
import { OMS_REPORTS_TABS } from "modules/oms/constants-oms/stringConstants";
import VendorProjections from "./Vendor-Projections";
import LateOrders from "./Late-Orders";
import ExpediteOrders from "./Expedite-Orders";
import { IS_TAB_OVERRIDEN_WIDTH } from "config/constants";

const OMSReporting = (props) => {
  const [selectedSubTab, setSelectedSubTab] = useState(null);
  const [tabsList, setTabsList] = useState([]);

  const handleSubTabChange = (event, newValue) => {
    setSelectedSubTab(newValue);
  };

  useEffect(() => {
    const newTabsList = [];
    OMS_REPORTS_TABS.forEach((tabOption) => {
      if (!props.moduleConfig?.hiddenModules?.includes(tabOption.value)) {
        newTabsList.push({ ...tabProps(tabOption) });
      }
    });
    setTabsList(newTabsList);
  }, [props.moduleConfig]);

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  const renderTabComponents = () => {
    let OMSReportsMapper = {
      vendor_projections: (
        <VendorProjections key="vendor_projections" {...props} />
      ),
      late_orders: <LateOrders key="late_orders" {...props} />,
      expedite_orders: <ExpediteOrders key="expedite_orders" {...props} />,
      //case "drop_ship":
      // return <DropShip key="drop_ship" {...props} />;
      //case "future_receipts_reports":
      // return (
      //   <OmsFutureReceiptsReports key="future_receipts_reports" {...props} />
      // );
      //case "forecast_accuracy":
      // return <ForescastAccuracy key="forecast_accuracy" {...props} />;
    };

    let tablePanel = tabsList.map((thisTab) => {
      let tabValue = thisTab?.value;
      return <div>{OMSReportsMapper[tabValue]}</div>;
    });
    return tablePanel;
  };

  useEffect(() => {
    if (props.moduleConfig?.hiddenModules?.includes("vendor_projections")) {
      setSelectedSubTab("drop_ship");
    } else {
      setSelectedSubTab("vendor_projections");
    }
  }, [props.moduleConfig]);

  return (
    <>
      <Tabs
        value={selectedSubTab}
        onChange={(_event, newValue) => handleSubTabChange(_event, newValue)}
        tabNames={[...tabsList]}
        tabPanels={renderTabComponents()}
        sx={{width: IS_TAB_OVERRIDEN_WIDTH}}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    moduleConfig:
      store.omsReducer.orderingCommonService.orderingModuleConfig
        ?.module_screens_info?.reports_oms,
  };
};

export default connect(mapStateToProps, null)(OMSReporting);
