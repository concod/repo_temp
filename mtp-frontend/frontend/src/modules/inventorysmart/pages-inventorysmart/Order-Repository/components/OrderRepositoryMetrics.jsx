import classNames from "classnames";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import globalStyles from "core/Styles/globalStyles";
import { Grid, makeStyles, Typography } from "@mui/material";
import { EastOutlined, Inventory2Outlined } from "@mui/icons-material";
import { useEffect, useState } from "react";
import {
  getOrderStatusSummary,
  setOrderRepositoryOrderStatusSummaryLoader,
} from "modules/inventorysmart/services-inventorysmart/Order-Repository/order-repository-service";
import {
  ERROR_MESSAGE,
  TENANT_LOCALE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";

const OrderRepositoryMetrics = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [orderStatus, setOrderStatus] = useState(null);
  const [orderQuantity, setOrderQuantity] = useState(null);
  const [orderCost, setOrderCost] = useState(null);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  useEffect(() => {
    const fetchOrderStatusSummary = async () => {
      try {
        props.setOrderRepositoryOrderStatusSummaryLoader(true);

        let body = {
          filters: [...props.selectedFilters],
          // ...props.startEndDate,
        };
        const response = await props.getOrderStatusSummary(body);
        if (response.data.status) {
          props?.setReloadKpi(false);
          let orderSummaryData = response.data.data.order_status;
          setOrderStatus(formatKPINumbers(orderSummaryData[0]));
          setOrderQuantity(formatKPINumbers(orderSummaryData[1]));
          setOrderCost(formatKPINumbers(orderSummaryData[2]));
          props.setOrderRepositoryOrderStatusSummaryLoader(false);
        }
      } catch (error) {
        props.setOrderRepositoryOrderStatusSummaryLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchOrderStatusSummary();
  }, [props.selectedFilters, props?.reloadKpi]);

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
        value: parseInt(kpi.value),
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
    <Loader loader={props.orderRepositoryOrderStatusSummaryLoader}>
      <div>
        <Grid item display={"none"} justifyContent={"flex-end"}>
          <EastOutlined className={classes.scrollArrow} />
        </Grid>

        <Grid container columnSpacing={2}>
          <Grid item xs={12} md={4}>
            <div
              className={classNames(
                classes.kpiCardContainer,
                globalClasses.marginVertical1rem
              )}
            >
              <Grid
                container
                direction="row"
                justifyContent="space-between"
                alignItems="stretch"
                style={{ position: "relative" }}
                className={globalClasses.marginBottom}
              >
                <Grid
                  item
                  xs={12}
                  display={"flex"}
                  justifyContent={"flex-start"}
                  alignItems={"center"}
                >
                  <div className={classes.kpiItemIcon}>
                    <Inventory2Outlined />
                  </div>
                  <Typography variant={"h5"}>{orderStatus?.label}</Typography>
                </Grid>
              </Grid>

              <Grid
                container
                item
                xs={12}
                sx={{
                  "& hr": {
                    minHeight: "50%",
                    mx: "auto",
                    width: "2px",
                  },
                }}
              >
                {orderStatus?.values.map((order) => (
                  <Grid
                    item
                    xs={12}
                    className={classNames(
                      globalClasses.marginVertical,
                      globalClasses.flexRow,
                      globalClasses.layoutAlignBetweenCenter
                    )}
                    key={order.key}
                  >
                    <Typography
                      align="left"
                      className={classes.omsRepoSubLabel}
                    >
                      {order.label}
                    </Typography>
                    <Typography
                      align="right"
                      fontSize={"0.85rem"}
                      className={classes.kpiSubValue}
                    >
                      {order.value.toLocaleString(TENANT_LOCALE)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </div>
          </Grid>

          <Grid item xs={12} md={4}>
            <div
              className={classNames(
                classes.kpiCardContainer,
                globalClasses.marginVertical1rem
              )}
            >
              <Grid
                container
                direction="row"
                justifyContent="space-between"
                alignItems="stretch"
                style={{ position: "relative" }}
                className={globalClasses.marginBottom}
              >
                <Grid
                  item
                  xs={12}
                  display={"flex"}
                  justifyContent={"flex-start"}
                  alignItems={"center"}
                >
                  <div className={classes.kpiItemIcon}>
                    <Inventory2Outlined />
                  </div>
                  <Typography variant={"h5"}>{orderQuantity?.label}</Typography>
                </Grid>
              </Grid>

              <Grid
                container
                item
                xs={12}
                sx={{
                  "& hr": {
                    minHeight: "50%",
                    mx: "auto",
                    width: "2px",
                  },
                }}
              >
                {orderQuantity?.values.map((order) => (
                  <Grid
                    item
                    xs={12}
                    className={classNames(
                      globalClasses.marginVertical,
                      globalClasses.flexRow,
                      globalClasses.layoutAlignBetweenCenter
                    )}
                    key={order.key}
                  >
                    <Typography
                      align="left"
                      className={classes.omsRepoSubLabel}
                    >
                      {order.label}
                    </Typography>
                    <Typography align="right" className={classes.kpiSubValue}>
                      {order.value.toLocaleString(TENANT_LOCALE)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </div>
          </Grid>

          <Grid item xs={12} md={4}>
            <div
              className={classNames(
                classes.kpiCardContainer,
                globalClasses.marginVertical1rem
              )}
            >
              <Grid
                container
                direction="row"
                justifyContent="space-between"
                alignItems="stretch"
                style={{ position: "relative" }}
                className={globalClasses.marginBottom}
              >
                <Grid
                  item
                  xs={12}
                  display={"flex"}
                  justifyContent={"flex-start"}
                  alignItems={"center"}
                >
                  <div className={classes.kpiItemIcon}>
                    <Inventory2Outlined />
                  </div>
                  <Typography variant={"h5"}>{orderCost?.label}</Typography>
                </Grid>
              </Grid>

              <Grid
                container
                item
                xs={12}
                sx={{
                  "& hr": {
                    minHeight: "50%",
                    mx: "auto",
                    width: "2px",
                  },
                }}
              >
                {orderCost?.values.map((order) => (
                  <Grid
                    item
                    xs={12}
                    className={classNames(
                      globalClasses.marginVertical,
                      globalClasses.flexRow,
                      globalClasses.layoutAlignBetweenCenter
                    )}
                    key={order.key}
                  >
                    <Typography
                      align="left"
                      className={classes.omsRepoSubLabel}
                    >
                      {order.label}
                    </Typography>
                    <Typography align="right" className={classes.kpiSubValue}>
                      ${order.value.toLocaleString(TENANT_LOCALE)}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </div>
          </Grid>
        </Grid>
      </div>
    </Loader>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .selectedFilters,
    orderRepositoryOrderStatusSummaryLoader:
      store.inventorysmartReducer.inventorySmartOrderRepositoryService
        .orderRepositoryOrderStatusSummaryLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrderStatusSummary: (payload) => dispatch(getOrderStatusSummary(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderRepositoryOrderStatusSummaryLoader: (payload) =>
    dispatch(setOrderRepositoryOrderStatusSummaryLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderRepositoryMetrics);
