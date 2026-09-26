import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { isEmpty } from "lodash";
import classNames from "classnames";
import { Button } from "impact-ui-v3";
import { useNavigate } from "react-router-dom-v5-compat";
import { useStyles } from "modules/oms/styles-oms/orderingCustomStyles";
import { displaySnackMessages } from "modules/oms/utils-oms/oms-utility";
import {
  ERROR_MESSAGE,
  OMS_DASHBOARD_ALERT_ACTION_CONFIG,
  OMS_DASHBOARD_CACHE,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";
import {
  getOrderAlertsTableConfiguration,
  getOrderAlertsTableData,
  setOrderAlertsTableConfigLoader,
  setOrderAlertsTableDataLoader,
  setOrderVendorDCAlertCount,
  setOffCycleOrderAlertCount,
  setOffCycleOrderAlertDataLoader,
  getOffCycleOrderAlertData,
  resetOrderingAlertsData,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-alerts-service";
import OrderAlertsDeepDive from "./Ordering-Alerts/components/OrderAlertsDeepDive";
import OrderingAlerts from "./Ordering-Alerts";
import KPIAlertsData from "./Ordering-KPI/component/KPIAlertsData";
import { OFF_CYCLE_ORDER_VIEW_DRAFTS } from "modules/oms/constants-oms/routeConstants";
import { clearActiveModuleCache } from "modules/inventorysmart/services-inventorysmart/active-module-common-service";

const OMSDashboardAlerts = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const navigate = useNavigate();

  const [alertsTableColumnConfig, setAlertsTableColumnConfig] = useState([]);
  const [alertsTableData, setAlertsTableData] = useState([]);
  const [reloadAlerts, setReloadAlerts] = useState(false);

  const IS_OFF_CYCLE_ORDER_ENABLED =
    props?.offCycleOrderScreenConfig?.is_enabled;

  const hasTableConfigRef = useRef(false);

  useEffect(() => {
    return () => {
      hasTableConfigRef.current = false;
      props.resetAlertsData();
      props.clearActiveModuleCache(OMS_DASHBOARD_CACHE);
    };
  }, [props.resetAlertsData, props.clearActiveModuleCache]);

  useEffect(() => {
    if (isEmpty(props.selectedFilters)) {
      return undefined;
    }

    let cancelled = false;

    const load = async () => {
      try {
        if (!hasTableConfigRef.current) {
          await fetchOrderAlertsTableConfig();
          if (cancelled) return;
          hasTableConfigRef.current = true;
        }
        await fetchOrderAlertsData();
        if (cancelled) return;
        if (IS_OFF_CYCLE_ORDER_ENABLED) {
          await fetchOffCycleOrderAlertData();
        }
      } catch {}
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [props.selectedFilters]);

  useEffect(() => {
    if (reloadAlerts) {
      fetchOrderAlertsData();
      if (IS_OFF_CYCLE_ORDER_ENABLED) {
        fetchOffCycleOrderAlertData();
      }
      setReloadAlerts(false);
    }
  }, [reloadAlerts]);

  const getFiltersForAlerts = () => {
    const filters = {
      filters: [],
      store_attributes: [],
    };

    (props.selectedFilters || []).forEach((filter) => {
      const dim = (filter.dimension || "").toLowerCase();
      if (dim === "product" && filter?.values?.length > 0) {
        filters.filters.push(filter);
      } else if (dim === "store" && filter?.values?.length > 0) {
        filters.store_attributes.push(filter);
      } else if (dim === "dc" && filter?.values?.length > 0) {
        filters.filters.push(filter);
      }
    });

    return filters;
  };

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

      const filters = getFiltersForAlerts();
      let body = {
        ...filters,
      };
      setAlertsTableData([]);
      let response = await props.getOrderAlertsTableData(
        body,
        props.dashboardApiFlags
      );

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
        props.setOrderVendorDCAlertCount(alertsCountPayload);
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
      let response = await props.getOrderAlertsTableConfiguration();

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

  const fetchOffCycleOrderAlertData = async () => {
    try {
      props.setOffCycleOrderAlertDataLoader(true);
      const filters = getFiltersForAlerts();
      let body = {
        ...filters,
        ...tableConfigurationMetaData,
      };
      let response = await props.getOffCycleOrderAlertData(
        body,
        props.dashboardApiFlags
      );
      if (response.data.status) {
        const structuredData = {
          draft_count_kpi: [
            {
              label: "Manual Off Cycle Drafts",
              value: response?.data?.grand_total?.manual_total || 0,
            },
            {
              label: "Expedite Off Cycle Drafts",
              value: response?.data?.grand_total?.expedite_total || 0,
            },
          ],
        };
        props.setOffCycleOrderAlertCount({
          key: props.screen,
          data: structuredData?.draft_count_kpi || [],
          isViewDetailsButtonEnabled:
            response?.data?.grand_total?.manual_total > 0 ||
            response?.data?.grand_total?.expedite_total > 0,
        });
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setOffCycleOrderAlertDataLoader(false);
    }
  };

  const openOffCycleOrderViewDrafts = () => {
    navigate(OFF_CYCLE_ORDER_VIEW_DRAFTS, {
      state: {
        filters: getFiltersForAlerts(),
      },
    });
  };

  return (
    <>
      {IS_OFF_CYCLE_ORDER_ENABLED && (
        <div className={classNames(classes.alertsWrapper)}>
          <div className={globalClasses.flexRow}>
            {!props.offCycleOrderAlertDataLoader &&
              props?.offCycleOrderAlertCount?.["data"]?.length > 0 && (
                <div
                  className={`${globalClasses.flexAlignBetweenCenter} ${globalClasses.fullWidth}`}
                >
                  <KPIAlertsData
                    data={{
                      data: [...props.offCycleOrderAlertCount?.["data"]],
                      label: "Pending Off Cycle Order Draft",
                      type: "Drafts",
                    }}
                  />

                  <div>
                    <Button
                      variant="tertiary"
                      size="large"
                      disabled={
                        !props?.offCycleOrderAlertCount?.[
                          "isViewDetailsButtonEnabled"
                        ]
                      }
                      onClick={() => openOffCycleOrderViewDrafts()}
                    >
                      {`View Details >`}
                    </Button>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}

      <div className={classNames(classes.alertsWrapper)}>
        <div className={globalClasses.flexRow}>
          {!props.orderAlertsTableDataLoader &&
            props?.orderVendorDCAlertCount?.["data"]?.length > 0 && (
              <div className={globalClasses.marginBottom}>
                <KPIAlertsData
                  data={{
                    data: [...props.orderVendorDCAlertCount?.["data"]],
                    label: "Alerts",
                    type: "Alerts",
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
            dashboardApiFlags={props.dashboardApiFlags}
          />
        )}
      </div>

      <OrderAlertsDeepDive dashboardApiFlags={props.dashboardApiFlags} />
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
    orderAlertsTableDataLoader:
      store.omsReducer.omsOrderingAlertsService.orderAlertsTableDataLoader,
    orderVendorDCAlertCount:
      store.omsReducer.omsOrderingAlertsService.orderVendorDCAlertCount,
    offCycleOrderScreenConfig:
      store.omsReducer.offCycleOrderService.offCycleOrderConfiguration,
    offCycleOrderAlertCount:
      store.omsReducer.omsOrderingAlertsService.offCycleOrderAlertCount,
    offCycleOrderAlertDataLoader:
      store.omsReducer.omsOrderingAlertsService.offCycleOrderAlertDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setOrderAlertsTableConfigLoader: (payload) =>
    dispatch(setOrderAlertsTableConfigLoader(payload)),
  setOrderAlertsTableDataLoader: (payload) =>
    dispatch(setOrderAlertsTableDataLoader(payload)),
  getOrderAlertsTableConfiguration: (payload) =>
    dispatch(getOrderAlertsTableConfiguration(payload)),
  setOrderVendorDCAlertCount: (payload) =>
    dispatch(setOrderVendorDCAlertCount(payload)),
  getOrderAlertsTableData: (payload, apiFlags) =>
    dispatch(getOrderAlertsTableData(payload, apiFlags)),
  setOffCycleOrderAlertCount: (payload) =>
    dispatch(setOffCycleOrderAlertCount(payload)),
  setOffCycleOrderAlertDataLoader: (payload) =>
    dispatch(setOffCycleOrderAlertDataLoader(payload)),
  getOffCycleOrderAlertData: (payload, apiFlags) =>
    dispatch(getOffCycleOrderAlertData(payload, apiFlags)),
  resetAlertsData: (payload) => dispatch(resetOrderingAlertsData(payload)),
  clearActiveModuleCache: (module) => dispatch(clearActiveModuleCache(module)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OMSDashboardAlerts);
