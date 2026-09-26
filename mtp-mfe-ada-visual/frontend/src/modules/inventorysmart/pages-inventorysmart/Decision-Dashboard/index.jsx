import { useHistory } from "react-router";
import { DASHBOARD } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  setInventorysmartFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  resetDashboardStore,
  setInventoryDashboardFilterConfig,
  getDataRefreshDateDetails,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import {
  APP_NAME,
  ERROR_MESSAGE,
  FULL_ACCESS_PERMISSIONS_LIST,
  INVENTORY_DASHBOARD_TAB_OPTIONS,
  ROLES_ACCESS_MODULES_MAPPING,
  SCREENS_SUBCOMPONENT_LIST_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import InventoryDashboardForecastData from "./components/InventoryDashboardForecastData";
import InventoryDashboardDetails from "./components/InventoryDashboardDetails";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { cloneDeep, isEmpty } from "lodash";
import { Tab, Tabs, Typography } from "@mui/material";
import Ticker from "core/commonComponents/ticker";
import { resetStoreInventoryState } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";

import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  getModuleLevelAccess,
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import moment from "moment";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import InventoryDashboardOrderData from "./components/InventoryDashboardOrderData";
import Loader from "core/Utils/Loader/loader";

const InventoryDashboard = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [tabValue, setTabValue] = useState("forecast");
  const [refreshDateData, setRefreshDateData] = useState(null);
  const [mountComponent, setMountComponent] = useState(false);

  const applyFilters = (filterElements, filterDependency) => {
    const payload = filtersPayload(filterElements, filterDependency, true);

    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(payload.reqBody);
    setMountComponent(true);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setMountComponent(false);
    applyFilters(filterData, dependencyData);
  };

  const getRefreshDateInfo = async () => {
    try {
      const response = await props.getDataRefreshDateDetails();
      setRefreshDateData(response.data.data);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const fetchModulesAccess = async () => {
    try {
      props.setInventorySmartPermissionLoader(true);

      const moduleName = props?.module;
      const subModules = ROLES_ACCESS_MODULES_MAPPING[props?.module];

      let rolesBasedModulesPermission = {};

      if (props?.inventorysmartScreenConfig?.roleBasedAccess) {
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
          rolesBasedModulesPermission[subModule] = FULL_ACCESS_PERMISSIONS_LIST;
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

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("InventoryDashboard");
        if (isEmpty(props.filterDashboardConfiguration)) {
          props.setInventoryDashboardFilterConfig(response);
        }
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    getInitialFilterConfiguration();

    return () => {
      props.resetDashboardStore();
      props.resetStoreInventoryState();
    };
  }, []);

  useEffect(() => {
    if (
      !isEmpty(props.inventoryDashboardFilterConfig) &&
      !isEmpty(props.inventorysmartScreenConfig)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          props.setInventorysmartFilterLoader(true);
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.inventoryDashboardFilterConfig) || [],
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
            "decisionDashboardFilterConfiguration",
            filterConfigData,
            "Decision Dashboard"
          );

          props.setFilterConfiguration(filterConfig);
        } catch (error) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        } finally {
          props.setInventorysmartFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [props.inventoryDashboardFilterConfig, props.inventorysmartScreenConfig]);

  useEffect(() => {
    /** Checks the config for a particular client and sets default value to Store Inventory Tab if no other tabs are present */
    if (!isEmpty(props?.inventorysmartScreenConfig)) {
      if (
        props?.inventorysmartScreenConfig?.dashboard?.subComponent ===
          SCREENS_SUBCOMPONENT_LIST_MAP.INVENTORYSMART_DASHBOARD_WITH_STORE_INVENTORY ||
        props?.inventorysmartScreenConfig?.dashboard?.subComponent ===
          SCREENS_SUBCOMPONENT_LIST_MAP.INVENTORYSMART_DASHBOARD_WITH_STORE_INVENTORY_AND_FORECAST
      ) {
        setTabValue("store_inventory");
      }

      if (!isEmpty(props.tickersList)) {
        getRefreshDateInfo();
      }

      fetchModulesAccess();
    }
  }, [props?.inventorysmartScreenConfig]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
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

  const routeOptions = [
    {
      label: "Decision Dashboard",
      id: 1,
      action: () => {
        history.push(DASHBOARD);
      },
    },
  ];

  const renderTabComponents = () => {
    switch (tabValue) {
      case "forecast":
        return (
          <InventoryDashboardForecastData
            tabValue={tabValue}
            module={props?.module}
          />
        );
      case "store_inventory":
        return (
          <InventoryDashboardDetails
            tabValue={tabValue}
            module={props?.module}
          />
        );
      case "oms":
        return (
          <InventoryDashboardOrderData
            tabValue={tabValue}
            module={props?.module}
          />
        );
      default:
        return;
    }
  };

  return (
    <CoreComponentScreen
      showPageRoute={props.hideBreadCrumbs ? false : true}
      showPageHeader={true}
      showFilterLoader={props.inventorySmartPermissionLoader}
      routeOptions={routeOptions}
      // Filter dashboard props
      showFilterDashboard={true}
      filterConfigKey={"decisionDashboardFilterConfiguration"}
      onApplyFilter={onFilterDashboardClick}
      contained={true}
    >
      <Loader loader={props.dashboardFilterFullScreen}>
        {props?.isFiltersValid &&
          !isEmpty(refreshDateData) &&
          !isEmpty(props.tickersList) && (
            <div className={classNames(globalClasses.filterWrapper)}>
              <Ticker>
                <div className={classes.flexRow}>
                  {props.tickersList?.map((tickerList) => {
                    return (
                      <Typography component="p" className={classes.tickerText}>
                        {`${tickerList["label"]} ${moment(
                          refreshDateData?.[tickerList?.["value"]]
                        ).format("MM-DD-YYYY")}`}
                      </Typography>
                    );
                  })}
                </div>
              </Ticker>
            </div>
          )}
        {props.isFiltersValid && (
          <div className={classNames(globalClasses.marginVertical1rem)}>
            <Tabs
              value={tabValue}
              onChange={handleChangeTabValue}
              aria-label="product-profile-tabs"
            >
              {
                //  ? INVENTORY_DASHBOARD_TAB_OPTIONS.dashboardWithForecastStoreAndOrderInventory
                props.inventorysmartScreenConfig?.dashboard?.subComponent
                  ? INVENTORY_DASHBOARD_TAB_OPTIONS[
                      props.inventorysmartScreenConfig?.dashboard?.subComponent
                    ].map((option, index) => (
                      <Tab
                        label={option.label}
                        value={option.value}
                        {...tabProps(index)}
                      />
                    ))
                  : INVENTORY_DASHBOARD_TAB_OPTIONS.dashboardWithForecastAndStoreInventory.map(
                      (option, index) => (
                        <Tab
                          label={option.label}
                          value={option.value}
                          {...tabProps(index)}
                        />
                      )
                    )
              }
            </Tabs>

            {mountComponent && renderTabComponents()}

            {/* {tabValue === "forecast" ? (
            <InventoryDashboardForecastData />
          ) : (
            tabValue === "store_inventory" && <InventoryDashboardDetails />
          )} */}
          </div>
        )}
      </Loader>
    </CoreComponentScreen>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartFilterLoader:
      store.inventorysmartReducer.inventorySmartDashboardService
        .inventorysmartFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartDashboardService.isFiltersValid,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventorysmartModulesPermission:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartModulesPermission,
    inventorySmartPermissionLoader:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorySmartPermissionLoader,
    inventoryDashboardFilterConfig:
      store.inventorysmartReducer.inventorySmartDashboardService
        .inventoryDashboardFilterConfig,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    dashboardFilterFullScreen:
      store.inventorysmartReducer.inventorySmartDashboardService
        .dashboardFilterFullScreen,
    tickersList:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.tickersList,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartFilterLoader: (payload) =>
    dispatch(setInventorysmartFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventorySmartPermissionLoader: (payload) =>
    dispatch(setInventorySmartPermissionLoader(payload)),
  setInventoryDashboardFilterConfig: (payload) =>
    dispatch(setInventoryDashboardFilterConfig(payload)),
  setInventorySmartModulesPermissions: (payload) =>
    dispatch(setInventorySmartModulesPermissions(payload)),
  getModuleLevelAccess: (payload) => dispatch(getModuleLevelAccess(payload)),
  resetStoreInventoryState: (payload) =>
    dispatch(resetStoreInventoryState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  resetDashboardStore: (payload) => dispatch(resetDashboardStore(payload)),
  getDataRefreshDateDetails: (payload) =>
    dispatch(getDataRefreshDateDetails(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(InventoryDashboard);
