import { useHistory } from "react-router";
import { DASHBOARD, HOME } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import {
  setInventorysmartFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  resetDashboardStore,
  setInventoryDashboardFilterConfig,
  getDataRefreshDateDetails,
  setAutoDashboardLoad,
  saveAppliedFilters,
  getAppliedFilters,
  setFinalizeToDashboardReload,
  setFilterDependencyData,
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
  NO_SAVED_FILTERS,
  ROLES_ACCESS_MODULES_MAPPING,
  SCREENS_SUBCOMPONENT_LIST_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import InventoryDashboardForecastData from "./components/InventoryDashboardForecastData";
import InventoryDashboardDetails from "./components/InventoryDashboardDetails";
import { addSnack } from "core/actions/snackbarActions";
import classNames from "classnames";
import { cloneDeep, isArray, isEmpty } from "lodash";
import { Tab, Tabs, Typography,Grid, Box } from "@mui/material";
import {Refresh }from '@mui/icons-material';
import Ticker from "core/commonComponents/ticker";
import { resetStoreInventoryState } from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/store-inventory-services";

import { formattedFilterConfiguration, mapDataToLabel } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
} from "modules/inventorysmart/services-inventorysmart/common/inventory-smart-common-services";
import moment from "moment";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import InventoryDashboardOrderData from "./components/InventoryDashboardOrderData";
import Loader from "core/Utils/Loader/loader";
import { tabModulePermissionMap } from "./config/tabConfig";
import { getTabItemVisibility } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";

