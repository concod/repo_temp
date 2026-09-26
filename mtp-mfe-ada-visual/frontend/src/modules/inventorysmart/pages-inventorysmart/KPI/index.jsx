import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import moment from "moment";
import { Grid, Typography } from "@mui/material";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import LoadingOverlay from "core/Utils/Loader/loader";
import InventoryDashboardForecastKPI from "./components/InventoryDashboardForecastKPI";
import InventoryDashboardStyleInventoryDetailsKPI from "./components/InventoryDashboardStyleInventoryDetailsKPI";
import InventoryDashboardStyleInventoryKPI from "./components/InventoryDashboardStyleInventoryKPI";
import {
  SCREENS_LIST_MAP,
  SCREENS_SUBCOMPONENT_LIST_MAP,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getInventoryDashboardForecastKPIData,
  getInventoryDashboardStoreInventoryKPIData,
  getInventoryDashboardKPIData,
  getInventoryDashboardOrderKPIData,
  setInventoryDashboardKPIConfigLoader,
  setInventoryDashboardKPIDataLoader,
  setInventoryDashboardForecastKPIDataLoader,
  setInventoryDashboardOrderKPIDataLoader,
  getInventoryDashboardOrderKPIAlertData,
} from "modules/inventorysmart/services-inventorysmart/KPI-Matrix/kpi-services";
import { addSnack } from "core/actions/snackbarActions";
import InventoryDashboardKPI from "./components/InventoryDashboardKPI";
import { EventBusy, EastOutlined } from "@mui/icons-material";
import DateRangeFilter from "./components/DateRangeFilter";
import { isEmpty } from "lodash";
import KPIAlertsData from "./components/KPIAlertsData";
import InventoryDashboardOrderKPI from "./components/InventoryDashboardOrderKPI";
import KPIReceiptsCost from "./components/KPIReceiptsCost";
import KPIReceiptUnitsOpenOrders from "./components/KPIReceiptUnitsOpenOrders";
import { formatStringDate } from "core/Utils/functions/utils";

const receiptUnitsOpenOrdersData = [
  { label: "Receipt Unit", units: "730 (U)", value: 54300 },
  { label: "Open Orders", units: "330 (U)", value: 35200 },
];

