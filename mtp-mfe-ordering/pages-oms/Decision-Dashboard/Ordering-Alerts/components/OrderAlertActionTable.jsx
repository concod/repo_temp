import React, { useState, useEffect, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { isEmpty } from "lodash";
import globalStyles from "core/Styles/globalStyles";
import makeStyles from "@mui/styles/makeStyles";
import moment from "moment/moment";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { replaceSpecialCharacter } from "core/Utils/functions/utils";
import { cloneDeep } from "lodash";
import DownloadIcon from "@mui/icons-material/Download";
import { getHeaderForExcel } from "core/Utils/functions/utils";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import { tenantConfigApiCache } from "core/actions/tenantConfigActions";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { Badge, Button, Switch } from "impact-ui-v3";
import {
  CONFIGURATION,
  CREATE_NEW_ORDER,
  ORDER_REPOSITORY,
  ORDER_MANAGEMENT_MATRIX_SUMMARY,
  ORDER_MANAGEMENT_PRODUCT_DETAILS,
  ORDER_MANAGEMENT_ORDER_DETAILS,
} from "modules/oms/constants-oms/routeConstants";
import {
  BLANK_LIST,
  defaultTableData,
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
  NO_DATA_FOUND,
  OMS_DASHBOARD_ALERT_ACTION_CONFIG,
  OMS_DASHBOARD_ALERTS_REDIRECT_ROUTES,
  OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";
import {
  getAlertsActionTableConfiguration,
  setAlertsActionTableConfigLoader,
} from "modules/oms/services-oms/Decision-Dashboard/alerts-actions-service";
import {
  getRecommendedOrderAlertsTableData,
  updateResolvedData,
} from "modules/oms/services-oms/Decision-Dashboard/ordering-alerts-service";
import PackConfigBottomSheet from "modules/oms/pages-oms/common/PackConfigBottomSheet";
import { getOmsCoreFiscalCalendar } from "modules/oms/services-oms/common/common-services";
import { getValidCheckConfiguration } from "modules/oms/utils-oms/utils";
import {
  ORDER_MANAGEMENT_FILTER_CONFIG,
  ORDER_MANAGEMENT_VENDOR_STORE_FILTER_CONFIG,
} from "modules/oms/constants-oms/apiConstants";

import { getOmsDeepDiveFilters } from "modules/oms/services-oms/Order-Management/order-management-service";
import { setOrderManagementProductDetailsFilters } from "modules/oms/services-oms/Order-Management/order-management-service";
import { setSelectedRowsFromOrderDetails } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import { setDeepDiveFiltersPayload } from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import {
  VENDOR_TO_STORE_DEEP_DIVE_FILTERS,
  setDeepDiveFilters,
} from "modules/oms/services-oms/Order-Management/order-management-vendor-to-store-service";
import ApprovalFlowDialog from "modules/oms/pages-oms/Order-Management/components/Approval-Flow-Dialog/ApprovalFlowDialog";
import ApprovalFlowDialogVendorStore from "modules/oms/pages-oms/Order-Management/VendorStore/components/Approval-Flow-Dialog-Vendor-Store/ApprovalFlowDialogVendorStore";
import DeepDiveBottomSheet from "modules/oms/pages-oms/Order-Management/VendorStore/components/Deep-Dive/DeepDiveBottomSheet";

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

const REDIRECT_TO_OMS = "Order Management";
const REDIRECT_TO_MATRIX_SUMMARY = "Matrix Summary";
const REDIRECT_TO_STYLE_ORDER_SUMMARY = "Style Order Summary";
const REDIRECT_TO_DEEP_DIVE = "Deep Dive";
const REDIRECT_TO_CREATE_NEW_ORDER = "Create New Order";
const REDIRECT_TO_CONFIGURATION = "Configuration";
const APPROVAL_FLOW = "Approval Flow";
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
  const [redirectButtons, setRedirectButtons] = useState([]);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [render, setRender] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const [tableDataLoader, setTableDataLoader] = useState(false);
  const recommendedPopUpApi = useRef(null);

  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const downloadLink = useRef(null);
  const [csvData, setCsvData] = useState([]);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});

  const [isResolvedSwitchChecked, setIsResolvedSwitchChecked] = useState(false);
  const [hideTable, setHideTable] = useState(false);

  // Pack Config Details
  const [packConfigState, setPackConfigState] = useState({
    isOpen: false,
    selectedArticle: "",
  });

  //Vendor To Store
  const [openDeepDive, setOpenDeepDive] = useState(false);
  const [checkAllSetAllRequest, setCheckAllSetAllRequest] = useState([]);

  const openDeepDiveBottomSheet = () => {
    preparePayloadForDeepDive();
    setOpenDeepDive(true);
  };
  const closeDeepDiveBottomSheet = () => {
    setOpenDeepDive(false);
    refreshTableData();
  };

  useEffect(() => {
    if (agGridInstance?.current) {
      agGridInstance.current.api.checkAllSetAllRequest = checkAllSetAllRequest;
    }
  }, [checkAllSetAllRequest]);

  const getCheckConfigurationForApproval = () => {
    let l_checkAllSetAllRequest = {
      searchColumns: agGridInstance?.current?.api?.getFilterModel(),
    };
    let setAllData;
    if (
      agGridInstance?.current?.api?.checkConfiguration[
        agGridInstance?.current?.api?.checkConfiguration.length - 2
      ]
    ) {
      setCheckAllSetAllRequest((old) => {
        if (!isEmpty(old)) {
          setAllData = [...old, l_checkAllSetAllRequest];
          return [...old, l_checkAllSetAllRequest];
        } else {
          setAllData = [l_checkAllSetAllRequest];
          return [l_checkAllSetAllRequest];
        }
      });
    }
    const selection = {
      data: getValidCheckConfiguration(
        agGridInstance?.current?.api?.checkConfiguration
      ),
      unique_columns: ["order_group_id"],
    };
    const checkConfig = {
      selection,
      set_all: setAllData,
      isSelectAllRecords: agGridInstance?.current?.api?.isSelectAllRecords,
    };
    return checkConfig;
  };

  const preparePayloadForDeepDive = () => {
    try {
      let appliedOMSFilters = cloneDeep(
        props?.filterDashboardConfiguration || []
      );

      const SELECTED_ROW_FILTER_CONFIG =
        props?.vendorToStoreScreenConfig?.oms_dashboard?.deep_dive
          ?.selected_product_filter || [];
      const filterConfigForOrderRow = SELECTED_ROW_FILTER_CONFIG?.[0] || {};

      const selectedIdsFromOrderTable = [];
      selectedRows.forEach((row) => {
        const columnId = filterConfigForOrderRow?.column_name;
        if (columnId && row[columnId]) {
          selectedIdsFromOrderTable.push(row[columnId]);
        }
      });

      const selectedRowsFilter = {
        filter_type: filterConfigForOrderRow?.type,
        attribute_name: filterConfigForOrderRow?.column_name,
        operator: "in",
        dimension: filterConfigForOrderRow?.dimension,
        values: [...selectedIdsFromOrderTable],
      };

      const checkConfigurationForDeepDive = getCheckConfigurationForApproval();
      let payload;
      if (checkConfigurationForDeepDive?.isSelectAllRecords) {
        payload = {
          filters: [...appliedOMSFilters],
        };
        props?.setSelectedRowsFromOrderDetails([]);
      } else {
        payload = {
          filters: [...appliedOMSFilters, selectedRowsFilter],
        };
        props?.setSelectedRowsFromOrderDetails(selectedRowsFilter);
      }

      props?.setDeepDiveFiltersPayload(payload);
    } catch (error) {
      console.log(
        "Error while creating Payload for Product details page",
        error
      );
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const sizeColumnClickHandler = useCallback((params) => {
    const article = params?.data?.article;
    if (article) {
      setPackConfigState({
        isOpen: true,
        selectedArticle: article,
      });
    }
  }, []);

  const handlePackConfigClose = useCallback(() => {
    setPackConfigState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  //For Send For Approval and Approve Scneario
  useEffect(() => {
    //Loads Fiscal Calendar and Filter COnfig
    const fetchFilters = async () => {
      try {
        let startYear = moment().year();
        let endYear = moment().year() + 2;
        let queryParams = `?start_fiscal_year=${startYear}&end_fiscal_year=${endYear}`;
        const getFinancialCalendarData = await getOmsCoreFiscalCalendar(
          queryParams
        );
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        console.log(error);
      }
    };
    fetchFilters();
  }, []);

  //Setting Product Details Filters and Deep Dive Filters in Vendor DC
  useEffect(() => {
    const fetchDeepDiveFiltersForVendorDC = async () => {
      try {
        let deepDiveFilters = await props?.getOmsDeepDiveFilters();
        let productDetailsFilters = [];
        if (deepDiveFilters?.data?.data?.length > 0) {
          productDetailsFilters.push(deepDiveFilters?.data?.data[0]);
        }
        props?.setOrderManagementProductDetailsFilters(productDetailsFilters);
      } catch (err) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };

    if (!props?.isCalledFromVendorStore) {
      if (
        props?.orderManagementProductDetailsFilters?.length === 0 ||
        localStorage.getItem("isRedirectedFromDashboardToOms")
      ) {
        fetchDeepDiveFiltersForVendorDC();
      }
    }
  }, []);

  //Fetches the Filters for Deep Dive and Sets the State in Vendor Store
  useEffect(() => {
    const getDeepDiveFiltersForVendorStore = async () => {
      try {
        const deepDiveFiltersResponse = await props?.tenantConfigApiCache(1, {
          attribute_name: VENDOR_TO_STORE_DEEP_DIVE_FILTERS,
        });
        const DEEP_DIVE_FILTERS =
          deepDiveFiltersResponse.data.data[0]?.attribute_value?.filters || [];
        props?.setDeepDiveFilters(DEEP_DIVE_FILTERS);
      } catch (error) {
        console.log(
          "Error in Fetching Deep Dive Filters for Vendor Store",
          error
        );
      }
    };
    if (
      props?.isCalledFromVendorStore &&
      props?.deepDiveFiltersForVendorStore?.length === 0
    ) {
      getDeepDiveFiltersForVendorStore();
    }
  }, []);

  const onApprovalComplete = async () => {
    let selectedIds = selectedRows.map((val) => val.id);
    let data = {
      ids: selectedIds,
      alert_id: props.alertId,
      vendor_store: props?.isCalledFromVendorStore ?? undefined,
    };
    let responseFromResolvedData = await props.updateResolvedData(data);
    if (!responseFromResolvedData?.data?.status) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log("Failed to update resolved data");
    }
  };

  const refreshTableData = () => {
    agGridInstance?.current?.api?.refreshServerSideStore({
      purge: true,
    });
    props?.setReloadAlerts(true);
    agGridInstance.current?.api?.deselectAll();
    setSelectedRows([]);
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      props.setAlertsActionTableConfigLoader(true);

      let columns;
      if (props.tableConfigName) {
        const payload = {
          tableConfigName: props.tableConfigName,
        };
        columns = await props.getAlertsActionTableConfiguration(payload);
      }
      let updatedColumns = columns?.data?.data?.filter(
        (col) => col.column_name !== "action"
      );

      if (props?.isActionButtonPresent) {
        let reviewRecommendationColumn = OMS_DASHBOARD_ALERT_ACTION_CONFIG[1];
        reviewRecommendationColumn.order_of_display = updatedColumns.length + 1;
        reviewRecommendationColumn.tc_code = updatedColumns[1]?.tc_code;
        reviewRecommendationColumn.tc_mapping_code =
          updatedColumns[1]?.tc_mapping_code;
        updatedColumns.push(reviewRecommendationColumn);
      }
      let formattedColumns = agGridColumnFormatter(
        updatedColumns,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );
      let isGrouping = false;
      let rowGroupingColumnIndex = 0;
      formattedColumns = formattedColumns.map((col, index) => {
        if (col?.extra?.is_grouping_key) {
          col.cellRenderer = "agGroupCellRenderer";
          isGrouping = true;
          rowGroupingColumnIndex = index;
        }
        col?.children?.map((child) => {
          if (child?.extra?.is_grouping_key) {
            child.cellRenderer = "agGroupCellRenderer";
            isGrouping = true;
          }

          if (child.column_name === "pack_id") {
            child.cellRenderer = (params, extraProps) => {
              const cellValue = params?.value || params?.data?.view_pack_config;

              if (cellValue === "View Pack Config") {
                return (
                  <Button
                    variant="url"
                    onClick={() => sizeColumnClickHandler(params)}
                  >
                    {cellValue}
                  </Button>
                );
              }

              return cellValue || "";
            };
          }

          return child;
        });

        if (col.column_name === "shipment_mode" && isGrouping) {
          col.cellRenderer = (params, extraProps) => {
            if (
              params.node.level === 0 &&
              Array.isArray(params.data?.shipment_modes) &&
              col.is_editable
            ) {
              col.options = params?.data?.shipment_modes.map((mode) => {
                return {
                  label: mode.shipment_mode,
                  value: mode.shipment_mode,
                };
              });
              return (
                <CellRenderers
                  cellData={params}
                  column={col}
                  extraProps={extraProps}
                  actions={null}
                ></CellRenderers>
              );
            } else {
              return (
                params?.data?.shipment_mode ||
                params?.data?.shipment_modes?.join(", ") ||
                ""
              );
            }
          };
        }

        if (col.column_name === "pack_id") {
          col.cellRenderer = (params, extraProps) => {
            const cellValue = params?.value || params?.data?.view_pack_config;

            if (cellValue === "View Pack Config") {
              return (
                <Button
                  variant="url"
                  onClick={() => sizeColumnClickHandler(params)}
                >
                  {cellValue}
                </Button>
              );
            }
            return cellValue || "";
          };
        }
        const targetIndexForBadge = isGrouping
          ? rowGroupingColumnIndex === 0
            ? 1
            : 0
          : 0;

        if (index === targetIndexForBadge) {
          col["minWidth"] = 200;
          col["width"] = 200;
          col.cellRenderer = (cellProps, extraProps) => {
            const is_resolved = cellProps?.data?.is_resolved;
            const value = cellProps?.value;
            return (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                {value}
                {is_resolved && (
                  <div>
                    <Badge
                      color="success"
                      label={"Reviewed"}
                      onClick={() => {}}
                      size="default"
                      variant="stroke"
                    />
                  </div>
                )}
              </div>
            );
          };
        }

        return col;
      });

      if (isGrouping) {
        formattedColumns = formattedColumns.map((col) => {
          if (col.column_name === "action") {
            col.cellRenderer = (params, extraProps) => {
              if (
                params.node.level === 0 &&
                params.data.product_details &&
                col.is_editable
              ) {
                return (
                  <CellRenderers
                    cellData={params}
                    column={col}
                    extraProps={extraProps}
                    actions={null}
                  ></CellRenderers>
                );
              } else {
                return "";
              }
            };
          }
          return col;
        });
      }
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
        if (
          (filter.dimension?.toLowerCase() || "") === "product" &&
          filter?.values?.length > 0
        ) {
          filters.filters.push(filter);
        }
      });
      let body = {
        data: {
          ...filters,
          vendor_store: props?.isCalledFromVendorStore ?? undefined,
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
      if (isResolvedSwitchChecked)
        body["data"]["show_non_reviewed"] = isResolvedSwitchChecked;
      setManualBodyData(body.data.meta);
      setTableDataLoader(true);

      let response = await props.getRecommendedOrderAlertsTableData(body);
      if (response.data.status) {
        setTableDataLoader(false);
        let alerts = response.data?.data.result.map((alert, index) => {
          alert.action = "View PO";
          return alert;
        });
        let formatedData = agGridRowFormatter(
          alerts,
          params?.api?.checkConfiguration,
          "unique_row_id"
        );
        if (response.data?.data.recommended) {
          recommendedPopUpApi.current = response.data?.data.recommended;
        }
        setRedirectButtons(props?.alertButtons || []);
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

  const handleReviewRecommendation = (redirect) => {
    if (selectedRows?.length === 0) {
      displaySnackMessages(BLANK_LIST, "error");
    } else if (redirect === APPROVAL_FLOW) {
      localStorage.setItem(
        "approvalFlowFilters",
        JSON.stringify(props?.selectedFilters)
      );
      setShowApprovalModal(true);
      onApprovalComplete();
    } else if (
      props?.isCalledFromVendorStore &&
      redirect === REDIRECT_TO_DEEP_DIVE
    ) {
      openDeepDiveBottomSheet();
      onApprovalComplete();
    } else {
      redirectToReviewRecommendation(redirect);
    }
  };

  const redirectToReviewRecommendation = async (redirect) => {
    try {
      if (props?.isCalledFromVendorStore)
        localStorage.setItem("isRedirectedFromVendorStore", "true");

      var selectedIds = [];
      let data = {
        ids: selectedIds,
        alert_id: props.alertId,
        vendor_store: props?.isCalledFromVendorStore ?? undefined,
      };
      selectedRows.filter((val) => {
        selectedIds.push(val.id);
      });

      //Storing Selected SKU IDs and FilterDependency in LocalStorage
      if (redirect === REDIRECT_TO_CREATE_NEW_ORDER) {
        var selectedSkuIds = [];
        selectedRows.filter((val) => {
          val.product_code && selectedSkuIds.push(val.product_code);
        });
        localStorage.setItem("selectedSku", JSON.stringify(selectedSkuIds));
      }

      const extraFilterLevels = [];
      props.redirectionLevel?.map((filterLevel) => {
        const values = selectedRows.map((row) => row?.[filterLevel]);
        extraFilterLevels.push({
          filter_type: "cascaded",
          attribute_name: filterLevel,
          filter_id: filterLevel,
          operator: "in",
          dimension: "product",
          values: [...values],
        });
      });

      const filterData = [
        ...(props.filterDashboardConfiguration ||
          props.filterDependencyData ||
          []),
        ...extraFilterLevels,
      ];

      localStorage.setItem(
        "selectedFiltersDependency",
        JSON.stringify(filterData)
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

      if (
        redirect === REDIRECT_TO_MATRIX_SUMMARY ||
        redirect === REDIRECT_TO_OMS
      ) {
        let responseFromResolvedData = await props.updateResolvedData(data);
        if (responseFromResolvedData?.data?.status) {
          agGridInstance?.current?.api?.refreshServerSideStore({
            purge: true,
          });
          props?.setReloadAlerts(true);
        }
        localStorage.setItem("isRedirectedFromDashboardToOms", true);
        localStorage.setItem(
          "redirect_filter_level",
          JSON.stringify(extraFilterLevels)
        );
        window.open(
          `${ORDER_MANAGEMENT_MATRIX_SUMMARY}?step=0&type=alerts`,
          "_blank",
          "noopener,noreferrer"
        );
      } else if (
        redirect === REDIRECT_TO_DEEP_DIVE ||
        redirect === REDIRECT_TO_STYLE_ORDER_SUMMARY
      ) {
        let selectedOptions = selectedRows.map((row) => row.style);
        let DEEP_DIVE_REDIRECTION_PAYLOAD = cloneDeep(
          OMS_PRODUCT_DETAILS_REDIRECTION_PAYLOAD
        );
        DEEP_DIVE_REDIRECTION_PAYLOAD.selectedFilters = filterData;
        DEEP_DIVE_REDIRECTION_PAYLOAD.selectedRowIds = selectedOptions;
        DEEP_DIVE_REDIRECTION_PAYLOAD.tabSelected = "deep_dive";

        if (redirect === REDIRECT_TO_STYLE_ORDER_SUMMARY) {
          DEEP_DIVE_REDIRECTION_PAYLOAD.tabSelected = "style_order_summary";
        }
        let responseFromResolvedData = await props.updateResolvedData(data);
        if (responseFromResolvedData?.data?.status) {
          agGridInstance?.current?.api?.refreshServerSideStore({
            purge: true,
          });
          props?.setReloadAlerts(true);
        }
        localStorage.setItem(
          "omsRedirectionDetails",
          JSON.stringify(DEEP_DIVE_REDIRECTION_PAYLOAD)
        );
        if (props?.isCalledFromVendorStore)
          window.open(
            `${ORDER_MANAGEMENT_ORDER_DETAILS}`,
            "_blank",
            "noopener,noreferrer"
          );
        else
          window.open(
            `${ORDER_MANAGEMENT_PRODUCT_DETAILS}`,
            "_blank",
            "noopener,noreferrer"
          );
      } else if (redirect === REDIRECT_TO_CREATE_NEW_ORDER) {
        window.open(
          `${CREATE_NEW_ORDER}?step=0&type=alerts`,
          "_blank",
          "noopener,noreferrer"
        );
        let responseFromResolvedData = await props.updateResolvedData(data);
        if (responseFromResolvedData?.data?.status) {
          // props?.setReloadKpi(true);
          agGridInstance?.current?.api?.refreshServerSideStore({
            purge: true,
          });
          props?.setReloadAlerts(true);
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
          // props?.setReloadKpi(true);
          agGridInstance?.current?.api?.refreshServerSideStore({
            purge: true,
          });
          props?.setReloadAlerts(true);
        }
      } else if (redirect === REDIRECT_TO_ORDER_REPOSITORY) {
        let responseFromResolvedData = await props.updateResolvedData(data);
        if (responseFromResolvedData?.data?.status) {
          agGridInstance?.current?.api?.refreshServerSideStore({
            purge: true,
          });
          props?.setReloadAlerts(true);
        }
        localStorage.removeItem("selectedSku");
        window.open(
          `${ORDER_REPOSITORY}?step=0&type=alerts`,
          "_blank",
          "noopener,noreferrer"
        );
      } else {
        displaySnackMessages("Error", "error");
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log(error);
    }
  };

  const onReviewClick = (data) => {
    props.onReviewClick(data, recommendedPopUpApi);
  };

  const downloadCsv = async () => {
    if (totalCount > 0) {
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");

      var filters = {
        filters: [],
      };
      props.selectedFilters.forEach((filter) => {
        if (
          filter.dimension.toLowerCase() === "product" &&
          filter?.values?.length > 0
        ) {
          filters.filters.push(filter);
        }
      });

      let body = {
        data: {
          ...filters,
          vendor_store: props?.isCalledFromVendorStore ?? undefined,
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

      let response = await props.getRecommendedOrderAlertsTableData(body);
      if (response.data.status) {
        let downloadData = agGridRowFormatter(response?.data?.data?.result);
        let formattedColumns = agGridColumnFormatter(
          alertsActionTableTableConfig,
          null,
          null,
          null,
          null,
          null,
          null,
          true
        );
        let csvDwlndData = [];
        downloadData.forEach((data) => {
          if (
            data?.product_details &&
            Array.isArray(data?.product_details) &&
            data?.product_details.length > 0
          ) {
            data.product_details.forEach((productDetail) => {
              // Copy missing fields from `data` to `productDetail`
              Object.keys(data).forEach((key) => {
                if (!productDetail.hasOwnProperty(key)) {
                  productDetail[key] = data[key];
                }
              });

              // Append updated productDetail to csvDwlndData
              csvDwlndData.push(productDetail);
            });
          } else {
            csvDwlndData = [...csvDwlndData, ...data];
          }
        });

        csvDwlndData = csvDwlndData.map((obj) =>
          Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [
              key,
              typeof value === "string"
                ? replaceSpecialCharacter(value)
                : value,
            ])
          )
        );

        setCsvData(cloneDeep(csvDwlndData));
        setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } else {
      displaySnackMessages(NO_DATA_FOUND, "info");
    }
  };

  const onBlur = (
    _e,
    data,
    column,
    isChanged,
    value,
    _initialValue,
    cellData
  ) => {
    const colDef = column?.colDef;
    if (
      colDef.column_name === "shipment_mode" &&
      colDef.is_editable &&
      Array.isArray(data?.shipment_modes)
    ) {
      //BASED ON THE SHIPMENT MODES, WE NEED TO UPDATE THE LEAD TIME
      const shipment = data?.shipment_modes?.find(
        (mode) => mode.shipment_mode === data.shipment_mode
      );
      if (shipment) {
        cellData.node.data.lead_time = shipment?.lead_time || 0;
      }
      agGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        columns: ["lead_time"],
        rowNodes: [cellData.node],
      });
    }
  };

  const getTopRightOptions = () => {
    let options = [];
    const buttonTypes = ["secondary", "primary"];

    if (selectedRows?.length) {
      if (redirectButtons?.length) {
        redirectButtons.forEach((link, index) => {
          options.push(
            <Button
              variant={link?.type ?? buttonTypes[index]}
              type="default"
              key={index}
              id="productSetAllBtn"
              className={classes.button}
              disabled={selectedRows.length === 0}
              onClick={() => handleReviewRecommendation(link?.link)}
            >
              {link?.label || OMS_DASHBOARD_ALERTS_REDIRECT_ROUTES[link]}
            </Button>
          );
        });
      }
    } else {
      if (!props?.screenConfig?.show_non_review_toggle) {
        options.push(
          <Switch
            id="review-non-reviewed"
            checked={isResolvedSwitchChecked}
            onChange={(event) => onResolvedSwitchChange()}
            leftLabel={"See Non-Reviewed"}
            rightLabel={""}
          />
        );
      }

      options.push(
        <>
          {downloadExcelLink(
            csvData,
            props?.tableConfigName,
            downloadLink,
            csvHeaders,
            "",
            "",
            true
          )}
        </>
      );
    }

    return options;
  };

  const onDownloadButtonClick = async () => {
    try {
      await downloadCsv();
      downloadLink.current.link.click();
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const onResolvedSwitchChange = () => {
    setIsResolvedSwitchChecked(!isResolvedSwitchChecked);
    setTableDataLoader(true);
    setHideTable(true);
  };

  useEffect(() => {
    if (hideTable) {
      setTableDataLoader(false);
      setHideTable(false);
    }
  }, [hideTable]);

  const getRowStyleAlertTable = (params) => {
    if (props?.screenConfig?.add_row_color && params?.data?.is_resolved) {
      return { background: "rgb(57 255 20 / 20%)" };
    }
  };

  return (
    <>
      {render && (
        <Loader
          loader={props.alertsActionTableConfigLoader || tableDataLoader}
          minHeight={"188px"}
        >
          {!hideTable && (
            <AgGridComponent
              columns={alertsActionTableTableConfig}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              onReviewClick={(tableInfo) => onReviewClick(tableInfo.data)}
              uniqueRowId={"unique_row_id"}
              loadTableInstance={loadAlertsTableInstance}
              onSelectionChanged={onSelectionChanged}
              getRowStyle={(params) => {
                getRowStyleAlertTable(params);
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
              hideChildSelection={true}
              showSetAll={false}
              purgeClosedRowNodes={true}
              suppressAggFuncInHeader={true}
              suppressClickEdit={true}
              groupDisplayType={"custom"}
              treeData={true}
              childKey={"product_details"}
              onBlur={onBlur}
              tableHeader={props?.alertName}
              topRightOptions={getTopRightOptions()}
              showDownloadButton
              onDownloadButtonClick={onDownloadButtonClick}
              closeButton
              handleCloseButtonClick={() => {
                if (typeof props?.setSelectedAlertIndex === "function")
                  props?.setSelectedAlertIndex(-1);
              }}
            />
          )}

          {redirectButtons && (
            <>
              {showApprovalModal &&
                (props?.isCalledFromVendorStore ? (
                  <ApprovalFlowDialogVendorStore
                    setShowApprovalModal={setShowApprovalModal}
                    screenName={ORDER_MANAGEMENT_VENDOR_STORE_FILTER_CONFIG}
                    fiscalCalendarDetails={fiscalCalendarDetails}
                    selectedRows={selectedRows}
                    targetTable={"alerts_action_table"}
                    reloadComponent={refreshTableData}
                  />
                ) : (
                  <ApprovalFlowDialog
                    setShowApprovalModal={setShowApprovalModal}
                    screenName={ORDER_MANAGEMENT_FILTER_CONFIG}
                    fiscalCalendarDetails={fiscalCalendarDetails}
                    selectedRows={selectedRows}
                    targetTable={"alerts_action_table"}
                    reloadComponent={refreshTableData}
                  />
                ))}
            </>
          )}

          {openDeepDive && (
            <DeepDiveBottomSheet
              selectedRows={selectedRows}
              onClose={closeDeepDiveBottomSheet}
            />
          )}

          {packConfigState.isOpen && (
            <PackConfigBottomSheet
              openPackConfigDetailSheet={packConfigState.isOpen}
              setOpenPackConfigDetailSheet={handlePackConfigClose}
              l1DisplayName="Master SKU ID"
              activeChildHierarchyKey={packConfigState.selectedArticle}
              screenName={props.tableConfigName}
            />
          )}
        </Loader>
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    alertsActionTableConfigLoader:
      store.omsReducer.omsAlertsActionsService.alertsActionTableConfigLoader,
    selectedFilters: store.omsReducer.orderingDashboardService.selectedFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "decisionDashboardFilterConfiguration"
      ]?.appliedFilterData?.dependencyData,

    filterDependencyData:
      store.omsReducer.orderingDashboardService.filterDependencyData,
    orderingAccessControl:
      store.omsReducer.orderingCommonService?.orderingAccessControl,
    orderManagementProductDetailsFilters:
      store.omsReducer.orderManagementService
        .orderManagementProductDetailsFilters,

    deepDiveFiltersForVendorStore:
      store.omsReducer?.orderManagementVendorToStoreService?.deepDiveFilters,
    vendorToStoreScreenConfig:
      store.omsReducer.orderingCommonService?.orderingVendorToStoreConfig,
    screenConfig:
      store.omsReducer.orderingCommonService?.orderingScreensConfig
        ?.decision_dashboard,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getAlertsActionTableConfiguration: (payload) =>
    dispatch(getAlertsActionTableConfiguration(payload)),
  setAlertsActionTableConfigLoader: (payload) =>
    dispatch(setAlertsActionTableConfigLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  getRecommendedOrderAlertsTableData: (payload) =>
    dispatch(getRecommendedOrderAlertsTableData(payload)),
  updateResolvedData: (payload) => dispatch(updateResolvedData(payload)),
  getOmsDeepDiveFilters: () => dispatch(getOmsDeepDiveFilters()),
  setOrderManagementProductDetailsFilters: (payload) =>
    dispatch(setOrderManagementProductDetailsFilters(payload)),
  setSelectedRowsFromOrderDetails: (payload) =>
    dispatch(setSelectedRowsFromOrderDetails(payload)),
  setDeepDiveFiltersPayload: (payload) =>
    dispatch(setDeepDiveFiltersPayload(payload)),
  setDeepDiveFilters: (payload) => dispatch(setDeepDiveFilters(payload)),
  tenantConfigApiCache: (application, queryParam) =>
    dispatch(tenantConfigApiCache(application, queryParam)),
});

export default connect(mapStateToProps, mapDispatchToProps)(AlertsActionTable);
