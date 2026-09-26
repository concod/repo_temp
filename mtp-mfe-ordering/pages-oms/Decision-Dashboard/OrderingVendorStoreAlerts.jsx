import React from "react";
import { useEffect, useState } from "react";
import { connect } from "react-redux";
import classNames from "classnames";
import { isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import { displaySnackMessages } from "modules/oms/utils-oms/oms-utility";
import {
  ERROR_MESSAGE,
  OMS_DASHBOARD_ALERT_ACTION_CONFIG,
  OMS_DASHBOARD_CACHE,
  OMS_ORDERING_DASHBOARD_TABS,
} from "modules/oms/constants-oms/stringConstants";
import {
  getVendorStoreAlertsTableConfiguration,
  getOrderAlertsTableData,
  setOrderAlertsTableConfigLoader,
  setOrderAlertsTableDataLoader,
  setOrderVendorStoreAlertCount,
  resetOrderingAlertsData,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-alerts-service";
import OrderingAlerts from "./Ordering-Alerts";
import KPIAlertsData from "./Ordering-KPI/component/KPIAlertsData";
import { clearActiveModuleCache } from "modules/inventorysmart/services-inventorysmart/active-module-common-service";

const OMSDashboardAlerts = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [alertsTableColumnConfig, setAlertsTableColumnConfig] = useState([]);
  const [alertsTableData, setAlertsTableData] = useState([]);
  const [reloadAlerts, setReloadAlerts] = useState(false);

  useEffect(() => {
    if (!isEmpty(props.selectedFilters)) {
      props.setOrderAlertsTableConfigLoader(true);
      fetchOrderAlertsTableConfig();
      fetchOrderAlertsData();
    }

    return () => {
      props.resetAlertsData();
      props.clearActiveModuleCache(OMS_DASHBOARD_CACHE);
    };
  }, []);

  useEffect(() => {
    if (reloadAlerts) {
      fetchOrderAlertsData();
      setReloadAlerts(false);
    }
  }, [reloadAlerts]);

  /**
   * Fetches order alerts data and updates the state with the fetched data.
   *
   * @async
   * @function fetchOrderAlertsData
   * @returns {Promise<void>}
   * @throws Will display an error message if the request fails.
   */
  const fetchOrderAlertsData = async () => {
    try {
      props.setOrderAlertsTableDataLoader(true);

      const filters = {
        filters: [],
        store_attributes: [],
      };

      props.selectedFilters.forEach((filter) => {
        if (
          (filter.dimension?.toLowerCase() || "") === "product" &&
          filter?.values?.length > 0
        ) {
          filters.filters.push(filter);
        } else if (
          (filter.dimension?.toLowerCase() || "") === "store" &&
          filter?.values?.length > 0
        ) {
          filters.store_attributes.push(filter);
        }
      });
      let body = {
        ...filters,
        vendor_store: true,
      };
      setAlertsTableData([]);
      let response = await props.getOrderAlertsTableData(body);

      if (response.data.status) {
        let alerts = response.data?.data?.alerts.map((alert, index) => {
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
          data: response?.data?.data?.alert_count_kpi,
        };
        setAlertsTableData(alerts);
        props.setOrderVendorStoreAlertCount(alertsCountPayload);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setOrderAlertsTableDataLoader(false);
    }
  };

  /**
   * Fetches the order alerts table configuration and updates the state with the configuration.
   *
   * @async
   * @function fetchOrderAlertsTableConfig
   * @returns {Promise<void>}
   *
   * @description
   * This function fetches the order alerts table configuration from the server, adds an action column to the configuration,
   * and updates the state with the new configuration. It also manages the loading state during the fetch operation.
   *
   * @throws Will always execute the finally block to set the loader state to false.
   */
  const fetchOrderAlertsTableConfig = async () => {
    try {
      props.setOrderAlertsTableConfigLoader(true);
      let response = await props.getAlertsTableConfiguration();

      const actionColumn = {
        ...OMS_DASHBOARD_ALERT_ACTION_CONFIG[1],
        tc_code: response.data.data[1].tc_code,
        tc_mapping_code: response.data.data[1].tc_mapping_code,
        width: 300,
      };
      props.setOrderAlertsTableConfigLoader(false);
      const config = [...response.data.data, actionColumn];
      setAlertsTableColumnConfig([...config]);
    } finally {
      props.setOrderAlertsTableConfigLoader(false);
    }
  };

  return (
    <>
      <div className={classNames(classes.alertsWrapper)}>
        <div className={globalClasses.flexRow}>
          {!props.orderAlertsTableDataLoader &&
            props?.orderVendorStoreAlertCount?.["data"]?.length > 0 && (
              <div className={globalClasses.marginBottom}>
                <KPIAlertsData
                  data={{
                    data: [...props.orderVendorStoreAlertCount?.["data"]],
                    label: "Alerts",
                  }}
                />
              </div>
            )}
        </div>

        {props.orderAlertsTableDataLoader ? (
          <Loader
            loader={props.orderAlertsTableDataLoader}
            minHeight={"188px"}
          />
        ) : (
          <OrderingAlerts
            screen={props.screen}
            columnConfig={alertsTableColumnConfig}
            data={alertsTableData}
            canEdit={props.canEdit}
            canDelete={props.canDelete}
            canCreate={props.canCreate}
            setReloadAlerts={setReloadAlerts}
            isCalledFromVendorStore={true}
          />
        )}
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
    orderAlertsTableDataLoader:
      store.omsReducer.omsOrderingAlertsService.orderAlertsTableDataLoader,
    orderVendorStoreAlertCount:
      store.omsReducer.omsOrderingAlertsService.orderVendorStoreAlertCount,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderAlertsTableConfigLoader: (payload) =>
    dispatch(setOrderAlertsTableConfigLoader(payload)),
  setOrderAlertsTableDataLoader: (payload) =>
    dispatch(setOrderAlertsTableDataLoader(payload)),
  getAlertsTableConfiguration: (payload) =>
    dispatch(getVendorStoreAlertsTableConfiguration(payload)),
  setOrderVendorStoreAlertCount: (payload) =>
    dispatch(setOrderVendorStoreAlertCount(payload)),
  getOrderAlertsTableData: (payload) =>
    dispatch(getOrderAlertsTableData(payload)),
  resetAlertsData: (payload) => dispatch(resetOrderingAlertsData(payload)),
  clearActiveModuleCache: (module) => dispatch(clearActiveModuleCache(module)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OMSDashboardAlerts);
