import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import StoreGroup from "./components/store-group";
import ProductGroup from "./components/product-group";
import Tabs from "core/commonComponents/tabs";
import {
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  getModuleLevelAccess,
  setInventorySmartModulesPermissions,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import LoadingOverlay from "core/Utils/Loader/loader";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import globalStyles from "core/Styles/globalStyles";
import { IS_TAB_OVERRIDEN_WIDTH } from "config/constants";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles(() => ({
  breadcrumbPadding: {
    padding: "5.5px 0px",
  },
  pageRoot: {
    "& [class*='emptyStateContainer']": {
      marginTop: "0px !important",
    },
  },
}));
import { useTranslation } from "impact-ui-v3";

const Grouping = (props) => {
  const classes = useStyles();
  const { t } = useTranslation();
  const [tabValue, setTabValue] = useState(
    props.location?.state?.from?.includes("product-grouping") ? 1 : 0
  );
  const [isModuleAccessFetched, setIsModuleAccessFetched] = useState(false);

  const tabsData = [
    {
      label: `${dynamicLabelsBasedOnTenant("Store", "core")} Group`,
      id: "storeGroup",
      TabPanel: <StoreGroup {...props} isISGrouping = {true}/>,
      leaveSpaceForCore:true,
    },
    {
      label: `${dynamicLabelsBasedOnTenant("product", "core")} Group`,
      id: "productGroup",
      TabPanel: <ProductGroup {...props} isISGrouping = {true}/>,
      leaveSpaceForCore:true,
    },
  ];
  const [tabs, setTabsData] = useState([]);

  useEffect(() => {
    setTabsData(tabsData);
  }, []);

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const currentActiveTab = sessionStorage.getItem("grouping-active-tab");
      const fetchModulesAccess = async () => {
        try {
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
          setIsModuleAccessFetched(true);
        } catch (error) {
          console.log(error, "e");
        }
      };
      fetchModulesAccess();
      if (props.inventorysmartScreenConfig.inventorysmart_grouping_hiddentab) {
        let finaltabs = tabsData.filter(
          (item) =>
            props.inventorysmartScreenConfig.inventorysmart_grouping_hiddentab.indexOf(
              item.id
            ) === -1
        );
        setTabsData(finaltabs);
      }
      if (currentActiveTab != undefined || currentActiveTab != null) {
        setTabValue(Number(currentActiveTab));
      }
    }
  }, [props.inventorysmartScreenConfig]);

  const handleChange = (newValue) => {
    //setting the value to newValue that is coming from tabs component
    setTabValue(newValue);
    sessionStorage.setItem("grouping-active-tab", newValue);
    //If the newValue is 0 and path has product-grouping, then change the route to
    //store-eligibility grouping
    props.history.push({
      pathname: `/inventory-smart/store-eligibility-grouping`,
      state: {
        from: null,
      },
    });
    return true;
  };
  const routeOptions = [
    {
      label: t("inventorysmart.home"),
      to: "/home",
    },
    {
      label: t("inventorysmart.grouping"),
      id: 1,
    },
  ];
  const globalClasses = globalStyles();
  const activeFilterConfigKey =
    tabValue === 0
      ? "storeGroupingFilterConfiguration"
      : "productGroupingFilterConfiguration";
  const activeFilterConfig =
    props.filterDashboardConfiguration?.[activeFilterConfigKey];
  const isEmptyStateVisible = !(
    props.isFilterApplied &&
    activeFilterConfig?.appliedFilterData?.dependencyData?.length > 0
  );
  const tabsStyles = {
    width: isEmptyStateVisible ? "100%" : IS_TAB_OVERRIDEN_WIDTH,
    marginTop: "12px",
  };

  return (
    <div className={`${globalClasses.paddingAroundNew} ${classes.pageRoot}`}>
      <div className={classes.breadcrumbPadding}>
        <HeaderBreadCrumbs options={routeOptions} />
      </div>
      {isModuleAccessFetched ? (
        <Tabs
          sx={tabsStyles}
          tabPannelStyle={{ padding: "0px" }}
          tabsData={tabs}
          customSelectedtab={tabValue}
          handleChange={handleChange}
        />
      ) : (
        <LoadingOverlay loader={true} spinner></LoadingOverlay>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    isFilterApplied: store.filterReducer?.isFilterApplied,
    filterDashboardConfiguration:
      store.filterReducer?.filterDashboardConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getModuleLevelAccess: (payload) => dispatch(getModuleLevelAccess(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(Grouping);
