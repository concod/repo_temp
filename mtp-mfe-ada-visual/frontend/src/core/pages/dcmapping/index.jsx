import { useEffect, useState } from "react";
import { connect } from "react-redux";
import DCtoStore from "./components/dc-store-mapping";
import DCtoProduct from "./components/dc-product-mapping";
import TabsComponent from "core/commonComponents/tabs";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import { setDcMappingIsAggregated } from "./services-dc-mapping/dc-mapping-service";
import { useNavigate } from "react-router-dom-v5-compat";
import { getTenantConfigApplicationLevel } from "core/actions/tenantConfigActions";
import { INVENTORY_SUBMODULES_NAMES } from "../../Utils/constants/inventorySmart-constants";
import { getCurrentApplicationDetails } from "core/commonComponents/coreComponentScreen/utils";
import { cloneDeep, isEmpty } from "lodash";
import { isActionAllowedOnSubModule } from "core/Utils/utils";
import LoadingOverlay from "core/Utils/Loader/loader";

function DCMapping(props) {
  const [dcMappingTabs, setDcMappingTabs] = useState([]);
  const [isModuleAccessFetched, setIsModuleAccessFetched] = useState(false);
  const [activeTabIndex, setActiveTabIndex] = useState(0);
  const tabsComponentList = [
    {
      label: "DC-Store",
      id: "dc-store-fc",
      leaveSpaceForCore:true,
      TabPanel: (
        <DCtoStore
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
          setNoOfButtonsNextToTab={props.setNoOfButtonsNextToTab}
        />
      ),
    },
    {
      label: `DC-${dynamicLabelsBasedOnTenant("product", "core")}`,
      id: "dc-product",
      leaveSpaceForCore:true,
      TabPanel: (
        <DCtoProduct
          module={props.module}
          screenName={props.screenName}
          roleBasedAccess={props.inventorysmartScreenConfig?.roleBasedAccess}
          setNoOfButtonsNextToTab={props.setNoOfButtonsNextToTab}
        />
      ),
    },
    // {
    //   label: "FC-Store",
    //   id: "fc-store",
    //   TabPanel: <StoreToFc />,
    // },
  ];

  useEffect(() => {
    const setAggregated = async () => {
      const displayLevelsResp = await props.getTenantConfigApplicationLevel(3, {
        attribute_name: "display_levels",
      });
      if (
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"] &&
        displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
          "product"
        ]
      ) {
        const hidden_levels =
          displayLevelsResp?.data?.data?.[0]?.["attribute_value"]?.["value"]?.[
            "product"
          ]?.["hidden_levels"];
        if (hidden_levels?.includes("product")) {
          props.setDcMappingIsAggregated(true);
        }
      }
    };
    setAggregated();
  }, []);

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  const checkAccess = (moduleName) => {
    const dc_mapping_module_access = canTakeActionOnModules(moduleName, "view");
    if (!dc_mapping_module_access) {
      return canTakeActionOnModules(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING,
        "view"
      );
    }
    return true;
  };

  useEffect(() => {
    const applicationDetails = getCurrentApplicationDetails();
    let dcMappingTabsDataCopy = cloneDeep(tabsComponentList);
    if (
      applicationDetails?.applicationCode === 1 &&
      !isEmpty(props?.inventorysmartModulesPermission)
    ) {
      let hiddenTabs =
        props.inventorysmartScreenConfig?.[props?.module]?.drillDown
          ?.hiddenTabs || [];
      let dcProductMappingAccess = checkAccess(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_PRODUCT
      );
      let dcStoreMappingAccess = checkAccess(
        INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_STORE
      );
      // if user does not have any access to dc-store Mapping, remove the tab
      if (
        hiddenTabs.includes(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_STORE
        ) ||
        hiddenTabs.includes(INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING) ||
        !dcStoreMappingAccess
      ) {
        dcMappingTabsDataCopy = dcMappingTabsDataCopy.slice(1);
      }
      // if user does not have any access to dc-product Mapping, remove the tab
      if (
        hiddenTabs.includes(
          INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING_DC_PRODUCT
        ) ||
        hiddenTabs.includes(INVENTORY_SUBMODULES_NAMES.INVENTORY_DC_MAPPING) ||
        !dcProductMappingAccess
      ) {
        dcMappingTabsDataCopy.pop();
      }
      setDcMappingTabs(dcMappingTabsDataCopy);
    } else {
      setDcMappingTabs(cloneDeep(tabsComponentList));
    }
    setIsModuleAccessFetched(true);
  }, [props?.inventorysmartModulesPermission]);

  // Reset no_of_buttons_next_to_tab when tab changes
  useEffect(() => {
    if (props.setNoOfButtonsNextToTab) {
      props.setNoOfButtonsNextToTab(undefined);
    }
    return () => {
      if (props.setNoOfButtonsNextToTab) {
        props.setNoOfButtonsNextToTab(undefined);
      }
    };
  }, [activeTabIndex]);

  // Update no_of_buttons_next_to_tab based on filter configuration
  useEffect(() => {
    if (!props.setNoOfButtonsNextToTab) return;

    const tabFilterConfigMap = {
      "dc-store-fc": "dcToStoreMappingFilterConfiguration",
      "dc-product": "dcToProductMappingFilterConfiguration",
    };

    if (!dcMappingTabs || !dcMappingTabs.length) return;

    const activeTab = dcMappingTabs[activeTabIndex] || dcMappingTabs[0];
    const currentFilterConfigKey = tabFilterConfigMap[activeTab?.id];
    const hasFiltersApplied = currentFilterConfigKey &&
      props.filterDashboardConfiguration?.[currentFilterConfigKey]?.appliedFilterData?.dependencyData?.length > 0;

    props.setNoOfButtonsNextToTab(hasFiltersApplied ? 1 : undefined);
  }, [props.filterDashboardConfiguration, activeTabIndex, dcMappingTabs]);

  const handleChange = (newVal) => {
    setActiveTabIndex(newVal);
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

  return (
    <>
      {isModuleAccessFetched ? (
      <TabsComponent
         sx={{ width: tabWidth }}
         tabPannelStyle={{ padding: "0px" }}
         tabContainerstyle={{ padding: "0px" }}
         tabHeadingStyle={{ padding: "0" }}
         tabsData={dcMappingTabs}
         handleChange={handleChange}
    />
      ) : (
        <LoadingOverlay loader={true} spinner></LoadingOverlay>
      )}
    </>
  );
}
const StoreToFc = (props) => {
  const navigate = useNavigate();
  useEffect(() => {
    navigate("/store-mapping", {
      state: {
        isRedirect: true,
      },
    });
  }, []);
  return <></>;
};

const mapStateToProps = (state) => {
  return {
    inventorysmartModulesPermission:
      state?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    no_of_buttons_next_to_tab:
      state.inventorysmartReducer?.inventorySmartCommonService
        ?.no_of_buttons_next_to_tab,
    filterDashboardConfiguration: state.filterReducer?.filterDashboardConfiguration,
  };
};

const mapActionsToProps = {
  setDcMappingIsAggregated,
  getTenantConfigApplicationLevel,
};

export default connect(mapStateToProps, mapActionsToProps)(DCMapping);
