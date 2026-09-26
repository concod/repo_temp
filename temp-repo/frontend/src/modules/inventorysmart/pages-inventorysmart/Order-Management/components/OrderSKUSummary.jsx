import React, { useEffect, useState, useRef } from "react";
import globalStyles from "core/Styles/globalStyles";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { connect } from "react-redux";
import {
  deletePlans,
  setInventorysmartDeletePlanLoader,
} from "modules/inventorysmart/services-inventorysmart/Decision-Dashboard/decision-dashboard-services";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { Button, FormControl, Grid, Tooltip, Typography } from "@mui/material";
import { Switch } from "impact-ui";
import UpdateIcon from "@mui/icons-material/Update";
import DownloadIcon from "@mui/icons-material/Download";
import QueryStatsIcon from "@mui/icons-material/QueryStats";
import OrderManagementTable from "./OrderManagementTable";
import { Stack } from "@mui/system";
import {
  ORDER_MANAGEMENT_CREATE_SCENARIO,
  ORDER_MANAGEMENT_DEEP_DRIVE,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { useHistory } from "react-router";
import SendApprovalButton from "./SendApprovalButton";
import {
  editOmsSkuSummaryTableData,
  setEditSkuSummaryTableDataFailed,
  setEditSkuSummaryTableDataSuccess,
  setRedirectFromDeepDive,
  getOmsSkuSummaryTableConfiguration,
  getOmsSkuSummaryTableData,
  setIsFiltersValid,
  updateSkuSummaryNotBeforeAfterDates,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import moment from "moment";
import { cloneDeep } from "lodash";
import { ADA_VISUAL } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  INVALID_DATE,
  TENANT_DATE_FORMAT,
  OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
  UPDATED_MESSAGE,
  INVALID_ORDER_QTY,
  INVALID_ORDER_QTY_PACKSIZE,
  EMPTY_ORDER_QTY,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import {
  tableArticleFilter,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";

const ERROR_MESSAGE_DATES_UPDATE = "Updating NBD and NAD Dates failed!";
const ERROR_MESSAGE_QUANTITY_UPDATE = "Updating Order Quantity failed!";
const NOT_BEFORE_AFTER_DATE_COLUMN = "editable_not_before_after_date";

const OrderSKUSummary = function (props) {
  const globalClasses = globalStyles();
  const classes = useStyles();
  const history = useHistory();

  const [selectedPlanIds, setSelectedPlanIds] = useState([]);
  const [renderAgGrid, setRenderAgGrid] = useState(false);
  const [selectedSkuCount, setSelectedSkuCount] = useState(0);
  const [selectedSku, setSelectedSku] = useState([]);
  const [orderQuantity, setOrderQuantity] = useState([]);
  const [notBeforeAfterDates, setNotBeforeAfterDates] = useState([]);
  const [isRecommended, setIsRecommended] = useState(true);
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [updatedColumnProp, setUpdatedColumnProp] = useState(null);
  const [isQtySaveSuccess, setIsQtySaveSuccess] = useState(false);
  const [isDatesSaveSuccess, setIsDatesSaveSuccess] = useState(false);
  const [isUpdateInProgress, setIsUpdateInProgress] = useState(true);

  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const [totalCount, setTotalCount] = useState(0);

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const viewOrderDeepDrive = (data) => {
    setSelectedSku(data);
  };

  const viewOrderDeepDive = () => {
    props.setRedirectFromDeepDive(true);
    props.setIsFiltersValid(false);
    history.push({
      pathname: ORDER_MANAGEMENT_DEEP_DRIVE,
      data: selectedSku,
      isRedirectedFromOMS: true,
      isRedirectedFromDashboardPage: props.isRedirectedFromDifferentPage,
      isRecommended: isRecommended,
    });
  };

  const viewOrderCreateScenario = () => {
    props.setRedirectFromDeepDive(true);
    props.setIsFiltersValid(false);
    const url = `${ORDER_MANAGEMENT_CREATE_SCENARIO}?step=0`;
    history.push(url, {
      data: selectedSku,
      isRedirectedFromDifferentPage: props.isRedirectedFromDifferentPage,
      isRedirectedFromOMS: true,
      isRecommended: isRecommended,
    });
  };

  const saveOrderQuantity = (data, column) => {
    setOrderQuantity(data);
    column.colDef.cellStyle = {};
  };

  const saveUpdatedDates = (data, params) => {
    setNotBeforeAfterDates(data);
    params.column.colDef.cellStyle = {};
  };

  const updateEditedValues = () => {
    if (orderQuantity.length > 0 && notBeforeAfterDates.length > 0) {
      updateNotBeforeAfterDates();
      updateOrderQuantity();
      setUpdatedColumnProp("order_date");
    } else {
      if (orderQuantity.length > 0) {
        setUpdatedColumnProp("order");
        updateOrderQuantity();
      } else {
        updateNotBeforeAfterDates();
        setUpdatedColumnProp("date");
      }
    }
  };

  const updateNotBeforeAfterDates = async () => {
    let invalidData = false;
    let payload = [];
    if (notBeforeAfterDates && notBeforeAfterDates.length !== 0) {
      notBeforeAfterDates.forEach((row) => {
        if (
          moment(row.data.not_after_date).format(TENANT_DATE_FORMAT) ===
            INVALID_DATE ||
          moment(row.data.not_before_date).format(TENANT_DATE_FORMAT) ===
            INVALID_DATE
        ) {
          invalidData = true;
        } else if (row.isValueError) {
          invalidData = true;
        } else {
          payload.push(row.data);
        }
      });
    }
    if (!invalidData) {
      let body = {
        user: localStorage.getItem("name"),
        orders: payload,
      };
      let response = await props.updateSkuSummaryNotBeforeAfterDates(body);
      if (response.data.status) {
        setIsDatesSaveSuccess(true);
        props?.setReloadKpi(true);
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setIsSaveDisabled(true);
        setNotBeforeAfterDates([]);
      } else {
        setIsDatesSaveSuccess(true);
        setNotBeforeAfterDates([]);
        displaySnackMessages(ERROR_MESSAGE_DATES_UPDATE, "error");
      }
    } else {
      displaySnackMessages(NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE, "error");
    }
  };

  const updateOrderQuantity = async () => {
    let invalidData = false;
    let updatedOrderQuantityList = [];
    if (orderQuantity && orderQuantity.length !== 0) {
      orderQuantity.every((order) => {
        if (!order.new_qty > 0) {
          invalidData = true;
          displaySnackMessages(EMPTY_ORDER_QTY, "error");
          return false;
        } else {
          if (
            parseInt(order.new_qty) < parseInt(order.min_order_quantity) ||
            parseInt(order.new_qty) > parseInt(order.max_order_quantity)
          ) {
            invalidData = true;
            displaySnackMessages(INVALID_ORDER_QTY, "error");
            return false;
          } else if (
            parseInt(order.new_qty) % parseInt(order.pack_size) !==
            0
          ) {
            invalidData = true;
            displaySnackMessages(INVALID_ORDER_QTY_PACKSIZE, "error");
            return false;
          } else {
            updatedOrderQuantityList.push({
              new_qty: order.new_qty,
              id: order.id,
            });
            return true;
          }
        }
      });
    }
    if (!invalidData) {
      let body = {
        user: localStorage.getItem("name"),
        orders: updatedOrderQuantityList,
      };
      let response = await props.editOmsSkuSummaryTableData(body);
      if (response.data.status) {
        setIsQtySaveSuccess(true);
        props?.setReloadKpi(true);
        displaySnackMessages(UPDATED_MESSAGE, "success");
        setIsSaveDisabled(true);
        setOrderQuantity([]);
      } else displaySnackMessages(ERROR_MESSAGE_QUANTITY_UPDATE, "error");
    }
  };

  const switchValue = (event) => {
    setIsRecommended(event.target.checked);
    setSelectedSku([]);
    setIsUpdateInProgress(true);
    setIsSaveDisabled(true);
  };

  const redirectToADAVisual = () => {
    var selectedSkuId = [];
    var filters = [];
    selectedSku.filter((val) => {
      selectedSkuId.push(val.product_code);
    });
    props.filterDashboardConfiguration.appliedFilterData.dependencyData.forEach(
      (filterData) => {
        if (
          filterData.dimension === "product" &&
          filterData?.values?.length > 0
        ) {
          filters.push(filterData);
        }
      }
    );
    const adaPayload = {
      isRedirectedFromInventory: true,
      payload: {
        product_code: selectedSkuId,
        // store_code: storeCodes,
      },
      selectedDependency: cloneDeep(filters),
      selectedHistoricValue: 1,
      timeline: {
        startDate: moment().format("YYYY/MM/DD"),
        endDate: moment().add(8, "weeks").format("YYYY/MM/DD"), //setting the default timeline as 8 weeks from the current date (temporary implementation)
      },
    };
    localStorage.setItem("adaPayload", JSON.stringify(adaPayload));
    window.open(`${ADA_VISUAL}?type=alerts`, "_blank", "noopener,noreferrer");
  };

  const downloadCsv = async () => {
    let columns = await props.getOmsSkuSummaryTableConfiguration();
    let formattedColumns = agGridColumnFormatter(columns?.data?.data);
    if (props.isRedirectedFromDifferentPage) {
      var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
      skuFilter.values = [...props.selectedOmsSku];
    }
    if (totalCount > 0) {
      let body = {
        filters: props.isRedirectedFromDifferentPage
          ? [...props.selectedFilters, skuFilter]
          : [...props.selectedFilters],
        date_filter: [props.ropDate, props.recommRecieptDate],
        is_recommended: isRecommended,
        include_custom_order: false,
        current_cycle_order: true,
        order_status: OMS_SKU_SUMMARY_ALL_ORDERS_STATUS_SERIES,
        meta: manualBodyData?.sort
          ? {
              ...manualBodyData,
              limit: { limit: totalCount, page: 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: totalCount, page: 1 },
            },
      };
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");
      let response = await props.getOmsSkuSummaryTableData(body);
      if (response.data.status) {
        var downloadData = agGridRowFormatter(response.data.data);
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
        downloadData.forEach((val) => {
          let notBeforeDate = moment(val?.editable_not_before_date).format(
            TENANT_DATE_FORMAT
          );
          let notAfterDate = moment(val?.editable_not_after_date).format(
            TENANT_DATE_FORMAT
          );
          if (notBeforeDate !== INVALID_DATE && notAfterDate !== INVALID_DATE) {
            val[
              NOT_BEFORE_AFTER_DATE_COLUMN
            ] = `${notBeforeDate} - ${notAfterDate}`;
          } else {
            val[NOT_BEFORE_AFTER_DATE_COLUMN] = "";
          }
        });
        setCsvData(cloneDeep(downloadData), csvHeaders);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  };

  useEffect(() => {
    setSelectedSku([]);
    setIsSaveDisabled(true);
    setIsUpdateInProgress(true);
  }, [props.selectedFilters]);

  useEffect(() => {
    if (selectedSku.length > 0) {
      if (isSaveDisabled) setIsUpdateInProgress(false);
      else setIsUpdateInProgress(true);
    } else {
      setIsUpdateInProgress(true);
    }
  }, [selectedSku, isSaveDisabled]);

  useEffect(() => {
    if (updatedColumnProp === "order_date") {
      if (isQtySaveSuccess && isDatesSaveSuccess) {
        props?.setEditSkuSummaryTableDataSuccess(true);
        setIsQtySaveSuccess(false);
        setIsDatesSaveSuccess(false);
      }
    } else {
      if (
        (updatedColumnProp === "order" && isQtySaveSuccess) ||
        (updatedColumnProp === "date" && isDatesSaveSuccess)
      ) {
        props?.setEditSkuSummaryTableDataSuccess(true);
        setIsQtySaveSuccess(false);
        setIsDatesSaveSuccess(false);
      }
    }
  }, [isQtySaveSuccess, isDatesSaveSuccess]);

  return (
    <div>
      <Grid
        container
        className={globalClasses.marginVertical1rem}
        justifyContent={"space-between"}
      >
        <Grid container alignItems={"center"} item xs={6} lg={3}>
          <Typography variant="h6">SKU Summary</Typography>
        </Grid>
        {!props.isDeepDriveScreen && (
          <Grid
            container
            justifyContent={"flex-end"}
            alignItems={"center"}
            item
            xs={6}
            lg={3}
          >
            <FormControl>
              <Stack
                direction="row"
                spacing={0}
                alignItems="center"
                sx={{ mx: 2 }}
              >
                <Switch
                  defaultChecked
                  onChange={switchValue}
                  rightLabel="Recommended"
                  leftLabel="All"
                />
              </Stack>
            </FormControl>
          </Grid>
        )}
        <Grid item xs={12} lg={6} container justifyContent={"flex-end"}>
          {props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible && (
            <Tooltip title="Update">
              <Button
                variant="contained"
                color="primary"
                id="createProductBtn"
                className={classes.button}
                onClick={updateEditedValues}
                disabled={isSaveDisabled}
              >
                <UpdateIcon fontSize="small"></UpdateIcon>
              </Button>
            </Tooltip>
          )}

          <Tooltip title="Review Forecast">
            <Button
              variant="contained"
              color="primary"
              id="createProductBtn"
              className={classes.button}
              onClick={redirectToADAVisual}
              disabled={isUpdateInProgress}
            >
              <QueryStatsIcon fontSize="small"></QueryStatsIcon>
            </Button>
          </Tooltip>
          {!props.isDeepDriveScreen && (
            <Button
              variant="outlined"
              color="primary"
              id="viewOrderDeepDive"
              className={classes.button}
              onClick={viewOrderDeepDive}
              disabled={isUpdateInProgress}
            >
              Deep Dive
            </Button>
          )}
          <Button
            variant="outlined"
            color="primary"
            id="viewOrderCreateScenario"
            className={classes.button}
            onClick={viewOrderCreateScenario}
            disabled={isUpdateInProgress}
          >
            Create Scenario
          </Button>
          <Tooltip title="Download">
            <Button
              variant="contained"
              className={classes.button}
              onClick={async () => {
                await downloadCsv();
                downloadLink.current.link.click();
              }}
              startIcon={<DownloadIcon />}
              disabled={totalCount === 0}
            >
              Download
            </Button>
          </Tooltip>
          {downloadExcelLink(
            csvData,
            "sku_summary",
            downloadLink,
            csvHeaders,
            "",
            "",
            true
          )}
        </Grid>
      </Grid>
      <OrderManagementTable
        setSelectedPlanIds={setSelectedPlanIds}
        renderAgGrid={renderAgGrid}
        setRenderAgGrid={setRenderAgGrid}
        pagination={false}
        setSelectedSkuCount={setSelectedSkuCount}
        recommRecieptDate={props?.recommRecieptDate}
        ropDate={props?.ropDate}
        deepDive={viewOrderDeepDrive}
        saveOrderQuantity={saveOrderQuantity}
        saveUpdatedDates={saveUpdatedDates}
        isRecommended={isRecommended}
        isRedirectedFromDifferentPage={props.isRedirectedFromDifferentPage}
        setIsSaveDisabled={setIsSaveDisabled}
        setTotalCount={setTotalCount}
        fiscalCalendarData={props.fiscalCalendarData}
        setManualBodyData={setManualBodyData}
      />
      {!props.isDeepDriveScreen && (
        <Grid
          container
          className={globalClasses.marginVertical1rem}
          justifyContent={"center"}
        >
          <SendApprovalButton
            selectedSkuCount={selectedSku.length}
            ApproveOrderRequest={selectedSku}
            isSaveDisabled={isSaveDisabled}
            deepDive={viewOrderDeepDrive}
            isUpdateInProgress={isUpdateInProgress}
            setReloadKpi={props?.setReloadKpi}
          />
        </Grid>
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    selectedOmsSku:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedSku,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .selectedFilters,
    editOmsSkuSummaryTableDataSuccess:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .editOmsSkuSummaryTableDataSuccess,
    editOmsSkuSummaryTableDataFailed:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .editOmsSkuSummaryTableDataFailed,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ],
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
  };
};

const mapDispatchToProps = (dispatch) => ({
  deletePlans: (payload) => dispatch(deletePlans(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventorysmartDeletePlanLoader: (payload) =>
    dispatch(setInventorysmartDeletePlanLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  editOmsSkuSummaryTableData: (payload) =>
    dispatch(editOmsSkuSummaryTableData(payload)),
  updateSkuSummaryNotBeforeAfterDates: (payload) =>
    dispatch(updateSkuSummaryNotBeforeAfterDates(payload)),
  setEditSkuSummaryTableDataSuccess: (payload) =>
    dispatch(setEditSkuSummaryTableDataSuccess(payload)),
  setRedirectFromDeepDive: (payload) =>
    dispatch(setRedirectFromDeepDive(payload)),
  getOmsSkuSummaryTableConfiguration: (payload) =>
    dispatch(getOmsSkuSummaryTableConfiguration(payload)),
  getOmsSkuSummaryTableData: (payload) =>
    dispatch(getOmsSkuSummaryTableData(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderSKUSummary);