const KPI = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();

  const [kpiData, setKPIData] = useState(null);
  const [kpiAlertData, setKpiAlertData] = useState([]);

  const generateKPIFilterBody = (startDate, endDate) => {
    const filters = {
      product_attributes: [],
      store_attributes: [],
      other_attributes: [
        {
          attribute_name: "start_date",
          attribute_value: startDate,
        },
        {
          attribute_name: "end_date",
          attribute_value: endDate,
        },
      ],
    };

    props.selectedFilters.forEach((filter) => {
      if (filter.dimension === "Product" && filter?.values?.length > 0) {
        filters.product_attributes.push(filter);
      } else if (filter.dimension === "Store" && filter?.values?.length > 0) {
        filters.store_attributes.push(filter);
      }
    });

    return filters;
  };

  const formatForecastKPIDetails = (kpis) => {
    const kpiDetails = { ...kpis };

    kpiDetails.kpis = kpiDetails.kpis.map((kpiItem) => {
      kpiItem.ia_forecast_value_delta =
        kpiItem.ia_forecast_value - kpiItem.value;
      kpiItem.ia_forecast_value_abs_delta = Math.abs(
        kpiItem.ia_forecast_value_delta
      );
      kpiItem.ia_adj_forecast_value_delta =
        kpiItem.ia_adj_forecast_value - kpiItem.value;
      kpiItem.ia_adj_forecast_value_abs_delta = Math.abs(
        kpiItem.ia_adj_forecast_value_delta
      );

      if (kpiItem.value) {
        kpiItem.ia_forecast_value_delta_percentage = parseFloat(
          (kpiItem.ia_forecast_value_delta / kpiItem.value) * 100
        ).toFixed(2);
        kpiItem.ia_adj_forecast_value_delta_percentage = parseFloat(
          (kpiItem.ia_adj_forecast_value_delta / kpiItem.value) * 100
        ).toFixed(2);
      }
      return kpiItem;
    });

    return kpiDetails;
  };

  const formatStoreInventoryKPIDetails = (kpis) => {
    const kpiDetails = { ...kpis };

    kpiDetails.kpis = kpiDetails.kpis.map((kpiItem) => {
      if (kpiItem.value && kpiItem.ly_value) {
        kpiItem.value_delta = Math.abs(kpiItem.value - kpiItem.ly_value);
        kpiItem.value_delta_percentage = parseFloat(
          (kpiItem.value_delta / kpiItem.ly_value) * 100
        ).toFixed(2);
      }
      return kpiItem;
    });

    delete kpiDetails.alerts;
    return kpiDetails;
  };

  const formatOrderInventoryKPIDetails = (kpis) => {
    let kpiDetailsForOrders = [];
    let kpiDetailsForNotOrders = [];
    kpis.forEach((kpi) => {
      if (kpi.type === "kpi_details_orders") kpiDetailsForOrders.push(kpi);
      else kpiDetailsForNotOrders.push(kpi);
    });
    let kpiDetailsForOrdersObject = {
      type: "kpi_details_orders",
      kpis: kpiDetailsForOrders,
    };
    let kpiDetailData = {
      kpis: [kpiDetailsForOrdersObject, ...kpiDetailsForNotOrders],
    };
    return kpiDetailData;
  };

  /** Fetch KPI Data for Store Inventory Tab */
  const fetchInventoryDashboardStoreInventoryKPIData = async () => {
    try {
      const startDate = formatStringDate(
        props?.selectedDates?.fiscalInfoStartDate?.calendar_week_start_date,
        true,
        true
      ).format("YYYY-MM-DD");
      const endDate = formatStringDate(
        props?.selectedDates?.fiscalInfoEndDate?.calendar_week_start_date,
        true,
        true
      )
        .endOf("week")
        .format("YYYY-MM-DD");

      props.setInventoryDashboardKPIDataLoader(true);

      const filters = generateKPIFilterBody(startDate, endDate);

      let body = {
        ...filters,
      };

      let response = await props.getInventoryDashboardStoreInventoryKPIData(
        body
      );

      let kpiDetails = response.data.data;

      if (
        props.inventorysmartScreenConfig?.dashboard?.subComponent !==
        SCREENS_SUBCOMPONENT_LIST_MAP.INVENTORYSMART_DASHBOARD_WITH_FORECAST_AND_STORE_INVENTORY
      ) {
        kpiDetails = formatStoreInventoryKPIDetails(kpiDetails);
      }

      setKPIData(kpiDetails);
    } finally {
      props.setInventoryDashboardKPIDataLoader(false);
    }
  };

  /** Fetch KPI Data for Forecast Tab */
  const fetchInventoryDashboardForecastKPIData = async () => {
    try {
      const startDate = moment().subtract(8, "weeks").format("YYYY-MM-DD");
      const endDate = moment().format("YYYY-MM-DD");

      props.setInventoryDashboardForecastKPIDataLoader(true);

      const filters = generateKPIFilterBody(startDate, endDate);

      let body = {
        ...filters,
      };

      let response = await props.getInventoryDashboardForecastKPIData(body);
      const kpiDetails = formatForecastKPIDetails(response.data.data);

      setKPIData(kpiDetails);
    } finally {
      props.setInventoryDashboardForecastKPIDataLoader(false);
    }
  };

  /** Fetch KPI Data for Order Inventory Tab */
  const fetchInventoryDashboardOrderInventoryKPIData = async () => {
    try {
      const startDate = moment().subtract(8, "weeks").format("YYYY-MM-DD");
      const endDate = moment().format("YYYY-MM-DD");
      const filters = generateKPIFilterBody(startDate, endDate);
      props.setInventoryDashboardOrderKPIDataLoader(true);
      let kpiBody = {
        ...filters,
      };

      let alertFilterArray = [];
      props.selectedFilters.forEach((filter) => {
        if (filter.dimension === "Product" && filter?.values?.length > 0) {
          alertFilterArray.push(filter);
        }
      });
      let alertBody = {
        filters: [...alertFilterArray],
      };
      let response = await props.getInventoryDashboardOrderKPIData(kpiBody);

      // const responses = await Promise.all([
      //   props
      //     .getInventoryDashboardOrderKPIData(kpiBody)
      //     .catch((error) => error),
      //   // props
      //   //   .getInventoryDashboardOrderKPIAlertData(alertBody)
      //   //   .catch((error) => error),
      // ]);

      if (response.data.status) {
        props.setInventoryDashboardOrderKPIDataLoader(false);
        let kpiOrderDetails = formatOrderInventoryKPIDetails(
          response.data.data.kpis
        );
        setKPIData(kpiOrderDetails);
      }

      //KPI Alert
      // let alertResponse = await props.getInventoryDashboardOrderKPIAlertData(alertBody);
      // if (alertResponse.data.status) {
      //   // props.setInventoryDashboardOrderKPIDataLoader(false);
      //   setKpiAlertData([...alertResponse.data.data.data.kpis]);
      // }
    } finally {
      props.setInventoryDashboardOrderKPIDataLoader(false);
    }
  };

  const fetchKPIData = () => {
    if (
      props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY
    ) {
      fetchInventoryDashboardStoreInventoryKPIData();
    } else if (
      props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_FORECAST
    ) {
      fetchInventoryDashboardForecastKPIData();
    } else if (
      props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER
    ) {
      props?.setReloadKpi(false);
      fetchInventoryDashboardOrderInventoryKPIData();
    } else {
      fetchInventoryDashboardStoreInventoryKPIData();
    }
  };

  useEffect(() => {
    !isEmpty(props.selectedFilters) &&
      (!props.showDateFilter ||
        (props.showDateFilter &&
          props.selectedDates?.fiscalInfoStartDate &&
          props.selectedDates.fiscalInfoEndDate)) &&
      fetchKPIData();
  }, [props.selectedFilters, props.selectedDates, props?.reloadKpi]);

  useEffect(() => {
    return () => {};
  }, []);

  //Hide Loader only when the KPI Data is Present in ORDER TAB
  // useEffect(() => {
  //   if (
  //     props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER &&
  //     kpiData?.kpis?.length > 0
  //   )
  //     props.setInventoryDashboardOrderKPIDataLoader(false);
  // }, [kpiData]);

  return (
    <LoadingOverlay
      loader={
        props.screen == SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER
          ? props?.inventoryDashboardOrderKPIDataLoader
          : props.inventoryDashboardKPIDataLoader ||
            props.inventoryDashboardForecastKPIDataLoader ||
            props.inventorysmartDatesLoader
      }
      minHeight={"180px"}
    >
      <div className={classes.kpiCard}>
        {props.screen !== SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER && (
          <Grid container columnSpacing={2}>
            {props.showDateFilter && (
              <Grid
                item
                xs={12}
                display={"flex"}
                justifyContent={"space-between"}
                alignItems={"center"}
              >
                <Grid item display={"flex"} alignItems={"center"}>
                  <DateRangeFilter displayRow={true} />
                </Grid>
                <Grid item display={"flex"} alignItems={"center"}>
                  <EventBusy className={globalClasses.marginHorizontal} />
                  <Typography variant="body">
                    Date range not applicable
                  </Typography>
                </Grid>
              </Grid>
            )}
          </Grid>
        )}

        {(props.inventorysmartScreenConfig?.dashboard?.drillDown
          ?.store_inventory_kpis_short_width
          ? kpiData?.kpis?.length > 6
          : kpiData?.kpis?.length > 3) && (
          <Grid item display={"flex"} justifyContent={"flex-end"}>
            <EastOutlined className={classes.scrollArrow} />
          </Grid>
        )}

        <Grid
          container
          columnSpacing={2}
          className={
            props.screen ===
              SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_STORE_INVENTORY &&
            classes.kpiContainerOverflow
          }
        >
          {kpiData?.kpis?.map((kpi) =>
            /**Switching KPI Cards on the basis of their type & different details will be visible on different type */
            kpi.type === "kpi_details_orders" ? (
              <Grid
                item
                xs={12}
                md={6}
                key={kpi.key}
                display={"flex"}
                alignItems={"stretch"}
              >
                <InventoryDashboardOrderKPI kpi={kpi} />
              </Grid>
            ) : kpi.type === "kpi_details" ? (
              <Grid
                item
                xs={
                  props.inventorysmartScreenConfig?.dashboard?.drillDown
                    ?.store_inventory_kpis_short_width
                    ? 2
                    : 3
                }
                key={kpi.key}
              >
                <InventoryDashboardKPI kpi={kpi} />
              </Grid>
            ) : kpi.type === "kpi_details_right_aligned" ? (
              <Grid item xs={12} md={4}>
                <InventoryDashboardForecastKPI kpi={kpi} />
              </Grid>
            ) : kpi.type === "kpi_details_cost" ? (
              <Grid item xs={12} md={3}>
                <InventoryDashboardStyleInventoryKPI
                  kpi={kpi}
                  isDateHidden={
                    props.screen ===
                    SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER
                  }
                />
              </Grid>
            ) : (
              <Grid item xs={12} md={3}>
                <InventoryDashboardStyleInventoryDetailsKPI kpi={kpi} />
              </Grid>
            )
          )}
        </Grid>

        {props.screen !== SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER &&
          !props.storeForecastAlertsTableLoader &&
          !props.storeInventoryAlertsTableDataLoader &&
          props.inventorysmartScreenConfig?.dashboard?.drillDown.hidden.indexOf(
            "kpi_alerts_count"
          ) === -1 &&
          props?.inventoryDashboardAlertCount?.[props.screen]?.length > 0 && (
            <KPIAlertsData
              alerts={props.inventoryDashboardAlertCount?.[props.screen]}
            />
          )}

        {/* For OMS */}
        {props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER &&
          !props?.inventoryDashboardOrderKPIDataLoader &&
          props?.inventoryDashboardOMSAlertCount?.length > 0 && (
            <KPIAlertsData alerts={props.inventoryDashboardOMSAlertCount} />
          )}

        {/* For OMS */}
        {props.screen === SCREENS_LIST_MAP.INVENTORYSMART_DASHBOARD_ORDER &&
          props.showDateFilter && (
            <>
              <Grid container columnSpacing={2}>
                <Grid
                  item
                  xs={12}
                  display={"flex"}
                  justifyContent={"space-between"}
                  alignItems={"center"}
                >
                  <Grid item display={"flex"} alignItems={"center"}>
                    <DateRangeFilter displayRow={true} />
                  </Grid>
                  <Grid item display={"flex"} alignItems={"center"}>
                    <EventBusy className={globalClasses.marginHorizontal} />
                    <Typography variant="body">
                      Date range not applicable
                    </Typography>
                  </Grid>
                </Grid>
              </Grid>

              <Grid container columnSpacing={2}>
                <Grid
                  item
                  xs={12}
                  md={4}
                  display={"flex"}
                  alignItems={"stretch"}
                >
                  <KPIReceiptsCost
                    title="Planned Receipts"
                    costValue={345000}
                    label="Cost"
                  />
                </Grid>
                <Grid
                  item
                  xs={12}
                  md={4}
                  display={"flex"}
                  alignItems={"stretch"}
                >
                  <KPIReceiptUnitsOpenOrders
                    alerts={receiptUnitsOpenOrdersData}
                  />
                </Grid>

                <Grid
                  item
                  xs={12}
                  md={4}
                  display={"flex"}
                  alignItems={"stretch"}
                >
                  <KPIReceiptsCost
                    title="Open to Buy Receipts"
                    costValue={255000}
                    label="Cost"
                  />
                </Grid>
              </Grid>
            </>
          )}
      </div>
    </LoadingOverlay>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    selectedDates:
      store.inventorysmartReducer.inventorySmartDashboardService.selectedDates,
    inventoryDashboardAlertCount:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardAlertCount,
    inventoryDashboardOMSAlertCount:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardOMSAlertCount,
    inventorysmartDatesLoader:
      store.inventorysmartReducer.inventorySmartDashboardService
        .inventorysmartDatesLoader,
    inventoryDashboardKPIConfigLoader:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardKPIConfigLoader,
    inventoryDashboardKPIDataLoader:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardKPIDataLoader,
    inventoryDashboardForecastKPIDataLoader:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardForecastKPIDataLoader,
    storeForecastAlertsTableLoader:
      store.inventorysmartReducer.inventorySmartStoreForecastAlerts
        .storeForecastAlertsTableLoader,
    storeInventoryAlertsTableDataLoader:
      store.inventorysmartReducer.inventorySmartStoreInventoryAlertsService
        .storeInventoryAlertsTableDataLoader,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    inventoryDashboardOrderKPIDataLoader:
      store.inventorysmartReducer.inventorySmartKPIService
        .inventoryDashboardOrderKPIDataLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventoryDashboardKPIConfigLoader: (payload) =>
    dispatch(setInventoryDashboardKPIConfigLoader(payload)),
  setInventoryDashboardKPIDataLoader: (payload) =>
    dispatch(setInventoryDashboardKPIDataLoader(payload)),
  setInventoryDashboardForecastKPIDataLoader: (payload) =>
    dispatch(setInventoryDashboardForecastKPIDataLoader(payload)),
  setInventoryDashboardOrderKPIDataLoader: (payload) =>
    dispatch(setInventoryDashboardOrderKPIDataLoader(payload)),
  getInventoryDashboardKPIData: (payload) =>
    dispatch(getInventoryDashboardKPIData(payload)),
  getInventoryDashboardForecastKPIData: (payload) =>
    dispatch(getInventoryDashboardForecastKPIData(payload)),
  getInventoryDashboardStoreInventoryKPIData: (payload) =>
    dispatch(getInventoryDashboardStoreInventoryKPIData(payload)),
  getInventoryDashboardOrderKPIData: (payload) =>
    dispatch(getInventoryDashboardOrderKPIData(payload)),
  getInventoryDashboardOrderKPIAlertData: (payload) =>
    dispatch(getInventoryDashboardOrderKPIAlertData(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(KPI);
