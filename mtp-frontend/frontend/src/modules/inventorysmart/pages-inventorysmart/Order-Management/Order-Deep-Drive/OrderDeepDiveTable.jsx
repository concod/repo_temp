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
import { makeStyles } from "@mui/styles";
import DownloadIcon from "@mui/icons-material/Download";
import _, { cloneDeep } from "lodash";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import CustomAccordion from "core/commonComponents/Custom-Accordian";

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
  const [isSwitchedChecked, setIsSwitchedChecked] = useState(true);

  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);

  const [seriesGraphData, setSeriesGraphData] = useState([]);
  const [fiscalYearWeek, setFiscalYearWeek] = useState([]);
  const [deepDiveChartData, setDeepDiveChartData] = useState({});

  const graphColours = [
    theme.palette.graphColours[18],
    theme.palette.graphColours[0],
    theme.palette.graphColours[21],
    theme.palette.graphColours[22],
    theme.palette.graphColours[3],
    theme.palette.graphColours[29],
    theme.palette.graphColours[30],
    theme.palette.graphColours[19],
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
      leadTimeLabel: "Projected DC Inventory",
      effectiveLeadTimeLabel: "Projected DC Inventory ELT",
    },
    {
      series: {
        type: "column",
        color: graphColours[1],
      },
      leadTimeLabel: "On Order Receipts",
      effectiveLeadTimeLabel: "On Order Receipts ELT",
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
      leadTimeLabel: " DC Inventory Out",
      effectiveLeadTimeLabel: " DC Inventory Out",
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
      effectiveLeadTimeLabel: "Ecom Reserve",
    },
    {
      series: {
        type: "column",
        color: graphColours[6],
        fillOpacity: 0.2,
      },
      leadTimeLabel: "Immediate Order Receipts",
      effectiveLeadTimeLabel: "Immediate Order Receipts ELT",
    },
    {
      series: {
        type: "column",
        color: graphColours[7],
        fillOpacity: 0.2,
      },
      leadTimeLabel: "Order Cycle Receipts",
      effectiveLeadTimeLabel: "Order Cycle Receipts ELT",
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
        let cols = formattingDeepDiveColumns(
          columns?.data?.data,
          isSwitchedChecked
        );
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
              recommended_inventory_in_without_qc: [],
              recommended_inventory_in_with_qc: [],
              pending_receipts_without_qc: [],
              pending_receipts_with_qc: [],
              immediate_order_without_qc: [],
              immediate_order_with_qc: [],
              order_cycle_without_qc: [],
              order_cycle_with_qc: [],
            };

            response?.data?.data.forEach((val) => {
              if (val?.week) {
                responseDataObject.fiscal_year_week_data.push(
                  moment(val?.week).format("MMM DD")
                );
              }

              if (val?.safety_stock || val?.safety_stock === 0) {
                responseDataObject.safety_stock.push(
                  Math.round(val?.safety_stock)
                );
              }
              if (val?.ecom_reserve || val?.ecom_reserve === 0) {
                responseDataObject.ecom_reserve.push(
                  Math.round(val.ecom_reserve)
                );
              }
              if (val?.total_dc_forecast || val?.total_dc_forecast === 0) {
                responseDataObject.inventory_out.push(
                  Math.round(-val?.total_dc_forecast)
                );
              }
              if (val?.forecast || val?.forecast === 0) {
                responseDataObject.sales_forecast.push(
                  Math.round(val.forecast)
                );
              }

              if (
                val?.exp_bop_dc_inv_without_qc ||
                val?.exp_bop_dc_inv_without_qc === 0
              ) {
                responseDataObject.projected_inventory_without_qc.push(
                  Math.round(val?.exp_bop_dc_inv_without_qc)
                );
              }
              if (
                val?.exp_bop_dc_inv_with_qc ||
                val?.exp_bop_dc_inv_with_qc == 0
              ) {
                responseDataObject.projected_inventory_with_qc.push(
                  Math.round(val?.exp_bop_dc_inv_with_qc)
                );
              }

              if (
                val?.po_receipts_without_qc ||
                val?.po_receipts_without_qc == 0
              ) {
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
                val?.roq_receipts_without_qc ||
                val?.roq_receipts_without_qc == 0
              ) {
                responseDataObject.recommended_inventory_in_without_qc.push(
                  Math.round(val?.roq_receipts_without_qc)
                );
              }
              if (val?.roq_receipts_with_qc || val?.roq_receipts_with_qc == 0) {
                responseDataObject.recommended_inventory_in_with_qc.push(
                  Math.round(val?.roq_receipts_with_qc)
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

              if (
                val?.Immediate_without_qc ||
                val?.Immediate_without_qc === 0
              ) {
                responseDataObject.immediate_order_without_qc.push(
                  Math.round(val?.Immediate_without_qc)
                );
              }
              if (val?.Immediate_with_qc || val?.Immediate_with_qc === 0) {
                responseDataObject.immediate_order_with_qc.push(
                  Math.round(val?.Immediate_with_qc)
                );
              }

              if (
                val?.Order_Cycle_without_qc ||
                val?.Order_Cycle_without_qc === 0
              ) {
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

            if (responseDataObject.fiscal_year_week_data.length > 0) {
              setDeepDiveChartData(responseDataObject);
              setFiscalYearWeek([...responseDataObject.fiscal_year_week_data]);
            }

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

  useEffect(() => {
    if (!_.isEmpty(deepDiveChartData)) {
      createGraphSeries();
    }
  }, [deepDiveChartData]);

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
            ? deepDiveChartData.commited_inventory_in_with_qc
            : deepDiveChartData.commited_inventory_in_without_qc;
          break;
        case 2:
          graphSeries.data = deepDiveChartData.safety_stock;
          break;
        case 3:
          graphSeries.data = deepDiveChartData.sales_forecast;
          break;
        case 4:
          graphSeries.data = deepDiveChartData.inventory_out;
          break;
        case 5:
          graphSeries.data = deepDiveChartData.ecom_reserve;
          break;
        case 6:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.immediate_order_with_qc
            : deepDiveChartData.immediate_order_without_qc;
          break;
        case 7:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.order_cycle_with_qc
            : deepDiveChartData.order_cycle_without_qc;
          break;
        case 8:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.recommended_inventory_in_with_qc
            : deepDiveChartData.recommended_inventory_in_without_qc;
          break;
        case 9:
          graphSeries.data = isELTEnabled
            ? deepDiveChartData.pending_receipts_with_qc
            : deepDiveChartData.pending_receipts_without_qc;
          break;
        default:
          graphSeries.data = [];
      }
      series.push(graphSeries);
    });
    setSeriesGraphData([...series]);
    let cols = formattingDeepDiveColumns(deepDiveTableColumns, isELTEnabled);
    setDeepDiveTableColumns(cols);
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

  const onSwitchChange = (event) => {
    let displayType = event.target.checked;
    createGraphSeries(displayType);
    setIsSwitchedChecked(displayType);
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
    <div>
      {isRender ? (
        <CustomAccordion label={"Deep Dive Graph"}>
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
                    checked={isSwitchedChecked}
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
                false,
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
        </CustomAccordion>
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
          <div className={globalClasses.marginVertical1rem}>
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

// const useStyles = makeStyles(() => ({
//   gridContainer: {
//     "& #myGrid .ag-body-viewport": {
//       maxHeight: "calc(100vh - 600px)",
//     },
//   },
// }));
