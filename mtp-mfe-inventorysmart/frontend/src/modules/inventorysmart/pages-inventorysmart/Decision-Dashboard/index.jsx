import React, { useRef } from "react";
import { useNavigate } from "react-router-dom-v5-compat";
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
  setAutoDashboardLoad,
  saveAppliedFilters,
  getAppliedFilters,
  setFinalizeToDashboardReload,
  setFilterDependencyData,
  setDDScreenConfigs,
  renamePLansByLevel,
  setFilterPlan,
  setSummaryPlan,
  setEnableSmartFilter,
  setIsProdCloudFunction,
} from "../../services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
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
  INVENTORY_DASHBOARD_ALLOCATION_TABS,
  INVENTORY_DASHBOARD_TAB_OPTIONS,
  NO_SAVED_FILTERS,
  ROLES_ACCESS_MODULES_MAPPING,
} from "../../constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import InventoryDashboardDetails from "./components/InventoryDashboardDetails";
import DailyBrief from "./components/DailyBrief";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isArray, isEmpty } from "lodash";
import { Typography, Grid, Box } from "@mui/material";
import { resetStoreInventoryState } from "../../services-inventorysmart/Decision-Dashboard/store-inventory-services";
import {
  formattedFilterConfiguration,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  setInventorySmartModulesPermissions,
  setInventorySmartPermissionLoader,
  getModuleBasedTenantConfig,
} from "../../services-inventorysmart/common/inventory-smart-common-services";
import moment from "moment";
import { useStyles } from "modules/inventorysmart/styles/inventorySmartUseStyles";
import Loader from "core/Utils/Loader/loader";
import { getModuleLevelAccessUtility } from "core/actions/userAccessActions";
import { tabModulePermissionMap } from "./config/tabConfig";
import {
  checkS2SAvaiableOrNot,
  getTabItemVisibility,
} from "../../utils-inventorysmart/utilityFunctions";
import { ButtonGroup, Button, useTranslation, Tabs } from "impact-ui-v3";
import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import LoopIcon from "assets/LoopIcon.svg";

