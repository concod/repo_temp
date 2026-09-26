import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import makeStyles from "@mui/styles/makeStyles";
import { cloneDeep, isEmpty } from "lodash";
import Grid from "@mui/material/Grid";

import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";

import DashboardTable from "./Product-Profile-Dashboard/dashboard-table";
import { CREATE_PRODUCT_PROFILE } from "../../constants-inventorysmart/routesConstants";
import {
  tableConfigurationMetaData,
  ERROR_MESSAGE,
  ROLES_ACCESS_MODULES_MAPPING,
  APP_NAME,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_SUBMODULES_NAMES,
} from "../../constants-inventorysmart/stringConstants";
import {
  setProductProfileDashboardFilterConfig,
  setProductProfileDashboardLoader,
  getIARecommededTableData,
  setIARecommendedTableData,
  setUserCreatedTableData,
  resetProductProfile,
  setProductProfileTableLoader,
} from "../../services-inventorysmart/Product-Profile/product-profile-dashboard-service";
import { setNewProductProfileLoader } from "../../services-inventorysmart/Product-Profile/create-product-profile-service";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import {
  isActionAllowedOnSubModule,
  getFilterDimensions,
} from "../inventorysmart-utility";

import { setFilterConfiguration } from "core/actions/filterAction";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  fetchFilterConfig,
  fetchFilterOptions,
} from "../inventorysmart-utility";
import { getCrossDimensionFiltersData } from "core/actions/filterAction";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";

const useStyles = makeStyles(() => ({
  tabHeaderDesign: {
    display: "flex",
    justifyContent: "space-between",
  },
  mb: {
    marginBottom: "1rem",
  },
}));

