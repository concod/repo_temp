import { useEffect, useRef, useState } from "react";
import globalStyles from "core/Styles/globalStyles";
import { connect } from "react-redux";
import { addSnack } from "core/actions/snackbarActions";
import {
  FormControl,
  Grid,
  MenuItem,
  Select,
  Tooltip,
  Typography,
  Button,
} from "@mui/material";
import theme from "core/Styles/theme";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import {
  getOmsDeepDiveTableConfiguration,
  setOrderManagementDeepDiveTableLoader,
  setOrderManagementDeepDiveTableData,
  setOrderManagementDeepDiveTableConfig,
  getOmsDeepDiveTableData,
  setOrderManagementDeepDiveTableConfigLoader,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import LoadingOverlay from "core/Utils/Loader/loader";
import { Box } from "@mui/system";
import Charts from "core/Utils/charts";
import {
  DEEP_DIVE_ELT_TABLE_COLUMNS,
  DEEP_DIVE_TABLE_COLUMNS,
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
} from "../../../constants-inventorysmart/stringConstants";
import { Switch } from "impact-ui";
import { Stack } from "@mui/system";
import moment from "moment/moment";
import DownloadIcon from "@mui/icons-material/Download";
import { cloneDeep } from "lodash";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";

const OrderDeepDiveTable = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [previousSkuIds, setPreviousSkuIds] = useState([]);
  const [deepDiveTableColumns, setDeepDiveTableColumns] = useState([]);
  const [deepDiveTableData, setDeepDiveTableData] = useState([]);
  const [selectedSkuId, setSelectedSkuId] = useState([]);
  const [skuIdSelectArray, setSkuIdSelectArray] = useState([]);
  const [skuData, setSkuData] = useState(props.skuData);
  const [isRender, setIsRender] = useState(false);

  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);

  const [seriesGraphData, setSeriesGraphData] = useState([]);
  const [fiscalYearWeek, setFiscalYearWeek] = useState([]);
  const [qcGraphSeries, setQcGraphSeries] = useState([]);
  var safetyStock = [];
  var inventoryOut = [];
  var projectedInventory = [];
  var CommitedInventoryIn = [];
  var RecommendedInvenotryIn = [];
  var fiscalYearWeekData = [];
  var salesForecast = [];
  var pendingReceipts = [];
  var ecomReserve = [];
  var immediateOrder = [];
  var orderCycle = [];

  const graphColours = [
    theme.palette.graphColours[18],
    theme.palette.graphColours[0],
    theme.palette.graphColours[21],
    theme.palette.graphColours[22],
    theme.palette.graphColours[3],
    theme.palette.graphColours[29],
    theme.palette.graphColours[19],
    theme.palette.graphColours[13],
    theme.palette.graphColours[23],
    theme.palette.graphColours[20],
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
      leadTimeLabel: "Projected Inventory",
      effectiveLeadTimeLabel: "Projected Inventory ELT",
    },
    {
      series: {
        type: "column",
        color: graphColours[1],
      },
      leadTimeLabel: "Commited Inventory In",
      effectiveLeadTimeLabel: "Commited Inventory In ELT",
    },
    {
      series: {
        type: "spline",
        color: graphColours[2],
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
      leadTimeLabel: "Safety Stock",
      effectiveLeadTimeLabel: "Safety Stock",
    },
    {
      series: {
        type: "spline",
        color: graphColours[3],
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
      leadTimeLabel: "Sales Forecast",
      effectiveLeadTimeLabel: "Sales Forecast",
    },
    {
      series: {
        type: "column",
        color: graphColours[4],
      },
      leadTimeLabel: "Inventory Out",
      effectiveLeadTimeLabel: "Inventory Out",
    },
    {
      series: {
        type: "area",
        color: graphColours[5],
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
      leadTimeLabel: "Ecom Reserve",
      effectiveLeadTimeLabel: "Ecom Reserve ELT",
    },
    {
      series: {
        type: "column",
        color: graphColours[6],
        fillOpacity: 0.2,
      },
      leadTimeLabel: "Immediate Order Inv In",
      effectiveLeadTimeLabel: "Immediate Order Inv In ELT",
    },
    {
      series: {
        type: "column",
        color: graphColours[7],
        fillOpacity: 0.2,
      },
      leadTimeLabel: "Order Cycle Order Inv In",
      effectiveLeadTimeLabel: "Order Cycle Order Inv In ELT",
    },
    // {
    //   series: {
    //     type: "column",
    //     color: graphColours[8],
    //     fillOpacity: 0.2,
    //   },
    //   leadTimeLabel: "Recommended Inventory In",
    //   effectiveLeadTimeLabel: "Recommended Inventory In ELT",
    // },
    // {
    //   series: {
    //     type: "column",
    //     color: graphColours[9],
    //     fillOpacity: 0.2,
    //   },
    //   leadTimeLabel: "Pending Reciept In",
    //   effectiveLeadTimeLabel: "Pending Reciept ELT",
    // },
  ];

  const handleSkuIdChange = (event) => {
    let newValue = event.target.value;
    setSelectedSkuId(
      typeof value === "string" ? newValue.split(",") : newValue
    );
  };

  const getDeepDivePayload = () => {
    let payload = [];
    skuData?.forEach((e) => {
      let productCode = parseInt(e.product_code);
      let prodObject = {
        product_code: productCode,
        loc_code: e.loc_code,
      };
      payload.push(prodObject);
    });
    return payload;
  };

  const handleSelectClose = async (event) => {
    props.setOrderManagementDeepDiveTableLoader(true);

    //Checking if user has select/deselect any SKUs
    if (selectedSkuId.length > 0) {
      if (JSON.stringify(previousSkuIds) === JSON.stringify(selectedSkuId)) {
        props.setOrderManagementDeepDiveTableLoader(false);
        return;
      }
      setPreviousSkuIds(selectedSkuId);
    } else {
      setSelectedSkuId([...skuIdSelectArray]);
      setPreviousSkuIds([...skuIdSelectArray]);
    }

    let payload = [];
    if (selectedSkuId.length === 0) {
      payload = [...getDeepDivePayload()];
    } else {
      skuData?.forEach((e) => {
        let productCode = parseInt(e.product_code);
        if (selectedSkuId.includes(productCode)) {
          let prodObject = {
            product_code: productCode,
            loc_code: e.loc_code,
          };
          payload.push(prodObject);
        }
      });
    }

    let body = {
      data: [...payload],
    };
    let response = await props.getOmsDeepDiveTableData(body);
    if (response.data.status) {
      let formatedData = agGridRowFormatter(response.data.data);
      setDeepDiveTableData(formatedData);
      props.setOrderManagementDeepDiveTableData(formatedData);
      props.setOrderManagementDeepDiveTableLoader(false);
    }
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  useEffect(() => {
    const fetchColumnData = async () => {
      try {
        props.setOrderManagementDeepDiveTableData([]);
        props.setOrderManagementDeepDiveTableConfigLoader(true);
        let columns = await props.getOmsDeepDiveTableConfiguration();
        let cols = formattingDeepDiveColumns(columns?.data?.data, false);
        setDeepDiveTableColumns(cols);
        props.setOrderManagementDeepDiveTableConfigLoader(false);
        props.setOrderManagementDeepDiveTableLoader(true);
        let values = [];
        skuData?.forEach((e) => {
          values.push(parseInt(e.product_code));
        });
        setSkuIdSelectArray([...values]);
        setSelectedSkuId([...values]);

        let payload = [...getDeepDivePayload()];
        if (payload.length === 0) {
          props.setOrderManagementDeepDiveTableLoader(false);
        } else {
          let body = {
            data: [...payload],
          };
          let response = await props.getOmsDeepDiveTableData(body);
          props.setOrderManagementDeepDiveTableLoader(false);

          if (response.data.status) {
            setIsRender(true);
            props?.setReloadComponents(false);
            response?.data?.data.forEach((val) => {
              if (val?.safety_stock || val.safety_stock === 0) {
                safetyStock.push(Math.round(val?.safety_stock));
              }
              if (val?.total_dc_forecast || val?.total_dc_forecast == 0) {
                inventoryOut.push(Math.round(-val?.total_dc_forecast));
              }
              if (
                val?.exp_bop_dc_inv_without_qc ||
                val?.exp_bop_dc_inv_without_qc == 0
              ) {
                projectedInventory.push(
                  Math.round(val?.exp_bop_dc_inv_without_qc)
                );
              }
              if (
                val?.po_receipts_without_qc ||
                val?.po_receipts_without_qc == 0
              ) {
                CommitedInventoryIn.push(
                  Math.round(val?.po_receipts_without_qc)
                );
              }
              if (
                val?.roq_receipts_without_qc ||
                val?.roq_receipts_without_qc == 0
              ) {
                RecommendedInvenotryIn.push(
                  Math.round(val?.roq_receipts_without_qc)
                );
              }
              if (val?.week) {
                fiscalYearWeekData.push(moment(val?.week).format("MMM DD"));
              }
              if (val?.forecast || val?.forecast === 0) {
                salesForecast.push(Math.round(val.forecast));
              }
              if (
                val?.receipt_pending_without_qc ||
                val?.receipt_pending_without_qc === 0
              ) {
                pendingReceipts.push(
                  Math.round(val?.receipt_pending_without_qc)
                );
              }
              if (val?.ecom_reserve || val?.ecom_reserve === 0) {
                ecomReserve.push(Math.round(val.ecom_reserve));
              }
              if (
                val?.Immediate_without_qc ||
                val?.Immediate_without_qc === 0
              ) {
                immediateOrder.push(Math.round(val?.Immediate_without_qc));
              }
              if (
                val?.Order_Cycle_without_qc ||
                val?.Order_Cycle_without_qc === 0
              ) {
                orderCycle.push(Math.round(val.Order_Cycle_without_qc));
              }
            });

            let series = [];
            graphIndicators.forEach((graph, index) => {
              let graphSeries = {
                ...graph.series,
                name: graph.leadTimeLabel,
                data: [],
              };
              switch (index) {
                case 0:
                  graphSeries.data = projectedInventory;
                  break;
                case 1:
                  graphSeries.data = CommitedInventoryIn;
                  break;
                case 2:
                  graphSeries.data = safetyStock;
                  break;
                case 3:
                  graphSeries.data = salesForecast;
                  break;
                case 4:
                  graphSeries.data = inventoryOut;
                  break;
                case 5:
                  graphSeries.data = ecomReserve;
                  break;
                case 6:
                  graphSeries.data = immediateOrder;
                  break;
                case 7:
                  graphSeries.data = orderCycle;
                  break;
                case 8:
                  graphSeries.data = RecommendedInvenotryIn;
                  break;
                case 9:
                  graphSeries.data = pendingReceipts;
                  break;
                default:
                  graphSeries.data = [];
              }
              series.push(graphSeries);
            });

            setQcGraphSeries([...series]);
            setSeriesGraphData([...series]);
            setFiscalYearWeek([...fiscalYearWeekData]);

            let formatedData = agGridRowFormatter(response.data.data);
            props.setOrderManagementDeepDiveTableData(formatedData);
          }
        }
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setOrderManagementDeepDiveTableLoader(false);
      }
    };
    if (props?.reloadComponents === null || props?.reloadComponents === true) {
      fetchColumnData();
    }
  }, [props?.reloadComponents]);

  let colorValue = null;
  let colorIndex = null;

  const graphOptions = {
    chartType: "stackedBarChart",
    chartHeight: 450,
    chartTitle: null,
    axisLegends: {
      xaxis: {
        categories: fiscalYearWeek,
      },
      yaxis: {
        title: "Units",
      },
    },
    tickPixelInterval: {
      yaxis: 40,
    },
    series: seriesGraphData,
    legend: {
      verticalAlign: "top",
    },
    exporting: {
      buttons: {
        contextButton: {
          enabled: false,
        },
      },
    },
    plotOptions: {
      series: {
        states: {
          hover: {
            enabled: true,
            brightness: 0.2,
          },
        },
        events: {
          mouseOver: function () {
            colorValue = graphColours[this.index];
            colorIndex = this.index;
            this.chart.series[this.index].update({
              color: colorValue,
            });
          },
          mouseOut: function () {
            this.chart.series[this.index].update({
              color: graphColours[this.index],
            });
          },
        },
      },
    },

    tooltip: {
      backgroundColor: theme.palette.common.white,
      borderColor: theme.palette.text.disabled,
      shadow: false,
      style: {
        padding: "8px",
      },
      useHTML: true,
      formatter: function () {
        let activePoint = `<span style="color: ${theme.palette.text.primary}"><b>${this.points[0].key}</b></span><br/>`;
        let titleLine = `<div style="width: 100%; height: 1px; margin: 6px 0; background-color: ${theme.palette.text.disabled}"></div>`;
        activePoint += titleLine;

        this.points.forEach(function (point, index) {
          let textColor = theme.palette.text.primary;
          if (index !== colorIndex) textColor = theme.palette.text.disabled;
          let pointValue = point.y;
          if (point.y < 0) pointValue = -1 * point.y;
          activePoint +=
            `<span style="color: ${point.color}; margin-right:2px">\u25CF</span>` +
            `<span style="color: ${textColor}"> ${point.series.name} <b> : ${pointValue} </b><br>`;
        });
        return activePoint;
      },
      shared: true,
    },
  };

  const onSwitchChange = (event) => {
    let displayType = event.target.checked;
    if (displayType) {
      props?.orderManagementDeepDiveTableData?.forEach((val) => {
        if (val?.safety_stock || val?.safety_stock == 0) {
          safetyStock.push(Math.round(val?.safety_stock));
        }
        if (val?.total_dc_forecast || val?.total_dc_forecast == 0) {
          inventoryOut.push(Math.round(-val?.total_dc_forecast));
        }
        if (val?.exp_bop_dc_inv_with_qc || val?.exp_bop_dc_inv_with_qc == 0) {
          projectedInventory.push(Math.round(val?.exp_bop_dc_inv_with_qc));
        }
        if (val?.po_receipts_with_qc || val?.po_receipts_with_qc == 0) {
          CommitedInventoryIn.push(Math.round(val?.po_receipts_with_qc));
        }
        if (val?.roq_receipts_with_qc || val?.roq_receipts_with_qc == 0) {
          RecommendedInvenotryIn.push(Math.round(val?.roq_receipts_with_qc));
        }
        if (val?.forecast || val?.forecast == 0) {
          salesForecast.push(Math.round(val.forecast));
        }
        if (
          val?.receipt_pending_with_qc ||
          val?.receipt_pending_with_qc === 0
        ) {
          pendingReceipts.push(Math.round(val?.receipt_pending_with_qc));
        }
        if (val?.ecom_reserve || val?.ecom_reserve == 0) {
          ecomReserve.push(Math.round(val.ecom_reserve));
        }
        if (val?.Immediate_with_qc || val?.Immediate_with_qc === 0) {
          immediateOrder.push(Math.round(val?.Immediate_with_qc));
        }
        if (val?.Order_Cycle_with_qc || val?.Order_Cycle_with_qc === 0) {
          orderCycle.push(Math.round(val.Order_Cycle_with_qc));
        }
      });

      let series = [];
      graphIndicators.forEach((graph, index) => {
        let graphSeries = {
          ...graph.series,
          name: graph.effectiveLeadTimeLabel,
          data: [],
        };
        switch (index) {
          case 0:
            graphSeries.data = projectedInventory;
            break;
          case 1:
            graphSeries.data = CommitedInventoryIn;
            break;
          case 2:
            graphSeries.data = safetyStock;
            break;
          case 3:
            graphSeries.data = salesForecast;
            break;
          case 4:
            graphSeries.data = inventoryOut;
            break;
          case 5:
            graphSeries.data = ecomReserve;
            break;
          case 6:
            graphSeries.data = immediateOrder;
            break;
          case 7:
            graphSeries.data = orderCycle;
            break;
          case 8:
            graphSeries.data = RecommendedInvenotryIn;
            break;
          case 9:
            graphSeries.data = pendingReceipts;
            break;
          default:
            graphSeries.data = [];
        }
        series.push(graphSeries);
      });
      setSeriesGraphData([...series]);
      let cols = formattingDeepDiveColumns(deepDiveTableColumns, true);
      setDeepDiveTableColumns(cols);
    } else {
      setSeriesGraphData([...qcGraphSeries]);
      let cols = formattingDeepDiveColumns(deepDiveTableColumns, false);
      setDeepDiveTableColumns(cols);
    }
  };

  const formattingDeepDiveColumns = (columns, isEltEnabled) => {
    columns.forEach((val) => {
      if (DEEP_DIVE_ELT_TABLE_COLUMNS.includes(val?.column_name)) {
        val.is_hidden = !isEltEnabled;
      }

      if (DEEP_DIVE_TABLE_COLUMNS.includes(val?.column_name)) {
        val.is_hidden = isEltEnabled;
      }
    });
    let formattedColumns = agGridColumnFormatter(columns);
    return formattedColumns;
  };

  const downloadCsv = async () => {
    displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");
    if (deepDiveTableColumns.length > 0) {
      setCsvData(
        cloneDeep(props.orderManagementDeepDiveTableData),
        deepDiveTableColumns
      );
      setCsvHeaders(getHeaderForExcel(cloneDeep(deepDiveTableColumns)));
    } else {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  return (
    <div className={globalClasses.marginVertical2rem}>
      <Grid container alignItems={"center"} item xs={3}>
        <Typography variant="h6">Deep Dive Graph</Typography>
      </Grid>

      {isRender ? (
        <div>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <Grid item sx={{ visibility: "hidden" }}>
              <Typography variant="h6">Deep Dive Graph</Typography>
            </Grid>
            <div className={globalClasses.centerAlign}>
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
            <div className={globalClasses.layoutAlignEnd}>
              <Tooltip title="Download">
                <Button
                  variant="contained"
                  className={classes.button}
                  sx={{ mr: 0 }}
                  onClick={async () => {
                    await downloadCsv();
                    downloadLink.current.link.click();
                  }}
                  startIcon={<DownloadIcon />}
                  disabled={!props.orderManagementDeepDiveTableData.length > 0}
                >
                  Download
                </Button>
              </Tooltip>
              {downloadExcelLink(
                csvData,
                "deep_dive",
                downloadLink,
                csvHeaders,
                "",
                "",
                true
              )}
            </div>
          </Box>

          <div>
            <LoadingOverlay
              loader={props.orderManagementDeepDiveTableLoader}
              minHeight={"260px"}
            >
              <Box sx={{ pb: 1 }}>
                <Charts options={graphOptions} mapView={true} />
              </Box>
            </LoadingOverlay>
          </div>
        </div>
      ) : (
        <LoadingOverlay
          loader={props.orderManagementDeepDiveTableLoader}
          minHeight={"260px"}
        >
          <div
            className={globalClasses.centerAlign}
            style={{ minHeight: "100px" }}
          >
            <Typography variant="h7" className={globalClasses.paperWrapper}>
              No data is present for the selected filters
            </Typography>
          </div>
        </LoadingOverlay>
      )}

      {false && (
        <>
          <Grid container className={globalClasses.marginVertical1rem}>
            <Typography variant="h6">Deep Dive</Typography>
          </Grid>
          <Grid container className={globalClasses.marginVertical}>
            <Typography
              variant="subtitle1"
              color={theme.palette.textColours.slateGrayLight}
            >
              SKU ID
            </Typography>
          </Grid>
          <Grid container className={globalClasses.marginBottom}>
            <FormControl size="small" sx={{ minWidth: 240 }}>
              <Select
                multiple
                value={selectedSkuId}
                onChange={handleSkuIdChange}
                onClose={handleSelectClose}
              >
                {skuIdSelectArray.map((skuId) => (
                  <MenuItem key={skuId} value={skuId}>
                    {skuId}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </>
      )}
      {isRender && (
        <Loader
          loader={props.orderManagementDeepDiveTableLoader}
          minHeight={"260px"}
        >
          <div>
            <AgGridComponent
              columns={deepDiveTableColumns}
              rowdata={props.orderManagementDeepDiveTableData}
              pagination={false}
              showSaveTableConfig={true}
              showSearchModalBtn={true}
            />
          </div>
        </Loader>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    orderManagementDeepDiveTableConfig:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementDeepDiveTableConfig,
    orderManagementDeepDiveTableData:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementDeepDiveTableData,
    orderManagementDeepDiveTableLoader:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .orderManagementDeepDiveTableLoader,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsDeepDiveTableConfiguration: (payload) =>
    dispatch(getOmsDeepDiveTableConfiguration(payload)),
  getOmsDeepDiveTableData: (payload) =>
    dispatch(getOmsDeepDiveTableData(payload)),
  setOrderManagementDeepDiveTableConfig: (payload) =>
    dispatch(setOrderManagementDeepDiveTableConfig(payload)),
  setOrderManagementDeepDiveTableData: (payload) =>
    dispatch(setOrderManagementDeepDiveTableData(payload)),
  setOrderManagementDeepDiveTableLoader: (payload) =>
    dispatch(setOrderManagementDeepDiveTableLoader(payload)),
  setOrderManagementDeepDiveTableConfigLoader: (payload) =>
    dispatch(setOrderManagementDeepDiveTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderDeepDiveTable);
