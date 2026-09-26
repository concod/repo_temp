import { useState, useEffect, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useHistory } from "react-router";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import classNames from "classnames";
import {
  getOmsCreateScenarioTableConfig,
  getOmsSkuSummaryTableData,
  setOrderManagementSkuSummaryTableLoader,
  setOrderScenarioApplyTableConfigLoader,
  getOmsSkuSummaryTableConfiguration,
  getOmsSkuSummaryCreateScenarioApplyTableConfiguration,
  setRedirectFromDeepDive,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import { setOmsCreateNewOrderApproveRequestData } from "modules/inventorysmart/services-inventorysmart/Create-New-Order/create-new-order-service";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  Button,
  Grid,
  Typography,
  Tabs,
  Tab,
  FormControl,
} from "@mui/material";
import AgGridComponent from "core/Utils/agGrid";
import {
  ERROR_MESSAGE,
  OMS_ORDER_TYPE_CHIP_KEY,
  OMS_ORDER_STATUS_CHIP_KEY,
  ORDER_STATUS_GROUPING_BGCOLOR_MAPPER,
  ORDER_TYPE_GROUPING_BGCOLOR_MAPPER,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { ORDER_MANAGEMENT } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import Charts from "core/Utils/charts";
import { Switch } from "impact-ui";
import { Stack } from "@mui/system";
import theme from "core/Styles/theme";
import OriginalDeepDiveTableView from "./OriginalDeepDiveTableView";
import ScenarioTableView from "./ScenarioTableView";
import moment from "moment/moment";
import StyledChip from "core/Utils/chip/StyledChip";

const FAILED_TEXT = "Unsuccessfull at creating scenarios for ";
const FAILED_ALL_TEXT = "Unsuccessfull at creating scenarios for all SKUs";
const SUCCESS_TEXT = "Scenario created for ";
const SUCCESS_ALL_TEXT = "Scenario created successfully.";

const OrderScenarioApplyTable = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();
  const [selectedSku, setSelectedSku] = useState([]);
  const [skuTableData, setSkuTableData] = useState([]);
  const [tableColumns, setTableColumns] = useState([]);
  const tableGridInstance = useRef(null);
  const [tabValue, setTabValue] = useState("original");
  const [tabOptionsData, setTabOptionsData] = useState([]);
  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [deepDiveTableData, setDeepDiveTableData] = useState([]);
  const [scenarioViewTableColumns, setScenarioViewTableColumns] = useState([]);
  const [seriesGraphData, setSeriesGraphData] = useState([]);
  const [fiscalYearWeek, setFiscalYearWeek] = useState([]);
  const [qcGraphSeries, setQcGraphSeries] = useState([]);

  const createScenarioTabData = [
    {
      label: "Original",
      value: "original",
    },
    {
      label: "Scenario",
      value: "scenario",
    },
  ];

  var safetyStock = [];
  var safetyStockScenario = [];
  var inventoryOut = [];
  var projectedInventory = [];
  var projectedInventoryScenario = [];
  var CommitedInventoryIn = [];
  var RecommendedInvenotryIn = [];
  var RecommendedInvenotryInScenario = [];
  var fiscalYearWeekData = [];
  var salesForecast = [];
  var pendingReceipts = [];

  const renderOrderTypeCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_TYPE_CHIP_KEY].toLowerCase()
        .split(" ")
        .join("_");
      return (
        <StyledChip
          label={params.data[OMS_ORDER_TYPE_CHIP_KEY]}
          color={ORDER_TYPE_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };
  const renderOrderStatusCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_STATUS_CHIP_KEY].toLowerCase();
      return (
        <StyledChip
          label={params.data[OMS_ORDER_STATUS_CHIP_KEY]}
          color={ORDER_STATUS_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setOrderScenarioApplyTableConfigLoader(true);
      let columns = await props.getOmsSkuSummaryCreateScenarioApplyTableConfiguration();
      props.setOrderScenarioApplyTableConfigLoader(false);
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);

      let cols = formattedColumns.map((col) => {
        switch (col.accessor) {
          case OMS_ORDER_TYPE_CHIP_KEY:
            col = renderOrderTypeCell(col);
            break;
          case OMS_ORDER_STATUS_CHIP_KEY:
            col = renderOrderStatusCell(col);
            break;
          default:
            return col;
        }
        return col;
      });

      setTableColumns(cols);
      setDeepDiveTableData(props?.deepDiveViewTableData);
      setDeepDiveTableColumns(props?.deepDiveTableColumn);
      setScenarioViewTableColumns(props?.scenarioViewColumns);
      setSkuTableData(props?.skuData);
      props?.deepDiveViewTableData.forEach((val) => {
        if (val.safety_stock || val?.safety_stock == 0) {
          safetyStock.push(Math.round(val?.safety_stock));
        }
        if (val.total_dc_forecast || val?.total_dc_forecast == 0) {
          inventoryOut.push(Math.round(-val?.total_dc_forecast));
        }
        if (
          val.exp_bop_dc_inv_without_qc ||
          val?.exp_bop_dc_inv_without_qc == 0
        ) {
          projectedInventory.push(Math.round(val?.exp_bop_dc_inv_without_qc));
        }
        if (val.po_receipts_without_qc || val?.po_receipts_without_qc == 0) {
          CommitedInventoryIn.push(Math.round(val?.po_receipts_without_qc));
        }
        if (val.roq_receipts_without_qc || val?.roq_receipts_without_qc == 0) {
          RecommendedInvenotryIn.push(Math.round(val?.roq_receipts_without_qc));
        }
        if (val.week) {
          fiscalYearWeekData.push(moment(val?.week).format("MMM DD"));
        }
        if (val.forecast || val?.forecast == 0) {
          salesForecast.push(Math.round(val?.forecast));
        }
        if (
          val.receipt_pending_without_qc ||
          val?.receipt_pending_without_qc === 0
        ) {
          pendingReceipts.push(Math.round(val?.receipt_pending_without_qc));
        }
      });

      props?.createScenarioViewTableData.forEach((val) => {
        if (val.safety_stock || val?.safety_stock == 0) {
          safetyStockScenario.push(Math.round(val?.safety_stock));
        }
        if (
          val.exp_bop_dc_inv_without_qc ||
          val?.exp_bop_dc_inv_without_qc == 0
        ) {
          projectedInventoryScenario.push(
            Math.round(val?.exp_bop_dc_inv_without_qc)
          );
        }
        if (val.roq_receipts_without_qc || val?.roq_receipts_without_qc == 0) {
          RecommendedInvenotryInScenario.push(
            Math.round(val?.roq_receipts_without_qc)
          );
        }
      });
      let series = [
        {
          name: "Projected Inventory",
          type: "area",
          color: theme.palette.graphColours[18],
          fillOpacity: 0.8,
          marker: {
            enabled: false,
            symbol: "circle",
            radius: 0,
            states: {
              hover: {
                enabled: true,
              },
            },
          },
          data: projectedInventory,
        },
        {
          name: "Projected Inventory Scenario",
          type: "spline",
          color: "black", 
          dashStyle: "longdash",
          data: projectedInventoryScenario,
          fillOpacity: 0.8,
          marker: {
            radius: 1,
          },
        },
        {
          name: "Recommended Inventory In",
          type: "column",
          data: RecommendedInvenotryIn,
          color: theme.palette.graphColours[19],
        },
        {
          name: "Recommended Inventory In Scenario",
          type: "column",
          data: RecommendedInvenotryInScenario,
          color: {
            pattern: {
              path: {
                d: "M 0 0 L 10 10 M 9 - 1 L 11 1 M - 1 9 L 1 11",
                stroke: "white",
              },
              width: 10,
              height: 10,
              backgroundColor: theme.palette.graphColours[19],
            },
          },
        },
        {
          name: "Safety Stock",
          type: "spline",
          data: safetyStock,
          color: "#ff0000",
        },
        {
          name: "Safety Stock Scenario",
          type: "spline",
          data: safetyStockScenario,
          dashStyle: "longdash",
          color: "#ff8180",
          marker: {
            lineWidth: 1,
            radius: 1,
          },
        },
        {
          name: "Commited Inventory In",
          type: "column",
          data: CommitedInventoryIn,
          color: theme.palette.graphColours[0],
        },

        // {
        //   name: "Pending Reciept In",
        //   type: "column",
        //   color: theme.palette.graphColours[20],
        //   data: pendingReceipts,
        // },
        {
          name: "Sales Forecast",
          type: "spline",
          color: theme.palette.graphColours[22],
          data: salesForecast,
          marker: {
            radius: 1,
          },
        },
        {
          name: "Inventory Out",
          type: "column",
          color: theme.palette.graphColours[3],
          data: inventoryOut,
        },
      ];
      setQcGraphSeries([...series]);
      setSeriesGraphData([...series]);
      setFiscalYearWeek([...fiscalYearWeekData]);
      props.setOrderScenarioApplyTableConfigLoader(false);
    };
    fetchColumnData();
  }, []);

  const displaySnackMessages = (
    message,
    variance,
    hideAllSnackMessages = true
  ) => {
    if (hideAllSnackMessages) props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  const onSelectionChanged = (event) => {
    let selectedRows = [];
    tableGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedSku(selectedRows);
  };

  const handleApplyButton = async () => {
    try {
      let flag = true;
      if (flag) {
        props.setIsScenarioApplied(true);
        let body = {
          action: "recommended",
          comment: "",
          order_gen_type: "scenario",
          new_orders: [...selectedSku],
        };
        let response = await props.setOmsCreateNewOrderApproveRequestData(body);

        if (response.data.status) {
          if (response.data.data?.failed.length === 0) {
            displaySnackMessages(SUCCESS_ALL_TEXT, "success");
          } else if (response.data.data?.success.length === 0) {
            displaySnackMessages(FAILED_ALL_TEXT, "error");
          } else {
            if (response.data.data?.failed.length > 0) {
              let orders = [];
              response.data.data?.failed.forEach((order) => {
                orders.push(order.product_code);
              });
              let errorText = FAILED_TEXT + orders.join(" , ");
              displaySnackMessages(errorText, "error", false);
            }
            if (response.data.data?.success.length > 0) {
              let orders = [];
              response.data.data?.success.forEach((order) => {
                orders.push(order.product_code);
              });
              let successText = SUCCESS_TEXT + orders.join(" , ");
              displaySnackMessages(successText, "success", false);
            }
          }
          tableGridInstance.current.api.deselectAll();
          props.setRedirectFromDeepDive(true);
          setTimeout(() => {
            history.push({
              pathname: ORDER_MANAGEMENT,
              isRedirectedFromDeepDive: true,
              disabledFilter: props?.isRedirectedFromDifferentPage,
            });
          }, 2000);
        } else {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
      data: tabOption,
    };
  };

  const renderTabComponents = () => {
    switch (tabValue) {
      case "original":
        return (
          <OriginalDeepDiveTableView
            data={deepDiveTableData}
            columns={deepDiveTableColumns}
          />
        );
      case "scenario":
        return (
          <ScenarioTableView
            data={props?.scenarioViewTableData}
            columns={scenarioViewTableColumns}
          />
        );
      default:
        return;
    }
  };

  const onSwitchChange = (event) => {
    let displayType = event.target.checked;
    if (displayType) {
      deepDiveTableData?.forEach((val) => {
        if (val.safety_stock || val?.safety_stock == 0) {
          safetyStock.push(Math.round(val?.safety_stock));
        }
        if (val.total_dc_forecast || val?.total_dc_forecast == 0) {
          inventoryOut.push(Math.round(-val?.total_dc_forecast));
        }
        if (val.exp_bop_dc_inv_with_qc || val?.exp_bop_dc_inv_with_qc == 0) {
          projectedInventory.push(Math.round(val?.exp_bop_dc_inv_with_qc));
        }
        if (val.po_receipts_with_qc || val?.po_receipts_with_qc == 0) {
          CommitedInventoryIn.push(Math.round(val?.po_receipts_with_qc));
        }
        if (val.roq_receipts_with_qc || val?.roq_receipts_with_qc == 0) {
          RecommendedInvenotryIn.push(Math.round(val?.roq_receipts_with_qc));
        }
        if (val.forecast || val?.forecast == 0) {
          salesForecast.push(Math.round(val?.forecast));
        }
        if (val.receipt_pending_with_qc || val?.receipt_pending_with_qc === 0) {
          pendingReceipts.push(Math.round(val?.receipt_pending_with_qc));
        }
      });
      props?.scenarioViewTableData.forEach((val) => {
        if (val.safety_stock) {
          safetyStockScenario.push(Math.round(val?.safety_stock));
        }
        if (val.exp_bop_dc_inv_with_qc || val?.exp_bop_dc_inv_with_qc == 0) {
          projectedInventoryScenario.push(
            Math.round(val?.exp_bop_dc_inv_with_qc)
          );
        }
        if (val.roq_receipts_with_qc || val?.roq_receipts_with_qc == 0) {
          RecommendedInvenotryInScenario.push(
            Math.round(val?.roq_receipts_with_qc)
          );
        }
      });
      let series = [
        {
          name: "Projected Inventory ELT",
          type: "area",
          color: theme.palette.graphColours[18],
          fillOpacity: 0.8,
          marker: {
            enabled: false,
            symbol: "circle",
            radius: 0,
            states: {
              hover: {
                enabled: true,
              },
            },
          },
          data: projectedInventory,
        },
        {
          name: "Projected Inventory ELT Scenario",
          type: "spline",
          color: "black", 
          dashStyle: "longdash",
          data: projectedInventoryScenario,
          fillOpacity: 0.8,
          marker: {
            radius: 1,
          },
        },
        {
          name: "Recommended Inventory In ELT",
          type: "column",
          data: RecommendedInvenotryIn,
          color: theme.palette.graphColours[19],
        },
        {
          name: "Recommended Inventory In ELT Scenario",
          type: "column",
          data: RecommendedInvenotryInScenario,
          color: {
            pattern: {
              path: {
                d: "M 0 0 L 10 10 M 9 - 1 L 11 1 M - 1 9 L 1 11",
                stroke: "white",
              },
              width: 10,
              height: 10,
              backgroundColor: theme.palette.graphColours[19],
            },
          },
        },
        {
          name: "Safety Stock",
          type: "spline",
          data: safetyStock,
          color: "#ff0000",
        },
        {
          name: "Safety Stock Scenario",
          type: "spline",
          data: safetyStockScenario,
          dashStyle: "longdash",
          color: "#ff8180",
          marker: {
            lineWidth: 1,
            radius: 1,
          },
        },
        {
          name: "Commited Inventory In ELT",
          type: "column",
          data: CommitedInventoryIn,
          color: theme.palette.graphColours[0],
        },

        // {
        //   name: "Pending Reciept In ELT",
        //   type: "column",
        //   color: theme.palette.graphColours[20],
        //   data: pendingReceipts,
        // },
        {
          name: "Sales Forecast ELT",
          type: "spline",
          color: theme.palette.graphColours[22],
          data: salesForecast,
          marker: {
            radius: 1,
          },
        },
        {
          name: "Inventory Out ELT",
          type: "column",
          color: theme.palette.graphColours[3],
          data: inventoryOut,
        },
      ];

      setSeriesGraphData([...series]);
      deepDiveTableColumns.forEach((val) => {
        if (
          val?.column_name === "exp_bop_dc_inv_with_qc" ||
          val?.column_name === "po_receipts_with_qc" ||
          val?.column_name === "roq_receipts_with_qc" ||
          val?.column_name === "receipt_pending_with_qc" ||
          val?.column_name === "receipt_inventory_with_qc"
        ) {
          val.is_hidden = false;
        }
        if (
          val?.column_name === "exp_bop_dc_inv_without_qc" ||
          val?.column_name === "po_receipts_without_qc" ||
          val?.column_name === "roq_receipts_without_qc" ||
          val?.column_name === "receipt_pending_without_qc" ||
          val?.column_name === "receipt_inventory_without_qc"
        ) {
          val.is_hidden = true;
        }
      });
      scenarioViewTableColumns.forEach((val) => {
        if (
          val?.column_name === "exp_bop_dc_inv_with_qc" ||
          val?.column_name === "po_receipts_with_qc" ||
          val?.column_name === "roq_receipts_with_qc" ||
          val?.column_name === "receipt_pending_with_qc" ||
          val?.column_name === "receipt_inventory_with_qc"
        ) {
          val.is_hidden = false;
        }
        if (
          val?.column_name === "exp_bop_dc_inv_without_qc" ||
          val?.column_name === "po_receipts_without_qc" ||
          val?.column_name === "roq_receipts_without_qc" ||
          val?.column_name === "receipt_pending_without_qc" ||
          val?.column_name === "receipt_inventory_without_qc"
        ) {
          val.is_hidden = true;
        }
      });
      let formattedColumns = agGridColumnFormatter(deepDiveTableColumns);
      let scenarioViewFormattedColumns = agGridColumnFormatter(
        scenarioViewTableColumns
      );
      setDeepDiveTableColumns(formattedColumns);
      setScenarioViewTableColumns(scenarioViewFormattedColumns);
    } else {
      setSeriesGraphData([...qcGraphSeries]);
      deepDiveTableColumns.forEach((val) => {
        if (
          val?.column_name === "exp_bop_dc_inv_with_qc" ||
          val?.column_name === "po_receipts_with_qc" ||
          val?.column_name === "roq_receipts_with_qc" ||
          val?.column_name === "receipt_pending_with_qc" ||
          val?.column_name === "receipt_inventory_with_qc"
        ) {
          val.is_hidden = true;
        }
        if (
          val?.column_name === "exp_bop_dc_inv_without_qc" ||
          val?.column_name === "po_receipts_without_qc" ||
          val?.column_name === "roq_receipts_without_qc" ||
          val?.column_name === "receipt_pending_without_qc" ||
          val?.column_name === "receipt_inventory_without_qc"
        ) {
          val.is_hidden = false;
        }
      });
      scenarioViewTableColumns.forEach((val) => {
        if (
          val?.column_name === "exp_bop_dc_inv_with_qc" ||
          val?.column_name === "po_receipts_with_qc" ||
          val?.column_name === "roq_receipts_with_qc" ||
          val?.column_name === "receipt_pending_with_qc" ||
          val?.column_name === "receipt_inventory_with_qc"
        ) {
          val.is_hidden = true;
        }
        if (
          val?.column_name === "exp_bop_dc_inv_without_qc" ||
          val?.column_name === "po_receipts_without_qc" ||
          val?.column_name === "roq_receipts_without_qc" ||
          val?.column_name === "receipt_pending_without_qc" ||
          val?.column_name === "receipt_inventory_without_qc"
        ) {
          val.is_hidden = false;
        }
      });
      let formattedColumns = agGridColumnFormatter(deepDiveTableColumns);
      let scenarioViewFormattedColumns = agGridColumnFormatter(
        scenarioViewTableColumns
      );
      setDeepDiveTableColumns(formattedColumns);
      setScenarioViewTableColumns(scenarioViewFormattedColumns);
    }
  };

  const graphOptions = {
    chartType: "barLineChart",
    chartTitle: null,
    axisLegends: {
      xaxis: {
        categories: fiscalYearWeek,
      },
      yaxis: {
        primaryAxisTitle: "Units",
      },
    },
    series: seriesGraphData,
  };

  return (
    <>
      <div>
        <div
          className={globalClasses.centerAlign}
          style={{ marginTop: "80px" }}
        >
          <FormControl>
            <Stack
              direction="row"
              spacing={0}
              alignItems="center"
              sx={{ mx: 2 }}
            >
              <Switch
                onChange={onSwitchChange}
                disabled={false}
                rightLabel="Effective lead time"
                leftLabel="Lead time"
              />
            </Stack>
          </FormControl>
        </div>
        <Grid container alignItems={"center"} item xs={3}>
          <Typography variant="h6">Create Scenario Graph</Typography>
        </Grid>
        <LoadingOverlay
          loader={props.orderManagementDeepDiveTableLoader}
          minHeight={"260px"}
        >
          <Box sx={{ pb: 1 }}>
            <Charts options={graphOptions} mapView={true} />
          </Box>
        </LoadingOverlay>

        <div className={globalClasses.marginVertical1rem}>
          <Tabs
            style={{ paddingTop: "1rem" }}
            value={tabValue}
            onChange={handleChangeTabValue}
            aria-label="allocation-reports-tab"
          >
            {createScenarioTabData?.map((tabOption) => (
              <Tab {...tabProps(tabOption)} />
            ))}
          </Tabs>
          {renderTabComponents()}
        </div>
        <div>
          <Grid
            container
            className={globalClasses.marginVertical1rem}
            justifyContent={"space-between"}
          >
            <Grid container alignItems={"center"} item xs={3}>
              <Typography variant="h6">SKU Table</Typography>
            </Grid>
          </Grid>
          <Loader
            loader={props.orderScenarioApplyTableConfigLoader}
            minHeight={"260px"}
          >
            <AgGridComponent
              sideBar={false}
              pagination={false}
              columns={tableColumns}
              rowdata={skuTableData}
              selectAllHeaderComponent={true}
              hideSelectAllRecords={true}
              onSelectionChanged={onSelectionChanged}
              loadTableInstance={loadTableInstance}
              uniqueRowId={"id"}
            />
          </Loader>
          <Grid
            container
            direction="row"
            justifyContent="center"
            alignItems="center"
            className={globalClasses.marginAround}
          >
            <Button
              variant="contained"
              color="primary"
              id="scenarioApplyBtn"
              className={classes.button}
              disabled={props.isScenarioApplied || selectedSku.length == 0}
              onClick={() => handleApplyButton()}
            >
              Apply
            </Button>
          </Grid>
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    createScenarioViewTableData:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .createScenarioViewTableData,
    orderScenarioApplyTableConfigLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderScenarioApplyTableConfigLoader,
    orderScenarioApplyTableDataLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderScenarioApplyTableDataLoader,
    orderManagementSkuSummaryTableLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementSkuSummaryTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsCreateScenarioTableConfig: (payload) =>
    dispatch(getOmsCreateScenarioTableConfig(payload)),
  getOmsSkuSummaryCreateScenarioApplyTableConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryCreateScenarioApplyTableConfiguration(payload)),
  getOmsSkuSummaryTableData: (payload) =>
    dispatch(getOmsSkuSummaryTableData(payload)),
  setOrderScenarioApplyTableConfigLoader: (payload) =>
    dispatch(setOrderScenarioApplyTableConfigLoader(payload)),
  setOrderManagementSkuSummaryTableLoader: (payload) =>
    dispatch(setOrderManagementSkuSummaryTableLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  getOmsSkuSummaryTableConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryTableConfiguration(payload)),
  setOmsCreateNewOrderApproveRequestData: (payload) =>
    dispatch(setOmsCreateNewOrderApproveRequestData(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderScenarioApplyTable);
