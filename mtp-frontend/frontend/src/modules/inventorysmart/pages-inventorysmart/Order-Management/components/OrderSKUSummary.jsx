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
  uploadOmsSkuSummaryFile,
  setOmsSkuSummaryApproveRequestSuccess,
} from "modules/inventorysmart/services-inventorysmart/Order-Management/order-management-service";
import moment from "moment";
import { cloneDeep } from "lodash";
import { ADA_VISUAL } from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import {
  INVALID_DATE,
  TENANT_DATE_FORMAT,
  UPDATED_MESSAGE,
  INVALID_ORDER_QTY,
  INVALID_ORDER_QTY_PACKSIZE,
  NOT_BEFORE_AFTER_DATE_ERROR_MESSAGE,
  OMS_FILE_UPLOAD_INSTRUCTIONS,
  ERROR_MESSAGE,
  OMS_WAIT_FOR_UPLOAD_PROCESS,
  UPLOAD_SUCCESS_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  tableArticleFilter,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { Button as IAButton } from "impact-ui";
import FileUploadIcon from "@mui/icons-material/FileUpload";
import UploadHandler from "core/commonComponents/uploadHandler";
import DownloadButton from "./DownloadButton";

const ERROR_MESSAGE_DATES_UPDATE = "Updating NBD and NAD Dates failed!";
const ERROR_MESSAGE_QUANTITY_UPDATE = "Updating Order Quantity failed!";

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
  const [isUpdateInProgress, setIsUpdateInProgress] = useState(false);

  const [manualBodyData, setManualBodyData] = useState({});
  const [totalCount, setTotalCount] = useState(0);
  const [disableButtonForSetAll, setDisableButtonForSetAll] = useState(false);
  const [selectionDataFromSetAll, setSelectionDataFromSetAll] = useState({});

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [skuSummaryColumns, setSkuSummaryColumns] = useState([]);
  const [uploadColumns, setUploadColumns] = useState([]);
  const validationHandler = useRef();

  const displaySnackMessages = (message, variance, isRefreshNeeded) => {
    if (!isRefreshNeeded) props.closeSnack();
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
        // if (!order.new_qty > 0) {
        //   invalidData = true;
        //   displaySnackMessages(EMPTY_ORDER_QTY, "error");
        //   return false;
        // } else {
        if (order.new_qty === 0) {
          invalidData = false;
          updatedOrderQuantityList.push({
            new_qty: order.new_qty,
            id: order.id,
          });
          return true;
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
        // }
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
        // setDisableButtonForSetAll(false)
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

    if (props?.filterDashboardConfiguration?.dependencyData?.length > 0) {
      props?.filterDashboardConfiguration?.dependencyData.forEach(
        (filterData) => {
          if (
            filterData.dimension === "product" &&
            filterData?.values?.length > 0
          ) {
            filters.push(filterData);
          }
        }
      );
    }

    if (props?.inventoryOrderManagementFilterDependency?.length > 0) {
      props?.inventoryOrderManagementFilterDependency.forEach((filterData) => {
        if (
          filterData.dimension === "product" &&
          filterData?.values?.length > 0
        ) {
          filters.push(filterData);
        }
      });
    }

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

  useEffect(() => {
    setSelectedSku([]);
    setIsSaveDisabled(true);
    setIsUpdateInProgress(true);
  }, [props.selectedFilters]);

  useEffect(() => {
    if (selectedSku.length > 0 || disableButtonForSetAll) {
      if (disableButtonForSetAll && !isSaveDisabled) {
        setIsSaveDisabled(false);
      }
      if (!disableButtonForSetAll && isSaveDisabled) {
        setIsUpdateInProgress(true);
      }
      if (isSaveDisabled) {
        setIsUpdateInProgress(false);
      } else {
        setIsUpdateInProgress(true);
      }
    } else {
      setIsUpdateInProgress(true);
    }
  }, [selectedSku, isSaveDisabled, disableButtonForSetAll]);

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

  const attachCallBacks = (callback) => {
    validationHandler.current = { validate: callback };
  };

  const handleUpload = async (file) => {
    try {
      const formData = new FormData();
      formData.append("csv_file", file);
      displaySnackMessages(OMS_WAIT_FOR_UPLOAD_PROCESS, "info");
      const res = await props.uploadOmsSkuSummaryFile(formData);
      setIsModalOpen(false);
      if (res?.data?.status) {
        displaySnackMessages(UPDATED_MESSAGE, "success");
        props.setOmsSkuSummaryApproveRequestSuccess(true);
        props?.setReloadKpi(true);
      } else {
        if (res?.data?.data?.length > 0) {
          res?.data?.data?.forEach((message) => {
            displaySnackMessages(message, "error", true);
          });
        } else displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (error) {
      if (error.response?.data?.data?.length) {
        validationHandler.current.validate(error.response?.data?.data);
      } else {
        displaySnackMessages(error?.data?.message || ERROR_MESSAGE, "error");
        validationHandler.current.validate([]);
      }
    }
  };

  useEffect(() => {
    if (skuSummaryColumns?.length > 0) {
      let columns = [];
      skuSummaryColumns.map((col) => {
        columns.push({
          label: col.label,
          key: col.column_name,
        });
      });
      setUploadColumns(columns);
    }
  }, [skuSummaryColumns]);

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
            lg={2}
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
        <Grid item xs={12} lg={7} container justifyContent={"flex-end"}>
          {props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible && (
            <Tooltip title="Update">
              <Button
                variant="contained"
                color="primary"
                className={classes.button}
                startIcon={<UpdateIcon />}
                onClick={updateEditedValues}
                disabled={
                  !isSaveDisabled && disableButtonForSetAll
                    ? false
                    : isSaveDisabled || disableButtonForSetAll
                }
              >
                Update
              </Button>
            </Tooltip>
          )}

          <Tooltip title="Review Forecast">
            <Button
              variant="contained"
              color="primary"
              className={classes.button}
              startIcon={<QueryStatsIcon />}
              onClick={redirectToADAVisual}
              disabled={
                isUpdateInProgress ||
                disableButtonForSetAll ||
                selectedSku.length > 10
              }
            >
              Review Forecast
            </Button>
          </Tooltip>
          {!props.isDeepDriveScreen && (
            <Button
              variant="outlined"
              color="primary"
              id="viewOrderDeepDive"
              className={classes.button}
              onClick={viewOrderDeepDive}
              disabled={
                isUpdateInProgress ||
                disableButtonForSetAll ||
                selectedSku.length > 10
              }
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
            disabled={
              isUpdateInProgress ||
              disableButtonForSetAll ||
              selectedSku.length > 10
            }
          >
            Create Scenario
          </Button>
          {props?.inventorysmartOmsCommonConfig?.isEditButton?.isVisible && (
            <div className={classes.button} style={{ marginLeft: "0.3125rem" }}>
              <IAButton
                variant="primary"
                id="uploadSkuSummary"
                onClick={() => setIsModalOpen(true)}
                icon={FileUploadIcon}
              />
              <UploadHandler
                handleUpload={handleUpload}
                isModalOpen={isModalOpen}
                setIsModalOpen={setIsModalOpen}
                attachCallBacks={attachCallBacks}
                jsonUpload={false}
                templateConfig={
                  uploadColumns?.length > 0 ? [...uploadColumns] : []
                }
                uploadInstructions={[...OMS_FILE_UPLOAD_INSTRUCTIONS]}
                tenantUploadConfig={{}}
                hideDownloadTemplateButton={true}
                onlyShowCSVUpload={true}
                customButtons={
                  <DownloadButton
                    isRedirectedFromDifferentPage={
                      props.isRedirectedFromDifferentPage
                    }
                    selectedOmsSku={props.selectedOmsSku}
                    ropDate={props?.ropDate}
                    recommRecieptDate={props?.recommRecieptDate}
                    manualBodyData={manualBodyData}
                    totalCount={totalCount}
                    isRecommended={isRecommended}
                    selectionDataFromSetAll={selectionDataFromSetAll}
                    disableButtonForSetAll={disableButtonForSetAll}
                  />
                }
              />
            </div>
          )}

          <DownloadButton
            isRedirectedFromDifferentPage={props.isRedirectedFromDifferentPage}
            selectedOmsSku={props.selectedOmsSku}
            ropDate={props?.ropDate}
            recommRecieptDate={props?.recommRecieptDate}
            manualBodyData={manualBodyData}
            totalCount={totalCount}
            isRecommended={isRecommended}
            selectionDataFromSetAll={selectionDataFromSetAll}
            disableButtonForSetAll={disableButtonForSetAll}
            isCalledForDownload={true}
          />
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
        setDisableButtonForSetAll={setDisableButtonForSetAll}
        setSelectionDataFromSetAll={setSelectionDataFromSetAll}
        setSkuSummaryColumns={setSkuSummaryColumns}
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
            selectionDataFromSetAll={selectionDataFromSetAll}
            isSelectAll={disableButtonForSetAll}
            selectedFilters={props.selectedFilters}
            manualBodyData={manualBodyData}
            tableConfigurationMetaData={tableConfigurationMetaData}
            isRedirectedFromDifferentPage={props.isRedirectedFromDifferentPage}
            tableArticleFilter={tableArticleFilter}
            selectedOmsSku={props.selectedOmsSku}
            ropDate={props.ropDate}
            recommRecieptDate={props.recommRecieptDate}
            isRecommended={isRecommended}
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
      ]?.appliedFilterData,
    inventorysmartOmsCommonConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartOmsCommonConfig,
    inventoryOrderManagementFilterDependency:
      store.inventorysmartReducer.inventorySmartOrderManagementService
        .inventoryOrderManagementFilterDependency,
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
  uploadOmsSkuSummaryFile: (payload) =>
    dispatch(uploadOmsSkuSummaryFile(payload)),
  setOmsSkuSummaryApproveRequestSuccess: (payload) =>
    dispatch(setOmsSkuSummaryApproveRequestSuccess(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(OrderSKUSummary);
