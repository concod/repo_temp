import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { Tabs } from "impact-ui-v3";
import Status from "modules/oms/pages-oms/Constraints/Status";
import VendorDCPolicy from "modules/oms/pages-oms/Constraints/VendorDCPolicy";
import { getTabItemVisibility } from "modules/oms/utils-oms/oms-utility";
import { omsOrderingTabModulePermissionMap } from "../common/omsTabConfig";
import {
  CONFIGURATIONS_OMS_SUBTAB,
  OMS_CONFIGURATION_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import { setNoOfButtonsNextToTab } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";

function ConfigurationsTab({
  moduleConfig,
  inventorysmartModulesPermission,
  module,
  screenName,
  no_of_buttons_next_to_tab,
  filterDashboardConfiguration,
  setNoOfButtonsNextToTab: setHeaderButtonsNextToTab,
}) {
  const [selectedSubTab, setSelectedSubTab] = useState(
    CONFIGURATIONS_OMS_SUBTAB[0].value
  );
  const handleSubTabChange = (event, newValue) => {
    setSelectedSubTab(newValue);
  };
  const [tabList, setTabList] = useState([]);

  const calculateTabWidth = () => {
    const n = no_of_buttons_next_to_tab;
    if (n === undefined || n === null || n < 1) {
      return "100%";
    }
    if (n === 1) {
      return `calc(100% - 140px)`;
    }
    return `calc(100% - ${140 + (n - 1) * 142}px)`;
  };

  const renderSubTabComponents = (screenName) => {
    let ReportsMapper = {
      constraints_status: <Status screenName={screenName} />,
      constraints_vendor_dc_policy: <VendorDCPolicy screenName={screenName} />,
    };

    let tablePanel = tabList.map((thisTab) => {
      let tabValue = thisTab?.value;
      return <div>{ReportsMapper[tabValue]}</div>;
    });
    return tablePanel;
  };
  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  useEffect(() => {
    const newTabsList = [];
    CONFIGURATIONS_OMS_SUBTAB.forEach((tabOption) => {
      const omsSubTabName =
        moduleConfig?.module_screens_info?.[OMS_CONFIGURATION_SCREENNAME_KEY]
          ?.subTabs?.[tabOption.value];
      if (omsSubTabName) {
        tabOption.label = omsSubTabName;
      }

      const { value } = tabOption;
      const tabPermissions = omsOrderingTabModulePermissionMap[value];
      const displayFlag = getTabItemVisibility(
        inventorysmartModulesPermission[module],
        tabPermissions
      );

      if (!displayFlag) {
        return null;
      }

      newTabsList.push({ ...tabProps(tabOption) });
    });
    setTabList(newTabsList);
  }, [moduleConfig, inventorysmartModulesPermission, module]);

  useEffect(() => {
    return () => {
      setHeaderButtonsNextToTab(undefined);
    };
  }, []);

  useEffect(() => {
    setHeaderButtonsNextToTab(undefined);
    return () => {
      setHeaderButtonsNextToTab(undefined);
    };
  }, [selectedSubTab]);

  useEffect(() => {
    const tabFilterConfigMap = {
      constraints_status: "ConstraintsOrderManagementFilterConfiguration",
      constraints_vendor_dc_policy:
        "ConstraintsOrderManagementFilterConfiguration",
    };
    const currentFilterConfigKey = tabFilterConfigMap[selectedSubTab];
    const hasFiltersApplied =
      currentFilterConfigKey &&
      filterDashboardConfiguration?.[currentFilterConfigKey]?.appliedFilterData
        ?.dependencyData?.length > 0;
    setHeaderButtonsNextToTab(hasFiltersApplied ? 1 : undefined);
  }, [filterDashboardConfiguration, selectedSubTab]);

  return (
    <>
      <Tabs
        sx={{ width: calculateTabWidth() }}
        value={selectedSubTab}
        onChange={(_event, newValue) => handleSubTabChange(_event, newValue)}
        aria-label="oms-configurations-tab"
        tabNames={[...tabList]}
        tabPanels={renderSubTabComponents(screenName)}
      />
    </>
  );
}

const mapStateToProps = (store) => {
  return {
    moduleConfig: store.omsReducer.orderingCommonService.orderingModuleConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
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

export default connect(mapStateToProps, mapDispatchToProps)(ConfigurationsTab);
