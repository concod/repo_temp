import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { Tabs } from "impact-ui-v3";
import { OMS_REPORTS_SUBTABS } from "modules/oms/constants-oms/stringConstants";
import VendorProjections from "../Vendor-Projections";
import LateOrders from "../Late-Orders";
import ExpediteOrders from "../Expedite-Orders";
import { setNoOfButtonsNextToTab } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";

const OMSVendorDCReporting = (props) => {
  const [selectedSubTab, setSelectedSubTab] = useState(null);
  const [tabsList, setTabsList] = useState([]);

  const handleSubTabChange = (event, newValue) => {
    setSelectedSubTab(newValue);
  };

  const calculateTabWidth = () => {
    if (props.no_of_buttons_next_to_tab === undefined) return "100%";
    if (props.no_of_buttons_next_to_tab === 1) return `calc(100% - 140px)`;
    return `calc(100% - ${
      140 + (props.no_of_buttons_next_to_tab - 1) * 142
    }px)`;
  };

  useEffect(() => {
    const newTabsList = [];
    OMS_REPORTS_SUBTABS.forEach((tabOption) => {
      if (!props.moduleConfig?.hiddenModules?.includes(tabOption.value)) {
        newTabsList.push({ ...tabProps(tabOption) });
      }
    });
    setTabsList(newTabsList);

    setSelectedSubTab(newTabsList?.[0]?.value);
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
    };

    let tablePanel = tabsList.map((thisTab) => {
      let tabValue = thisTab?.value;
      return <div>{OMSReportsMapper[tabValue]}</div>;
    });
    return tablePanel;
  };

  useEffect(() => {
    return () => {
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, []);

  useEffect(() => {
    props.setNoOfButtonsNextToTab(undefined);
    return () => {
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, [selectedSubTab]);

  useEffect(() => {
    const tabFilterConfigMap = {
      vendor_projections: "ordersFilterConfiguration",
      late_orders: "lateOrdersFilterConfiguration",
      expedite_orders: "expediteOrdersFilterConfiguration",
    };
    const currentFilterConfigKey = tabFilterConfigMap[selectedSubTab];
    const hasFiltersApplied =
      currentFilterConfigKey &&
      props.filterDashboardConfiguration?.[currentFilterConfigKey]
        ?.appliedFilterData?.dependencyData?.length > 0;
    props.setNoOfButtonsNextToTab(hasFiltersApplied ? 1 : undefined);
  }, [props.filterDashboardConfiguration, selectedSubTab]);

  return (
    <>
      <Tabs
        sx={{ width: calculateTabWidth() }}
        value={selectedSubTab}
        onChange={(_event, newValue) => handleSubTabChange(_event, newValue)}
        tabNames={[...tabsList]}
        tabPanels={renderTabComponents()}
      />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    moduleConfig:
      store.omsReducer.orderingCommonService.orderingModuleConfig
        ?.module_screens_info?.reports_oms,
    no_of_buttons_next_to_tab:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.no_of_buttons_next_to_tab,
    filterDashboardConfiguration:
      store.filterReducer?.filterDashboardConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setNoOfButtonsNextToTab: (value) => dispatch(setNoOfButtonsNextToTab(value)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OMSVendorDCReporting);
