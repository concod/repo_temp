import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { makeStyles } from "@mui/styles";
import { cloneDeep, findIndex, isEmpty } from "lodash";
import { useLocation } from "react-router-dom-v5-compat";
import ProductStatus from "modules/inventorysmart/pages-inventorysmart/Product-Status";
import ProductPortOfCall from "../../Product-Port-Of-Call";
import TabsComponent from "core/commonComponents/tabs";
import DCStatus from "modules/inventorysmart/pages-inventorysmart/DC-Status";
import DCtoStore from "modules/inventorysmart/pages-inventorysmart/DC-Mapping/components/dc-store-mapping";
import DCtoProduct from "modules/inventorysmart/pages-inventorysmart/DC-Mapping/components/dc-product-mapping";
import SetAllPanelForm from "modules/inventorysmart/pages-inventorysmart/Common/components/SetAllPanelForm";
import { setDcMappingIsAggregated } from "modules/inventorysmart/pages-inventorysmart/DC-Mapping/services-dc-mapping/dc-mapping-service";
import StoreStatus from "modules/inventorysmart/pages-inventorysmart/Store-Status";
import NewStoreSetup from "../../New-Store-Setup";
import ProductRulesDashboard from "../../Product-Configuration/components/ProductRulesDashboard";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import ProductStoreTabWrapper from "./ProductStoreTabWrapper";
import ProductDcTabWrapper from "./ProductDcTabWrapper";
import ProductPortTabWrapper from "./ProductPortTabWrapper";
import StoreDcTabWrapper from "./StoreDcTabWrapper";
import StoreProductTabWrapper from "./StoreProductTabWrapper";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  tenantConfigApiCache,
  getTenantConfigApplicationLevel,
} from "core/actions/tenantConfigActions";
import { setNoOfButtonsNextToTab } from "../../../services-inventorysmart/common/inventory-smart-common-services";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import {
  INVENTORY_SUBMODULES_NAMES,
  ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  ADD_NEW_STORE,
  CREATE_NEW_PRODUCT_MAPPING,
  ADD_NEW_STORE_TRANSFER_RULE,
  ADD_NEW_DC_TRANSFER_RULE,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import ProductsSupersession from "../../Product-Supersession";
import RetailEvents from "../../Retail-Events";
import DCToStoreStrategy from "../../DC-Store-Policy/DC-To-Store-Strategy";
import AutoAllocationRulesComponent from "../../AutoAllocationRules";
// import CreateAutoAllocationRules from "../../AutoAllocationRules/CreateAutoAllocationRules";
import AutoAllocationScheduler from "../../AutoAllocationScheduler";
import DCStoreStrategyRulesComponent from "../../DC-Store-Strategy-Rule";
import SupplyRoute from "../../Supply-Route";
import RemodelStoreSetupComponent from "../../Remodel-Store-Setup";
import DcNetwork from "../../DC-Network";
import NetworkRoute from "../../Network-Route";
import StoreTransferRule from "../../Store-Transfer-Rule";
import StoreTransferRuleNewFlow from "../../Store-Transfer-Rule_New_Flow";
import DCTransferRule from "../../DC-Transfer-Rule";
import StoreTransferConfiguration from "../../Store-Transfer-Configuration";
import DCTransferConfiguration from "../../DC-Transfer-Configuration";
import ShipAllocationCalendar from "../../Ship-Allocation-Calendar";
import LogisticsConfiguration from "../../Logistics-Configuration/LogisticsConfiguration";
// import ProductStoreInventorySourceMapping from "../../Product-Store-Inventory-Source-Mapping";
// import StoreDCConfiguration from "../../Store-DC-Configuration";
// import StoreCapacity from "./store-capacity";
// import UserMaintainedDates from "../../User-Maintained-Dates";
// import PriorityCodeConfig from "../../Priority-Code-Config";

const useStyles = makeStyles({
  hideTabHeaders: {
    "& .ia-tabList": {
      display: "none",
    },
  },
  storePolicyTabPanelSpacing: {
    "& .ia-styles.ia-tabContainer .ia-styles.ia-tabPanel": {
      padding: "0 !important",
    },
  },
});

function TabLayout(props) {
  const classes = useStyles();
  const [dcTabVal, setDcTabVal] = useState([]);
  const [showDcTransferRule, setShowDcTransferRule] = useState(false);
  const [showDcTransferConfiguration, setShowDcTransferConfiguration] =
    useState(false);
  // Ensures navigation-return tab selection runs once per navigation.
  const navigationReturnHandledRef = useRef(false);
  let location = useLocation();

  const { product: productLabel } = props.dynamicLabels || {};

  const dcStatusObj = {
    leaveSpaceForCore: true,
    label: "DC Status",
    id: "dc status",
    TabPanel: (
      <DCStatus
        hideBreadCrumbs={true}
        module={props.module}
        screenName={props.screenName}
        roleBasedAccess={props.roleBasedAccess}
        customSetAllComponent={SetAllPanelForm}
      ></DCStatus>
    ),
  };
  const dcStoreMappingObj = {
    label: "DC Store Mapping",
    id: "dc-store-fc",
    leaveSpaceForCore: true,
    TabPanel: (
      <DCtoStore
        module={props.module}
        screenName={props.screenName}
        roleBasedAccess={props.roleBasedAccess}
        customSetAllComponent={SetAllPanelForm}
      />
    ),
  };
  const dcProductMappingObj = {
    label: `DC ${dynamicLabelsBasedOnTenant("product", "core")} Mapping`,
    id: "dc-product",
    leaveSpaceForCore: true,
    TabPanel: (
      <DCtoProduct
        module={props.module}
        screenName={props.screenName}
        roleBasedAccess={props.roleBasedAccess}
        customSetAllComponent={SetAllPanelForm}
      />
    ),
  };
  const dcTransferRuleObj = {
    label: "DC Transfer Rule",
    id: "dc transfer rule",
    leaveSpaceForCore: true,
    TabPanel: (
      <DCTransferRule
        hideBreadCrumbs={true}
        module={props.module}
        screenName={props.screenName}
        roleBasedAccess={props.roleBasedAccess}
      />
    ),
  };
  const dcTransferConfigurationObj = {
    label: "DC Transfer Configuration",
    id: "dc-transfer-configuration",
    leaveSpaceForCore: true,
    TabPanel: (
      <DCTransferConfiguration
        hideBreadCrumbs={true}
        module={props.module}
        screenName={
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_TRANSFER_CONFIG
        }
        roleBasedAccess={props.roleBasedAccess}
      />
    ),
  };

  const getBaseDcTabs = () => [
    dcStatusObj,
    dcStoreMappingObj,
    dcProductMappingObj,
    dcTransferRuleObj,
    dcTransferConfigurationObj,
  ];

  const canTakeActionOnDcModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.modulePermission,
      props.module,
      subModuleName,
      action
    );
  };

  const checkDcMappingAccess = (moduleName) => {
    const hasAccess = canTakeActionOnDcModules(moduleName, "view");
    if (!hasAccess) {
      return canTakeActionOnDcModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
        "view"
      );
    }
    return true;
  };

  const filterDcTabs = (tabs) => {
    let filteredTabs = [...tabs];
    const hiddenTabs = props.hideDCDimensionSubTabs || [];
    const drillDownHiddenTabs =
      props.inventorysmartScreenConfig?.[props?.module]?.drillDown
        ?.hiddenTabs || [];

    if (
      hiddenTabs.includes("dc status") ||
      drillDownHiddenTabs.includes(INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS)
    ) {
      filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc status");
    }

    const hideAllDcMapping =
      hiddenTabs.includes("dc mapping") ||
      drillDownHiddenTabs.includes(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING
      );
    const hideDcStore =
      hideAllDcMapping ||
      hiddenTabs.includes("dc-store-fc") ||
      drillDownHiddenTabs.includes(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_STORE
      );
    const hideDcProduct =
      hideAllDcMapping ||
      hiddenTabs.includes("dc-product") ||
      drillDownHiddenTabs.includes(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_PRODUCT
      );
    const hideDcTransferRule =
      !showDcTransferRule || hiddenTabs.includes("dc transfer rule");
    const hideDcTransferConfiguration =
      !showDcTransferConfiguration ||
      hiddenTabs.includes("dc-transfer-configuration");

    if (hideDcStore) {
      filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc-store-fc");
    }
    if (hideDcProduct) {
      filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc-product");
    }
    if (hideDcTransferRule) {
      filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc transfer rule");
    }
    if (hideDcTransferConfiguration) {
      filteredTabs = filteredTabs.filter(
        (tab) => tab.id !== "dc-transfer-configuration"
      );
    }

    const applicationDetails = getCurrentApplicationDetails();
    if (
      applicationDetails?.applicationCode === 1 &&
      !isEmpty(props?.modulePermission)
    ) {
      if (
        !checkDcMappingAccess(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_STORE
        )
      ) {
        filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc-store-fc");
      }
      if (
        !checkDcMappingAccess(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_PRODUCT
        )
      ) {
        filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc-product");
      }
    }

    if (!isEmpty(props?.modulePermission) && props.dimension === "dc") {
      const noDCStatusAccess =
        props?.modulePermission?.[props.module]?.[
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_STATUS
        ]?.length === 0;
      const noDCStoreAccess =
        (
          props?.modulePermission?.[props.module]?.[
            INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_STORE
          ] || []
        )?.length === 0 &&
        (
          props?.modulePermission?.[props.module]?.[
            INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING
          ] || []
        )?.length === 0;
      const noDCProductAccess =
        (
          props?.modulePermission?.[props.module]?.[
            INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_PRODUCT
          ] || []
        )?.length === 0 &&
        (
          props?.modulePermission?.[props.module]?.[
            INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING
          ] || []
        )?.length === 0;

      if (noDCStatusAccess) {
        filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc status");
      }
      if (noDCStoreAccess) {
        filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc-store-fc");
      }
      if (noDCProductAccess) {
        filteredTabs = filteredTabs.filter((tab) => tab.id !== "dc-product");
      }
    }

    return filteredTabs;
  };

  const resolveDcDefaultTabIndex = (savedIndex, visibleTabs) => {
    if (!visibleTabs?.length) return 0;

    const parsedIndex = Number(savedIndex);
    if (Number.isNaN(parsedIndex)) return 0;

    // Legacy layout used index 1 for "DC Mapping"; that slot is now "DC Store Mapping".
    if (parsedIndex === 1 && visibleTabs[1]?.id === "dc-store-fc") {
      return 0;
    }

    if (parsedIndex < 0 || parsedIndex >= visibleTabs.length) return 0;
    return parsedIndex;
  };

  const getResolvedDefaultTabIndex = (savedIndex) => {
    if (props.dimension !== "dc") {
      return savedIndex || 0;
    }
    return resolveDcDefaultTabIndex(
      savedIndex,
      dcTabVal.length ? dcTabVal : getBaseDcTabs()
    );
  };

  const supplyRouteObj = [
    {
      label: "Vendor to DC",
      value: "Vendor-DC",
    },
    {
      label: "DC to DC",
      value: "DC-DC",
    },
    {
      label: "DC to Store",
      value: "DC-Store",
    },
    {
      label: "Store to Store",
      value: "Store-Store",
    },
  ];

  const dcStoreToStrategyObj = {
    label:
      dynamicLabelsBasedOnTenant("dc_store_strategy", "core") ||
      "Store Strategy",
    id: "dc-to-store-strategy",
    leaveSpaceForCore: true,
    TabPanel: <DCToStoreStrategy {...props} />,
  };
  const poStoreToStrategyObj = {
    label:
      dynamicLabelsBasedOnTenant("po_store_strategy", "core") ||
      "Store Strategy",
    id: "po-to-store-strategy",
    leaveSpaceForCore: true,
    TabPanel: <DCToStoreStrategy {...props} is_po_strategy_flow={true} />,
  };
  const autoAllocationRulesObj = {
    label: "Auto Allocation Rules",
    id: "auto-allocation-rules",
    TabPanel: <AutoAllocationRulesComponent {...props} />,
  };
  const autoAllocationSchedulerObj = {
    label:
      dynamicLabelsBasedOnTenant("auto_allocation_scheduler", "core") ||
      "Auto Allocation Scheduler",
    id: "auto-allocation-scheduler",
    TabPanel: <AutoAllocationScheduler {...props} />,
  };
  const dCStoreStrategyRulesObj = {
    label:
      dynamicLabelsBasedOnTenant("dc_store_strategy_rule", "core") ||
      "DC Store Strategy Rules",
    id: "dc-store-strategy-rules",
    TabPanel: <DCStoreStrategyRulesComponent {...props} />,
  };

  let dcStorePolicyTabs = [
    dcStoreToStrategyObj,
    poStoreToStrategyObj,
    autoAllocationRulesObj,
    autoAllocationSchedulerObj,
    dCStoreStrategyRulesObj,
  ];

  useEffect(() => {
    setDcTabVal(filterDcTabs(getBaseDcTabs()));
  }, [
    props.hideDCDimensionSubTabs,
    props.modulePermission,
    props.dimension,
    props.module,
    props.inventorysmartScreenConfig,
    props.roleBasedAccess,
    showDcTransferRule,
    showDcTransferConfiguration,
  ]);

  useEffect(() => {
    if (props.dimension !== "dc") return;

    const setAggregated = async () => {
      const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
        attribute_name: "display_levels",
      });
      if (
        displayLevelsResp?.data?.data?.[0]?.attribute_value?.value?.product
          ?.hidden_levels?.includes("product")
      ) {
        props.setDcMappingIsAggregated(true);
      }
    };
    setAggregated();
  }, [props.dimension]);
  const [defaultIndex, setDefaultIndex] = useState(0);
  const [productConfigTabs, setProductConfigTabs] = useState([]);
  const [storeConfigTabs, setStoreConfigTabs] = useState([]);
  const [networkConfigTabs, setNetworkConfigTabs] = useState([]);
  const [dcStorePolicyTabsList, setDcStorePolicyTabsList] = useState([]);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const [showLogisticFlow, setShowLogisticFlow] = useState(false);

  const fromPath =
    typeof location?.state === "string" ? location.state : location?.state?.from;

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const handleErrorMessage = (e, defaultError = ERROR_MESSAGE) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(defaultError, "error");
  };

  let productTabsData = [
    {
      label: dynamicLabelsBasedOnTenant("product_rules"),
      id: "product rules",
      leaveSpaceForCore: true,
      TabPanel: (
        <div>
        <ProductRulesDashboard
          module={props.module}
          screenName={props.screenName}
          handleErrorMessage={handleErrorMessage}
        />
        </div>
      ),
    },
    {
      label: dynamicLabelsBasedOnTenant("product_status"),
      id: "product status",
      leaveSpaceForCore: true,
      TabPanel: (
        <ProductStatus
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
        ></ProductStatus>
      ),
    },
    {
      label: dynamicLabelsBasedOnTenant("product_port_of_call"),
      id: "product port of call",
      leaveSpaceForCore: true,
      TabPanel: (
        <ProductPortOfCall
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
        ></ProductPortOfCall>
      ),
    },
    {
      label: `${dynamicLabelsBasedOnTenant(
        "product",
        "core"
      )}-${dynamicLabelsBasedOnTenant("Store", "core")} Mapping`,
      id: "Product Mapping",
      leaveSpaceForCore: true,
      TabPanel: (
        <ProductStoreTabWrapper
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
          savedFilterSelection={props.savedFilterSelection}
          producMappingRulesFilterConfiguration={
            props.producMappingRulesFilterConfiguration
          }
          productMappingFilterDependency={props.productMappingFilterDependency}
          inventorysmartScreenConfig={props.inventorysmartScreenConfig}
          setFilterConfiguration={props.setFilterConfiguration}
          setNoOfButtonsNextToTab={props.setNoOfButtonsNextToTab}
        />
      ),
    },
    // Product-DC tab moved from level 3 to level 2
    {
      label: `${dynamicLabelsBasedOnTenant("product", "core")}-DC Mapping`,
      id: "Product to DC/FC Mapping",
      leaveSpaceForCore: true,
      TabPanel: (
        <ProductDcTabWrapper
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
          savedFilterSelection={props.savedFilterSelection}
          productMappingFilterDashboardConfiguration={
            props.productMappingFilterDashboardConfiguration
          }
          productMappingFilterDependency={props.productMappingFilterDependency}
          selectedProductMappingArticles={props.selectedProductMappingArticles}
          setFilterConfiguration={props.setFilterConfiguration}
          setNoOfButtonsNextToTab={props.setNoOfButtonsNextToTab}
        />
      ),
    },
    // Product-Port Mapping tab
    {
      label: `${dynamicLabelsBasedOnTenant("product", "core")}-Port Mapping`,
      id: "Product to Port Mapping",
      leaveSpaceForCore: true,
      TabPanel: (
        <ProductPortTabWrapper
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
          savedFilterSelection={props.savedFilterSelection}
          productPortMappingFilterDashboardConfiguration={
            props.productPortMappingFilterDashboardConfiguration
          }
          productPortMappingFilterDependency={[]}
          setFilterConfiguration={props.setFilterConfiguration}
          setNoOfButtonsNextToTab={props.setNoOfButtonsNextToTab}
        />
      ),
    },
    {
      label: `${productLabel ?? "Product"} Supersession`,
      id: "product supersession",
      leaveSpaceForCore: true,
      TabPanel: (
        <ProductsSupersession
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
        ></ProductsSupersession>
      ),
    },
    // {
    //   label: "Product Store Inv. Source Mapping",
    //   id: "product store inventory source mapping",
    //   TabPanel: (
    //     <ProductStoreInventorySourceMapping
    //       hideBreadCrumbs={true}
    //       module={props.module}
    //       screenName={props.screenName}
    //       roleBasedAccess={props.roleBasedAccess}
    //     ></ProductStoreInventorySourceMapping>
    //   ),
    // },
    // {
    //   label: "User Maintained Dates",
    //   id: "user maintained dates",
    //   TabPanel: (
    //     <UserMaintainedDates
    //       hideBreadCrumbs={true}
    //       module={props.module}
    //       screenName={"Product Life Cycle"}
    //       roleBasedAccess={props.roleBasedAccess}
    //     />
    //   )
    // },
    // {
    //   label: "Map Product to Supply-Route",
    //   id: "map product to supply route",
    //   TabPanel: (
    //      <MapProductSupplyRoute
    //      hideBreadCrumbs={true}
    //      module={props.module}
    //      dimension={props?.dimension}
    //      screenName={props.screenName}
    //      roleBasedAccess={props.roleBasedAccess}
    //      />
    //   ),
    // },
    // {
    //   label: "Priority Code Setup",
    //   id: "priority code",
    //   TabPanel: (
    //     <PriorityCodeConfig
    //       hideBreadCrumbs={true}
    //       module={props.module}
    //       screenName={"Product Life Cycle"}
    //       roleBasedAccess={props.roleBasedAccess}
    //     />
    //   )
    //   },
    {
      label: "Retail Events",
      id: "retail events",
      leaveSpaceForCore: true,
      TabPanel: (
        <RetailEvents
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
        />
      ),
    },
  ];

  let storeTabsData = [
    {
      label: dynamicLabelsBasedOnTenant("store_status", "core") || "Store Status",
      id: "store status",
      leaveSpaceForCore: true,
      TabPanel: (
        <StoreStatus
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
        ></StoreStatus>
      ),
    },
    {
      label: `${dynamicLabelsBasedOnTenant("Store", "core") || "Store"}-${dynamicLabelsBasedOnTenant("product", "core") || "Product"} Mapping`,
      id: "store to product mapping",
      leaveSpaceForCore: true,
      TabPanel: (
        <StoreProductTabWrapper
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
        />
      ),
    },
    {
      label: `${dynamicLabelsBasedOnTenant("Store", "core") || "Store"}-DC Mapping`,
      id: "Store to DC/FC Mapping",
      leaveSpaceForCore: true,
      TabPanel: (
        <StoreDcTabWrapper
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
          handleErrorMessage={handleErrorMessage}
        />
      ),
    },
    // {
    //   label: "Store Lead Time Configuration",
    //   id: "dc lead time",
    //   TabPanel: (
    //     <StoreDCConfiguration
    //       hideBreadCrumbs={true}
    //       module={props.module}
    //       screenName={props.screenName}
    //       roleBasedAccess={props.roleBasedAccess}
    //     ></StoreDCConfiguration>
    //   ),
    // },
    {
      label: dynamicLabelsBasedOnTenant("new_store_setup", "core") || "New Store Setup",
      id: "new store setup",
      TabPanel: (
        <NewStoreSetup
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></NewStoreSetup>
      ),
    },
    {
      label: "Remodel Store Setup",
      id: "remodel store setup",
      TabPanel: (
        <RemodelStoreSetupComponent
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></RemodelStoreSetupComponent>
      ),
    },
    {
      label: "Store Transfer Rule",
      id: "store transfer rule",
      TabPanel: showLogisticFlow ? (
        <StoreTransferRuleNewFlow
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        />
      ) : (
        <StoreTransferRule
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        />
      ),
    },
    {
      label: "Store Transfer Configuration",
      id: "store-transfer-config",
      leaveSpaceForCore: true,
      TabPanel: (
        <StoreTransferConfiguration
          hideBreadCrumbs={true}
          module={props.module}
          screenName={
            INVENTORY_SUBMODULES_NAMES.INVENTORY_STORE_TRANSFER_CONFIG
          }
          roleBasedAccess={props.roleBasedAccess}
        />
      ),
    },
    {
      label: "Logistics Configuration",
      id: "logistics-configuration",
      TabPanel: (
        <LogisticsConfiguration
          hideBreadCrumbs={true}
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.roleBasedAccess}
        ></LogisticsConfiguration>
      ),
    },
    {
      label: "Ship Allocation Calendar",
      id: "ship-allocation-calendar",
      leaveSpaceForCore: true,
      TabPanel: (
        <ShipAllocationCalendar
          hideBreadCrumbs={true}
          module={props.module}
          screenName={"Ship-Allocation Calendar"}
          roleBasedAccess={props.roleBasedAccess}
        />
      ),
    },
    // {
    //   label: "Store Capacity",
    //   id: "Store Capacity",
    //   TabPanel: (
    //     <StoreCapacity
    //       hideBreadCrumbs={true}
    //       module={props.module}
    //       screenName={props.screenName}
    //       roleBasedAccess={props.roleBasedAccess}
    //     ></StoreCapacity>
    //   ),
    // },
  ];
  let networkTabsData = [
    {
      label: "Manage Network",
      id: "Network",
      TabPanel: <NetworkRoute />,
    },
    {
      label: "Map Network",
      id: "dc-to-store_network-strategy",
      TabPanel: <DcNetwork {...props} />,
    },
  ];
  useEffect(() => {
    if (fromPath === ADD_NEW_DC_TRANSFER_RULE && props.dimension === "dc") {
      return;
    }
    const resolvedIndex = getResolvedDefaultTabIndex(props.defaultChildIndex);
    setDefaultIndex(resolvedIndex);
    setActiveTabIndex(resolvedIndex);
  }, [props.defaultChildIndex, props.dimension]);
  // For Supply Route Tabs
  let supplyRouteTabsData = supplyRouteObj?.map((tabOption) => ({
    label: tabOption?.label,
    value: tabOption?.value,
    TabPanel: <SupplyRoute tabValue={tabOption?.value} />,
  }));

  useEffect(() => {
    if (fromPath === ADD_NEW_STORE && !navigationReturnHandledRef.current) {
      // for signet there is an additional tab in store view, hence we add this cond
      let indexVal = props.newStoreTabIndex;
      navigationReturnHandledRef.current = true;
      setDefaultIndex(indexVal);
      props.handleChange(indexVal);
    } else if (
      fromPath === CREATE_NEW_PRODUCT_MAPPING &&
      !navigationReturnHandledRef.current
    ) {
      // productConfigTabs is the fully filtered list used for rendering Used it directly to get the correct index
      if (productConfigTabs.length > 0) {
        let tabIndex = findIndex(productConfigTabs, {
          id: "product supersession",
        });
        if (tabIndex !== -1) {
          navigationReturnHandledRef.current = true;
          setDefaultIndex(tabIndex);
          props.handleChange(tabIndex);
        }
      }
    } else if (
      fromPath === ADD_NEW_STORE_TRANSFER_RULE &&
      !navigationReturnHandledRef.current
    ) {
      let indexVal =
        props?.inventorysmartScreenConfig?.inventorysmart_configuration
          ?.drillDown?.store_transfer_config?.storeTransferRuleTabIndex;
      let indexValBackup = findIndex(storeTabsData, {
        id: "store transfer rule",
      });
      navigationReturnHandledRef.current = true;
      setDefaultIndex(indexVal ? indexVal : indexValBackup - 1);
      props.handleChange(indexVal ? indexVal : indexValBackup - 1);
    } else if (
      fromPath === ADD_NEW_DC_TRANSFER_RULE &&
      props.dimension === "dc" &&
      !navigationReturnHandledRef.current
    ) {
      const dcTabs = dcTabVal.length ? dcTabVal : getBaseDcTabs();
      const tabIndex = findIndex(dcTabs, {
        id: "dc transfer rule",
      });
      if (tabIndex !== -1) {
        navigationReturnHandledRef.current = true;
        setDefaultIndex(tabIndex);
        setActiveTabIndex(tabIndex);
        props.handleChange(tabIndex);
      }
    } else if (fromPath !== ADD_NEW_DC_TRANSFER_RULE) {
      const resolvedIndex = getResolvedDefaultTabIndex(props.defaultChildIndex);
      setDefaultIndex(resolvedIndex);
    }
  }, [
    props.inventorysmartModulesPermission,
    props.dimension,
    props.hideStoreDimensionSubTabs,
    props.hideProductDimensionSubTabs,
    dcTabVal,
    productConfigTabs,
  ]);

  useEffect(() => {
    const fetchLogisticFlowConfig = async () => {
      try {
        const constraintsNewFlowResponse = await props?.tenantConfigApiCache(
          1,
          {
            attribute_name: "constraints_new_flow",
          }
        );
        const constraintsNewFlowValue =
          constraintsNewFlowResponse?.data?.data?.[0]?.attribute_value || {};
        const isLogisticFlowEnabled =
          constraintsNewFlowValue?.inventorysmart_logistic_screen
            ?.showLogisticFlow === true;
        const isDcTransferRuleEnabled =
          constraintsNewFlowValue?.inventorysmart_dc_transfer_screen
            ?.showDcTransferRule === true;
        const isDcTransferConfigurationEnabled =
          constraintsNewFlowValue?.inventorysmart_dc_transfer_screen
            ?.showDcTransferConfiguration === true;
        setShowLogisticFlow(isLogisticFlowEnabled);
        setShowDcTransferRule(isDcTransferRuleEnabled);
        setShowDcTransferConfiguration(isDcTransferConfigurationEnabled);
      } catch (error) {
        handleErrorMessage(error);
      }
    };

    fetchLogisticFlowConfig();
  }, [props.tenantConfigApiCache]);

  useEffect(() => {
    let filteredStoreTabsData = [...storeTabsData];
    const hideStoreDimensionSubTabs =
      props.hideStoreDimensionSubTabs ??
      props.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown
        ?.hiddenTabs;

    //  hide new store tab based on role based module access
    if (
      !isEmpty(props.modulePermission) &&
      !isEmpty(props.modulePermission?.[props.module])
    ) {
        let noNewStore = Object.keys(props.modulePermission?.[props.module]);
        if (!noNewStore.includes("New Store")) {
          filteredStoreTabsData = filteredStoreTabsData.filter(
            (tabNames) => tabNames.id !== "new store setup"
          );
        }

        if (!noNewStore.includes("Store Status")) {
          filteredStoreTabsData = filteredStoreTabsData.filter(
            (tabNames) => tabNames.id !== "store status"
          );
        }

        // Check access for Store Mapping tab (Store-Product)
        if (!noNewStore.includes("Store Mapping")) {
          filteredStoreTabsData = filteredStoreTabsData.filter(
            (tabNames) =>
              tabNames.id !== "Store Mapping" && tabNames.id !== "store mapping"
          );
        }
        if (!noNewStore.includes("New Remodel Store")) {
          filteredStoreTabsData = filteredStoreTabsData.filter(
            (tabNames) => tabNames.id !== "remodel store setup"
          );
        }
        if (
          !noNewStore.includes("Inventorysmart Configurations Store Transfer")
        ) {
          filteredStoreTabsData = filteredStoreTabsData.filter(
            (tabNames) => tabNames.id !== "store transfer rule"
          );
        }
        if (
          !noNewStore.includes(
            "Inventorysmart Configurations Store Transfer Configuration"
          )
        ) {
          filteredStoreTabsData = filteredStoreTabsData.filter(
            (tabNames) => tabNames.id !== "store-transfer-config"
          );
        }
        // Check access for Store to DC/FC Mapping tab
        if (!noNewStore.includes("Store to DC/FC Mapping")) {
          filteredStoreTabsData = filteredStoreTabsData.filter(
            (tabNames) => tabNames.id !== "Store to DC/FC Mapping"
          );
        }
      }
    // Currently applying this logic only for store dimension tabs - hide new store tab based on tenant attribute master config
    if (hideStoreDimensionSubTabs?.length) {
      filteredStoreTabsData = filteredStoreTabsData.filter(
        (item) =>
          !hideStoreDimensionSubTabs.some(
            (tabNames) => tabNames === item.id
          )
      );
    }

    // Filter Ship Allocation Calendar based on config flag
    // Hide by default, show only if explicitly set to true
    const showShipAllocationCalendar =
      props.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.drillDown?.showShipAllocationCalendar === true;

    if (!showShipAllocationCalendar) {
      filteredStoreTabsData = filteredStoreTabsData.filter(
        (item) => item.id !== "ship-allocation-calendar"
      );
    }

    if (!showLogisticFlow) {
      filteredStoreTabsData = filteredStoreTabsData.filter(
        (item) => item.id !== "logistics-configuration"
      );
    }

    setStoreConfigTabs(filteredStoreTabsData);
    setNetworkConfigTabs(networkTabsData);
  }, [
    props.modulePermission,
    props.hideStoreDimensionSubTabs,
    props.inventorysmartScreenConfig,
    showLogisticFlow,
  ]);

  useEffect(() => {
    let tempProductTabsData = cloneDeep(productTabsData);
    const hideProductDimensionSubTabs =
      props.hideProductDimensionSubTabs ??
      props.inventorysmartScreenConfig?.inventorysmart_configuration?.drillDown
        ?.hiddenTabs;
    //  hide product tabs based on role based module access
    if (
      !isEmpty(props.modulePermission) &&
      !isEmpty(props.modulePermission?.[props.module])
    ) {
      let accessibleTabs = Object.keys(props.modulePermission?.[props.module]);
      tempProductTabsData = productTabsData.filter((tabNames) =>
        Array.isArray(tabNames.subIds) && tabNames.subIds.length > 0
          ? tabNames.subIds.some((subId) =>
              accessibleTabs.some((tab) =>
                tab.toLowerCase().includes(subId.toLowerCase())
              )
            )
          : accessibleTabs.some((tab) =>
              tab.toLowerCase().includes(tabNames.id.toLowerCase())
            ) || tabNames.id === "retail events"
      );
    }
    // Do not show new store tab for signet (Will be removed later)
    // Currently applying this logic only for store dimension tabs
    if (hideProductDimensionSubTabs?.length) {
      tempProductTabsData = filterTabsbyHiddenTabs(
        tempProductTabsData,
        hideProductDimensionSubTabs.filter((tab) => tab !== "retail events")
      );
    }
    // Filter Product-Port Mapping based on config flag
    // Hide by default, show only if explicitly set to true
    const showProductPortMapping =
      props.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.drillDown?.showProductPortMapping === true;

    if (showProductPortMapping) {
      // Add Product-Port Mapping tab if config flag is true and it was filtered out by role-based access
      const productPortMappingTab = productTabsData.find(
        (item) => item.id === "Product to Port Mapping"
      );
      if (productPortMappingTab && !tempProductTabsData.find((item) => item.id === "Product to Port Mapping")) {
        // Find the index of Product Status to insert after it
        const productStatusIndex = tempProductTabsData.findIndex(
          (item) => item.id === "product status"
        );
        if (productStatusIndex !== -1) {
          tempProductTabsData.splice(productStatusIndex + 1, 0, productPortMappingTab);
        } else {
          tempProductTabsData.push(productPortMappingTab);
        }
      }
    } else {
      tempProductTabsData = tempProductTabsData.filter(
        (item) => item.id !== "Product to Port Mapping"
      );
    }
    // Filter Product-Port Of Call based on config flag
    // Hide by default, show only if explicitly set to true
    const showProductPortOfCall =
      props.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.drillDown?.showProductPortOfCall === true;

    if (showProductPortOfCall) {
      // Add Product-Port Of Call tab if config flag is true and it was filtered out by role-based access
      const productPortOfCallTab = productTabsData.find(
        (item) => item.id === "product port of call"
      );
      if (productPortOfCallTab && !tempProductTabsData.find((item) => item.id === "product port of call")) {
        // Find the index of Product Status to insert after it
        const productStatusIndex = tempProductTabsData.findIndex(
          (item) => item.id === "product status"
        );
        if (productStatusIndex !== -1) {
          tempProductTabsData.splice(productStatusIndex + 1, 0, productPortOfCallTab);
        } else {
          tempProductTabsData.push(productPortOfCallTab);
        }
      }
    } else {
      tempProductTabsData = tempProductTabsData.filter(
        (item) => item.id !== "product port of call"
      );
    }
    if (tempProductTabsData.length === 0) {
      let hiddenDimensionTabs = cloneDeep(props?.hiddenDimensionTabs || []);
      props.setHiddenDimensionTabs([
        ...new Set([...hiddenDimensionTabs, "product"]),
      ]);
    }
    setProductConfigTabs(tempProductTabsData);
  }, [props.modulePermission, props.hideProductDimensionSubTabs, props.inventorysmartScreenConfig]);

  useEffect(() => {
    let tempDcStorePolicyTabs = [...dcStorePolicyTabs];
    
    // Filter based on hideDcStoryPolicySubTabs
    if (props.hideDcStoryPolicySubTabs?.length) {
      tempDcStorePolicyTabs = tempDcStorePolicyTabs.filter(
        (item) => !props.hideDcStoryPolicySubTabs.includes(item.id)
      );
    }
    
    // NEW: Filter PO Store Strategy based on config flag
    // Hide by default, show only if explicitly set to true
    const showPoStoreStrategy =
      props.inventorysmartScreenConfig?.inventorysmart_configuration
        ?.drillDown?.showPoStoreStrategy === true;
  
    if (!showPoStoreStrategy) {
      tempDcStorePolicyTabs = tempDcStorePolicyTabs.filter(
        (item) => item.id !== "po-to-store-strategy"
      );
    }
  
    setDcStorePolicyTabsList(tempDcStorePolicyTabs);
  }, [props.hideDcStoryPolicySubTabs, props.inventorysmartScreenConfig]);
  
  const configJSON = {
    product: productConfigTabs,
    store: storeConfigTabs,
    network: networkConfigTabs,
    dc: dcTabVal,
    SupplyRoute: supplyRouteTabsData,
    dcStorePolicy: dcStorePolicyTabsList,
  };

  useEffect(() => {
    props.setNoOfButtonsNextToTab(undefined);
    return () => {
      props.setNoOfButtonsNextToTab(undefined);
    };
  }, [activeTabIndex, props.dimension]);

  useEffect(() => {
    const tabFilterConfigMap = {
      "product status": "productStatusFilterConfiguration",
      "product port of call": "productPortOfCallFilterConfiguration",
      "store status": "storeStatusFilterConfiguration",
      "dc status": "dcStatusDcFilterConfiguration",
      "Store to DC/FC Mapping": "storeMappingStoreToDCFCFilterConfiguration",
      "dc-store-fc": "dcToStoreMappingFilterConfiguration",
      "dc-product": "dcToProductMappingFilterConfiguration",
      "dc-transfer-configuration":
        "dcTransferConfigurationFilterConfiguration",
      "ship-allocation-calendar": "shipAllocationCalendarFilterConfiguration",
    };

    const currentTabs = configJSON[props.dimension];
    if (!currentTabs || !currentTabs.length) return;

    const activeTab = currentTabs[activeTabIndex] || currentTabs[0];
    const currentFilterConfigKey = tabFilterConfigMap[activeTab?.id];
    // Tabs not in this map own their own reservation (DC Store Strategy
    // reserves 2 slots for Manage RCL + Show Filter). Do not reset them.
    if (!currentFilterConfigKey) {
      return;
    }
    const hasFiltersApplied =
      props.filterDashboardConfiguration?.[currentFilterConfigKey]
        ?.appliedFilterData?.dependencyData?.length > 0;

    props.setNoOfButtonsNextToTab(hasFiltersApplied ? 1 : undefined);
  }, [props.filterDashboardConfiguration, activeTabIndex, props.dimension]);

  const filterTabsbyHiddenTabs = (allTabs, hiddenTabs) => {
    let filteredTabs = allTabs?.filter(
      (item) => !hiddenTabs.some((tabNames) => tabNames === item.id)
    );
    return filteredTabs;
  };

  const handleChange = (newVal) => {
    setActiveTabIndex(newVal);
    props.handleChange && props.handleChange(newVal);
    return true;
  };

  const calculateTabWidth = () => {
    if (props.no_of_buttons_next_to_tab === undefined) {
      return "100%";
    }
    
    if (props.no_of_buttons_next_to_tab === 1) {
      return `calc(100% - 140px)`;
    }

    const additionalButtons = props.no_of_buttons_next_to_tab - 1;
    const totalWidth = 140 + (additionalButtons * 142);
    return `calc(100% - ${totalWidth}px)`;
  };
  
  const tabWidth = calculateTabWidth();
  const currentTabs = configJSON[props.dimension] || [];
  const dcStoreStrategyRulesIndex = currentTabs.findIndex(
    (tab) => tab.id === "dc-store-strategy-rules"
  );
  const autoAllocationRulesIndex = currentTabs.findIndex(
    (tab) => tab.id === "auto-allocation-rules"
  );
  const isCreateOnStorePolicy =
    props.dimension === "dcStorePolicy" &&
    (props.isDcStoreStrategyRulesCreateView ||
      props.isAutoAllocationRulesCreateView);

  let selectedTabForRender = defaultIndex;
  if (props.isDcStoreStrategyRulesCreateView && dcStoreStrategyRulesIndex !== -1) {
    selectedTabForRender = dcStoreStrategyRulesIndex;
  } else if (
    props.isAutoAllocationRulesCreateView &&
    autoAllocationRulesIndex !== -1
  ) {
    selectedTabForRender = autoAllocationRulesIndex;
  }

  return (
    // <div
    //   className={[
    //     isCreateOnStorePolicy ? classes.hideTabHeaders : "",
    //     props.dimension === "dcStorePolicy"
    //       ? classes.storePolicyTabPanelSpacing
    //       : "",
    //   ]
    //     .filter(Boolean)
    //     .join(" ")}
    // >
      <TabsComponent
        sx={{ width: tabWidth }}
        tabPannelStyle={
          props.dimension === "dcStorePolicy"
            ? { paddingTop: "16px", paddingBottom: 0, paddingLeft: 0, paddingRight: 0 }
            : { padding: "0px" }
        }
        tabContainerstyle={{ padding: "0px" }}
        tabsData={configJSON[props.dimension]}
        disabled={props.disabled}
        handleChange={handleChange}
        type={props.type}
        customSelectedtab={selectedTabForRender}
        key={`tabs-${props.dimension}-${defaultIndex}`}
      />
    
  );
}
const mapStateToProps = (store) => {
  return {
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    inventorysmartScreenConfig:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    newStoreTabIndex:
      store.inventorysmartReducer.inventorySmartNewStoreDashboardService
        ?.newStoreModuleConfig?.new_store?.newStoreTabIndex,
    modulePermission:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    // Props needed for Product-Store and Product-DC wrapper components
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    producMappingRulesFilterConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "producMappingRulesFilterConfiguration"
      ],
    productMappingFilterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "productMappingFilterConfiguration"
      ],
    productPortMappingFilterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "productPortMappingFilterConfiguration"
      ],
    productMappingFilterDependency:
      store.productMappingReducerService.productMappingFilterDependency,
    selectedProductMappingArticles:
      store.productMappingReducerService.selectedProductMappingArticles,
    // Filter configuration for dcStorePolicy to check if filters are applied
    dcStorePolicyFilterConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "dcStorePolicyFilterConfigs"
      ],
    // Generic state for tab width calculation based on number of buttons
    no_of_buttons_next_to_tab:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.no_of_buttons_next_to_tab,
    filterDashboardConfiguration: store.filterReducer?.filterDashboardConfiguration,
    isDcStoreStrategyRulesCreateView:
      store.inventorysmartReducer.createDCStoreStrategyRulesService
        ?.isCreateViewActive,
    isAutoAllocationRulesCreateView:
      store.inventorysmartReducer.createAutoAllocationRulesService
        ?.isCreateViewActive,
  };
};

const mapActionsToProps = {
  setFilterConfiguration,
  setNoOfButtonsNextToTab,
  tenantConfigApiCache,
  setDcMappingIsAggregated,
  getTenantConfigApplicationLevel,
};

export default connect(mapStateToProps, mapActionsToProps)(TabLayout);
