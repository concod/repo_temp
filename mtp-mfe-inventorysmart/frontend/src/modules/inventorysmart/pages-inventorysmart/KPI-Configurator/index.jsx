import { useState, useEffect } from "react";
import { connect } from "react-redux";
import { useLocation } from "react-router-dom-v5-compat";
import { Tabs } from "impact-ui-v3";
import globalStyles from "core/Styles/globalStyles";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { fetchKpiModuleAccess } from "./utils/fetchKpiModuleAccess";
import CustomKPIs from "./components/CustomKPIs";
import CalculatedFields from "./components/CalculatedFields";

const KPIConfigurator = (props) => {
  const globalClasses = globalStyles();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(0);

  // Load KPI Configurator UAM permissions once tenant screen config is available
  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      fetchKpiModuleAccess({
        inventorysmartScreenConfig: props.inventorysmartScreenConfig,
        setInventorySmartModulesPermissions:
          props.setInventorySmartModulesPermissions,
        setInventorySmartPermissionLoader:
          props.setInventorySmartPermissionLoader,
      });
    }
  }, [props.inventorysmartScreenConfig]);

  const paths = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "KPI Configurator",
      to: "#",
    },
  ];

  // Handle URL query parameters on mount and when location changes
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabParam = searchParams.get("tab");

    // Set active tab based on URL parameter
    if (tabParam === "calculated-fields") {
      setActiveTab(1);
    } else if (tabParam === "custom-kpis") {
      setActiveTab(0);
    }
    // Note: The create parameter is handled by CalculatedFields component
    // which will clean up the URL params after reading them
  }, [location.search]);

  const handleTabChange = (_event, newValue) => {
    setActiveTab(newValue);
  };

  const tabs = [
    {
      label: "Custom KPIs",
      value: 0,
    },
    {
      label: "Calculated Fields",
      value: 1,
    },
  ];

  const tabPanels = [
    <CustomKPIs key="custom-kpis" />,
    <CalculatedFields key="calculated-fields" />,
  ];

  return (
    <div className={globalClasses.paddingAround}>
      {/* Breadcrumb Navigation */}
      <div className={globalClasses.marginBottom}>
        <HeaderBreadCrumbs options={paths} />
      </div>

      {/* Tabs Component */}
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        tabNames={tabs}
        tabPanels={tabPanels}
      />
      {/* <div className={`${globalClasses.pageContainer} ${globalClasses.paddingAround}`}>
      KPI Configurator
      <DefineKPI /> */}
    </div>
  );
};

const mapStateToProps = (store) => ({
  inventorysmartScreenConfig:
    store.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartScreenConfig,
  inventorysmartModulesPermission:
    store.inventorysmartReducer?.inventorySmartCommonService
      ?.inventorysmartModulesPermission,
});

const mapDispatchToProps = (dispatch) => ({
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(KPIConfigurator);
