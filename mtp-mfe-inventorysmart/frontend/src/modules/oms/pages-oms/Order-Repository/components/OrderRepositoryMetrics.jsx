import { Grid } from "@mui/material";
import { useEffect, useState } from "react";
import { cloneDeep } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  tableArticleFilter,
} from "modules/oms/constants-oms/stringConstants";
import MetricCard from "./MetricCard";
import {
  getOrderStatusSummaryForVendorDC,
  getOrderStatusSummaryForVendorStore,
  setOrderRepositoryOrderStatusSummaryLoader,
} from "modules/oms/services-oms/Order-Repository/order-repository-service";
import OrderProgressCard from "./OrderProgressCard";

const OrderRepositoryMetrics = (props) => {
  const [orderMetrics, setOrderMetrics] = useState([]);

  const IS_COST_SHOWN_IN_DECIMALS =
    props?.screenConfig?.isCostDisplayedInDecimals;
  const COST_ROUNDING_PRECISION =
    props?.screenConfig?.cost_rounding_precision || 2;
  const SHOW_3D_ICON_METRIC_CARD =
    props?.screenConfig?.show_3d_icon_metric_card || false;

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  const buildOrderStatusSummaryBody = () => {
    if (
      props.syncOrderStatusSummaryWithRepoSummary &&
      props.orderRepoSummaryApiPayload
    ) {
      return cloneDeep(props.orderRepoSummaryApiPayload);
    }
    if (props.syncOrderStatusSummaryWithRepoSummary) {
      return null;
    }
    if (props.isRedirectedFromDifferentPage) {
      var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
      skuFilter.values = [...props?.OrderRepoSelectedSku];
    }
    return {
      filters: props.isRedirectedFromDifferentPage
        ? [...props.selectedFilters, skuFilter]
        : [...props.selectedFilters],
    };
  };

  const fetchOrderStatusSummary = async () => {
    const body = buildOrderStatusSummaryBody();
    if (!body) {
      return;
    }
    try {
      props.setOrderRepositoryOrderStatusSummaryLoader(true);
      let response = {};
      if (props?.isCalledFromVendorStore) {
        response = await props.getOrderStatusSummaryForVendorStore(body);
      } else {
        response = await props.getOrderStatusSummaryForVendorDC(body);
      }
      if (response?.data?.status) {
        props?.setReloadKpi(false);
        let orderSummaryData = response.data.data.order_status;
        let formattedOrderMetrics = [];
        formattedOrderMetrics = orderSummaryData.map((resp) => {
          const formattedData = formatKPINumbers(resp);
          return cloneDeep(formattedData);
        });
        setOrderMetrics(formattedOrderMetrics);
        props.setOrderRepositoryOrderStatusSummaryLoader(false);
      }
    } catch (error) {
      props.setOrderRepositoryOrderStatusSummaryLoader(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  useEffect(() => {
    if (props.syncOrderStatusSummaryWithRepoSummary) {
      return;
    }
    if (props.selectedFilters?.length) {
      fetchOrderStatusSummary();
    }
  }, [props.selectedFilters, props.syncOrderStatusSummaryWithRepoSummary]);

  useEffect(() => {
    if (
      props.syncOrderStatusSummaryWithRepoSummary &&
      props.orderRepoSummaryApiPayload
    ) {
      fetchOrderStatusSummary();
    }
  }, [
    props.syncOrderStatusSummaryWithRepoSummary,
    props.orderRepoSummaryApiPayload,
  ]);

  useEffect(() => {
    if (!props?.reloadKpi) {
      return;
    }
    const canFetch = props.syncOrderStatusSummaryWithRepoSummary
      ? !!props.orderRepoSummaryApiPayload
      : props.selectedFilters?.length > 0;
    if (canFetch) {
      fetchOrderStatusSummary();
    } else if (
      props.syncOrderStatusSummaryWithRepoSummary &&
      !props.orderRepoSummaryApiPayload
    ) {
      props?.setReloadKpi(false);
    }
  }, [props?.reloadKpi]);

  //Formatting the Int Fields
  const numberFormatter = (num, decimalPoints) => {
    const lookup = [
      { value: 1, symbol: "" },
      { value: 1e3, symbol: "k" },
      { value: 1e6, symbol: "M" },
      { value: 1e9, symbol: "G" },
      { value: 1e12, symbol: "T" },
      { value: 1e15, symbol: "P" },
      { value: 1e18, symbol: "E" },
    ];
    const rx = /\.0+$|(\.[0-9]*[1-9])0+$/;
    if (decimalPoints === undefined) decimalPoints = 0;
    var item = lookup
      .slice()
      .reverse()
      .find(function (item) {
        return num >= item.value;
      });
    return item
      ? (num / item.value).toFixed(decimalPoints).replace(rx, "$1") +
          item.symbol
      : "0";
  };

  const formatKPINumbers = (kpiArray) => {
    let values = [];
    kpiArray.values.forEach((kpi) => {
      let kpiValues = {
        label: kpi.label,
        value: kpi.value ?? 0,
        key: `${kpiArray.label}_${kpi.label}`,
        //value: numberFormatter(kpi.value, 0),
      };
      values.push(kpiValues);
    });

    let kpiObject = {
      label: kpiArray.label,
      values: values,
    };
    return kpiObject;
  };

  return (
    <Loader
      showSkeleton={true}
      loader={props.orderRepositoryOrderStatusSummaryLoader}
    >
      {SHOW_3D_ICON_METRIC_CARD ? (
        <>
          {/* 3D icon Metric Card */}
          <Grid container spacing={3}>
            {orderMetrics.map((metric, index) => (
              <Grid
                item
                xs={12}
                md={12 / orderMetrics.length}
                key={metric.label}
              >
                <MetricCard
                  IS_COST_SHOWN_IN_DECIMALS={IS_COST_SHOWN_IN_DECIMALS}
                  COST_ROUNDING_PRECISION={COST_ROUNDING_PRECISION}
                  type={
                    metric.label.toLowerCase().includes("status")
                      ? "status"
                      : metric.label.toLowerCase().includes("quantity")
                      ? "quantity"
                      : "cost"
                  }
                  data={metric}
                  key={metric.label}
                />
              </Grid>
            ))}
          </Grid>
        </>
      ) : (
        <>
          {/* Progress Bar Metric Card */}
          {orderMetrics.length > 0 && (
            <div style={{ marginBottom: "16px" }}>
              <OrderProgressCard
                IS_COST_SHOWN_IN_DECIMALS={IS_COST_SHOWN_IN_DECIMALS}
                COST_ROUNDING_PRECISION={COST_ROUNDING_PRECISION}
                orderMetrics={orderMetrics}
              />
            </div>
          )}
        </>
      )}
    </Loader>
  );
};

const mapStateToProps = (store) => {
  return {
    OrderRepoSelectedSku: store.omsReducer?.orderRepositoryService.selectedSku,
    selectedFilters: store.omsReducer?.orderRepositoryService.selectedFilters,
    orderRepositoryOrderStatusSummaryLoader:
      store.omsReducer?.orderRepositoryService
        .orderRepositoryOrderStatusSummaryLoader,
    orderRepoSummaryApiPayload:
      store.omsReducer?.orderRepositoryService.orderRepoSummaryApiPayload,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.order_repository,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderStatusSummaryForVendorDC: (payload) =>
    dispatch(getOrderStatusSummaryForVendorDC(payload)),
  getOrderStatusSummaryForVendorStore: (payload) =>
    dispatch(getOrderStatusSummaryForVendorStore(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderRepositoryOrderStatusSummaryLoader: (payload) =>
    dispatch(setOrderRepositoryOrderStatusSummaryLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderRepositoryMetrics);