const ProductProfileComponent = (props) => {
  const [tabValue, setTabValue] = useState(0);
  const [onFilterReqBody, setOnFilterReqBody] = useState({});
  const [showDataGrid, setShowDataGrid] = useState(false);
  const onFilterDependency = useRef([]);

  const homeIcon = [
    {
      label: `${dynamicLabelsBasedOnTenant("article")} Profile`,
      id: 1,
    },
  ];
  const classes = useStyles();
  const globalClasses = globalStyles();

  useEffect(() => {
    if (props.inventorysmartScreenConfig) {
      const fetchModulesAccess = async () => {
        try {
          props.setInventorySmartPermissionLoader(true);
          // props.module is fetched  from routes
          const moduleName = props?.module;
          const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

          let rolesBasedModulesPermission = {};

          // identifying if its for vb or signet
          if (props.inventorysmartScreenConfig.roleBasedAccess) {
            let accessDataResponse = await getModuleLevelAccessUtility({
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
              rolesBasedModulesPermission[
                subModule
              ] = FULL_ACCESS_PERMISSIONS_LIST;
            });
          }
          props?.setInventorySmartModulesPermissions({
            [moduleName]: rolesBasedModulesPermission,
          });
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorySmartPermissionLoader(false);
        }
      };
      fetchModulesAccess();
      return () => {
        props.resetProductProfile();
      };
    }
  }, [props.inventorysmartScreenConfig]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setProductProfileDashboardLoader(true);
        let response = await fetchFilterConfig("product profile");
        props.setProductProfileDashboardFilterConfig(response);
        props.setProductProfileDashboardLoader(false);
      } catch (e) {
        props.setProductProfileDashboardLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => {
      props.resetProductProfile();
    };
  }, []);

  useEffect(() => {
    // this useEffect is called for the first time when we navigate to pp dashboard screen
    // when we switch to diff module we clear the productProfileDashboardFilterConfig states along with other states in this screen
    // and based on the above useEffect props.filterDashboardConfiguration is not empty as it is not cleared and it has savedFilterSelection in originalSelections
    // hence when u come back our filter configurations are filtered out
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.productProfileDashboardFilterConfig)
    ) {
      props.setProductProfileDashboardLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.productProfileDashboardFilterConfig),
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);
          const filterConfigData = [
            {
              filterDashboardData: response,
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "productProfileFilterConfiguration",
            filterConfigData,
            "Product Profile Screen"
          );
          props.setFilterConfiguration(filterConfig);
          props.setProductProfileDashboardLoader(false);
        } catch (err) {
          props.setProductProfileDashboardLoader(false);
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.productProfileDashboardFilterConfig, props.savedFilterSelection]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const tabProps = (index) => {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const applyFilters = (_filterElements, dependency) => {
    props.setProductProfileTableLoader(true);
    let body = {
      meta: tableConfigurationMetaData.meta,
      product_attributes: dependency.filter(
        (item) => item.dimension === "product"
      ),
      store_attributes: dependency.filter((item) => item.dimension === "store"),
    };
    setOnFilterReqBody(body);
    setShowDataGrid(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    onFilterDependency.current = dependencyData; // might not be needed
    setShowDataGrid(false)
    applyFilters(filterData, dependencyData);
  };

  const navigateToCreatePP = () => {
    props.setNewProductProfileLoader(true);
    props.history.push(CREATE_PRODUCT_PROFILE);
  };

  const canTakeActionOnModules = (subModuleName, action) => {
    return isActionAllowedOnSubModule(
      props.inventorysmartModulesPermission,
      props.module,
      subModuleName,
      action
    );
  };

  return (
    <>
      <HeaderBreadCrumbs options={homeIcon}></HeaderBreadCrumbs>
      <div className={globalClasses.marginAround}>
        <Tabs
          value={tabValue}
          onChange={handleChangeTabValue}
          aria-label="product-profile-tabs"
        >
          <Tab label="IA Recommended" {...tabProps(0)} />
          <Tab label="User Created" {...tabProps(1)} />
        </Tabs>

        <Grid container direction="row" justifyContent="flex-end">
          <Grid>
            <Button
              id="create-product-profile"
              onClick={() => navigateToCreatePP()}
              color="primary"
              variant="contained"
              size="medium"
              className={classes.mb}
              disabled={
                !canTakeActionOnModules(
                  INVENTORY_SUBMODULES_NAMES.INVENTORY_USER_CREATED_PRODUCT_PROFILE,
                  "create"
                )
              }
            >
              Create {dynamicLabelsBasedOnTenant("article")} Profile{" "}
              {props.productProfileDashboardLoader}
            </Button>
          </Grid>
        </Grid>
        <CoreComponentScreen
          showFilterDashboard={true}
          filterConfigKey={"productProfileFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
        >
          <Loader loader={props.productProfileDashboardLoader}>
            <></>
          </Loader>

          <Loader loader={props.productProfileTableLoader}>
            {showDataGrid && (
              <div className={globalClasses.marginAround}>
                <CustomAccordion label="Details table" defaultExpanded={true}>
                  <DashboardTable
                    tabState={tabValue}
                    selectedDependencyValue={onFilterReqBody}
                    module={props.module}
                  />
                </CustomAccordion>
              </div>
            )}
          </Loader>
        </CoreComponentScreen>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    productProfileDashboardLoader:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileDashboardLoader,
    productProfileTableLoader:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileTableLoader,
    productProfileDashboardFilterConfig:
      inventorysmartReducer.productProfileDashboardReducer
        .productProfileDashboardFilterConfig,
    tableDataIARecommended:
      inventorysmartReducer.productProfileDashboardReducer
        .tableDataIARecommended,
    inventorySmartPermissionLoader:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorySmartPermissionLoader,
    inventorysmartModulesPermission:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartModulesPermission,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "productProfileFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setProductProfileDashboardLoader: (body) =>
      dispatch(setProductProfileDashboardLoader(body)),
    setProductProfileDashboardFilterConfig: (body) =>
      dispatch(setProductProfileDashboardFilterConfig(body)),
    getCrossDimensionFiltersData: (body) =>
      dispatch(getCrossDimensionFiltersData(body)),
    getIARecommededTableData: (body) =>
      dispatch(getIARecommededTableData(body)),
    setIARecommendedTableData: (body) =>
      dispatch(setIARecommendedTableData(body)),
    setUserCreatedTableData: (body) => dispatch(setUserCreatedTableData(body)),
    resetProductProfile: (body) => dispatch(resetProductProfile(body)),
    setNewProductProfileLoader: (body) =>
      dispatch(setNewProductProfileLoader(body)),
    setInventorySmartPermissionLoader: (payload) =>
      dispatch(setInventorySmartPermissionLoader(payload)),
    setInventorySmartModulesPermissions: (payload) =>
      dispatch(setInventorySmartModulesPermissions(payload)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setProductProfileTableLoader: (body) =>
      dispatch(setProductProfileTableLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ProductProfileComponent);
