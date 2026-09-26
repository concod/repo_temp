import { useEffect, useState } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import StoreInventoryAlerts from "../../StoreInventoryAlerts";
import OrderInventoryAlerts from "../../Order-Inventory-Alerts";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  ASC_ORDER,
  SCREENS_LIST_MAP,
  STORE_INVENTORY_ALERT_ACTION_CONFIG,
  STORE_INVENTORY_ALERT_ORDER,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import Loader from "core/Utils/Loader/loader";
import {
  getStoreInventoryAlertsTableConfiguration,
  getStoreInventoryAlertsTableData,
  setStoreInventoryAlertsTableConfigLoader,
  setStoreInventoryAlertsTableDataLoader,
  setStoreInventoryAlertsTableData,
  setForecastAlertsTableData,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-inventory-alerts-service";
import {
  getOrderAlertsTableConfiguration,
  getOrderAlertsTableData,
  setOrderAlertsTableConfigLoader,
  setOrderAlertsTableDataLoader,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-order-alerts-service";
import {
  getStoreForecastAlertsTableData,
  setStoreForecastAlertsTableLoader,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-forecast-alerts-service";
import {
  setInventoryDashboardAlertCount,
  setInventoryDashboardOMSAlertCount,
} from "modules/inventorysmart/services-inventorysmart/KPI-Matrix/kpi-services";
import { sortByNumber } from "../../inventorysmart-utility";
import { cloneDeep, isEmpty } from "lodash";

const InventoryDashboardAlerts = function (props) {
  const globalClasses = globalStyles();

  const [alertsTableColumnConfig, setAlertsTableColumnConfig] = useState([]);
  const [alertsTableData, setAlertsTableData] = useState([]);
  const [storeAlertsTableData, setStoreAlertsTableData] = useState([]);
  const [pinnedAlertsData, setPinnedAlertsData] = useState([]);

  const [orderAlertsColumnConfig, setOrderAlertsColumnConfig] = useState([]);
  const [orderAlertsTableData, setOrderAlertsTableData] = useState([]);

  useEffect(() => {
    let clonedAlertsTableData = cloneDeep(props.storeInventoryAlertsTableData);
    setStoreAlertsTableData(clonedAlertsTableData);
  }, [props.storeInventoryAlertsTableData]);

  useEffect(() => {
    let clonedAlertsTableData = cloneDeep(props.forecastAlertsTableData);
    setAlertsTableData(clonedAlertsTableData);
  }, [props.forecastAlertsTableData]);

  const fetchStoreInventoryAlertsTableConfig = async () => {
    try {
      props.setStoreInventoryAlertsTableConfigLoader(true);
      let response = await props.getStoreInventoryAlertsTableConfiguration();
      // const actionColumn = {
      //   ...STORE_INVENTORY_ALERT_ACTION_CONFIG[0],
      //   tc_code: response.data.data[0].tc_code,
      //   tc_mapping_code: response.data.data[0].tc_mapping_code,
      // };

      const config = [...response.data.data];
      let formattedColumns = agGridColumnFormatter(config);
      const updatedConfig = formattedColumns.map(column => {
        if (column.accessor=== 'action') {
            return {
                ...column,
                suppressMenu: true,
                lockPosition: "right",
            };
        }
        return column;
    });
        setAlertsTableColumnConfig(updatedConfig);
      
    } finally {
      props.setStoreInventoryAlertsTableConfigLoader(false);
    }
  };

  const fetchStoreInventoryAlertsData = async () => {
    try {
      props.setStoreInventoryAlertsTableDataLoader(true);
      const filters = {
        product_attributes: [],
        store_attributes: [],
      };

      const filterDCAttributes = [];

      let excludedFilterValues = props.excludedFilterValues
        ? props.excludedFilterValues
        : [];

      [...props.selectedFilters, ...excludedFilterValues].forEach((filter) => {
        if (
          filter.dimension.toLowerCase() === "product" &&
          filter?.values?.length > 0
        ) {
          filters.product_attributes.push(filter);
        } else if (
          filter.dimension.toLowerCase() === "store" &&
          filter?.values?.length > 0
        ) {
          filters.store_attributes.push(filter);
        } else if (
          filter.dimension.toLowerCase() === "dc" &&
          filter?.values?.length > 0
        ) {
          filterDCAttributes.push(filter);
        }
      });

      if (filterDCAttributes?.length > 0) {
        filters.dc_attributes = filterDCAttributes;
      }

      let body = {
        ...filters,
      };

      let response = await props.getStoreInventoryAlertsTableData(body);
      let alertsCount = response?.data?.data?.count;
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
        alerts = sortByNumber(alerts, ASC_ORDER, "order");
      }

      if (
        props?.inventorysmartScreenConfig?.dashboard?.drillDown
          .enableAlertsPinning
      ) {
        const topAlerts = alerts.splice(0, 2);

        setPinnedAlertsData(topAlerts);
      }

      let alertsCountPayload = {
        key: props.screen,
        data: alertsCount,
      };

      let hiddenTabs =
        props.inventorysmartScreenConfig?.inventorysmart_configuration
          ?.drillDown?.hiddenTabs || [];
      if (hiddenTabs.includes("new store setup")) {
        alerts = alerts.filter(
          (alert) => alert.name !== "New Store Auto Allocation"
        );
      }

      props.setStoreInventoryAlertsTableData(alerts);
      props.setInventoryDashboardAlertCount(alertsCountPayload);
    } finally {
      props.setStoreInventoryAlertsTableDataLoader(false);
    }
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

      let alertsCountPayload = {
        key: props.screen,
        data: alertsCount,
      };
      props.setForecastAlertsTableData(alerts);
      props.setInventoryDashboardAlertCount(alertsCountPayload);
    } finally {
      props.setStoreForecastAlertsTableLoader(false);
    }
  };

  const fetchOrderAlertsData = async () => {
    try {
      props.setOrderAlertsTableDataLoader(true);

      const filters = {
        filters: [],
        store_attributes: [],
      };

      props.selectedFilters.forEach((filter) => {
        if (filter.dimension === "Product" && filter?.values?.length > 0) {
          filters.filters.push(filter);
        }
      });
      let body = {
        ...filters,
      };
      props.setInventoryDashboardOMSAlertCount([]);
      props.setStoreInventoryAlertsTableData([]);
      props.setForecastAlertsTableData([])
      setOrderAlertsTableData([]);
      let response = await props.getOrderAlertsTableData(body);
      if (response.data.status) {
        let alertsCount = response?.data?.data?.alert_count_kpi;
        let alerts = response.data?.data?.alerts.map((alert, index) => {
          alert.disableAction = "article_count";
          alert.action = "Review Recommendation";
          alert.current_level = 0;
          alert.index = index;
          alert.is_selectable = alert.is_selected;
          delete alert.is_selected;
          return alert;
        });
        props.setStoreInventoryAlertsTableData(alerts);
        props.setInventoryDashboardOMSAlertCount(alertsCount);
        props.setOrderAlertsTableDataLoader(false);
        setOrderAlertsTableData(alerts);
      }
    } catch {
      props.setStoreInventoryAlertsTableData([]);
      props.setForecastAlertsTableData([]);
      setOrderAlertsTableData([]);
    }
  };

  const fetchOrderAlertsTableConfig = async () => {
    try {
      props.setOrderAlertsTableConfigLoader(true);
      let response = await props.getOrderAlertsTableConfiguration();
      const actionColumn = {
        ...STORE_INVENTORY_ALERT_ACTION_CONFIG[1],
        tc_code: response.data.data[1].tc_code,
        tc_mapping_code: response.data.data[1].tc_mapping_code,
        width: 300,
      };
      props.setOrderAlertsTableConfigLoader(false);
      const config = [...response.data.data, actionColumn];
      setOrderAlertsColumnConfig([...config]);
    } finally {
      props.setOrderAlertsTableConfigLoader(false);
    }
  };

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
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
        props.setOrderAlertsTableConfigLoader(true);
        fetchOrderAlertsTableConfig();
        fetchOrderAlertsData();
      } else {
        fetchStoreInventoryAlertsTableConfig();
        fetchForecastAlertsTableData();
      }
    }
  }, [props.selectedFilters, props?.reloadKpi]);

  //Hide Loader only when the Alerts Table Data is Present in ORDER TAB
  // useEffect(() => {
  //   if (
  //     props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER &&
  //     alertsTableData.length > 0
  //   )
  //     props.setOrderAlertsTableDataLoader(false);
  // }, [alertsTableData]);

  return (
    <div className={globalClasses.marginVertical1rem}>
      <CustomAccordion label="Alerts">
        {props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER && (
          <Loader
            loader={
              props.orderAlertsTableDataLoader ||
              orderAlertsTableData.length === 0
            }
            minHeight={"188px"}
          >
            {orderAlertsTableData.length !== 0 && (
              <OrderInventoryAlerts
                columnConfig={orderAlertsColumnConfig}
                data={orderAlertsTableData}
                canEdit={props.canEdit}
                canDelete={props.canDelete}
                canCreate={props.canCreate}
                setReloadKpi={props?.setReloadKpi}
              />
            )}
          </Loader>
        )}
        {props.screen != SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER && (
          <Loader
            loader={
              props.storeForecastAlertsTableLoader ||
              props.storeInventoryAlertsTableDataLoader ||
              props.storeInventoryAlertsTableConfigLoader ||
              props.orderInventoryAlertsTableConfigLoader
            }
            minHeight={"188px"}
          >
            {!props.storeForecastAlertsTableLoader &&
              !props.storeInventoryAlertsTableDataLoader &&
              !props.storeInventoryAlertsTableConfigLoader && (
                <StoreInventoryAlerts
                  screen={props.screen}
                  columnConfig={alertsTableColumnConfig}
                  data={props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY ?  storeAlertsTableData  : alertsTableData}
                  pinnedData={pinnedAlertsData}
                  canEdit={props.canEdit}
                  canDelete={props.canDelete}
                  canCreate={props.canCreate}
                />
              )}
          </Loader>
        )}
      </CustomAccordion>
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
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
    orderAlertsTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderAlertsService
        .orderAlertsTableConfigLoader,
    orderAlertsTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderAlertsService
        .orderAlertsTableDataLoader,
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
  };
};

