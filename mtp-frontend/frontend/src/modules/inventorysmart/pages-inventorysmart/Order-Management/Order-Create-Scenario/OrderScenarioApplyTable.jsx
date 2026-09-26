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
  CREATE_SCENARIO_ELT_TABLE_COLUMNS,
  CREATE_SCENARIO_TABLE_COLUMNS,
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
import CustomAccordion from "core/commonComponents/Custom-Accordian";

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
  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [deepDiveTableData, setDeepDiveTableData] = useState([]);
  const [scenarioViewTableColumns, setScenarioViewTableColumns] = useState([]);
  const [seriesGraphData, setSeriesGraphData] = useState([]);
  const [fiscalYearWeek, setFiscalYearWeek] = useState([]);
  const [deepDiveChartData, setDeepDiveChartData] = useState({});
  const [isSwitchedChecked, setIsSwitchedChecked] = useState(true);

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

  const graphColours = [
    theme.palette.graphColours[18],
    theme.palette.graphColours[25],
    theme.palette.graphColours[30],
    theme.palette.graphColours[30],
    theme.palette.graphColours[19],
    theme.palette.graphColours[19],
    theme.palette.graphColours[26],
    theme.palette.graphColours[27],
    theme.palette.graphColours[0],
    theme.palette.graphColours[20],
    theme.palette.graphColours[22],
    theme.palette.graphColours[3],
  ];

  const graphIndicators = [
    {
      series: {
        type: "area",
        color: graphColours[0],
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
      },
      leadTimeLabel: "Projected DC Inventory",
      effectiveLeadTimeLabel: "Projected DC Inventory ELT",
    },
    {
      series: {
        type: "spline",
        color: graphColours[1],
        fillOpacity: 0.8,
        dashStyle: "longdash",
        marker: {
          radius: 1,
        },
      },
      leadTimeLabel: "Projected DC Inventory Scenario",
      effectiveLeadTimeLabel: "Projected DC Inventory ELT Scenario",
    },
    {
      series: {
        type: "column",
        color: graphColours[2],
      },
      leadTimeLabel: "Immediate Order Receipts",
      effectiveLeadTimeLabel: "Immediate Order Receipts ELT",
    },
    {
      series: {
        type: "column",
        color: {
          pattern: {
            path: {
              d: "M 0 0 L 10 10 M 9 - 1 L 11 1 M - 1 9 L 1 11",
              stroke: theme.palette.common.white,
            },
            width: 10,
            height: 10,
            backgroundColor: graphColours[3],
          },
        },
      },
      leadTimeLabel: "Immediate Order Receipts Scenario",
      effectiveLeadTimeLabel: "Immediate Order Receipts ELT Scenario",
    },
    {
      series: {
        color: graphColours[4],
        type: "column",
      },
      leadTimeLabel: "Order Cycle Receipts",
      effectiveLeadTimeLabel: "Order Cycle Receipts ELT",
    },
    {
      series: {
        type: "column",
        color: {
          pattern: {
            path: {
              d: "M 0 0 L 10 10 M 9 - 1 L 11 1 M - 1 9 L 1 11",
              stroke: theme.palette.common.white,
            },
            width: 10,
            height: 10,
            backgroundColor: graphColours[5],
          },
        },
      },
      leadTimeLabel: "Order Cycle Receipts Scenario",
      effectiveLeadTimeLabel: "Order Cycle Receipts ELT Scenario",
    },
    {
      series: {
        type: "spline",
        color: graphColours[6],
      },
      leadTimeLabel: "Safety Stock",
      effectiveLeadTimeLabel: "Safety Stock",
    },
    {
      series: {
        type: "spline",
        color: graphColours[7],
        dashStyle: "longdash",
        marker: {
          lineWidth: 1,
          radius: 1,
        },
      },
      leadTimeLabel: "Safety Stock Scenario",
      effectiveLeadTimeLabel: "Safety Stock Scenario",
    },
    {
      series: {
        type: "column",
        color: graphColours[8],
      },
      leadTimeLabel: "On Order Receipts",
      effectiveLeadTimeLabel: "On Order Receipts ELT ",
    },
    // {
    //   series: {
    //     type: "column",
    //     color: graphColours[9],
    //   },
    //   leadTimeLabel: "Pending Reciept In",
    //   effectiveLeadTimeLabel: "Pending Reciept In ELT",
    // },
    {
      series: {
        type: "spline",
        color: graphColours[10],
        marker: {
          radius: 1,
        },
      },
      leadTimeLabel: "Sales Forecast",
      effectiveLeadTimeLabel: "Sales Forecast",
    },
    {
      series: {
        type: "column",
        color: graphColours[11],
      },
      leadTimeLabel: "DC Inventory Out",
      effectiveLeadTimeLabel: "DC Inventory Out",
    },
  ];

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

      let formattedColumns = formattingDeepDiveColumns(
        columns?.data?.data,
        isSwitchedChecked
      );

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
      props.setOrderScenarioApplyTableConfigLoader(false);

      let responseDataObject = {
        fiscal_year_week_data: [],
        safety_stock: [],
        ecom_reserve: [],
        inventory_out: [],
        sales_forecast: [],
        projected_inventory_without_qc: [],
        projected_inventory_with_qc: [],
        commited_inventory_in_without_qc: [],
        commited_inventory_in_with_qc: [],
        pending_receipts_without_qc: [],
        pending_receipts_with_qc: [],
        immediate_order_without_qc: [],
        immediate_order_with_qc: [],
        order_cycle_without_qc: [],
        order_cycle_with_qc: [],
        safety_stock_scenario: [],
        projected_inventory_scenario_with_qc: [],
        projected_inventory_scenario_without_qc: [],
        immediate_order_scenario_with_qc: [],
        immediate_order_scenario_without_qc: [],
        order_cycle_scenario_with_qc: [],
        order_cycle_scenario_without_qc: [],
      };

      props?.deepDiveViewTableData.forEach((val) => {
        if (val?.week) {
          responseDataObject.fiscal_year_week_data.push(
            moment(val?.week).format("MMM DD")
          );
        }

        if (val?.safety_stock || val?.safety_stock === 0) {
          responseDataObject.safety_stock.push(Math.round(val?.safety_stock));
        }
        if (val?.ecom_reserve || val?.ecom_reserve === 0) {
          responseDataObject.ecom_reserve.push(Math.round(val.ecom_reserve));
        }
        if (val?.total_dc_forecast || val?.total_dc_forecast === 0) {
          responseDataObject.inventory_out.push(
            Math.round(-val?.total_dc_forecast)
          );
        }
        if (val?.forecast || val?.forecast === 0) {
          responseDataObject.sales_forecast.push(Math.round(val.forecast));
        }

        if (
          val?.exp_bop_dc_inv_without_qc ||
          val?.exp_bop_dc_inv_without_qc === 0
        ) {
          responseDataObject.projected_inventory_without_qc.push(
            Math.round(val?.exp_bop_dc_inv_without_qc)
          );
        }
        if (val?.exp_bop_dc_inv_with_qc || val?.exp_bop_dc_inv_with_qc == 0) {
          responseDataObject.projected_inventory_with_qc.push(
            Math.round(val?.exp_bop_dc_inv_with_qc)
          );
        }

        if (val?.po_receipts_without_qc || val?.po_receipts_without_qc == 0) {
          responseDataObject.commited_inventory_in_without_qc.push(
            Math.round(val?.po_receipts_without_qc)
          );
        }

        if (val?.po_receipts_with_qc || val?.po_receipts_with_qc == 0) {
          responseDataObject.commited_inventory_in_with_qc.push(
            Math.round(val?.po_receipts_with_qc)
          );
        }

        if (
          val?.receipt_pending_without_qc ||
          val?.receipt_pending_without_qc === 0
        ) {
          responseDataObject.pending_receipts_without_qc.push(
            Math.round(val?.receipt_pending_without_qc)
          );
        }
        if (
          val?.receipt_pending_with_qc ||
          val?.receipt_pending_with_qc === 0
        ) {
          responseDataObject.pending_receipts_with_qc.push(
            Math.round(val?.receipt_pending_with_qc)
          );
        }

        if (val?.Immediate_without_qc || val?.Immediate_without_qc === 0) {
          responseDataObject.immediate_order_without_qc.push(
            Math.round(val?.Immediate_without_qc)
          );
        }
        if (val?.Immediate_with_qc || val?.Immediate_with_qc === 0) {
          responseDataObject.immediate_order_with_qc.push(
            Math.round(val?.Immediate_with_qc)
          );
        }

        if (val?.Order_Cycle_without_qc || val?.Order_Cycle_without_qc === 0) {
          responseDataObject.order_cycle_without_qc.push(
            Math.round(val.Order_Cycle_without_qc)
          );
        }
        if (val?.Order_Cycle_with_qc || val?.Order_Cycle_with_qc === 0) {
          responseDataObject.order_cycle_with_qc.push(
            Math.round(val.Order_Cycle_with_qc)
          );
        }
      });

      props?.scenarioViewTableData.forEach((val) => {
        if (val.safety_stock) {
          responseDataObject.safety_stock_scenario.push(
            Math.round(val?.safety_stock)
          );
        }
        if (val.exp_bop_dc_inv_with_qc || val?.exp_bop_dc_inv_with_qc == 0) {
          responseDataObject.projected_inventory_scenario_with_qc.push(
            Math.round(val?.exp_bop_dc_inv_with_qc)
          );
        }

        if (
          val.exp_bop_dc_inv_without_qc ||
          val?.exp_bop_dc_inv_without_qc == 0
        ) {
          responseDataObject.projected_inventory_scenario_without_qc.push(
            Math.round(val?.exp_bop_dc_inv_without_qc)
          );
        }

        if (val.Immediate_with_qc || val?.Immediate_with_qc == 0) {
          responseDataObject.immediate_order_scenario_with_qc.push(
            Math.round(val?.Immediate_with_qc)
          );
        }
        if (val.Immediate_without_qc || val?.Immediate_without_qc == 0) {
          responseDataObject.immediate_order_scenario_without_qc.push(
            Math.round(val?.Immediate_without_qc)
          );
        }

        if (val?.Order_Cycle_with_qc || val?.Order_Cycle_with_qc === 0) {
          responseDataObject.order_cycle_scenario_with_qc.push(
            Math.round(val.Order_Cycle_with_qc)
          );
        }
        if (val?.Order_Cycle_without_qc || val?.Order_Cycle_without_qc === 0) {
          responseDataObject.order_cycle_scenario_without_qc.push(
            Math.round(val.Order_Cycle_without_qc)
          );
        }
      });

      if (responseDataObject.fiscal_year_week_data.length > 0) {
        setDeepDiveChartData(responseDataObject);
        setFiscalYearWeek([...responseDataObject.fiscal_year_week_data]);
      }

      props.setOrderScenarioApplyTableConfigLoader(false);
    };
    fetchColumnData();
  }, []);

  useEffect(() => {
    if (!_.isEmpty(deepDiveChartData)) {
      createGraphSeries();
    }
  }, [deepDiveChartData]);

  const createGraphSeries = (displayType) => {
    let isELTEnabled = isSwitchedChecked;
    if (displayType !== undefined) isELTEnabled = displayType;

    let series = [];
    graphIndicators.forEach((graph, index) => {
      let graphSeries = {
        ...graph.series,
        name: isELTEnabled ? graph.effectiveLeadTimeLabel : graph.leadTimeLabel,
        data: [],
      };
      switch (index) {
        case 0:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.projected_inventory_with_qc
            : deepDiveChartData.projected_inventory_without_qc;
          break;
        case 1:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.projected_inventory_scenario_with_qc
            : deepDiveChartData.projected_inventory_scenario_without_qc;

          break;
        case 2:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.immediate_order_with_qc
            : deepDiveChartData.immediate_order_without_qc;
          break;
        case 3:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.immediate_order_scenario_with_qc
            : deepDiveChartData.immediate_order_scenario_without_qc;
          break;
        case 4:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.order_cycle_with_qc
            : deepDiveChartData.order_cycle_without_qc;
          break;
        case 5:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.order_cycle_scenario_with_qc
            : deepDiveChartData.order_cycle_scenario_without_qc;
          break;
        case 6:
          graphSeries.data = deepDiveChartData.safety_stock;
          break;
        case 7:
          graphSeries.data = deepDiveChartData.safety_stock_scenario;
          break;
        case 8:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.commited_inventory_in_with_qc
            : deepDiveChartData.commited_inventory_in_without_qc;
          break;
        case 9:
          graphSeries.data = deepDiveChartData.sales_forecast;
          break;
        case 10:
          graphSeries.data = deepDiveChartData.inventory_out;
          break;
        default:
          graphSeries.data = [];
      }
      series.push(graphSeries);
    });
    setSeriesGraphData([...series]);

    let deepDiveCols = formattingDeepDiveColumns(
      deepDiveTableColumns,
      isELTEnabled
    );
    setDeepDiveTableColumns(deepDiveCols);
    let scenarioCols = formattingDeepDiveColumns(
      scenarioViewTableColumns,
      isELTEnabled
    );
    setScenarioViewTableColumns(scenarioCols);
  };

  const formattingDeepDiveColumns = (columns, isEltEnabled) => {
    columns.forEach((val) => {
      if (CREATE_SCENARIO_ELT_TABLE_COLUMNS.includes(val?.column_name)) {
        val.is_hidden = !isEltEnabled;
      }

      if (CREATE_SCENARIO_TABLE_COLUMNS.includes(val?.column_name)) {
        val.is_hidden = isEltEnabled;
      }
    });
    let formattedColumns = agGridColumnFormatter(columns);
    return formattedColumns;
  };

  const onSwitchChange = (event) => {
    let displayType = event.target.checked;
    createGraphSeries(displayType);
    setIsSwitchedChecked(displayType);
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

  return (
    <>
      <div>
        <CustomAccordion label={"Create Scenario Graph"}>
          <div
            className={classNames(
              globalClasses.centerAlign,
              globalClasses.paddingAround
            )}
          >
            <FormControl>
              <Stack
                direction="row"
                spacing={0}
                alignItems="center"
                sx={{ mx: 2 }}
              >
                <Switch
                  checked={isSwitchedChecked}
                  onChange={onSwitchChange}
                  disabled={false}
                  rightLabel="Effective lead time"
                  leftLabel="Lead time"
                />
              </Stack>
            </FormControl>
          </div>
          <LoadingOverlay
            loader={props.orderManagementDeepDiveTableLoader}
            minHeight={"260px"}
          >
            <Box sx={{ pb: 1 }}>
              <Charts options={graphOptions} mapView={true} />
            </Box>
          </LoadingOverlay>
        </CustomAccordion>
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
          {props?.inventorysmartOmsCommonConfig?.isApprovalButton
            ?.isVisible && (
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
          )}
        </div>
      </div>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
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
