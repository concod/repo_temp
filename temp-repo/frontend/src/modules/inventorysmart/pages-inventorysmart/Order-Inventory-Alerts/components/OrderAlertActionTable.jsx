import React, { useState, useEffect, useRef } from "react";
import { connect } from "react-redux";
import {
  getAlertsActionTableConfiguration,
  setAlertsActionTableConfigLoader,
  reviewAlerts,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/alerts-actions-service";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  BLANK_LIST,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  STORE_INVENTORY_ALERT_ACTION_CONFIG,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
  defaultTableData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import {
  getRecommendedOrderAlertsTableData,
  updateResolvedData,
} from "modules/inventorysmart/services-inventorysmart/StoreInventoryAlerts/store-order-alerts-service";
import { isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import { Box, Button, Grid, Tooltip } from "@mui/material";
import moment from "moment/moment";
import {
  CONFIGURATION,
  CREATE_NEW_ORDER,
  ORDER_MANAGEMENT,
  ORDER_MANAGEMENT_DEEP_DRIVE,
  ORDER_REPOSITORY,
} from "modules/inventorysmart/constants-inventorysmart/routesConstants";
import { cloneDeep } from "lodash";
import DownloadIcon from "@mui/icons-material/Download";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { downloadExcelLink } from "core/Utils/csv-download/index";

const useStyles = makeStyles((theme) => ({
  moduleTitle: {
    ...theme.typography.h3,
  },
  dialogContentBody: {
    borderTop: "none",
  },
  paperFullWidth: {
    overflowY: "visible",
    minWidth: "80%",
  },
  dialogRoot: {
    "& .MuiDialog-paperWidthSm": {
      width: "35rem !important",
      borderRadius: "0.6rem",
    },
  },
}));

const GET_INITIAL_PROGRAM_SKU_DETAILS =
  "/oms/oms_decision_dashboard/get_initial_program_sku_details";
const GET_EXPEDITE_ORDERS_ALERTS_DETAILS =
  "inventorysmart_oms_expedite_orders_alerts_details";

const REDIRECT_TO_OMS = "Order Management";
const REDIRECT_TO_DEEP_DIVE = "Deep Dive";
const REDIRECT_TO_CREATE_NEW_ORDER = "Create New Order";
const REDIRECT_TO_CONFIGURATION = "Configuration";
const REDIRECT_TO_ORDER_REPOSITORY = "Order Repository";

const AlertsActionTable = (props) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const [
    alertsActionTableTableConfig,
    setAlertsActionTableTableConfig,
  ] = useState([]);
  const [alertsActionTableData, setAlertsActionTableData] = useState([]);
  const agGridInstance = useRef(null);
  const [totalCount, setTotalCount] = useState(0);
  const [redirect, setRedirect] = useState();
  const [render, setRender] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableDataLoader, setTableDataLoader] = useState(false);
  const recommendedPopUpApi = useRef(null);

  const downloadLink = useRef(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setAlertsActionTableConfigLoader(true);

      let columns;
      if (props.tableConfigName) {
        const payload = {
          tableConfigName: props.tableConfigName,
        };
        columns = await props.getAutoRecommendationTableConfiguration(payload);
      }
      if (props.tableConfigName == GET_EXPEDITE_ORDERS_ALERTS_DETAILS) {
        let reviewRecommendationColumn = STORE_INVENTORY_ALERT_ACTION_CONFIG[1];
        reviewRecommendationColumn.order_of_display =
          columns.data.data.length + 1;
        reviewRecommendationColumn.tc_code = columns.data.data[1]?.tc_code;
        reviewRecommendationColumn.tc_mapping_code =
          columns.data.data[1]?.tc_mapping_code;

        columns.data.data.push(reviewRecommendationColumn);
      }
      let formattedColumns = agGridColumnFormatter(columns?.data?.data);
      setAlertsActionTableTableConfig(formattedColumns);
      props.setAlertsActionTableConfigLoader(false);
      setRender(true);
    };
    fetchColumnConfig();

    return () => {
      setAlertsActionTableTableConfig([]);
      setAlertsActionTableData([]);
    };
  }, []);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      var filters = {
        filters: [],
      };
      props.selectedFilters.forEach((filter) => {
        if (filter.dimension === "Product" && filter?.values?.length > 0) {
          filters.filters.push(filter);
        }
      });
      let body = {
        data: {
          ...filters,
          meta: manualbody
            ? {
                ...manualbody,
                limit: { limit: 10, page: pageIndex + 1 },
              }
            : {
                limit: {
                  limit: 10,
                  page: Number(pageIndex) ? pageIndex + 1 : 1,
                },
              },
        },
        tableDataApi: props?.tableDataApiName,
      };
      setManualBodyData(body.data.meta);
      setTableDataLoader(true);
      let response = await props.getRecommendedOrderAlertsTableData(body);
      if (response.data.status) {
        setTableDataLoader(false);
        let alerts = response.data?.data.result.map((alert, index) => {
          if (alert.column_name === "action") {
            alert.is_hidden = true;
          }
          alert.action = "View PO";
          return alert;
        });
        let formatedData = agGridRowFormatter(
          alerts,
          params?.api?.checkConfiguration,
          "product_code"
        );
        if (response.data?.data.recommended) {
          recommendedPopUpApi.current = response.data?.data.recommended;
        }
        setRedirect(response.data?.data.redirect);
        setTotalCount(response.data?.total);
        return { data: formatedData, totalCount: response.data?.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        // props.setConstraintsStatusTableDataLoader(false);
        return defaultTableData;
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      // props.setConstraintsStatusTableDataLoader(false);
      return defaultTableData;
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
    !isEmpty(props.selectedFilters) && setRender(false);
  }, [props.selectedFilters]);

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];
    agGridInstance.current.api.forEachNode((node) => {
      node.selected && selectedRows.push({ ...node.data });
    });
    setSelectedRows(selectedRows);
  };

  const loadAlertsTableInstance = (params) => {
    agGridInstance.current = params;
  };

  const handleReviewRecommendation = (extraRedirect) => {
    if (selectedRows?.length === 0) {
      displaySnackMessages(BLANK_LIST, "error");
    } else {
      redirectToReviewRecommendation(extraRedirect);
    }
  };

  const redirectToReviewRecommendation = async (extraRedirect) => {
    var selectedIds = [];
    let data = {
      ids: selectedIds,
      alert_id: props.alertId,
    };
    selectedRows.filter((val) => {
      selectedIds.push(val.id);
    });

    //Storing Selected SKU IDs and FilterDependency in LocalStorage
    if (
      redirect !== REDIRECT_TO_DEEP_DIVE ||
      extraRedirect === REDIRECT_TO_CREATE_NEW_ORDER
    ) {
      var selectedSkuIds = [];
      selectedRows.filter((val) => {
        selectedSkuIds.push(val.product_code);
      });
      localStorage.setItem("selectedSku", JSON.stringify(selectedSkuIds));
    }

    localStorage.setItem(
      "selectedFiltersDependency",
      JSON.stringify(
        props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
          []
      )
    );

    //Storing startDate and endDate in LocalStorage
    let weekStartDay = moment().startOf("week");
    let weekEndDay = moment().endOf("week").day(14);
    localStorage.setItem(
      "startDate",
      JSON.stringify(moment(weekStartDay).format("YYYY-MM-DD"))
    );
    localStorage.setItem(
      "endDate",
      JSON.stringify(moment(weekEndDay).format("YYYY-MM-DD"))
    );

    if (redirect === REDIRECT_TO_OMS) {
      let responseFromResolvedData = await props.updateResolvedData(data);
      if (responseFromResolvedData?.data?.status) {
        props?.setReloadKpi(true);
        agGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
      localStorage.setItem(
        "selectedFiltersDependency",
        JSON.stringify(
          props.filterDashboardConfiguration.appliedFilterData.dependencyData ||
            []
        )
      );
      window.open(
        `${ORDER_MANAGEMENT}?step=0&type=alerts`,
        "_blank",
        "noopener,noreferrer"
      );
    } else if (
      (redirect === REDIRECT_TO_DEEP_DIVE && extraRedirect === undefined) ||
      (redirect === REDIRECT_TO_CREATE_NEW_ORDER &&
        extraRedirect === REDIRECT_TO_DEEP_DIVE)
    ) {
      var SkuIds = [];
      selectedRows.filter((val) => {
        SkuIds.push({ product_code: val.product_code, loc_code: val.loc_code });
      });
      localStorage.setItem("selectedSku", JSON.stringify(SkuIds || []));

      let responseFromResolvedData = await props.updateResolvedData(data);
      if (responseFromResolvedData?.data?.status) {
        props?.setReloadKpi(true);
        agGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
      window.open(
        `${ORDER_MANAGEMENT_DEEP_DRIVE}?step=0&type=alerts`,
        "_blank",
        "noopener,noreferrer"
      );
    } else if (
      (redirect === REDIRECT_TO_CREATE_NEW_ORDER &&
        extraRedirect === undefined) ||
      (redirect === REDIRECT_TO_DEEP_DIVE &&
        extraRedirect === REDIRECT_TO_CREATE_NEW_ORDER)
    ) {
      window.open(
        `${CREATE_NEW_ORDER}?step=0&type=alerts`,
        "_blank",
        "noopener,noreferrer"
      );
      let responseFromResolvedData = await props.updateResolvedData(data);
      if (responseFromResolvedData?.data?.status) {
        props?.setReloadKpi(true);
        agGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
    } else if (redirect === REDIRECT_TO_CONFIGURATION) {
      //let a = await props.updateResolvedData(data)
      var selectedArticleIds = [];
      selectedRows.filter((val) => {
        selectedArticleIds.push(val.product_code);
      });
      localStorage.setItem(
        "selectedArticles",
        JSON.stringify(selectedArticleIds)
      );
      window.open(
        `${CONFIGURATION}?type=alerts`,
        "_blank",
        "noopener,noreferrer"
      );
      let responseFromResolvedData = await props.updateResolvedData(data);
      if (responseFromResolvedData?.data?.status) {
        props?.setReloadKpi(true);
        agGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
    } else if (redirect === REDIRECT_TO_ORDER_REPOSITORY) {
      window.open(
        `${ORDER_REPOSITORY}?step=0&type=alerts`,
        "_blank",
        "noopener,noreferrer"
      );
      let responseFromResolvedData = await props.updateResolvedData(data);
      if (responseFromResolvedData?.data?.status) {
        props?.setReloadKpi(true);
        agGridInstance?.current?.api?.refreshServerSideStore({
          purge: true,
        });
      }
    } else {
      displaySnackMessages("Error", "error");
    }
  };

  const onReviewClick = (data) => {
    props.onReviewClick(data, recommendedPopUpApi);
  };

  const downloadCsv = async () => {
    if (totalCount > 0) {
      var filters = {
        filters: [],
      };
      props.selectedFilters.forEach((filter) => {
        if (filter.dimension === "Product" && filter?.values?.length > 0) {
          filters.filters.push(filter);
        }
      });

      let body = {
        data: {
          ...filters,
          meta: manualBodyData?.sort
            ? {
                ...manualBodyData,
                limit: { limit: totalCount, page: 1 },
              }
            : {
                ...tableConfigurationMetaData.meta,
                limit: { limit: totalCount, page: 1 },
              },
        },
        tableDataApi: props?.tableDataApiName,
      };
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");

      let response = await props.getRecommendedOrderAlertsTableData(body);
      if (response.data.status) {
        let downloadData = agGridRowFormatter(response?.data?.data?.result);
        let formattedColumns = agGridColumnFormatter(
          alertsActionTableTableConfig,
          null
        );
        setCsvData(cloneDeep(downloadData), formattedColumns);
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  };

  return (
    <>
      {!props.alertsActionTableConfigLoader && !tableDataLoader && (
        <Box
          sx={{ display: "flex", justifyContent: "flex-end" }}
          className={globalClasses.marginBottom}
        >
          <Tooltip title="Download">
            <Button
              variant="contained"
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
            props?.tableConfigName,
            downloadLink,
            csvHeaders,
            "",
            "",
            true
          )}
        </Box>
      )}

      {render && (
        <Loader
          loader={props.alertsActionTableConfigLoader || tableDataLoader}
          minHeight={"188px"}
        >
          <AgGridComponent
            columns={alertsActionTableTableConfig}
            manualCallBack={(body, pageIndex, params) =>
              manualCallBack(body, pageIndex, params)
            }
            onReviewClick={(tableInfo) => onReviewClick(tableInfo.data)}
            uniqueRowId={"product_code"}
            loadTableInstance={loadAlertsTableInstance}
            onSelectionChanged={onSelectionChanged}
            getRowStyle={(params) => {
              if (params?.data?.is_resolved) {
                return { background: "rgb(57 255 20 / 20%)" };
              }
            }}
            totalCount={totalCount}
            cacheBlockSize={10}
            serverSideStoreType="partial"
            rowModelType="serverSide"
            rowSelection="multiple"
            onRowSelected
            selectAllHeaderComponent={true}
            hideSelectAllRecords={true}
            skipAutoSizeColumn
          />

          {redirect && (
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
                id="productSetAllBtn"
                className={classes.button}
                disabled={selectedRows.length == 0}
                onClick={() => handleReviewRecommendation()}
              >
                {redirect}
              </Button>

              {redirect === REDIRECT_TO_CREATE_NEW_ORDER && (
                <div style={{ margin: "inherit" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    id="productSetAllBtn"
                    className={classes.button}
                    disabled={selectedRows.length == 0}
                    onClick={() =>
                      handleReviewRecommendation(REDIRECT_TO_DEEP_DIVE)
                    }
                  >
                    {REDIRECT_TO_DEEP_DIVE}
                  </Button>
                </div>
              )}

              {redirect === REDIRECT_TO_DEEP_DIVE && (
                <div style={{ margin: "inherit" }}>
                  <Button
                    variant="contained"
                    color="primary"
                    id="redirect_to_create_new_order"
                    className={classes.button}
                    disabled={selectedRows.length == 0}
                    onClick={() =>
                      handleReviewRecommendation(REDIRECT_TO_CREATE_NEW_ORDER)
                    }
                  >
                    {REDIRECT_TO_CREATE_NEW_ORDER}
                  </Button>
                </div>
              )}
            </Grid>
          )}
        </Loader>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    alertsActionTableConfigLoader:
      store.inventorysmartReducer.inventorySmartAlertsActionService
        .alertsActionTableConfigLoader,
    selectedFilters:
      store.inventorysmartReducer.inventorySmartDashboardService
        .selectedFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ],
  };
};

const mapDispatchToProps = (dispatch) => ({
  getAutoRecommendationTableConfiguration: (payload) =>
    dispatch(getAlertsActionTableConfiguration(payload)),
  setAlertsActionTableConfigLoader: (payload) =>
    dispatch(setAlertsActionTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getRecommendedOrderAlertsTableData: (payload) =>
    dispatch(getRecommendedOrderAlertsTableData(payload)),
  updateResolvedData: (payload) => dispatch(updateResolvedData(payload)),
  reviewAlerts: (payload) => dispatch(reviewAlerts(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AlertsActionTable);
