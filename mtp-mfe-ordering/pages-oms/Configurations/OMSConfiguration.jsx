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
import { IS_TAB_OVERRIDEN_WIDTH } from "config/constants";

function OMSConfiguration({
  moduleConfig,
  inventorysmartModulesPermission,
  module,
  screenName,
}) {
  const [selectedSubTab, setSelectedSubTab] = useState(
    CONFIGURATIONS_OMS_SUBTAB[0].value
  );
  const handleSubTabChange = (event, newValue) => {
    setSelectedSubTab(newValue);
  };
  const [tabList, setTabList] = useState([]);

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
  }, []);

  console.log("tabList", tabList);

  return (
    <>
      <div>
        <Tabs
          sx={{ width: IS_TAB_OVERRIDEN_WIDTH }}
          value={selectedSubTab}
          onChange={(_event, newValue) => handleSubTabChange(_event, newValue)}
          aria-label="oms-configurations-tab"
          tabNames={[...tabList]}
          tabPanels={renderSubTabComponents(screenName)}
        />
      </div>
    </>
  );
}

const mapStateToProps = (store) => {
  return {
    moduleConfig: store.omsReducer.orderingCommonService.orderingModuleConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
  };
};

const mapDispatchToProps = (dispatch) => ({});

export default connect(mapStateToProps, mapDispatchToProps)(OMSConfiguration);
