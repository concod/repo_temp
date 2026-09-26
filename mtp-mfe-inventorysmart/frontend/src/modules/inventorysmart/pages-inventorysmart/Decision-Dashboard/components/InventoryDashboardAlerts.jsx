import React from "react";
import { useEffect, useState,useMemo } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "../../../styles/inventorySmartUseStyles";
import StoreInventoryAlerts from "../../StoreInventoryAlerts";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  SCREENS_LIST_MAP,
  STORE_INVENTORY_ALERT_ACTION_CONFIG,
  STORE_INVENTORY_ALERT_ORDER,
  DASHBOARD_CACHE,
  ERROR_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import Loader from "core/Utils/Loader/loader";
import {
  getStoreInventoryAlertsTableConfiguration,
  getStoreInventoryAlertsTableData,
  setStoreInventoryAlertsTableConfigLoader,
  setStoreInventoryAlertsTableDataLoader,
  setStoreInventoryAlertsTableData,
  setForecastAlertsTableData,
  resetAlertsData,
  setRefetchAlerts,
  setAlertsTotalCount,
} from "../../../services-inventorysmart/StoreInventoryAlerts/store-inventory-alerts-service";
import {
  getStoreForecastAlertsTableData,
  setStoreForecastAlertsTableLoader,
} from "../../../services-inventorysmart/StoreInventoryAlerts/store-forecast-alerts-service";
import { setInventoryDashboardAlertCount } from "../../../services-inventorysmart/KPI-Matrix/kpi-services";
import { cloneDeep, isEmpty, isUndefined } from "lodash";
import { Tabs } from "impact-ui-v3";
import {
  setKeyValueInCache,
  clearActiveModuleCache,
} from "modules/inventorysmart/services-inventorysmart/active-module-common-service";
import { addSnack } from "core/actions/snackbarActions";

