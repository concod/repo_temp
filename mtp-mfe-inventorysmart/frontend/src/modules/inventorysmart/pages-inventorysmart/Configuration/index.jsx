import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import Tabs from "core/commonComponents/tabs";
import TabLayout from "./components/tab-layout";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { useTranslation } from "impact-ui-v3";
import { useLocation, useNavigationType } from "react-router-dom-v5-compat";

import {
  setInventorysmartRulesFilterDependency,
  setSelectedRulesArticles,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";

import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  setTabLevelData,
  setChildTabLevelData,
  resetChildLevelData,
} from "modules/inventorysmart/services-inventorysmart/Configuration/inventory-smart-configuration-services";
import {
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
  CONFIGUTAIONS_CACHE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isActionAllowedOnSubModule } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";

import { isEmpty, isUndefined, cloneDeep } from "lodash";

import {
  ADD_NEW_STORE,
  ADD_NEW_STORE_TRANSFER_RULE,
  ADD_NEW_DC_TRANSFER_RULE,
  CREATE_NEW_PRODUCT_MAPPING,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import PlanConfigTable from "./components/plan-configuration";
import LoadingOverlay from "core/Utils/Loader/loader";
import {
  setKeyValueInCache,
  clearActiveModuleCache,
} from "../../services-inventorysmart/active-module-common-service";
import { getModuleBasedTenantConfig } from "../../services-inventorysmart/common/inventory-smart-common-services";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import globalStyles from "core/Styles/globalStyles";

//OMS Related Imports
import { setOmsConstraintsScreenConfig } from "modules/oms/services-oms/Constraints/constraints-services";
import OMSConfiguration from "modules/oms/pages-oms/Configurations/index.jsx";

const useStyles = makeStyles({
  hideTopTabButtons: {
    "& > div > div:first-of-type": {
      display: "none",
    },
  },
});

const findTabIndexById = (tabs, tabId, fallbackIndex = 0) => {
  if (!tabs || tabs.length === 0) {
    return fallbackIndex;
  }

  const tabIndex = tabs.findIndex((tab) => tab.id === tabId);
  return tabIndex !== -1 ? tabIndex : fallbackIndex;
};

const Configuration = (props) => {
  const { t } = useTranslation();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);
  const navType = useNavigationType();
  let location = useLocation();

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const articles = JSON.parse(localStorage.getItem("selectedArticles")) || [];

  const type = new URLSearchParams(window.location.search).get("type");
  const redirectTab0 = Number(
    new URLSearchParams(window.location.search).get("tab0")
  );
  const redirectTab1 = Number(
    new URLSearchParams(window.location.search).get("tab1")
  );

  const fromPath =
    typeof location?.state === "string" ? location.state : location?.state?.from;

  const [tabs, setTabs] = useState([]);
  const [defaultIndex, setDefaultIndex] = useState(
    props.tabLevelData[0]?.id || 0
  );
  const [isModuleAccessFetched, setIsModuleAccessFetched] = useState(false);
  const [hiddenDimensionTabs, setHiddenDimensionTabs] = useState([]);
  const updateTabIndex = (childLevel, indexVal) => {
    props?.setChildTabLevelData({
      parentLevel: 0,
      level: childLevel,
      id: indexVal,
    });
  };

  useEffect(() => {
    const fetchConfigsOnLoad = async () => {
      try {
        let response;
        if (
          props?.cache[CONFIGUTAIONS_CACHE] &&
          props?.cache[CONFIGUTAIONS_CACHE]["AUTO-ALLOCATION-SCHEDULER"]
        ) {
          response =
            props?.cache[CONFIGUTAIONS_CACHE]["AUTO-ALLOCATION-SCHEDULER"];
        } else {
          response = await props?.getModuleBasedTenantConfig({
            module_name: "CONFIGURATION-CONFIGS",
            screen_name: "Inventorysmart Configurations",
          });
          props?.setKeyValueInCache({
            key: "AUTO-ALLOCATION-SCHEDULER",
            value: response,
            module: CONFIGUTAIONS_CACHE,
            persist: true,
          });
        }
      } catch (e) {
        console.log(e, "error");
      }
    };
    fetchConfigsOnLoad();
    return () => {
      props.clearActiveModuleCache(CONFIGUTAIONS_CACHE);
    };
  }, []);
  // First Level tabs in configuration module
  let tabsData = [
    {
      label: dynamicLabelsBasedOnTenant("article"),
      id: "product",
      level: "0",
      TabPanel: (
        <TabLayout
          {...props}
          dimension="product"
          disabled={isRedirectedFromDifferentPage}
          type={type}
          module={props?.module}
          screenName={props?.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
          hideProductDimensionSubTabs={
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.drillDown?.hiddenTabs
          }
          defaultChildIndex={
            props.tabLevelData[0]?.[0]?.id || redirectTab1 || 0
          }
          handleChange={(index) => updateTabIndex(0, index)}
          setTabs={setTabs}
          tabsData={tabs}
          setHiddenDimensionTabs={setHiddenDimensionTabs}
          hiddenDimensionTabs={hiddenDimensionTabs}
        />
      ),
    },
    {
      label:
        dynamicLabelsBasedOnTenant("Store", "core") ||
        t("inventorysmart.configStoreLabel"),
      id: "store",
      level: "0",
      TabPanel: (
        <TabLayout
          {...props}
          dimension="store"
          disabled={isRedirectedFromDifferentPage}
          module={props?.module}
          screenName={props?.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
          hideStoreDimensionSubTabs={
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.drillDown?.hiddenTabs
          }
          handleChange={(index) => updateTabIndex(1, index)}
          defaultChildIndex={
            props.tabLevelData[0]?.[1]?.id || redirectTab1 || 0
          }
        />
      ),
    },
    {
      label: t("inventorysmart.configDcLabel"),
      id: "dc",
      level: "0",
      TabPanel: (
        <TabLayout
          {...props}
          dimension="dc"
          disabled={isRedirectedFromDifferentPage}
          module={props?.module}
          screenName={props?.screenName}
          inventorysmartModulesPermission={
            props.inventorysmartModulesPermission
          }
          hideDCDimensionSubTabs={
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.drillDown?.hiddenTabs
          }
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
          handleChange={(index) => updateTabIndex(2, index)}
          defaultChildIndex={
            props.tabLevelData[0]?.[2]?.id || redirectTab1 || 0
          }
        />
      ),
    },
    {
      label:
        dynamicLabelsBasedOnTenant("dc_store_policy", "core") ||
        t("inventorysmart.configDcStorePolicyLabel"),
      id: "dc-store-policy",
      level: "0",
      TabPanel: (
        <TabLayout
          {...props}
          dimension="dcStorePolicy"
          disabled={isRedirectedFromDifferentPage}
          module={props?.module}
          screenName={props?.screenName}
          inventorysmartModulesPermission={
            props.inventorysmartModulesPermission
          }
          hideDcStoryPolicySubTabs={
            props.inventorysmartScreenConfig?.inventorysmart_configuration
              ?.drillDown?.hiddenTabs
          }
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
          handleChange={(index) => updateTabIndex(2, index)}
          defaultChildIndex={
            props.tabLevelData[0]?.[2]?.id || redirectTab1 || 0
          }
        />
      ),
    },
    {
      label: t("inventorysmart.configPlanLabel"),
      id: "plan",
      level: "0",
      TabPanel: (
        <PlanConfigTable
          module={props?.module}
          inventorysmartModulesPermission={
            props.inventorysmartModulesPermission
          }
          handleChange={(index) => updateTabIndex(3, index)}
          defaultChildIndex={
            props.tabLevelData[0]?.[3]?.id || redirectTab1 || 0
          }
        />
      ),
    },
    {
      label: t("inventorysmart.configOmsLabel"),
      id: "oms",
      level: "0",
      TabPanel: (
        <OMSConfiguration
          module={props?.module}
          screenName={props?.screenName}
        />
      ),
    },
  ];

  const [allTabs] = useState(tabsData);

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
      }
    };
    fetchOMSConstraintsConfig();
  }, []);

  //OMS Configuration
  useEffect(() => {
    const isOMSModuleHidden = props.omsModuleConfig?.hiddenModules?.includes(
      "inventorysmart_oms_configuration"
    );
    //Hide OMS module if it is not enabled
    if (isOMSModuleHidden || !props.omsModuleConfig?.is_oms_enabled) {
      let filteredtabsData = allTabs.filter((item) => item.id !== "oms");
      setTabs(filteredtabsData);
    } else {
      const omsTabName =
        props.omsModuleConfig?.module_screens_info
          ?.inventorysmart_oms_configuration?.tabName;
      if (omsTabName) {
        let filteredtabsData = allTabs;
        filteredtabsData.forEach((item) => {
          if (item.id === "oms") {
            item.label = omsTabName;
          }
        });
        setTabs(filteredtabsData);
      }
    }
  }, [allTabs]);

  useEffect(() => {
    const selectedArticles =
      articles?.length > 0 ? articles : props.selectedRulesArticles;
    const selectedFiltersDependency =
      savedFiltersDependency?.length > 0
        ? savedFiltersDependency
        : props.inventorysmartRulesFilterDependency;

    const redirectedFromDifferentPage =
      // to check if the same condition has to be modified my mentioning selected articles from other screens
      type && selectedArticles?.length > 0;
    props.setInventorysmartRulesFilterDependency(selectedFiltersDependency);
    props.setSelectedRulesArticles(selectedArticles);
    setIsRedirectedFromDifferentPage(redirectedFromDifferentPage);
    localStorage.removeItem("selectedFiltersDependency");
    localStorage.removeItem("selectedArticles");
    if (
      fromPath === ADD_NEW_STORE ||
      fromPath === ADD_NEW_STORE_TRANSFER_RULE
    ) {
      const storeTabIndex = findTabIndexById(tabs, "store", 1);
      setDefaultIndex(storeTabIndex);
      // Update Redux state to prevent setCurrentTabFromHistory from overwriting
      props?.setTabLevelData({ level: 0, id: storeTabIndex });
    } else if (fromPath === ADD_NEW_DC_TRANSFER_RULE) {
      const dcTabIndex = findTabIndexById(tabs, "dc", 2);
      setDefaultIndex(dcTabIndex);
      props?.setTabLevelData({ level: 0, id: dcTabIndex });
    } else if (fromPath === CREATE_NEW_PRODUCT_MAPPING) {
      const productTabIndex = findTabIndexById(tabs, "product", 0);
      setDefaultIndex(productTabIndex);
      props?.setTabLevelData({ level: 0, id: productTabIndex });
    } else if (type === "alerts" && !isUndefined(redirectTab0)) {
      setDefaultIndex(redirectTab0);
      props?.setTabLevelData({ level: 0, id: redirectTab0 });
      props?.setChildTabLevelData({
        parentLevel: 0,
        level: 1,
        id: redirectTab1,
      });
    } else setDefaultIndex(0);
  }, []);

  useEffect(() => {
    if (navType === "POP" || navType === "PUSH") {
      setCurrentTabFromHistory();
    }
  }, [navType, tabs, props.tabLevelData]);

  useEffect(() => {
    let tabsData = allTabs;
    if (props.inventorysmartScreenConfig) {
      let hiddenParentsTabs = cloneDeep(
        props.inventorysmartScreenConfig?.inventorysmart_configuration
          ?.drillDown?.hiddenParentTabs || []
      );

      //Hide OMS module if it is not enabled
      const isOMSModuleHidden = props.omsModuleConfig?.hiddenModules?.includes(
        "inventorysmart_oms_configuration"
      );
      if (isOMSModuleHidden || !props.omsModuleConfig?.is_oms_enabled) {
        hiddenParentsTabs.push("oms");
      }

      if (hiddenParentsTabs) {
        let filteredtabsData = allTabs.filter(
          (item) => hiddenParentsTabs.indexOf(item.id) === -1
        );
        tabsData = filteredtabsData;
        setTabs(tabsData);
      }

      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse = null;
            if (
              props.cache[CONFIGUTAIONS_CACHE] &&
              props.cache[CONFIGUTAIONS_CACHE][
                "getModuleLevelAccessUtility-Configuration"
              ]
            ) {
              accessDataResponse =
                props.cache[CONFIGUTAIONS_CACHE][
                  "getModuleLevelAccessUtility-Configuration"
                ];
            } else {
              accessDataResponse = await getModuleLevelAccessUtility({
                app: APP_NAME,
                module: subModules,
              })();
              props.setKeyValueInCache({
                key: "getModuleLevelAccessUtility-Configuration",
                value: accessDataResponse,
                module: CONFIGUTAIONS_CACHE,
                persist: true,
              });
            }
            rolesBasedModulesPermission = Object.fromEntries(
              Object.entries(accessDataResponse).map(([module, actions]) => [
                module,
                Object.keys(actions),
              ])
            );
          } else {
            subModules.map(async (subModule) => {
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
          setIsModuleAccessFetched(true);
        } catch (error) {
          console.log(error, "e");
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();

      let hiddenTabs =
        props.inventorysmartScreenConfig?.inventorysmart_configuration
          ?.drillDown?.hiddenTabs;
      let showNetworkTab =
        props.inventorysmartScreenConfig?.inventorysmart_configuration
          ?.drillDown?.showNetworkTab;
      if (hiddenTabs) {
        let finaltabsData = tabsData.filter(
          (item) => hiddenTabs.indexOf(item.id) === -1
        );
        setTabs(finaltabsData);
      }
      if (showNetworkTab) {
        let networkTab = {
          label: t("inventorysmart.configNetworkLabel"),
          id: "network",
          TabPanel: (
            <TabLayout
              {...props}
              dimension="network"
              disabled={isRedirectedFromDifferentPage}
              module={props?.module}
              screenName={props?.screenName}
              roleBasedAccess={
                props.inventorysmartScreenConfig?.roleBasedAccess
              }
              hideStoreDimensionSubTabs={
                props.inventorysmartScreenConfig?.inventorysmart_configuration
                  ?.drillDown?.hiddenTabs
              }
              handleChange={(index) => updateTabIndex(1, index)}
              defaultChildIndex={
                props.tabLevelData[0]?.[1]?.id || redirectTab1 || 0
              }
            />
          ),
        };
        let finaltabsData = [...tabsData, networkTab];
        setTabs(finaltabsData);
      }
    }
  }, [props.inventorysmartScreenConfig, props.tabLevelData]);

  const setCurrentTabFromHistory = () => {
    if (props.tabLevelData[0] !== undefined && props.tabLevelData[0] !== null) {
      setDefaultIndex(props.tabLevelData[0]?.id);
    }
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  useEffect(() => {
    // if user has view access, tab should be visible
    if (
      tabs.findIndex((tab) => tab.id === "dc") > -1 &&
      props.module &&
      !isEmpty(props.inventorysmartModulesPermission)
    ) {
      let dcStatusHasAccess = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS,
        "view"
      );
      let dcMappingHasAccess =
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_PRODUCT,
          "view"
        ) ||
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_STORE,
          "view"
        ) ||
        canTakeActionOnModules(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
          "view"
        );
      // if user does not have any access to these two modules remove DC tab
      if (!dcStatusHasAccess && !dcMappingHasAccess) {
        let newTabs = tabs.filter((tab) => tab.id !== "dc"); //filter out dc tab
        setTabs(newTabs);
      } else {
        setTabs(tabs);
      }
    }
  }, [props.inventorysmartModulesPermission, props.module, props.tabLevelData]);

  useEffect(() => {
    if (hiddenDimensionTabs.length > 0) {
      setTabs(tabs.filter((tab) => !hiddenDimensionTabs.includes(tab.id)));
    }
  }, [hiddenDimensionTabs]);

  const tabChange = (newVal) => {
    const isReturningToDcTransferRule = fromPath === ADD_NEW_DC_TRANSFER_RULE;
    if (fromPath && !isReturningToDcTransferRule) {
      props.history.replace({ state: "" });
    }
    if (!isReturningToDcTransferRule) {
      props?.resetChildLevelData(0);
    }
    props?.setTabLevelData({ level: 0, id: newVal });

    const selectedTab = tabs[newVal];
    if (selectedTab?.id === "dc" && !isReturningToDcTransferRule) {
      props?.setChildTabLevelData({ parentLevel: 0, level: 2, id: 0 });
    }

    return true;
  };

  const storePolicyTabIndex = tabs.findIndex((tab) => tab.id === "dc-store-policy");
  const isStorePolicyRulesCreateView =
    props.isDcStoreStrategyRulesCreateView ||
    props.isAutoAllocationRulesCreateView;
  const topLevelTabIndex =
    isStorePolicyRulesCreateView && storePolicyTabIndex !== -1
      ? storePolicyTabIndex
      : defaultIndex;

  return (
    <div className={`${globalClasses.mainContainerBody}`}>
      <div className={`${globalClasses.breadcrumbPadding} ${globalClasses.margin_12_24_12_24}`}>
        <HeaderBreadCrumbs
          options={[
            {
              label: t("inventorysmart.configHomeLabel"),
              to: "/home",
            },
            {
              label: t("inventorysmart.configBreadcrumbLabel"),
              id: 1,
            },
          ]}
        />
      </div>
      {isModuleAccessFetched ? (
        <div
          className={`${
            isStorePolicyRulesCreateView
              ? classes.hideTopTabButtons
              : undefined} 
            ${globalClasses.tabsContainerBody} 
            ${globalClasses.padding_0_24_0_24}`
          }
          style={{
            maxHeight:"calc(100vh - 136px)"
          }}
        >
          <Tabs
            tabPannelStyle={{ padding: "0px" }}
            tabsData={tabs}
            disabled={isRedirectedFromDifferentPage}
            customSelectedtab={topLevelTabIndex}
            handleChange={tabChange}
          />
        </div>
      ) : (
        <LoadingOverlay loader={true} spinner></LoadingOverlay>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedRulesArticles:
      store.inventorysmartReducer.productRuleService.selectedRulesArticles,
    inventorysmartRulesFilterDependency:
      store.inventorysmartReducer.productRuleService
        .inventorysmartRulesFilterDependency,
    inventorySmartPermissionLoader:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorySmartPermissionLoader,
    inventorysmartModulesPermission:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    tabLevelData:
      store.inventorysmartReducer.inventorySmartConfigurationService
        .tabLevelData,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
    omsModuleConfig:
      store.omsReducer?.orderingCommonService?.orderingModuleConfig,
    isDcStoreStrategyRulesCreateView:
      store.inventorysmartReducer.createDCStoreStrategyRulesService
        ?.isCreateViewActive,
    isAutoAllocationRulesCreateView:
      store.inventorysmartReducer.createAutoAllocationRulesService
        ?.isCreateViewActive,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setSelectedRulesArticles: (payload) =>
    dispatch(setSelectedRulesArticles(payload)),
  setInventorysmartRulesFilterDependency: (payload) =>
    dispatch(setInventorysmartRulesFilterDependency(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  setTabLevelData: (payload) => dispatch(setTabLevelData(payload)),
  setChildTabLevelData: (payload) => dispatch(setChildTabLevelData(payload)),
  resetChildLevelData: (payload) => dispatch(resetChildLevelData(payload)),
  setKeyValueInCache: (keyValuePair) =>
    dispatch(setKeyValueInCache(keyValuePair)),
  getModuleBasedTenantConfig: (module) =>
    dispatch(getModuleBasedTenantConfig(module)),
  setOmsConstraintsScreenConfig: (payload) =>
    dispatch(setOmsConstraintsScreenConfig(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
  clearActiveModuleCache: (module) => dispatch(clearActiveModuleCache(module)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Configuration);
