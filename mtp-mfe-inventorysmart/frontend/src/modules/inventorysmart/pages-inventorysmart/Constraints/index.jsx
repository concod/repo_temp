import { useNavigate } from "react-router-dom-v5-compat";
import { DASHBOARD } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import {
  APP_NAME,
  CONSTRAINTS_HEADER_TAB,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  ROLES_ACCESS_MODULES_MAPPING,
  DC_TRANSFER_SUBTABS,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import RulesConstraintComponent from "./Rules-Constraints";
import { connect } from "react-redux";
import UserReserveInvComponent from "./User-Reserve-Inv";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { tabModulePermissionMap } from "./config/tabConfig";
import { getTabItemVisibility } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { displaySnackMessages } from "../inventorysmart-utility";
import { addSnack } from "core/actions/snackbarActions";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import { Tabs, ButtonGroup } from "impact-ui-v3";
import DCTransferConstraints from "modules/inventorysmart/pages-inventorysmart/DC-DC-Transfer/DC-Transfer-Constraints";
import DCServiceLevels from "modules/inventorysmart/pages-inventorysmart/DC-DC-Transfer/DC-Service-Levels";
import { IS_TAB_OVERRIDEN_WIDTH } from "config/constants";

//Start of OMS Constraints Tabs
import {
  CONSTRAINTS_OMS_SUBTAB,
  CONSTRAINTS_OMS_DELIVERY_SUBTAB,
} from "modules/oms/constants-oms/stringConstants";
import { setOmsConstraintsScreenConfig } from "modules/oms/services-oms/Constraints/constraints-services";
import {
  setConstraintsConfigs,
  setShowNewConstraintFlow,
} from "modules/inventorysmart/services-inventorysmart/Constraints/constraints-services";
import { getModuleBasedTenantConfig } from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import { handleErrorMessage } from "../inventorysmart-utility";
import OMSConstraints from "modules/oms/pages-oms/Constraints/index.jsx";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import LandingScreen from "./landing-screen/LandingScreen";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";

const InventoryDashboard = (props) => {
  const {
    inventorysmartScreenConfig,
    omsModuleConfig,
    inventorysmartModulesPermission,
    module,
    constraintsConfigs,
  } = props;

  const navigate = useNavigate();

  const globalClasses = globalStyles();
  const classes = useStyles();

  const [hideHeaderTab, setHideHeaderTab] = useState(false);
  const [selectedTab, setSelectedTab] = useState(null);
  const [tabsList, setTabsList] = useState([]);
  const [selectedSubTab, setSelectedSubTab] = useState(null);
  const [selectedDeliveryTab, setSelectedDeliveryTab] = useState(null);
  const [omsTabs, setOmsTabs] = useState([]);
  const [showNewConstraintFlow, setShowNewConstraintFlow] = useState(false);
  const [isNewFlowConfigResolved, setIsNewFlowConfigResolved] = useState(false);

  useEffect(() => {
    let oms_tabs = [];
    CONSTRAINTS_OMS_SUBTAB.map((tabOption) => {
      const hiddenOMSModules =
        omsModuleConfig?.module_screens_info?.inventorysmart_oms_constraints
          ?.hiddenModules;
      if (!hiddenOMSModules?.includes(tabOption.value)) {
        oms_tabs.push(tabOption);
      }
    });
    setOmsTabs(oms_tabs);
  }, [omsModuleConfig]);

  useEffect(() => {
    fetchModuleConfigs();
  }, []);

  useEffect(() => {
    return () => {
      sessionStorage.removeItem("isRedirectedFromOMSRCLConstraints");
    };
  }, []);

  useEffect(() => {
    const newTabsList = CONSTRAINTS_HEADER_TAB.map((tabOption) => {
      if (constraintsConfigs?.hidden?.includes(tabOption.value)) {
        return null;
      }

      const omsTabName =
        omsModuleConfig?.module_screens_info?.inventorysmart_oms_constraints
          ?.tabName;
      if (omsTabName && tabOption.value === "constraints_oms") {
        tabOption.label = omsTabName;
      }

      if (tabOption.value === "store_allocations") {
        const storeLabel = (dynamicLabelsBasedOnTenant("store", "core") || "Store").trim();
        tabOption.label = `${storeLabel} Allocations`;
      }

      const { value } = tabOption;
      const tabPermissions = tabModulePermissionMap[value];
      const displayFlag = getTabItemVisibility(
        inventorysmartModulesPermission[module],
        tabPermissions
      );

      if (!displayFlag) {
        return null;
      }

      return tabOption;
      // return <Tab {...tabProps(tabOption)} />;
    });

    //OMS Tab Configurations
    const isOMSModuleHidden = omsModuleConfig?.hiddenModules?.includes(
      "inventorysmart_oms_constraints"
    );
    const isOMSEnabled = omsModuleConfig?.is_oms_enabled;
    const filteredTabList = newTabsList.filter((item) => {
      if (!item) return false;
      // Remove the "constraints_oms" tab if OMS is disabled Or OMS Constraints is hidden
      if (item.value === "constraints_oms") {
        return isOMSEnabled && !isOMSModuleHidden;
      }
      return true;
    });

    setTabsList(filteredTabList);
  }, [constraintsConfigs, inventorysmartModulesPermission, module]);

  const routeOptions = [
    {
      label: "Home",
      to: "/home",
    },
    {
      label: "Constraints",
      id: 1,
      action: () => {
        navigate(DASHBOARD);
      },
    },
  ];

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
    if (newValue === CONSTRAINTS_HEADER_TAB[1].value) {
      setSelectedSubTab(omsTabs[0].value);
    } else if (newValue === "dc_transfer") {
      setSelectedSubTab(DC_TRANSFER_SUBTABS[0].value);
    }
    sessionStorage.removeItem("isRedirectedFromOMSRCLConstraints");
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
    if (
      constraintsConfigs?.hidden?.includes("constraints_oms") &&
      constraintsConfigs?.hidden?.includes("store_allocations") &&
      constraintsConfigs?.hidden?.includes("user_reserve") &&
      constraintsConfigs?.hidden?.includes("sma")
    ) {
      setHideHeaderTab(true);
    }

    if (constraintsConfigs?.hidden?.includes("store_allocations")) {
      setSelectedTab(CONSTRAINTS_HEADER_TAB[1].value);
    } else {
      setSelectedTab(CONSTRAINTS_HEADER_TAB[0].value);
    }
    if (omsTabs.length) {
      setSelectedSubTab(omsTabs[0].value);
      setSelectedDeliveryTab(CONSTRAINTS_OMS_DELIVERY_SUBTAB[0].value);
    }

    //if redirected from OMS RCL Constraints Flow
    if (
      sessionStorage.getItem("isRedirectedFromOMSRCLConstraints") === "true" &&
      omsTabs.length > 0
    ) {
      setSelectedTab(CONSTRAINTS_HEADER_TAB[1].value);
      setSelectedDeliveryTab(CONSTRAINTS_OMS_DELIVERY_SUBTAB[0].value);
      const omsRCLIndex = omsTabs.findIndex(
        (tab) => tab.value === "vendor_constraints"
      );
      setSelectedSubTab(omsTabs[omsRCLIndex].value);
    }
  }, [constraintsConfigs, omsTabs]);

  const fetchModulesAccess = async () => {
    try {
      const module = props.module;
      const subModules = ROLES_ACCESS_MODULES_MAPPING[module];
      let rolesBasedModulesPermission = {};

      props.setInventorySmartPermissionLoader(true);

      if (inventorysmartScreenConfig?.roleBasedAccess) {
        const accessDataResponse = await getModuleLevelAccessUtility({
          app: APP_NAME,
          module: subModules,
        })();

        rolesBasedModulesPermission = Object.fromEntries(
          Object.entries(accessDataResponse).map(([module, actions]) => [
            module,
            Object.keys(actions),
          ])
        );
      } else {
        subModules.map(async (subModule) => {
          rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
        });
      }

      props.setInventorySmartModulesPermissions({
        [module]: rolesBasedModulesPermission,
      });
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error", props);
    } finally {
      props.setInventorySmartPermissionLoader(false);
    }
  };

  useEffect(() => {
    fetchModulesAccess();
    // role-based access only depends on module + whether urm is enabled
    // not on every constraints tab config refresh
  }, [props.module, inventorysmartScreenConfig?.roleBasedAccess]);

  const fetchModuleConfigs = async () => {
    try {
      let reqBody = {
        module_name: "inventorysmart_constraints_configs",
        screen_name: props.screenName,
      };
      let response = await props.getModuleBasedTenantConfig(reqBody);
      props.setConstraintsConfigs(response);
    } catch (e) {
      handleErrorMessage(e, props);
    }
  };

  useEffect(() => {
    const fetchConstraintsNewFlow = async () => {
      try {
        const constraintsNewFlowResponse = await props?.tenantConfigApiCache(
          1,
          {
            attribute_name: "constraints_new_flow",
          }
        );
        const constraintsNewFlowValue =
          constraintsNewFlowResponse?.data?.data[0]?.attribute_value || {};
        const isNewFlow =
          constraintsNewFlowValue?.inventorysmart_constraints_screen
            ?.showNewConstraintFlow === true;
        setShowNewConstraintFlow(isNewFlow);
        props.setShowNewConstraintFlowRedux(isNewFlow);
      } catch (error) {
        handleErrorMessage(error, props);
      } finally {
        setIsNewFlowConfigResolved(true);
      }
    };
    fetchConstraintsNewFlow();
  }, []);

  const renderStoreAllocationsContent = () => {
    const commonProps = {
      ...props,
      screenName: props.screenName,
      module: props.module,
    };

    // Wait for the tenant flag before mounting either flow. showNewConstraintFlow
    // defaults to false, so mounting immediately would flash the old flow first.
    if (!isNewFlowConfigResolved) {
      return null;
    }

    if (showNewConstraintFlow) {
      return <LandingScreen {...commonProps} isNewFlow={showNewConstraintFlow} />;
    }

    return <RulesConstraintComponent {...commonProps} />;
  };

  const renderTabComponents = () => {
    const tabContents = {
      store_allocations: renderStoreAllocationsContent(),
      constraints_oms: (
        <OMSConstraints
          tabProps={tabProps}
          screenName={props.screenName}
          omsTabs={omsTabs}
          omsModuleConfig={omsModuleConfig}
          inventorysmartModulesPermission={inventorysmartModulesPermission}
          module={module}
          selectedSubTab={selectedSubTab}
          handleSubTabChange={handleSubTabChange}
          selectedDeliveryTab={selectedDeliveryTab}
          handleDeliveryTabChange={handleDeliveryTabChange}
          constraintsConfigs={constraintsConfigs}
        />
      ),
      user_reserve: (
        <UserReserveInvComponent
          {...props}
          screenName={props.screenName}
          module={module}
        />
      ),
      dc_transfer: <DCTransferTabPanel screenName={props.screenName} />,
    };
    return tabContents[selectedTab];
  };

  const handleSubTabChange = (event, newValue) => {
    setSelectedSubTab(newValue);
  };

  const handleDeliveryTabChange = (event, newValue) => {
    setSelectedDeliveryTab(newValue);
  };

  useEffect(() => {
    const fetchOMSConstraintsConfig = async () => {
      try {
        const omsConstraintsConfig = await props?.tenantConfigApiCache(1, {
          attribute_name: "inv_oms_constraints_config",
        });
        if (omsConstraintsConfig) {
          props.setOmsConstraintsScreenConfig(
            omsConstraintsConfig?.data?.data[0]?.attribute_value?.constraints
          );
        }
      } catch (error) {
        console.log("Error in fetchOMSConstraintsConfig", error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchOMSConstraintsConfig();
  }, []);
  const DCTransferTabPanel = (props) => {
    const visibleDcSubTabs = DC_TRANSFER_SUBTABS.filter(
      (tab) => !constraintsConfigs?.hidden?.includes(tab.value)
    );

    if (visibleDcSubTabs.length === 1) {
      // No sub-tab row: offset by +13px so the child's -57px lands at -44px
      // (same alignment as other single-content constraint tabs)
      return (
        <div style={{ marginTop: "13px" }}>
          {renderDCTransferComponents(props.screenName, visibleDcSubTabs[0].value)}
        </div>
      );
    }

    return (
      <div className={globalClasses.paddingTop_24}>
        <Tabs
          sx={{ width: IS_TAB_OVERRIDEN_WIDTH }}
          value={selectedSubTab}
          onChange={handleSubTabChange}
          aria-label="dc-transfer-tab"
          tabNames={visibleDcSubTabs}
          tabPanels={visibleDcSubTabs.map((tabOption) =>
            renderDCTransferComponents(props.screenName, tabOption.value)
          )}
        />
      </div>
    );
  };

  const renderDCTransferComponents = (screenName, tabValue) => {
    switch (tabValue) {
      case "dc_transfer_constraints":
        return (
          <div key="dc_transfer_constraints">
            <DCTransferConstraints screenName={screenName} />
          </div>
        );

      case "dc_service_levels":
        return (
          <div key="dc_service_levels">
            <DCServiceLevels screenName={screenName} />
          </div>
        );
      default:
        return null;
    }
  };

  const hasUserReserveSubTabs =
    props.userReserveConfigs?.userReserveTabs?.length > 0;
  const showMainTabBottomPadding =
    selectedTab === CONSTRAINTS_HEADER_TAB[1].value ||
    (selectedTab === "user_reserve" && hasUserReserveSubTabs);

  return (
    <div
      className={`${globalClasses.paddingAroundNew} ${globalClasses.mainContainerBody}`}
    >
      <div
        className={`${globalClasses.breadcrumbPadding} ${globalClasses.marginBottom_12}`}
      >
        <HeaderBreadCrumbs options={routeOptions} />
      </div>

      <div
        className={`${classes.constraintsTabsContent} ${globalClasses.tabsContainerBody}`}
      >
        <div className={classes.constraintsContentPadding}>
          {hideHeaderTab ? (
            <RulesConstraintComponent
              screenName={props.screenName}
              {...props}
              module={props.module}
            />
          ) : (
            <>
              {tabsList.length > 1 && (
                <div
                  className={`${globalClasses.centerAlign} ${
                    showMainTabBottomPadding ? classes.paddingBottom24 : ""
                  }`}
                  style={{ pointerEvents: "none" }}
                >
                  <div style={{ pointerEvents: "auto" }}>
                    <ButtonGroup
                      onChange={handleTabChange}
                      options={tabsList}
                      selectedOption={selectedTab}
                    />
                  </div>
                </div>
              )}
              {renderTabComponents()}
            </>
          )}
        </div>
      </div>
    </div>
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

    omsModuleConfig:
      store.omsReducer?.orderingCommonService?.orderingModuleConfig,
    constraintsConfigs:
      store.inventorysmartReducer.inventorySmartConstraints.constraintsConfigs,
    userReserveConfigs:
      store.inventorysmartReducer.inventorySmartConstraints.userReserveConfigs,
  };
};

const mapDispatchToProps = (dispatch) => ({
  addSnack: (body) => dispatch(addSnack(body)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setOmsConstraintsScreenConfig: (payload) =>
    dispatch(setOmsConstraintsScreenConfig(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
  setConstraintsConfigs: (payload) => dispatch(setConstraintsConfigs(payload)),
  getModuleBasedTenantConfig: (module) =>
    dispatch(getModuleBasedTenantConfig(module)),
  setShowNewConstraintFlowRedux: (payload) =>
    dispatch(setShowNewConstraintFlow(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(InventoryDashboard);
