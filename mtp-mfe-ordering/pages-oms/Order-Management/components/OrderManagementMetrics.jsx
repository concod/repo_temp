import classNames from "classnames";
import { useEffect, useState, useRef } from "react";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { Grid, Tooltip, Typography } from "@mui/material";
import {
  ERROR_MESSAGE,
  TENANT_LOCALE,
  tableArticleFilter,
} from "modules/oms/constants-oms/stringConstants";
import {
  getOrdersSummaryByGrades,
  setOrderManagementKpiSummaryLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { addSnack } from "core/actions/snackbarActions";
import { connect } from "react-redux";
import Loader from "core/Utils/Loader/loader";

const ASSET_MEMO_LABEL = ["Asset", "Memo"];
const TOTAL_LABEL = "Total";

const OrderManagementMetrics = (props) => {
  const classes = useStyles();

  const [gradeLength, setGradeLength] = useState(0);
  const [gradeDivSize, setGradeDivSize] = useState(3);
  const [gradesByOrder, setGradesByOrder] = useState([]);
  const [kpiRowArray, setKpiRowArray] = useState([]);
  const [isError, setIsError] = useState(false);
  const selectedSku = useRef([]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  /*
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

  const [gradesTitleByOrder, setGradesTitleByOrder] = useState([]);
  //Formatting KPI Values
  const formatKPINumbers = (kpiArray, kpiType) => {
    let values = [];
    let gradeLabels = [];

    if (kpiArray.values.length === 0) {
      setIsError(true);
      return;
    }

    let total_asset_unit = 0;
    let total_asset_cost = 0;
    let total_memo_unit = 0;
    let total_memo_cost = 0;

    kpiArray.values.forEach((grade, index) => {
      let asset_units = 0;
      let asset_cost = 0;
      let memo_units = 0;
      let memo_cost = 0;
      let gradeValues = {};

      if (grade.value.length === 0) {
        gradeValues = {
          asset_unit: 0,
          asset_cost: 0,
          memo_unit: 0,
          memo_cost: 0,
          key: `${kpiType}_${index}`,
        };
      } else {
        grade.value.forEach((element) => {
          if (element.label === ASSET_MEMO_LABEL[0]) {
            asset_units = parseInt(element.units);
            asset_cost = parseInt(element.cost);
            total_asset_unit += asset_units;
            total_asset_cost += asset_cost;
          } else {
            memo_units = parseInt(element.units);
            memo_cost = parseInt(element.cost);
            total_memo_unit += memo_units;
            total_memo_cost += memo_cost;
          }
          gradeValues = {
            asset_unit: asset_units,
            asset_cost: asset_cost,
            memo_unit: memo_units,
            memo_cost: memo_cost,
            key: `${kpiType}_${index}`,
            // units: numberFormatter(kpi.units, 0),
            // cost: numberFormatter(kpi.cost, 0),
          };
        });
      }

      values.push(gradeValues);
      gradeLabels.push(grade.label);
    });

    findTotalValues(values, kpiType);
    setGradesByOrder([...gradeLabels]);

    gradeLabels.push(TOTAL_LABEL);
    gradeLabels.push(TOTAL_LABEL);
    setGradesTitleByOrder([...gradeLabels]);

    let totalValues = {
      asset_unit: total_asset_unit,
      asset_cost: total_asset_cost,
      memo_unit: total_memo_unit,
      memo_cost: total_memo_cost,
    };
    let combinedValues = [...values, totalValues];

    if (kpiType === "suggested") setSuggestedValuesByOrder(combinedValues);
    else setConstrainedValuesByOrder(combinedValues);

    let kpiObject = {
      label: kpiArray.label,
      values: values,
      total_asset_unit,
      total_asset_cost,
      total_memo_unit,
      total_memo_cost,
    };
    return kpiObject;
  };

  //Formatting KPI Total Values
  const findTotalValues = (ordersArray, orderType) => {
    let totalCost = 0;
    let totalUnit = 0;
    ordersArray.forEach((orders) => {
      totalCost += parseInt(orders.asset_cost + orders.memo_cost);
      totalUnit += parseInt(orders.asset_unit + orders.memo_unit);
    });

    let isNumberFormatted = false;
    if (isNumberFormatted) {
      let allCostInHundreds = false;
      let allUnitsInHundreds = false;
      if (
        ordersArray.values[0].cost < 1000 &&
        ordersArray.values[1].cost < 1000 &&
        ordersArray.values[2].cost < 1000 &&
        ordersArray.values[3].cost < 1000
      )
        allCostInHundreds = true;

      if (
        ordersArray.values[0].units < 1000 &&
        ordersArray.values[1].units < 1000 &&
        ordersArray.values[2].units < 1000 &&
        ordersArray.values[3].units < 1000
      )
        allUnitsInHundreds = true;

      if (orderType === "suggested") {
        if (allCostInHundreds) setSuggestedOrdersTotalCost(totalCost);
        else setSuggestedOrdersTotalCost(numberFormatter(totalCost, 0));
        if (allUnitsInHundreds) setSuggestedOrdersTotalUnits(totalUnit);
        else setSuggestedOrdersTotalUnits(numberFormatter(totalUnit, 0));
      } else {
        if (allCostInHundreds) setConstrainedOrdersTotalCost(totalCost);
        else setConstrainedOrdersTotalCost(numberFormatter(totalCost, 0));
        if (allUnitsInHundreds) setConstrainedOrdersTotalUnits(totalUnit);
        else setConstrainedOrdersTotalUnits(numberFormatter(totalUnit, 0));
      }
    } else {
      if (orderType === "suggested") {
        setSuggestedOrdersTotalCost(totalCost);
        setSuggestedOrdersTotalUnits(totalUnit);
      } else {
        setConstrainedOrdersTotalCost(totalCost);
        setConstrainedOrdersTotalUnits(totalUnit);
      }
    }
  };

   useEffect(() => {
    if (
      gradesTitleByOrder.length > 0 &&
      suggestedValuesByOrder.length > 0 &&
      constrainedValuesByOrder.length > 0
    )
      setGradeLength(gradesTitleByOrder.length - 1);
  }, [gradesTitleByOrder, suggestedValuesByOrder, constrainedValuesByOrder]);

  */

  useEffect(() => {
    const fetchOrderSummaryGrades = async () => {
      try {
        props.setOrderManagementKpiSummaryLoader(true);
        setIsError(false);
        selectedSku.current = props.selectedOmsSku;
        if (props.isRedirectedFromDifferentPage) {
          var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
          skuFilter.values = [...selectedSku.current];
        }
        let body = {
          filters: props.isRedirectedFromDifferentPage
            ? [...props.selectedFilters, skuFilter]
            : [...props.selectedFilters],
          date_filter: [props.ropDate, props.recommRecieptDate],
        };

        const response = await props.getOrdersSummaryByGrades(body);

        let gradeLabels = response?.data?.data?.grade;
        if (gradeLabels === undefined || gradeLabels.length === 0) {
          setIsError(true);
          props.setOrderManagementKpiSummaryLoader(false);
          return;
        }

        let gradeLabelsLength = gradeLabels.length;
        let gridItemSize = 12 / gradeLabelsLength;
        setGradeDivSize(gridItemSize);
        setGradesByOrder([...gradeLabels]);
        setGradeLength(gradeLabels.length);

        // setSuggestedOrders(formatKPINumbers(orderSummary[0], "suggested"));
        // setConstrainedOrders(formatKPINumbers(orderSummary[1], "constrained"));

        let orderSummary = response?.data?.data?.kpi;
        setKpiRowArray([...orderSummary]);
        props.setOrderManagementKpiSummaryLoader(false);
        props?.setReloadKpi(false);
      } catch (error) {
        props.setOrderManagementKpiSummaryLoader(false);
        setIsError(true);
        console.log(error);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    if (props?.reloadKpi === null || props?.reloadKpi === true) {
      if (props.selectedFilters?.length > 0) {
        fetchOrderSummaryGrades();
      }
    }
  }, [props.selectedFilters, props?.reloadKpi]);

  return (
    <Loader minHeight={"180px"} loader={props.orderManagementKpiSummaryLoader}>
      {isError ? (
        <div
          className={classNames(classes.omsKpiHeader, classes.omsKpiSubtext)}
        >
          No data applicable for selected filters
        </div>
      ) : (
        <div>
          <Grid container columnSpacing={2} display={{ xs: "flex" }}>
            <Grid item xs={12} lg={12}>
              <div className={classNames(classes.omsKpiCardContainer)}>
                <div>
                  {/* Grade Displaying Row */}
                  <Grid
                    container
                    direction="row"
                    justifyContent="space-between"
                    alignItems="stretch"
                  >
                    <Grid
                      item
                      lg={2}
                      //lg={1.7} - Removing For Signet
                      display={{ xs: "none", lg: "flex" }}
                      justifyContent={"flex-start"}
                      alignItems={"center"}
                    >
                      <Typography
                        variant={"h4"}
                        className={classNames(
                          classes.omsKpiSubtext,
                          classes.omsKpiLabel
                        )}
                      ></Typography>
                    </Grid>

                    <Grid item xs={12} lg={7} display="flex">
                      {gradesByOrder.map((grade) => (
                        <Grid item xs={gradeDivSize} key={grade}>
                          <Typography
                            variant={"h4"}
                            className={classNames(
                              classes.omsKpiSubtextBorder,
                              classes.omsKpiSubtext,
                              classes.omsKpiHeader
                            )}
                          >
                            {grade}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>

                    <Grid
                      item
                      lg={3}
                      //lg={2} - Removing For Signet
                      display={{ xs: "none", lg: "block" }}
                    >
                      <Typography
                        variant={"h4"}
                        className={classNames(
                          classes.omsKpiSubtextBorder,
                          classes.omsKpiSubtext,
                          classes.omsKpiHeader
                        )}
                      >
                        {TOTAL_LABEL}
                      </Typography>
                    </Grid>

                    {/* Removing For Signet */}
                    {/* <Grid item lg={1.3} display={{ xs: "none", lg: "block" }}>
                      <Typography
                        variant={"h4"}
                        style={{ borderTopRightRadius: "8px" }}
                        className={classNames(
                          classes.omsKpiSubtext,
                          classes.omsKpiHeader
                        )}
                      >
                        {TOTAL_LABEL}
                      </Typography>
                    </Grid> */}
                  </Grid>

                  {/* Asset vs Memo Displaying Row */}
                  <Grid
                    container
                    direction="row"
                    justifyContent="space-between"
                    alignItems="stretch"
                    className={classNames(
                      classes.omsKpiBottomSeparator,
                      classes.omsKpiTopSeparator
                    )}
                  >
                    <Grid
                      item
                      xs={12}
                      lg={2}
                      //lg={1.7} - Removing For Signet
                      display={{ xs: "none", lg: "flex" }}
                      justifyContent={"flex-start"}
                      alignItems={"center"}
                    >
                      <Typography
                        variant={"h4"}
                        className={classNames(
                          classes.omsKpiSubtext,
                          classes.omsKpiLabel,
                          classes.omsKpiSubtextBackground
                        )}
                      ></Typography>
                    </Grid>

                    <Grid item display="flex" xs={12} lg={7}>
                      {[...Array(gradeLength)].map((element, index) => (
                        <Grid
                          item
                          display="flex"
                          alignItems="center"
                          justifyContent="space-between"
                          xs={gradeDivSize}
                          className={classNames(
                            classes.omsKpiSubtextBackground,
                            classes.omsKpiSubtextBorder
                          )}
                          key={index}
                        >
                          <Typography
                            fontWeight="500"
                            width="50%"
                            className={classNames(
                              classes.omsKpiSubtext,
                              classes.omsKpiHeader,
                              classes.omsKpiRightSeparator
                            )}
                          >
                            {ASSET_MEMO_LABEL[0]}
                          </Typography>
                          <Typography
                            fontWeight="500"
                            width="50%"
                            className={classNames(
                              classes.omsKpiSubtext,
                              classes.omsKpiHeader
                            )}
                          >
                            {ASSET_MEMO_LABEL[1]}
                          </Typography>
                        </Grid>
                      ))}
                    </Grid>

                    <Grid
                      item
                      xs={6}
                      lg={3}
                      //lg={2} - Removing For Signet
                      display={{ xs: "none", lg: "flex" }}
                      alignItems="center"
                      justifyContent="space-between"
                      className={classNames(classes.omsKpiSubtextBackground)}
                    >
                      <Typography
                        fontWeight="500"
                        width="50%"
                        className={classNames(
                          classes.omsKpiSubtext,
                          classes.omsKpiHeader,
                          classes.omsKpiRightSeparator
                        )}
                      >
                        {ASSET_MEMO_LABEL[0]}
                      </Typography>
                      <Typography
                        fontWeight="500"
                        width="50%"
                        className={classNames(
                          classes.omsKpiSubtext,
                          classes.omsKpiHeader,
                          classes.omsKpiRightSeparator
                        )}
                      >
                        {ASSET_MEMO_LABEL[1]}
                      </Typography>
                    </Grid>

                    {/* Removing For Signet */}
                    {/* <Grid
                      item
                      xs={12}
                      lg={1.3}
                      display={{ xs: "none", lg: "flex" }}
                      alignItems="center"
                      justifyContent="space-between"
                      className={classNames(classes.omsKpiSubtextBackground)}
                    ></Grid> */}
                  </Grid>

                  {/* KPI Orders Row */}
                  {kpiRowArray?.map((row) => (
                    <Grid
                      container
                      direction="row"
                      justifyContent="space-between"
                      alignItems="stretch"
                    >
                      <Grid
                        item
                        xs={12}
                        lg={2}
                        //lg={1.7} - Removing For Signet
                        display={"flex"}
                        justifyContent={"flex-start"}
                        alignItems={"center"}
                      >
                        <Tooltip title={row?.label}>
                          <Typography
                            className={classNames(
                              classes.omsKpiSubtext,
                              classes.omsKpiLabel,
                              classes.omsKpiFirstRow,
                              classes.omsKpiEndColumn
                            )}
                          >
                            {row?.label}
                          </Typography>
                        </Tooltip>
                      </Grid>

                      <Grid item display="flex" xs={12} lg={7}>
                        {row?.values?.map((value) => (
                          <Grid
                            item
                            display="flex"
                            alignItems="center"
                            justifyContent="space-between"
                            xs={gradeDivSize}
                            className={classNames(classes.omsKpiSubtextBorder)}
                            key={value.key}
                          >
                            <Typography
                              className={classNames(
                                classes.omsKpiSubtext,
                                classes.omsKpiFirstRow,
                                classes.omsKpiHalfWidth,
                                classes.omsKpiRightSeparator
                              )}
                            >
                              {props.kpiCostChecked && "$"}
                              {props.kpiCostChecked
                                ? value.asset_cost.toLocaleString(TENANT_LOCALE)
                                : value.asset_unit.toLocaleString(
                                    TENANT_LOCALE
                                  )}
                            </Typography>
                            <Typography
                              className={classNames(
                                classes.omsKpiSubtext,
                                classes.omsKpiFirstRow,
                                classes.omsKpiHalfWidth
                              )}
                            >
                              {props.kpiCostChecked && "$"}
                              {props.kpiCostChecked
                                ? value.memo_cost.toLocaleString(TENANT_LOCALE)
                                : value.memo_unit.toLocaleString(TENANT_LOCALE)}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>

                      <Grid
                        item
                        display={{ xs: "flex", lg: "none" }}
                        alignItems="center"
                        justifyContent="space-between"
                        xs={6}
                        lg={3}
                        //lg={2} - Removing For Signet
                        className={classNames(classes.omsKpiSubtextBackground)}
                      >
                        <Typography
                          fontWeight="500"
                          width="100%"
                          className={classNames(
                            classes.omsKpiSubtext,
                            classes.omsKpiHeader,
                            classes.omsKpiRightSeparator
                          )}
                        >
                          {TOTAL_LABEL}
                        </Typography>
                      </Grid>

                      <Grid
                        item
                        xs={6}
                        lg={3}
                        //lg={2} - Removing For Signet
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                      >
                        <Typography
                          className={classNames(
                            classes.omsKpiSubtext,
                            classes.omsKpiFirstRow,
                            classes.omsKpiHalfWidth,
                            classes.omsKpiRightSeparator,
                            classes.omsKpiTotalBig
                          )}
                        >
                          {props.kpiCostChecked && "$"}
                          {props.kpiCostChecked
                            ? row?.total_asset_cost.toLocaleString(
                                TENANT_LOCALE
                              )
                            : row?.total_asset_unit.toLocaleString(
                                TENANT_LOCALE
                              )}
                        </Typography>

                        <Typography
                          className={classNames(
                            classes.omsKpiSubtext,
                            classes.omsKpiFirstRow,
                            classes.omsKpiHalfWidth,
                            classes.omsKpiRightSeparator,
                            classes.omsKpiTotalBig
                          )}
                        >
                          {props.kpiCostChecked && "$"}
                          {props.kpiCostChecked
                            ? row?.total_memo_cost.toLocaleString(TENANT_LOCALE)
                            : row?.total_memo_unit.toLocaleString(
                                TENANT_LOCALE
                              )}
                        </Typography>
                      </Grid>

                      {/* Removing For Signet */}
                      {/* <Grid
                        item
                        xs={12}
                        lg={1.3}
                        display="flex"
                        alignItems="center"
                        justifyContent="flex-end"
                        className={classes.omsKpiTotalSeparator}
                      >
                        <Typography
                          className={classNames(
                            classes.omsKpiSubtext,
                            classes.omsKpiFirstRow,
                            classes.omsKpiNumberBig
                          )}
                        >
                          {props.kpiCostChecked ? (
                            <Tooltip
                              title={`$${row?.total_cost.toLocaleString(
                                TENANT_LOCALE
                              )}`}
                            >
                              <span>
                                ${row?.total_cost.toLocaleString(TENANT_LOCALE)}
                              </span>
                            </Tooltip>
                          ) : (
                            <Tooltip
                              title={row?.total_unit.toLocaleString(
                                TENANT_LOCALE
                              )}
                            >
                              <span>
                                {row?.total_unit.toLocaleString(TENANT_LOCALE)}
                              </span>
                            </Tooltip>
                          )}
                        </Typography>
                      </Grid> */}
                    </Grid>
                  ))}
                </div>
              </div>
            </Grid>
          </Grid>
        </div>
      )}
    </Loader>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedOmsSku: store.omsReducer.orderManagementService.selectedSku,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    isFiltersValid: store.omsReducer.orderManagementService.isFiltersValid,
    orderManagementKpiSummaryLoader:
      store.omsReducer.orderManagementService.orderManagementKpiSummaryLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOrdersSummaryByGrades: (payload) =>
    dispatch(getOrdersSummaryByGrades(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  setOrderManagementKpiSummaryLoader: (payload) =>
    dispatch(setOrderManagementKpiSummaryLoader(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderManagementMetrics);
