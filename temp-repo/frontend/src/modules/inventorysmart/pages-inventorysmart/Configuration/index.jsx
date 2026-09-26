import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import Tabs from "core/commonComponents/tabs";
import TabLayout from "./components/tab-layout";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";

import {
  setInventorysmartRulesFilterDependency,
  setSelectedRulesArticles,
} from "modules/inventorysmart/services-inventorysmart/Product-Profile/product-rule-services";

import {
  getModuleLevelAccess,
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";

import {
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { isActionAllowedOnSubModule } from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";

import { isEmpty } from "lodash";

import {
  ADD_NEW_STORE,
  NEW_STORE_APPROVAL_FLOW,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";

const Configuration = (props) => {
  const [
    isRedirectedFromDifferentPage,
    setIsRedirectedFromDifferentPage,
  ] = useState(false);

  const savedFiltersDependency =
    JSON.parse(localStorage.getItem("selectedFiltersDependency")) || [];
  const articles = JSON.parse(localStorage.getItem("selectedArticles")) || [];

  const type = new URLSearchParams(window.location.search).get("type");

  const fromPath = props.location?.state;

  const [tabs, setTabs] = useState([]);
  const [defaultIndex, setDefaultIndex] = useState(0);

  let tabsData = [
    {
      label: dynamicLabelsBasedOnTenant("article"),
      id: "product",
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
        />
      ),
    },
    {
      label: "Store",
      id: "store",
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
        />
      ),
    },
    {
      label: "DC",
      id: "dc",
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
        />
      ),
    },
  ];
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
    if (fromPath === NEW_STORE_APPROVAL_FLOW || fromPath === ADD_NEW_STORE) {
      setDefaultIndex(1);
    } else setDefaultIndex(0);
  }, []);

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      setTabs(tabsData);
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            await Promise.all(
              subModules.map(async (module) => {
                const accessDataResponse = await props?.getModuleLevelAccess({
                  app: APP_NAME,
                  module,
                });
                rolesBasedModulesPermission[module] = Object.keys(
                  accessDataResponse.data.data
                );
              })
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
      if (hiddenTabs) {
        let finaltabsData = tabsData.filter(
          (item) => hiddenTabs.indexOf(item.id) === -1
        );
        setTabs(finaltabsData);
      }
    }
  }, [props.inventorysmartScreenConfig]);

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
      let dcMappingHasAccess = canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
        "view"
      );
      // if user does not have any access to these two modules remove DC tab
      if (!dcStatusHasAccess && !dcMappingHasAccess) {
        let newTabs = tabsData.slice(0, 2);
        setTabs(newTabs);
      } else {
        setTabs(tabsData);
      }
    }
  }, [props.inventorysmartModulesPermission, props.module]);
  const tabChange = () => {
    if (fromPath) {
      props.history.replace({ state: "" });
    }
    return true;
  };
  return (
    <div>
      <HeaderBreadCrumbs
        options={[
          {
            label: "Configuration",
            id: 1,
          },
        ]}
      ></HeaderBreadCrumbs>
      <Tabs
        tabPannelStyle={{ padding: "0px" }}
        tabsData={tabs}
        disabled={isRedirectedFromDifferentPage}
        customSelectedtab={defaultIndex}
        handleChange={tabChange}
      />
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
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorySmartPermissionLoader,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setSelectedRulesArticles: (payload) =>
    dispatch(setSelectedRulesArticles(payload)),
  setInventorysmartRulesFilterDependency: (payload) =>
    dispatch(setInventorysmartRulesFilterDependency(payload)),
  getModuleLevelAccess: (payload) => dispatch(getModuleLevelAccess(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Configuration);