const InventoryDashboardAlerts = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [alertsTableColumnConfig, setAlertsTableColumnConfig] = useState([]);
  const [alertsTableData, setAlertsTableData] = useState([]);
  const [storeAlertsTableData, setStoreAlertsTableData] = useState([]);
  const [pinnedAlertsData, setPinnedAlertsData] = useState([]);

  const [orderAlertsColumnConfig, setOrderAlertsColumnConfig] = useState([]);
  const [orderAlertsTableData, setOrderAlertsTableData] = useState([]);

  const [tabValue, setTabValue] = useState("");
  const [renderTableDetails, setRenderTableDetails] = useState(false);

  const isForecastTab = props.isForecastSeparate && props.parentTabValue === "forecast";
  const alertTabs = props?.ddScreenConfigs?.dashboard?.drillDown?.alertTabs || [];

  const filteredAlertTabs = useMemo(() => {
    if (!props.isForecastSeparate) {
      return alertTabs;
    }
    if (isForecastTab) {
      return alertTabs.filter(tab => tab === "forecast");
    } else {
      return alertTabs.filter(tab => tab !== "forecast");
    }
  }, [props.isForecastSeparate, isForecastTab, alertTabs]);

  useEffect(() => {
    return () => {
      props.resetAlertsData();
      props.clearActiveModuleCache(DASHBOARD_CACHE);
    };
  }, []);

  useEffect(() => {
    let clonedAlertsTableData = cloneDeep(
      props.storeInventoryAlertsTableData[tabValue]
    );
    setStoreAlertsTableData(clonedAlertsTableData);
  }, [props.storeInventoryAlertsTableData, tabValue]);

  useEffect(() => {
    let clonedAlertsTableData = cloneDeep(props.forecastAlertsTableData);
    setAlertsTableData(clonedAlertsTableData);
  }, [props.forecastAlertsTableData]);

  useEffect(() => {
    if (!isEmpty(props?.ddScreenConfigs)) {
      if (isForecastTab) {
        setTabValue("forecast");
      } else {
        if (filteredAlertTabs.length > 0) {
          setTabValue(filteredAlertTabs[0]);
        } else {
          setTabValue("");
        }
      }
    }
    setRenderTableDetails(true);
  }, [props?.ddScreenConfigs, props.parentTabValue, isForecastTab, filteredAlertTabs]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error");
    else displaySnackMessages(ERROR_MESSAGE, "error");
  };

  const fetchStoreInventoryAlertsTableConfig = async () => {
    if (
      props.cache[DASHBOARD_CACHE] &&
      props.cache[DASHBOARD_CACHE][`table_name=store_inventory_alerts`]
    ) {
      const config = cloneDeep(
        props.cache[DASHBOARD_CACHE][`table_name=store_inventory_alerts`]
      );
      setAlertsTableColumnConfig(config);
    } else {
      try {
        props.setStoreInventoryAlertsTableConfigLoader(true);
        let response = await props.getStoreInventoryAlertsTableConfiguration();
        const actionColumn = {
          ...STORE_INVENTORY_ALERT_ACTION_CONFIG[0],
          tc_code: response.data.data[0].tc_code,
          tc_mapping_code: response.data.data[0].tc_mapping_code,
        };
        const config = [...response.data.data, actionColumn];
        props.setKeyValueInCache({
          key: `table_name=store_inventory_alerts`,
          value: config,
          module: DASHBOARD_CACHE,
        });
        setAlertsTableColumnConfig(cloneDeep(config));
      } catch (e) {
        handleErrorMessage(e);
      } finally {
        props.setStoreInventoryAlertsTableConfigLoader(false);
      }
    }
  };

  const fetchStoreInventoryAlertsData = async (alertTab) => {
    if (props.storeInventoryAlertsTableData[alertTab] && !props?.refetchAlert) {
      setAlertsTableData(
        cloneDeep(props.storeInventoryAlertsTableData[alertTab])
      );
    } else {
      // No matter data is cached or not, if refetchAlert is true we fetch alerts again.
      // refetchAlert is always false.
      // Becmoes true when move to OB done then again is set to false.
      try {
        props.setStoreInventoryAlertsTableDataLoader(true);

        let body = {
          filters: props.selectedFilters,
        };

        let response = await props.getStoreInventoryAlertsTableData({
          body: body,
          tab: `${alertTab}_alerts`,
        });

        let alertsCount = response?.data?.data?.count;
        // response?.data?.data?.count;
        // let alerts = response?.data?.data?.alert?.map((alert, index) => {
        let alerts = response?.data?.data?.alert?.map((alert, index) => {
          alert.disableAction = "article_count";
          alert.action = "Review Recommendation";
          alert.current_level = 0;
          alert.index = index;
          alert.is_selectable = alert.is_selected;

          if (
            props.inventorysmartScreenConfig.dynamicLabels.article === "Product"
          ) {
            alert.order =
              STORE_INVENTORY_ALERT_ORDER?.[alert.name?.toLowerCase()];
          }

          delete alert.is_selected;

          return alert;
        });

        if (
          props.inventorysmartScreenConfig.dynamicLabels.article === "Product"
        ) {
          alerts = sortAlerts(alerts);
        }

        alerts = sortAlertsByDisplayOrder(alerts);

        if (props?.ddScreenConfigs?.dashboard?.drillDown.enableAlertsPinning) {
          const topAlerts = alerts.splice(0, 2);

          setPinnedAlertsData(topAlerts);
        }

        let alertsCountPayload = {
          key: props.screen,
          data: alertsCount,
        };
        props.setStoreInventoryAlertsTableData({ tab: alertTab, data: alerts });
        props.setInventoryDashboardAlertCount(alertsCountPayload);
        props.setAlertsTotalCount({ tabValue, alertsCount });
      } catch (e) {
        // handleErrorMessage(e);
      } finally {
        props.setStoreInventoryAlertsTableDataLoader(false);
        props?.setRefetchAlerts(false);
      }
    }
  };

  const sortAlerts = (alerts) => {
    if (!alerts || !alerts?.length) {
      return [];
    }
    let orderSpecifiedAlerts = [];
    let noOrderAlerts = [];
    alerts.forEach((thisAlert) => {
      if (!isUndefined(thisAlert?.order)) {
        orderSpecifiedAlerts.push(thisAlert);
      } else {
        noOrderAlerts.push(thisAlert);
      }
    });
    orderSpecifiedAlerts.sort((a, b) => a?.["order"] - b?.["order"]);
    let lastOrderValue = isEmpty(orderSpecifiedAlerts)
      ? 0
      : orderSpecifiedAlerts[orderSpecifiedAlerts.length - 1].order;
    noOrderAlerts.forEach((thisAlert, index) => {
      thisAlert["order"] = lastOrderValue + index;
    });
    let allAlerts = [...orderSpecifiedAlerts, ...noOrderAlerts];
    allAlerts.forEach((alert, index) => {
      alert["index"] = index;
      alert["order"] = index;
    });
    return [...allAlerts];
  };

  const sortAlertsByDisplayOrder = (alerts) => {
    if (!alerts?.length) return alerts || [];
    if (!alerts.some((a) => a.display_order != null)) return alerts;
    return [...alerts]
      .sort((a, b) => {
        const aHas = a.display_order != null;
        const bHas = b.display_order != null;
        if (aHas && bHas) return a.display_order - b.display_order;
        return aHas ? -1 : bHas ? 1 : 0;
      })
      .map((alert, index) => ({ ...alert, index }));
  };

  const fetchForecastAlertsTableData = async () => {
    try {
      props.setStoreForecastAlertsTableLoader(true);

      const filters = {
        product_attributes: [],
        store_attributes: [],
      };
      props.selectedFilters.forEach((filter) => {
        if (filter.dimension === "Product" && filter?.values?.length > 0) {
          filters.product_attributes.push(filter);
        } else if (filter.dimension === "Store" && filter?.values?.length > 0) {
          filters.store_attributes.push(filter);
        }
      });

      let body = {
        ...filters,
      };
      let response = await props.getStoreForecastAlertsTableData(body);
      let alertsCount = response?.data?.data?.count;
      let alerts = response?.data?.data?.alert?.map((alert, index) => {
        alert.disableAction = "article_count";
        alert.action = "Review Recommendation";
        alert.current_level = 0;
        alert.index = index;
        alert.is_selectable = alert.is_selected;

        delete alert.is_selected;
        return alert;
      });

      alerts = sortAlertsByDisplayOrder(alerts);

      let alertsCountPayload = {
        key: props.screen,
        data: alertsCount,
      };
      props.setForecastAlertsTableData(alerts);
      props.setInventoryDashboardAlertCount(alertsCountPayload);
      props.setAlertsTotalCount({ tabValue, alertsCount });
    } catch (e) {
      // handleErrorMessage(e);
    } finally {
      props.setStoreForecastAlertsTableLoader(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters) && renderTableDetails) {
      if (tabValue) {
        fetchStoreInventoryAlertsData(tabValue);
        fetchStoreInventoryAlertsTableConfig();
      } else {
        if (
          props.screen ===
          SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY
        ) {
          fetchStoreInventoryAlertsData();
          fetchStoreInventoryAlertsTableConfig();
        } else if (
          props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER
        ) {
          // a new table config will be created, to use that later, write a function and call respective table config api
        } else {
          fetchStoreInventoryAlertsTableConfig();
          fetchForecastAlertsTableData();
          // add two tabs here for alerts
        }
      }
    }
  }, [
    props.selectedFilters,
    props?.reloadKpi,
    renderTableDetails,
    tabValue,
    props?.refetchAlert,
  ]);

  const tabProps = (index) => {
    return {
      id: `simple-tab-${index}`,
      "aria-controls": `simple-tabpanel-${index}`,
    };
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const getTabPanels = () => {
    let tabPanels = [];
    if (props.screen != SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER) {
      
      filteredAlertTabs.forEach(
        (thisTab, index) => {
          tabPanels.push(
            <Loader
              key={index}
              loader={
                props.storeForecastAlertsTableLoader ||
                props.storeInventoryAlertsTableDataLoader ||
                props.storeInventoryAlertsTableConfigLoader ||
                props.orderInventoryAlertsTableConfigLoader
              }
              text="Loading Alerts"
              size="medium"
              minHeight={"180px"}
            >
              {!props.storeForecastAlertsTableLoader &&
                !props.storeInventoryAlertsTableDataLoader &&
                !props.storeInventoryAlertsTableConfigLoader && (
                  <StoreInventoryAlerts
                    isWithinTabs={
                      props?.ddScreenConfigs?.dashboard?.drillDown?.alertTabs
                        ?.length > 1
                    }
                    screen={props.screen}
                    columnConfig={alertsTableColumnConfig}
                    data={
                      props.screen ===
                      SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY
                        ? storeAlertsTableData
                        : alertsTableData
                    }
                    pinnedData={pinnedAlertsData}
                    canEdit={props.canEdit}
                    canDelete={props.canDelete}
                    canCreate={props.canCreate}
                    tabValue={thisTab}
                    tableHeader={
                      props?.ddScreenConfigs?.dashboard?.drillDown?.alertTabs
                        ?.length === 1
                        ? "Alerts"
                        : ""
                    }
                  />
                )}
            </Loader>
          );
        }
      );
    }
    return tabPanels;
  };
  return (
    <div className={globalClasses.marginTop_24}>
      {filteredAlertTabs.length > 1 ? (
        <div className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap_16} ${globalClasses.padding_20_20_12_20} ${classes.alertsContainerMultiTab}`}>
          <Tabs
            value={tabValue}
            onChange={handleChangeTabValue}
            aria-label="decision-dashboard-kpi-tabs"
            tabNames={filteredAlertTabs.map(
              (thisTab) => {
                return {
                  label: thisTab,
                  value: thisTab,
                };
              }
            )}
            tabPanels={getTabPanels()}
          ></Tabs>
          </div>
      ) : filteredAlertTabs.length === 1 ? (
        <div className={`${globalClasses.flexRow} ${globalClasses.flexColumn} ${globalClasses.gap_16} ${globalClasses.padding_20_16_20_16} ${classes.alertsContainerSingleTab}`}>
          {getTabPanels()}
        </div>
      ) : null}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    ddScreenConfigs:
      store.inventorysmartReducer.inventorySmartDashboardService
        .ddScreenConfigs,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    storeForecastAlertsTableLoader:
      store.inventorysmartReducer.inventorySmartStoreForecastAlerts
        .storeForecastAlertsTableLoader,
    storeInventoryAlertsTableDataLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableDataLoader,
    storeInventoryAlertsTableConfigLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableConfigLoader,
    refetchAlert:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .refetchAlert,
    dynamicLabels:
      store.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.dynamicLabels,
    excludedFilterValues:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer
        .filter_attribute_exclusion_values,
    storeInventoryAlertsTableData:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableData,
    forecastAlertsTableData:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .forecastAlertsTableData,
    cache: store.inventorysmartReducer?.activeModulesCacheService?.cache,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setStoreInventoryAlertsTableConfigLoader: (payload) =>
    dispatch(setStoreInventoryAlertsTableConfigLoader(payload)),
  setRefetchAlerts: (payload) => dispatch(setRefetchAlerts(payload)),
  setStoreInventoryAlertsTableDataLoader: (payload) =>
    dispatch(setStoreInventoryAlertsTableDataLoader(payload)),
  getStoreInventoryAlertsTableConfiguration: () =>
    dispatch(getStoreInventoryAlertsTableConfiguration()),
  getStoreInventoryAlertsTableData: (payload) =>
    dispatch(getStoreInventoryAlertsTableData(payload)),
  getStoreForecastAlertsTableData: (payload) =>
    dispatch(getStoreForecastAlertsTableData(payload)),
  setStoreForecastAlertsTableLoader: (payload) =>
    dispatch(setStoreForecastAlertsTableLoader(payload)),
  setInventoryDashboardAlertCount: (payload) =>
    dispatch(setInventoryDashboardAlertCount(payload)),
  setStoreInventoryAlertsTableData: (payload) =>
    dispatch(setStoreInventoryAlertsTableData(payload)),
  setForecastAlertsTableData: (payload) =>
    dispatch(setForecastAlertsTableData(payload)),
  resetAlertsData: (payload) => dispatch(resetAlertsData(payload)),
  setKeyValueInCache: (keyValuePair) =>
    dispatch(setKeyValueInCache(keyValuePair)),
  clearActiveModuleCache: (module) => dispatch(clearActiveModuleCache(module)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setAlertsTotalCount: (payload) => dispatch(setAlertsTotalCount(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InventoryDashboardAlerts);