const InventoryDashboard = (props) => {
  const {
    inventorysmartScreenConfig,
    inventorysmartModulesPermission,
    module,
  } = props;

  const history = useHistory();
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [tabValue, setTabValue] = useState("forecast");
  const [refreshDateData, setRefreshDateData] = useState(null);
  const [mountComponent, setMountComponent] = useState(false);
  const [customChipData, setCustomChipData] = useState(null);
  const [tabsList, setTabsList] = useState([]);

  useEffect(() => {
    //  ? INVENTORY_DASHBOARD_TAB_OPTIONS.dashboardWithForecastStoreAndOrderInventory
    const subComponent = inventorysmartScreenConfig?.dashboard?.subComponent;
    const tabsArray = subComponent
      ? INVENTORY_DASHBOARD_TAB_OPTIONS[subComponent]
      : INVENTORY_DASHBOARD_TAB_OPTIONS.dashboardWithForecastAndStoreInventory;

    const newTabsList = tabsArray.map((option, index) => {
      const { label, value } = option;
      const tabPermissions = tabModulePermissionMap[value];
      const displayFlag = getTabItemVisibility(
        inventorysmartModulesPermission[module],
        tabPermissions
      );

      if (!displayFlag) {
        return null;
      }

      return (
        <Tab key={value} label={label} value={value} {...tabProps(index)} />
      );
    });

    setTabsList(newTabsList);
  }, [inventorysmartScreenConfig, inventorysmartModulesPermission, module]);

  const applyFilters = async (filterElements, filterDependency) => {
    let formattedData = cloneDeep(filterElements);
    formattedData.forEach(item => {
      delete item.label;
      delete item.initialData 
    });

    const payload = filtersPayload(filterElements, filterDependency, true);
    let req = {
      filters: {
        dependencyData: filterDependency,
        filterData: formattedData,
      },
    };
    try {
      if (props.inventorysmartScreenConfig?.isSaveFilterRequired) {
        await props.saveAppliedFilters(req);
      }
    } catch (error) {
      console.log(error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
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

  useEffect(async () => {
    if (props.finalizeToDashboardReload) {
      try {
        let response = await props.getAppliedFilters();

        if (!isEmpty(response.data.data.data.attribute_value)) {
          const dependencyData = JSON.parse(
            response.data.data.data.attribute_value[0]
          ).dependencyData;
          const filterData = JSON.parse(
            response.data.data.data.attribute_value[0]
          ).filterData;

          // This code is used to explicitly set the filter data that core components handles on applying filter.
          props.setFilterDependencyData(dependencyData);

          // This code is used to explicitly set the Chip data that core components handles on applying filter.
          let chipsDependencyData = cloneDeep(dependencyData)?.map((item) => {
            if (isArray(item.values)) {
              item.values = item.values.map((value) => {
                if (typeof value === "boolean")
                  return mapDataToLabel(value.toString().toUpperCase());
                else return mapDataToLabel(value);
              });
            } else item.values = [mapDataToLabel(item.values)];

            return item;
          });
          setCustomChipData(chipsDependencyData);

          onFilterDashboardClick(dependencyData, filterData, true);
        } else {
          displaySnackMessages(NO_SAVED_FILTERS, "info");
        }
        props.setFinalizeToDashboardReload(false);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    }
  }, [props.finalizeToDashboardReload])

  useEffect(() => {
    if (
      props.autoLoadDashboard &&
      !isEmpty(props.filterDashboardConfiguration)
    ) {
      let dependencyData =
        props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
      let filterData =
        props.filterDashboardConfiguration?.filterConfig?.[0]
          ?.filterDashboardData;
      onFilterDashboardClick(dependencyData, filterData);
      props.setAutoDashboardLoad(false);
    }
  }, [props.autoLoadDashboard]);

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
      label: "Home",
      id: 1,
      action: () => {
        history.push(HOME);
      },
    },
    {
      label: "Decision Dashboard",
      id: 2,
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

  const RenderTickerComp = ()=>{
    return (
      !isEmpty(refreshDateData) &&
        !isEmpty(props.tickersList) && (
        <div className={`${globalClasses.flexRow}  ${globalClasses.gapHalf} `}>
          <div>
            <div className={`${globalClasses.flexRow} ${classes.datesContainer} ${globalClasses.gapHalf} ${globalClasses.verticalAlignCenter}`}>
              {props.tickersList?.map((tickerList, index) => {
                return (
                  <>
                    <Box>
                      <span>
                        {tickerList["label"]}
                        &nbsp;
                      </span>
                      <span className={`${classes.datesContainerValue}`}>
                        {
                          moment(
                            refreshDateData?.[tickerList?.["value"]]
                          ).format(
                            props.inventorysmartScreenConfig?.dateFormat || "MM-DD-YYYY"
                          )
                        }
                      </span>
                    </Box>
                    {props.tickersList?.length - 1 !== index && 
                    <span>
                      |
                    </span>}
                  </>
                );
              })}
            </div>
          </div>
        </div>
        )
    )
  }

  return (
    <>
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
        chipsDependency={customChipData ? customChipData : null}
      />
      <Loader loader={props.dashboardFilterFullScreen}>
        {props.isFiltersValid && (
          <div className={`${classes.marginAllSide}`}>
            {INVENTORY_DASHBOARD_TAB_OPTIONS[
              props.inventorysmartScreenConfig?.dashboard?.subComponent
            ].length == 1 ?
              <Grid className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}>
                <Grid >
                  <Typography component="h6" className={`${classes.labelPrimary}`}>
                    {`${INVENTORY_DASHBOARD_TAB_OPTIONS[props.inventorysmartScreenConfig?.dashboard?.subComponent][0].label}`}
                  </Typography>
                </Grid>
                <Grid className={`${globalClasses.layoutAlignEnd}`}>
                  {RenderTickerComp()}
                </Grid>
              </Grid> :
              <Grid className={`${globalClasses.flexRow} ${globalClasses.layoutAlignBetweenCenter}`}>
                <Grid>
                  <Tabs
                    value={tabValue}
                    onChange={handleChangeTabValue}
                    aria-label="product-profile-tabs"
                  >
                    {tabsList}
                  </Tabs>
                </Grid>
                <Grid>
                  {RenderTickerComp()}
                </Grid>
              </Grid>
            }

            {mountComponent && renderTabComponents()}

            {/* {tabValue === "forecast" ? (
            <InventoryDashboardForecastData />
          ) : (
            tabValue === "store_inventory" && <InventoryDashboardDetails />
          )} */}
          </div>
        )}
      </Loader>
    </>
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
    dashboardFilterFullScreen:
      store.inventorysmartReducer.inventorySmartDashboardService
        .dashboardFilterFullScreen,
    tickersList:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.tickersList,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    autoLoadDashboard:
      store.inventorysmartReducer.inventorySmartDashboardService
        .autoLoadDashboard,
    finalizeToDashboardReload:
      store.inventorysmartReducer.inventorySmartDashboardService
        .finalizeToDashboardReload,
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
  resetStoreInventoryState: (payload) =>
    dispatch(resetStoreInventoryState(payload)),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
  resetDashboardStore: (payload) => dispatch(resetDashboardStore(payload)),
  getDataRefreshDateDetails: (payload) =>
    dispatch(getDataRefreshDateDetails(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setAutoDashboardLoad: (payload) => dispatch(setAutoDashboardLoad(payload)),
  setFinalizeToDashboardReload: (payload) => dispatch(setFinalizeToDashboardReload(payload)),
  saveAppliedFilters: (payload) => dispatch(saveAppliedFilters(payload)),
  getAppliedFilters: (payload) => dispatch(getAppliedFilters(payload)),
  setFilterDependencyData: (payload) => dispatch(setFilterDependencyData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(InventoryDashboard);