/** OMS Components */
import OMSDecisionDashboard from "modules/oms/pages-oms/Decision-Dashboard/index.jsx";
import { DECISION_DASHBOARD_OUTER_TAB_GROUP_ID } from "config/constants";
import {
  setOrderingDDScreenConfigs,
  setSelectedFilters as setOrderingSelectedFilters,
  setIsFiltersValid as setOrderingIsFiltersValid,
  setSelectedDates as setOrderingSelectedDates,
  setFilterDependencyData as setOrderingFilterDependencyData,
  resetOrderingDashboardStore,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-decision-dashboard-service";
import DashboardViewPastAllocation from "./components/DashboardViewPastAllocation/DashboardViewPastAllocation";
import { makeStyles } from "@mui/styles";

const dasboardStyles = makeStyles(() => ({
  tableContainer: {
    "& .ia-styles.ia-tabPanel": {
      padding: "0 !important",
      marginTop: "16px",
    },
  },
}));

const InventoryDashboard = (props) => {
  const { t } = useTranslation();
  const { inventorysmartModulesPermission, module, ddScreenConfigs } = props;
  const navigate = useNavigate();
  const globalClasses = globalStyles();
  const classes = useStyles();
  const dashboardClasses = dasboardStyles();

  const [tabValue, setTabValue] = useState("forecast");
  const [refreshDateData, setRefreshDateData] = useState(null);
  const [mountComponent, setMountComponent] = useState(false);
  const [customChipData, setCustomChipData] = useState(null);
  const [tabsList, setTabsList] = useState([]);
  const [openPlans, setOpenPlans] = useState(false);
  const containerRef = useRef(null);

  const isS2SAvailable = checkS2SAvaiableOrNot(
    props.sideBarReducer.activeSideBarData || []
  );

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  useEffect(() => {
    if (openPlans && isS2SAvailable) {
      setTabValue("dc_to_store");
    }
  }, [openPlans]);

  useEffect(() => {
    const fetchModuleConfigs = async () => {
      try {
        props.setInventorySmartPermissionLoader(true);
        let reqBody = {
          module_name: "DD-CONFIGS",
          screen_name: props.screenName,
        };
        let response = await props.getModuleBasedTenantConfig(reqBody);
        reqBody.module_name = "inventory_kpi";
        let inventoryKpiResponse = await props.getModuleBasedTenantConfig(
          reqBody
        );

        // Fetch advance filter config
        reqBody.module_name = "Advance Filtering";
        reqBody.screen_name = props.screenName;
        const advanceFilterResponse = await props.getModuleBasedTenantConfig(
          reqBody
        );

        // Fetch prod cloud function config (separate, dedicated attribute)
        reqBody.module_name = "Prod Cloud Function";
        const prodCloudFunctionResponse = await props.getModuleBasedTenantConfig(
          reqBody
        );

        // Set enableFilterPlan and enableSummary directly in Redux state
        const enableFilterPlan =
          advanceFilterResponse?.enableFilterPlan || false;
        const enableSummary = advanceFilterResponse?.enableSummaryPlan || false;
        const enableSmartFilter =
          response?.dashboard?.drillDown?.enableSmartFilter || false;
        const isProdCloudFunction =
          prodCloudFunctionResponse?.isProdCloudFunction || false;
        props.setFilterPlan(enableFilterPlan);
        props.setSummaryPlan(enableSummary);
        props.setEnableSmartFilter(enableSmartFilter);
        props.setIsProdCloudFunction(isProdCloudFunction);

        // Map inventory_kpi config to response
        const kpiConfigMapping = {
          store: "storeKpisConfig",
          dc: "dcKpisConfig",
          tickersList: "tickersListConfig",
          kpiType: "kpiType",
          render3DIcons: "render3DIcons",
        };
        Object.entries(kpiConfigMapping).forEach(([source, target]) => {
          if (inventoryKpiResponse?.value?.[source] !== undefined) {
            response[target] = inventoryKpiResponse.value[source];
          }
        });

        // If OMS is enabled, use the tab key from OMS Config to render tabs
        if (props.inventorysmartOmsScreenConfig?.is_oms_enabled) {
          const tabKey =
            props.inventorysmartOmsScreenConfig?.module_screens_info
              ?.decision_dashboard?.tab_key;
          if (tabKey) response.dashboard.subComponent = tabKey;
        }
        props.setDDScreenConfigs(response);
        props.setOrderingDDScreenConfigs(response);
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        props.setInventorySmartPermissionLoader(false);
      }
    };
    fetchModuleConfigs();
    return () => {};
  }, [props.inventorysmartOmsScreenConfig]);

  useEffect(() => {
    // Only for DG
    if (ddScreenConfigs?.dashboard?.rename_plans_by_levels) {
      props.renamePLansByLevel();
    }
  }, [ddScreenConfigs?.dashboard?.rename_plans_by_levels]);
  useEffect(() => {
    const subComponent = ddScreenConfigs?.dashboard?.subComponent;
    const tabsArray = subComponent
      ? INVENTORY_DASHBOARD_TAB_OPTIONS[subComponent] ??
        INVENTORY_DASHBOARD_TAB_OPTIONS.dashboardWithForecastAndStoreInventory
      : INVENTORY_DASHBOARD_TAB_OPTIONS.dashboardWithForecastAndStoreInventory;

    let newTabsList = [];
    tabsArray.forEach((option, index) => {
      const { label, value } = option;
      const tabPermissions = tabModulePermissionMap[value];
      const displayFlag = getTabItemVisibility(
        inventorysmartModulesPermission[module],
        tabPermissions
      );

      if (displayFlag) {
        newTabsList.push({
          label,
          value,
        });
      }
    });

    setTabsList(newTabsList);
  }, [ddScreenConfigs, inventorysmartModulesPermission, module]);

  const applyFilters = async (
    filterElements,
    filterDependency,
    skipSave = false
  ) => {
    let formattedData = cloneDeep(filterElements);
    formattedData.forEach((item) => {
      delete item.label;
      delete item.initialData;
    });

    const payload = filtersPayload(filterElements, filterDependency, true);
    let req = {
      filters: {
        dependencyData: filterDependency,
        filterData: formattedData,
      },
    };
    // ToDo - Check this functionality later

    // try {
    //   if (!skipSave) {
    //     await props.saveAppliedFilters(req);
    //   }
    // } catch (error) {
    //   console.log(error);
    //   displaySnackMessages(ERROR_MESSAGE, "error");
    // }
    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(filterDependency);

    props.setOrderingIsFiltersValid(payload.isValid);
    props.setOrderingSelectedFilters(filterDependency);
    setMountComponent(true);
  };

  const onFilterDashboardClick = (
    dependencyData,
    filterData,
    skipSave = false
  ) => {
    setMountComponent(false);
    applyFilters(filterData, dependencyData, skipSave);
  };

  const getRefreshDateInfo = async () => {
    try {
      const response = await props.getDataRefreshDateDetails();
      setRefreshDateData(response.data.data);
    } catch (error) {
      handleErrorMessage(error);
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
      handleErrorMessage(error);
    } finally {
      props.setInventorySmartPermissionLoader(false);
    }
  };

  useEffect(() => {
    const onLoad = async () => {
      if (props.finalizeToDashboardReload) {
        try {
          let response = await props.getAppliedFilters();

          const attributeValue = response?.data?.data?.data?.attribute_value;

          if (!isEmpty(attributeValue)) {
            const parsedAttributeValue = JSON.parse(attributeValue[0]);
            const dependencyData = parsedAttributeValue.dependencyData;
            const filterData = parsedAttributeValue.filterData;

            // This code is used to explicitly set the filter data that core components handles on applying filter.
            props.setFilterDependencyData(dependencyData);

            props.setOrderingFilterDependencyData(dependencyData);

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
          handleErrorMessage(error);
        }
      }
    };
    onLoad();
  }, [props.finalizeToDashboardReload]);

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
        handleErrorMessage(e);
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
          handleErrorMessage(error);
        } finally {
          props.setInventorysmartFilterLoader(false);
        }
      };

      getFilterValues(props.savedFilterSelection);
    }
  }, [props.inventoryDashboardFilterConfig, props.inventorysmartScreenConfig]);

  useEffect(() => {
    /** Checks the config for a particular client and sets default value to Store Inventory Tab if no other tabs are present */
    if (!isEmpty(props?.ddScreenConfigs)) {
      if (props?.ddScreenConfigs?.dashboard?.subComponent) {
        const tabList =
          INVENTORY_DASHBOARD_TAB_OPTIONS[
            props?.ddScreenConfigs?.dashboard?.subComponent
          ] ??
          INVENTORY_DASHBOARD_TAB_OPTIONS.dashboardWithForecastAndStoreInventory;
        const defaultTabKey =
          props?.ddScreenConfigs?.dashboard?.drillDown?.defaultTab;
        let selectedTab = "store_inventory";
        if (
          defaultTabKey &&
          tabList.find((tab) => tab.value === defaultTabKey)
        ) {
          selectedTab = defaultTabKey;
        } else if (tabList.length > 0) {
          selectedTab = tabList[0].value;
        }
        setTabValue(selectedTab);
      } else {
        setTabValue("store_inventory");
      }

      // Check for tickersList from inventory_kpi config
      if (!isEmpty(props?.ddScreenConfigs?.tickersListConfig)) {
        getRefreshDateInfo();
      }
      fetchModulesAccess();
    }
  }, [props?.ddScreenConfigs, props?.ddScreenConfigs?.tickersListConfig]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const routeOptions = [
    {
      label: t("inventorysmart.decisionDashboardHome"),
      id: 1,
      action: () => {
        navigate(HOME);
      },
    },
    {
      label: t("inventorysmart.decisionDashboardTitle"),
      id: 2,
      action: () => {
        navigate(DASHBOARD);
      },
    },
  ];

  const renderTabComponents = () => {
    const isForecastSeparate =
      props?.ddScreenConfigs?.dashboard?.drillDown?.isForecastSeparate ?? false;
    switch (tabValue) {
      case "forecast":
        return (
          <InventoryDashboardDetails
            tabValue={tabValue}
            module={props?.module}
            openPlans={openPlans}
            setOpenPlans={setOpenPlans}
            containerRef={containerRef}
            isForecastSeparate={isForecastSeparate}
          />
        );
      case "store_inventory":
        return (
          <InventoryDashboardDetails
            tabValue={tabValue}
            module={props?.module}
            openPlans={openPlans}
            setOpenPlans={setOpenPlans}
            containerRef={containerRef}
            isForecastSeparate={isForecastSeparate}
          />
        );
      case "oms":
        return (
          <OMSDecisionDashboard
            tabValue={tabValue}
            module={props?.module}
            variant="oms"
          />
        );
      case "vendor_store":
        return (
          <OMSDecisionDashboard
            tabValue={tabValue}
            module={props?.module}
            variant="vendor_store"
          />
        );
      default:
        return;
    }
  };

  const renderTransferTabComponents = () => {
    const isForecastSeparate =
      props?.ddScreenConfigs?.dashboard?.drillDown?.isForecastSeparate ?? false;

    const tabMapper = {
      store_to_store: (
        <DashboardViewPastAllocation
          tabValue={tabValue}
          module={props?.module}
          openPlans={openPlans}
          setOpenPlans={setOpenPlans}
          containerRef={containerRef}
          isForecastSeparate={isForecastSeparate}
          isStoretoStore={true}
        />
      ),
      dc_to_store: (
        <DashboardViewPastAllocation
          tabValue={tabValue}
          module={props?.module}
          openPlans={openPlans}
          setOpenPlans={setOpenPlans}
          containerRef={containerRef}
          isForecastSeparate={isForecastSeparate}
        />
      ),
    };
    const tabsList = INVENTORY_DASHBOARD_ALLOCATION_TABS;
    const tabPanels = tabsList.map((thisTab) => {
      const tabValue = thisTab?.value;
      return (
        <div
          className={globalClasses.tabsContainerBody}
          key={tabValue}
          style={{
            maxHeight: `calc(100vh - ${
              320 - (props.isFilterStripVisible ? 0 : 64) // Bottom Footer + header + Filter + Tabs
            }px)`,
          }}
        >
          {tabMapper[tabValue]}
        </div>
      );
    });
    return tabPanels;
  };

  const getTickerLabel = (tickerValue, tickerConfig) => {
    // If label is provided in config (from inventory_kpi)
    if (tickerConfig?.label) {
      return tickerConfig.label;
    }
    // Fallback to default mapping
    const labelMapping = {
      refresh_date: t("inventorysmart.decisionDashboardInventoryLabel"),
      inventory_date: t("inventorysmart.decisionDashboardInventoryLabel"),
      transaction_date: t("inventorysmart.decisionDashboardTransactionLabel"),
      mfp_date: t("inventorysmart.decisionDashboardMFPLabel"),
    };
    return labelMapping[tickerValue] || "";
  };
  const getEffectiveTickersList = () => {
    const tickersListConfig = ddScreenConfigs?.tickersListConfig;
    if (!tickersListConfig) return [];
    return Object.values(tickersListConfig).filter(
      (ticker) => ticker.visible !== false
    );
  };

  const RenderTickerComp = () => {
    const effectiveTickersList = getEffectiveTickersList();
    return (
      !isEmpty(refreshDateData) &&
      !isEmpty(effectiveTickersList) && (
        <div
          className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${globalClasses.gap_4} ${globalClasses.paddingHorizontal_12} ${classes.refreshDatesTickerContainer}`}
        >
          <div
            className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${globalClasses.gap_16} ${globalClasses.fullWidth}`}
          >
            <div
              className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${globalClasses.gap_4}`}
            >
              <LoopIcon />
              <span className={classes.refreshDatesLabel}>
                {t("inventorysmart.decisionDashboardRefreshDatesLabel")}
              </span>
            </div>
            {effectiveTickersList?.map((tickerList, index) => {
              const label = getTickerLabel(tickerList?.value, tickerList);
              return (
                <React.Fragment key={index}>
                  <div
                    className={`${globalClasses.flexRow} ${globalClasses.centerAlign}`}
                  >
                    <span className={classes.refreshDatesItemLabel}>
                      {label}
                    </span>
                    &nbsp;
                    <span className={`${classes.datesContainerValue}`}>
                      {moment(refreshDateData?.[tickerList?.["value"]]).format(
                        localStorage.getItem("tenantDateFormat")
                      )}
                    </span>
                  </div>
                  {effectiveTickersList?.length - 1 !== index && (
                    <>&nbsp;|&nbsp;</>
                  )}
                </React.Fragment>
              );
            })}
          </div>
        </div>
      )
    );
  };

  const paths = [
    {
      label: t("inventorysmart.decisionDashboardHome"),
      to: "/home",
    },
    {
      label: t("inventorysmart.decisionDashboardTitle"),
      to: "#",
    },
  ];

  const isForecastSeparate =
    props?.ddScreenConfigs?.dashboard?.drillDown?.isForecastSeparate ?? false;

  return (
    <div
      className={`${globalClasses.paddingAroundNew} ${globalClasses.mainContainerBody}`}
    >
      <CoreComponentScreen
        headerBreadCrumb={
          !openPlans ? (
            <HeaderBreadCrumbs options={paths} />
          ) : (
            <HeaderBreadCrumbs
              options={[
                {
                  label: t("inventorysmart.decisionDashboardHome"),
                  to: "/home",
                },
                {
                  label: t("inventorysmart.decisionDashboardTitle"),
                  action: () => {
                    setOpenPlans(false);
                    setTabValue("store_inventory");
                  },
                },
                {
                  label: t("inventorysmart.decisionDashboardAllocationPlans"),
                  action: () => {
                    setOpenPlans(false);
                    setTabValue("store_inventory");
                  },
                },
              ]}
            />
          )
        }
        showPageRoute={false}
        showPageHeader={true}
        showFilterLoader={props.inventorySmartPermissionLoader}
        routeOptions={routeOptions}
        // Filter dashboard props
        showFilterDashboard={true}
        hideAllFiltersButton={
          openPlans &&
          props?.ddScreenConfigs?.dashboard?.drillDown?.hideFilterOnViewPlans
        }
        filterConfigKey={"decisionDashboardFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        chipsDependency={customChipData ? customChipData : null}
        extraButtons={
          props.isFiltersValid && !openPlans ? [RenderTickerComp()] : []
        }
        autoHideFilterButton={true}
      >
        {!openPlans ? (
          <div
            ref={containerRef}
            style={{
              position: "relative",
              maxHeight: `calc(100vh - ${
                200 - (props.isFilterStripVisible ? 0 : 64)
              }px)`,
            }}
            className={globalClasses.tabsContainerBody}
          >
            {props.isFiltersValid && (
              <div>
                <DailyBrief />
                {INVENTORY_DASHBOARD_TAB_OPTIONS[
                  props.ddScreenConfigs?.dashboard?.subComponent
                ]?.length == 1 ? (
                  <Grid
                    className={`${globalClasses.flexRow} ${globalClasses.centerAlign} ${globalClasses.paddingBottom_24}`}
                  >
                    <Grid id={DECISION_DASHBOARD_OUTER_TAB_GROUP_ID}>
                      <Typography
                        component="h6"
                        className={`${classes.labelPrimary}`}
                      >
                        {`${
                          INVENTORY_DASHBOARD_TAB_OPTIONS[
                            props.ddScreenConfigs?.dashboard?.subComponent
                          ][0]?.label
                        }`}
                      </Typography>
                    </Grid>
                  </Grid>
                ) : (
                  <Grid
                    className={`${globalClasses.centerAlign} ${globalClasses.paddingBottom_24}`}
                  >
                    <Grid>
                      <ButtonGroup
                        id={DECISION_DASHBOARD_OUTER_TAB_GROUP_ID}
                        onChange={handleChangeTabValue}
                        options={[...tabsList]}
                        selectedOption={tabValue}
                      />
                    </Grid>
                  </Grid>
                )}
                {mountComponent && <>{renderTabComponents()}</>}
              </div>
            )}
          </div>
        ) : (
          <div
            className={`${dashboardClasses.tableContainer}`}
            style={{
              marginTop: props.isFilterStripVisible ? "16px" : "",
            }}
          >
            {!isS2SAvailable ? (
              <div
                className={globalClasses.tabsContainerBody}
                style={{
                  maxHeight: `calc(100vh - ${
                    264 - (props.isFilterStripVisible ? 0 : 64)
                  }px)`,
                }}
              >
                <DashboardViewPastAllocation
                  tabValue={"store_inventory"}
                  module={props?.module}
                  openPlans={openPlans}
                  setOpenPlans={setOpenPlans}
                  containerRef={containerRef}
                  isForecastSeparate={isForecastSeparate}
                />
              </div>
            ) : (
              <Tabs
                onChange={handleChangeTabValue}
                tabNames={INVENTORY_DASHBOARD_ALLOCATION_TABS}
                value={tabValue}
                tabPanels={renderTransferTabComponents()}
              />
            )}
          </div>
        )}
      </CoreComponentScreen>
      {openPlans && (
        <div
          className={classes.bottomButtonsContainer}
          style={{ zIndex: 1000 }}
        >
          <Button
            type="default"
            variant="tertiary"
            id="back-to-dashboard"
            onClick={() => {
              setOpenPlans(false);
              setTabValue("store_inventory");
            }}
          >
            {t("inventorysmart.decisionDashboardBackButton")}
          </Button>
        </div>
      )}
    </div>
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
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        .ddScreenConfigs,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    inventorysmartOmsScreenConfig:
      store.omsReducer?.orderingCommonService?.orderingModuleConfig,
    sideBarReducer: store?.sideBarReducer,
    isFilterStripVisible: store?.filterReducer?.showFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  renamePLansByLevel: () => dispatch(renamePLansByLevel()),
  setDDScreenConfigs: (payload) => dispatch(setDDScreenConfigs(payload)),
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
  getDataRefreshDateDetails: () => dispatch(getDataRefreshDateDetails()),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setAutoDashboardLoad: (payload) => dispatch(setAutoDashboardLoad(payload)),
  setFinalizeToDashboardReload: (payload) =>
    dispatch(setFinalizeToDashboardReload(payload)),
  saveAppliedFilters: (payload) => dispatch(saveAppliedFilters(payload)),
  getAppliedFilters: (payload) => dispatch(getAppliedFilters()),
  setFilterDependencyData: (payload) =>
    dispatch(setFilterDependencyData(payload)),
  // setKeyValueInCache: (keyValuePair) =>
  //   dispatch(setKeyValueInCache(keyValuePair)),
  getModuleBasedTenantConfig: (module) =>
    dispatch(getModuleBasedTenantConfig(module)),
  setFilterPlan: (payload) => dispatch(setFilterPlan(payload)),
  setSummaryPlan: (payload) => dispatch(setSummaryPlan(payload)),
  setEnableSmartFilter: (payload) => dispatch(setEnableSmartFilter(payload)),
  setIsProdCloudFunction: (payload) =>
    dispatch(setIsProdCloudFunction(payload)),
  setOrderingDDScreenConfigs: (payload) =>
    dispatch(setOrderingDDScreenConfigs(payload)),
  setOrderingSelectedFilters: (payload) =>
    dispatch(setOrderingSelectedFilters(payload)),
  setOrderingIsFiltersValid: (payload) =>
    dispatch(setOrderingIsFiltersValid(payload)),
  setOrderingSelectedDates: (payload) =>
    dispatch(setOrderingSelectedDates(payload)),
  setOrderingFilterDependencyData: (payload) =>
    dispatch(setOrderingFilterDependencyData(payload)),
  resetOrderingDashboardStore: () => dispatch(resetOrderingDashboardStore()),
});

export default connect(mapStateToProps, mapDispatchToProps)(InventoryDashboard);