const mapDispatchToProps = (dispatch) => ({
  setStoreInventoryAlertsTableConfigLoader: (payload) =>
    dispatch(setStoreInventoryAlertsTableConfigLoader(payload)),
  setStoreInventoryAlertsTableDataLoader: (payload) =>
    dispatch(setStoreInventoryAlertsTableDataLoader(payload)),
  getStoreInventoryAlertsTableConfiguration: (payload) =>
    dispatch(getStoreInventoryAlertsTableConfiguration(payload)),
  getStoreInventoryAlertsTableData: (payload) =>
    dispatch(getStoreInventoryAlertsTableData(payload)),
  getStoreForecastAlertsTableData: (payload) =>
    dispatch(getStoreForecastAlertsTableData(payload)),
  setStoreForecastAlertsTableLoader: (payload) =>
    dispatch(setStoreForecastAlertsTableLoader(payload)),
  setOrderAlertsTableConfigLoader: (payload) =>
    dispatch(setOrderAlertsTableConfigLoader(payload)),
  setOrderAlertsTableDataLoader: (payload) =>
    dispatch(setOrderAlertsTableDataLoader(payload)),
  getOrderAlertsTableConfiguration: (payload) =>
    dispatch(getOrderAlertsTableConfiguration(payload)),
  getOrderAlertsTableData: (payload) =>
    dispatch(getOrderAlertsTableData(payload)),
  setInventoryDashboardAlertCount: (payload) =>
    dispatch(setInventoryDashboardAlertCount(payload)),
  setInventoryDashboardOMSAlertCount: (payload) =>
    dispatch(setInventoryDashboardOMSAlertCount(payload)),
  setStoreInventoryAlertsTableData: (payload) =>
    dispatch(setStoreInventoryAlertsTableData(payload)),
  setForecastAlertsTableData: (payload) =>
    dispatch(setForecastAlertsTableData(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(InventoryDashboardAlerts);
