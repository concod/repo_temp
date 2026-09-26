import Loader from "core/Utils/Loader/loader";
import React, { useEffect, useState, useRef, useCallback } from "react";
import { connect } from "react-redux";
import { cloneDeep, isEmpty, map, mapValues, remove, some } from "lodash";
import moment from "moment";
import CommentIcon from "@mui/icons-material/Comment";
import HistoryIcon from "@mui/icons-material/History";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import { Button, Prompt, Tooltip } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import { useStyles } from "core/Utils/styles/inventorySmartUseStyles";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import StyledChip from "core/Utils/chip/StyledChip";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { downloadExcelLink } from "core/Utils/csv-download/index";
import {
  getHeaderForExcel,
  replaceSpecialCharacter,
} from "core/Utils/functions/utils";
import { getValidCheckConfiguration } from "modules/oms/utils-oms/utils";
import {
  EMPTY_ORDER_QTY,
  ERROR_MESSAGE,
  FILE_DOWNLOADING_MESSAGE,
  INVALID_VALUE_MESSAGE,
  NO_DATA_FOUND,
  TENANT_DATE_FORMAT,
  defaultTableData,
  tableConfigurationMetaData,
  INVALID_ORDER_QTY,
  UPDATED_MESSAGE,
  DELETED_MESSAGE,
  tableArticleFilter,
  ORDER_STATUS_GROUPING_BGCOLOR_MAPPER,
  OMS_ORDER_GEN_TYPE_CHIP_KEY,
  OMS_ORDER_STATUS_CHIP_KEY,
  ORDER_QUANTITY_EACHES_COLUMN,
} from "modules/oms/constants-oms/stringConstants";
import CommentPopup from "../VendorStore/CommentPopup";
import CommentHistoryPanel from "../VendorStore/CommentHistoryPanel";
import PackConfigBottomSheet from "../../common/PackConfigBottomSheet";
import {
  deleteOrders,
  getTableConfiguration,
  getTableDataForVendorDC,
  getTableDataForVendorStore,
  sendOrdersForApproval,
  setTableConfigLoader,
  setOrdersTableData,
  setTableLoader,
  saveComment,
  updateOrders,
} from "modules/oms/services-oms/Order-Repository/order-repository-service";

const OrderRepositoryApprovedTable = (props) => {
  const classes = useStyles();
  const [approvedTableColumns, setApprovedTableColumns] = useState([]);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedSku, setSelectedSku] = useState([]);
  const skuSummaryTableGridInstance = useRef(null);

  const downloadLink = useRef(null);
  const [csvHeaders, setCsvHeaders] = useState([]);
  const [csvData, setCsvData] = useState([]);
  const [dateColumns, setDateColumns] = useState([]);
  const [manualBodyData, setManualBodyData] = useState({});
  const [totalCount, setTotalCount] = useState(0);

  const [configuration, setConfiguration] = useState();
  const [isSaveDisabled, setIsSaveDisabled] = useState(true);
  const [isDelete, setIsDelete] = useState(false);
  const updatedOrderQuantity = useRef({});
  const selectedRowsRef = useRef([]);
  const [packConfigState, setPackConfigState] = useState({
    isOpen: false,
    selectedArticle: "",
  });

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  //Vendor Store
  const [showCommentPopup, setShowCommentPopup] = useState(false);
  const [showCommentHistory, setShowCommentHistory] = useState(false);
  const [clickedOrderRow, setClickedOrderRow] = useState({});
  const [commentOptions, setCommentOptions] = useState(null);
  const [isCalledFromSendToReview, setIsCalledFromSendToReview] = useState(
    false
  );
  const [pushBackOrderDetails, setPushBackOrderDetails] = useState({
    actionName: "",
    actionCode: "",
    status: "",
  });

  const COMMENT_DROPDOWN_VALUES =
    props?.vendorToStoreConfig?.comments?.comment_list || [];

  const VIEW_COMMENT_HISTORY_API_KEYS =
    props?.vendorToStoreConfig?.comments?.view_api_keys || [];

  const onCommentHistoryPanelClose = () => {
    setShowCommentHistory(false);
  };

  const handleCommentClosePopup = () => {
    setShowCommentPopup(false);
  };

  const handleInlineCommentPopup = () => {
    setShowCommentPopup(true);
    setCommentOptions(COMMENT_DROPDOWN_VALUES);
    setIsCalledFromSendToReview(false);
  };

  const saveComments = async (comment) => {
    try {
      if (comment === "" || comment.length === 0 || comment.trim() === "") {
        displaySnackMessages(INVALID_VALUE_MESSAGE, "info");
        return;
      }
      props.setTableLoader(true);

      const EDIT_API_KEYS =
        props?.vendorToStoreConfig?.comments?.edit_api_keys || [];
      const body = {};
      EDIT_API_KEYS.forEach((key) => {
        body[key] = clickedOrderRow.hasOwnProperty(key)
          ? clickedOrderRow[key]
          : undefined;
      });
      body["comment"] = comment;
      body["comment_type"] = props?.data[0]?.label;

      let response = await props?.saveComment(body);
      if (response.data.status) {
        displaySnackMessages("Successfully Done", "success");
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log("Error in Saving Comments", error);
    } finally {
      props.setReloadKpi(true);
      setShowCommentPopup(false);
      skuSummaryTableGridInstance.current.api.refreshServerSideStore({
        purge: true,
      });
    }
  };

  const handleActionWithCommentCheck = async (actionDetails, status, type) => {
    try {
      const { actionName, actionCode, comment_options, show_comment_popup } = {
        ...actionDetails,
      };
      setShowCommentPopup(false);
      if (props?.isCalledFromVendorStore && show_comment_popup) {
        setPushBackOrderDetails({
          actionName,
          actionCode,
          status,
        });
        const commentDropdowns =
          props?.vendorToStoreConfig?.comments?.[comment_options] ||
          COMMENT_DROPDOWN_VALUES;
        setCommentOptions(commentDropdowns);
        setIsCalledFromSendToReview(true);
        setShowCommentPopup(true);
      } else {
        switch (type) {
          case "approve":
            approveOrders();
            break;
          case "delete":
            deleteOrders();
            break;
          default:
            confirmApprove(actionName, actionCode, status);
            break;
        }
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const sendForReview = (comments) => {
    setShowCommentPopup(false);
    const { actionName, actionCode, status } = pushBackOrderDetails;
    confirmApprove(actionName, actionCode, status, comments);
  };

  const APPROVE_PROMPT_TITLE = "Approve Selected Sku";
  const DELETE_PROMPT_TITLE = "Delete Selected Sku";

  const UNIQUE_ROW_ID =
    props?.screenConfig?.orders_table?.unique_key || "order_id";

  const ORDER_REPO_DELIVERY_DATE_COLUMN_NAME =
    (props?.isCalledFromVendorStore
      ? props?.vendorToStoreConfig?.orders_table?.delivery_date_key
      : props?.screenConfig?.orders_table?.delivery_date_key) ||
    "editable_expected_receipt_date";

  const isPackConfigEnabled = props.packOrderingConfig?.pack_ordering;

  const l1DisplayName =
    props?.packOrderingConfig?.l1DisplayName || "Master SKU ID";

  const renderOrderTypeCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_GEN_TYPE_CHIP_KEY]?.toLowerCase()
        .split(" ")
        .join("_");
      return (
        <StyledChip
          label={params.data[OMS_ORDER_GEN_TYPE_CHIP_KEY]}
          color={ORDER_STATUS_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
  };

  const renderOrderStatusCell = (groupTypeColumn) => {
    groupTypeColumn.cellRenderer = (params) => {
      let key = params.data[OMS_ORDER_STATUS_CHIP_KEY]?.toLowerCase();
      return (
        <StyledChip
          label={params.data[OMS_ORDER_STATUS_CHIP_KEY]}
          color={ORDER_STATUS_GROUPING_BGCOLOR_MAPPER[key]}
        />
      );
    };
    return groupTypeColumn;
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

  //Filters the table Config to show only selected columns only
  function filterDisplayColumns(
    columns,
    columnsToBeRemoved,
    visited = new Set()
  ) {
    return columns
      ?.filter(
        (col) =>
          col?.column_name && !columnsToBeRemoved.includes(col.column_name)
      )
      .map((col) => {
        if (visited.has(col)) {
          return null;
        }
        visited.add(col);

        const updatedCol = { ...col };

        if (Array.isArray(col.sub_headers)) {
          const filteredSub = filterDisplayColumns(
            col.sub_headers,
            columnsToBeRemoved,
            visited
          );
          updatedCol.sub_headers = filteredSub.length ? filteredSub : undefined;
        }

        if (Array.isArray(col.children)) {
          const filteredChildren = filterDisplayColumns(
            col.children,
            columnsToBeRemoved,
            visited
          );
          updatedCol.children = filteredChildren.length
            ? filteredChildren
            : undefined;
        }

        return updatedCol;
      })
      .filter(Boolean);
  }

  useEffect(() => {
    const fetchColumnData = async () => {
      props.setTableConfigLoader(true);
      let payload = {
        tableConfigName: props?.data[0]?.table_name,
      };
      let columns = await props.getTableConfiguration(payload);
      props.setTableConfigLoader(false);

      let formattedCols = [...columns?.data?.data];

      let dateCols = [];
      formattedCols.forEach((col) => {
        if (col.type === "datetime") {
          dateCols.push(col);
        }
      });
      setDateColumns(dateCols);

      let formattedColumns = agGridColumnFormatter(
        formattedCols,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );

      let isGrouping = false;
      formattedColumns.forEach((col) => {
        if (col?.extra?.is_grouping_key) {
          isGrouping = true;
        }
      });

      let cols = formattedColumns.map((col) => {
        if (col.extra?.is_grouping_key) {
          col.cellRenderer = "agGroupCellRenderer";
        }

        if (col.sub_headers && Array.isArray(col.sub_headers)) {
          col.sub_headers = col.sub_headers.map((subCol) => {
            switch (subCol.column_name) {
              case "size_column":
                subCol.cellRenderer = (params, extraProps) => {
                  const cellValue = params?.value || params?.data?.size_column;

                  // Check if the cell value is "View Pack Details" to render as clickable URL
                  if (cellValue === "View Pack Details") {
                    return (
                      <Button
                        variant="url"
                        onClick={() => sizeColumnClickHandler(params)}
                      >
                        {cellValue}
                      </Button>
                    );
                  }

                  // Otherwise, render as normal text
                  return cellValue || "";
                };
                break;

              case "add_comment":
                subCol.cellRenderer = (params, extraProps) => {
                  if (params.node.level === 0 && params.data.product_details) {
                    setClickedOrderRow(params?.data);
                    return (
                      <div>
                        <Button
                          variant="tertiary"
                          title="Add Comments"
                          size="large"
                          onClick={() => handleInlineCommentPopup()}
                        >
                          <CommentIcon />
                        </Button>
                      </div>
                    );
                  } else {
                    return "";
                  }
                };
                break;

              case "view_history":
                subCol.cellRenderer = (params, extraProps) => {
                  if (params.node.level === 0 && params.data.product_details) {
                    setClickedOrderRow(params?.data);
                    return (
                      <>
                        <Button
                          variant="tertiary"
                          title="View Comments"
                          size="large"
                          onClick={() => {
                            setShowCommentHistory(true);
                          }}
                        >
                          <HistoryIcon />
                        </Button>
                      </>
                    );
                  } else {
                    return "";
                  }
                };
                break;
              default:
                return subCol;
            }
            return subCol;
          });
        }

        switch (col.accessor || col.column_name) {
          case OMS_ORDER_GEN_TYPE_CHIP_KEY:
            col = renderOrderTypeCell(col);
            break;
          case OMS_ORDER_STATUS_CHIP_KEY:
            col = renderOrderStatusCell(col);
            break;
          case "order_quantity":
            if (isGrouping) {
              col.cellRenderer = (params, extraProps) => {
                if (params.node.level === 0 && params.data.product_details) {
                  const value = params.data.product_details.reduce(
                    (acc, val) => (acc += Number(val[col.column_name])),
                    0
                  );
                  return Number(value) || "";
                } else {
                  if (col.is_editable) {
                    return (
                      <CellRenderers
                        cellData={params}
                        column={col}
                        extraProps={extraProps}
                        actions={null}
                      ></CellRenderers>
                    );
                  }
                  return params.data.order_quantity;
                }
              };
            }
            break;

          case ORDER_REPO_DELIVERY_DATE_COLUMN_NAME:
            if (isGrouping) {
              col.cellRenderer = (params, extraProps) => {
                if (
                  params.node.level === 0 &&
                  params.data.product_details &&
                  col.is_editable
                ) {
                  col.disablePast = true;
                  return (
                    <CellRenderers
                      cellData={params}
                      column={col}
                      extraProps={extraProps}
                      actions={null}
                    ></CellRenderers>
                  );
                } else {
                  let column = cloneDeep(col);
                  column.type = "dateStr";
                  return (
                    <CellRenderers
                      cellData={params}
                      column={column}
                      extraProps={extraProps}
                      actions={null}
                    ></CellRenderers>
                  );
                }
              };
            }
            break;
          default:
            return col;
        }
        return col;
      });

      const columnsToBeRemoved = props?.data[0]?.columns_to_remove;
      if (columnsToBeRemoved && Array.isArray(columnsToBeRemoved)) {
        let columns = filterDisplayColumns(
          formattedColumns,
          columnsToBeRemoved
        );
        formattedColumns = [...columns];
      }

      setApprovedTableColumns(formattedColumns);
      props.setRenderAgGrid(true);
      setCsvHeaders(getHeaderForExcel(cloneDeep(formattedColumns)));
      setSelectedSku([]);
    };
    fetchColumnData();
  }, [props.selectedFilters, props?.data]);

  useEffect(() => {
    setConfiguration(props?.data[0]);
  }, [props?.data]);

  useEffect(() => {
    !isEmpty(props.selectedFilters) && props.setRenderAgGrid(false);
  }, [props.selectedFilters]);

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setTableLoader(true);
      if (props.isRedirectedFromDifferentPage) {
        var skuFilter = JSON.parse(JSON.stringify(tableArticleFilter));
        skuFilter.values = [...props?.OrderRepoSelectedSku];
      }
      let body = {
        filters: props.isRedirectedFromDifferentPage
          ? [...props.selectedFilters, skuFilter]
          : [...props.selectedFilters],
        include_custom_order: true,
        current_cycle_order: false,
        order_status: props?.data[0]?.status,
        // ...props.startEndDate,
        meta: manualbody
          ? {
              ...manualbody,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: 10, page: Number(pageIndex) ? pageIndex + 1 : 1 },
            },
      };
      setManualBodyData(body.meta);
      let response = {};
      if (props?.isCalledFromVendorStore) {
        response = await props.getTableDataForVendorStore(body);
      } else {
        response = await props.getTableDataForVendorDC(body);
      }
      if (response?.data?.status) {
        let hasInvalidDate = false;

        // Convert string dates to absolute dates and format them
        const dataWithAbsoluteDates = response?.data?.data?.map((row) => {
          const processedRow = { ...row };

          try {
            // Process order_placement_date
            if (row.order_placement_date) {
              const date = moment(row.order_placement_date);
              if (!date.isValid()) {
                console.error(
                  `Invalid order_placement_date for ID ${row.id}:`,
                  row.order_placement_date
                );
                processedRow.order_placement_date = "";
                hasInvalidDate = true;
              } else {
                processedRow.order_placement_date = date
                  .local()
                  .format("YYYY-MM-DD");
              }
            }

            dateColumns?.forEach((dateCol) => {
              if (row?.[dateCol.column_name]) {
                const formatter = dateCol?.formatter || DATE_FORMAT;
                const rawDate = row?.[dateCol.column_name];
                const formattedDate = moment(
                  rawDate,
                  "YYYY-MM-DD",
                  true
                ).format(formatter);
                processedRow[dateCol.column_name] = formattedDate;
              }
            });
          } catch (error) {
            console.error(
              `Error processing order_placement_date for ID ${row.id}:`,
              error
            );
            processedRow.order_placement_date = "";
            hasInvalidDate = true;
          }

          return processedRow;
        });

        let formatedData = agGridRowFormatter(
          dataWithAbsoluteDates,
          params?.api?.checkConfiguration,
          UNIQUE_ROW_ID
        );

        // Handle dates in product_details
        formatedData.forEach((val) => {
          val.checkbox_disabled = false;
          val.order_quantity_copy = val.order_quantity;
          if (val?.product_details) {
            val.product_details = val.product_details.map((prod) => {
              const processedProd = {
                ...prod,
                order_quantity_copy: prod.order_quantity,
                order_id: (prod?.id || prod?.ids || "") + (val?.order_id || ""),
                min_order_quantity: prod?.min_order_quantity ?? 0,
                unit_cost: prod?.unit_cost ?? 0,
              };

              try {
                if (prod.order_placement_date) {
                  const date = moment(prod.order_placement_date);
                  if (!date.isValid()) {
                    console.error(
                      `Invalid order_placement_date in product_details for ID ${prod.id}:`,
                      prod.order_placement_date
                    );
                    hasInvalidDate = true;
                    processedProd.order_placement_date = "";
                  } else {
                    processedProd.order_placement_date = date
                      .local()
                      .format("YYYY-MM-DD");
                  }
                }
              } catch (error) {
                console.error(
                  `Error processing order_placement_date in product_details for ID ${prod.id}:`,
                  error
                );
                processedProd.order_placement_date = "";
                hasInvalidDate = true;
              }

              return processedProd;
            });
          }
        });

        // Show single warning if any invalid dates were found
        if (hasInvalidDate) {
          displaySnackMessages(
            "Warning: Some dates have invalid format",
            "warning"
          );
        }

        setTotalCount(response.data?.total);
        //props.setOrderManagementSkuSummaryTableData(cloneDeep(formatedData));
        props.setTableLoader(false);
        return { data: formatedData, totalCount: response.data.total };
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setTableLoader(false);
        return defaultTableData;
      }
    } catch (error) {
      console.error("manualCallBack error:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setTableLoader(false);
      return defaultTableData;
    }
  };

  const displaySnackMessages = (message, variance, autoHideDuration = 5000) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        disableOnClose: true,
        autoHideDuration: autoHideDuration,
      },
    });
  };

  const onSelectionChanged = (event) => {
    // fetch all selected rows
    let selectedRows = [];

    skuSummaryTableGridInstance.current.api.forEachNode((node) => {
      if (node.selected) {
        // Only add if the item with the same UNIQUE_ROW_ID doesn't already exist
        if (
          !some(selectedRows, { [UNIQUE_ROW_ID]: node.data[UNIQUE_ROW_ID] })
        ) {
          selectedRows.push(node.data);
        }
      } else if (
        !node.selected &&
        some(selectedRows, { [UNIQUE_ROW_ID]: node.data[UNIQUE_ROW_ID] })
      ) {
        remove(selectedRows, {
          [UNIQUE_ROW_ID]: node.data[UNIQUE_ROW_ID],
        });
      }
    });
    selectedRowsRef.current = selectedRows;
    setSelectedSku(selectedRows);
  };

  const loadTableInstance = (params) => {
    skuSummaryTableGridInstance.current = params;
  };

  const confirmDelete = async () => {
    setShowDeleteDialog(false);
    setIsDelete(false);
    props.setTableLoader(true);
    try {
      const isAllRowsSelected =
        skuSummaryTableGridInstance?.current?.api?.isSelectAllRecords;

      let orderIds = [];
      const clonedSelectedSku = cloneDeep(selectedSku);
      clonedSelectedSku.forEach((id) => {
        if (
          id?.product_details &&
          Array.isArray(id?.product_details) &&
          id?.product_details.length > 0
        ) {
          id.product_details.forEach((order) => {
            if (isPackConfigEnabled && Array.isArray(order.ids)) {
              orderIds.push(order);
            } else {
              orderIds.push(order);
            }
          });
        } else {
          if (isPackConfigEnabled && Array.isArray(id.ids)) {
            orderIds.push(...id.ids);
          } else if (Array.isArray(id.id)) {
            orderIds.push(...id.id);
          } else {
            orderIds.push(id);
          }
        }
      });
      if (isPackConfigEnabled) {
        // Transform orderIds array to array of objects with id key
        let transformedOrders = [];
        orderIds?.forEach((order) => {
          // Create separate objects for each ID
          if (Array.isArray(order["ids"]) && order["ids"].length > 0) {
            order["ids"].forEach((individualId) => {
              let newOrder = { ...order };
              newOrder["id"] = individualId;
              delete newOrder.ids;
              transformedOrders.push(newOrder);
            });
          } else if (Array.isArray(order["id"]) && order["id"].length > 0) {
            order["id"]?.forEach((individualId) => {
              let newOrder = { ...order };
              newOrder["id"] = individualId;
              transformedOrders.push(newOrder);
            });
          } else {
            transformedOrders.push(order);
          }
        });
        orderIds = transformedOrders;
      }

      let body;

      if (isAllRowsSelected) {
        const selection = {
          data: getValidCheckConfiguration(
            skuSummaryTableGridInstance?.current?.api?.checkConfiguration
          ),
          unique_columns: [UNIQUE_ROW_ID],
        };

        body = {
          delete_type: "hard",
          delete_from: configuration?.value || "",
          filters: [...props.selectedFilters],
          selection,
          isSelectAllRecords: isAllRowsSelected,
          meta: manualBodyData || tableConfigurationMetaData.meta,
        };
      } else {
        body = {
          delete_type: "hard",
          orders: orderIds,
          delete_from: configuration?.value || "",
        };
      }
      let response = await props.deleteOrders(
        body,
        props?.isCalledFromVendorStore
      );
      if (response.data.status) {
        if (response.data.data?.failed.length === 0) {
          props?.setReloadKpi(true);
          skuSummaryTableGridInstance.current.api.deselectAll();
          skuSummaryTableGridInstance.current.api.refreshServerSideStore({
            purge: true,
          });
          displaySnackMessages(DELETED_MESSAGE, "success");
        } else if (response.data.data?.success.length === 0) {
          displaySnackMessages("Delete failed for all orders", "error");
        } else {
          if (response.data.data?.failed.length > 0) {
            let orders = [];
            response.data.data?.failed.forEach((order) => {
              orders.push(order);
            });
            let errorText = "Delete failed for order IDs:" + orders.join(" , ");
            displaySnackMessages(errorText, "error");
          }
        }
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
      props.setTableLoader(false);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setTableLoader(false);
    }
  };

  const confirmApprove = async (
    action,
    actionCode,
    statusCode,
    comments = ""
  ) => {
    setShowDeleteDialog(false);
    let isPayloadValid = true;
    props.setTableLoader(true);
    try {
      const isAllRowsSelected =
        skuSummaryTableGridInstance?.current?.api?.isSelectAllRecords;
      let orderIds = [];
      selectedSku.forEach((id) => {
        const currentDate = moment();

        const editedExpectedReceiptDate = moment(
          id?.editable_expected_receipt_date,
          DATE_FORMAT
        );
        if (
          action !== "Push_Back" &&
          editedExpectedReceiptDate.isSameOrBefore(currentDate)
        ) {
          isPayloadValid = false;
        }

        const placedDate = id?.order_placement_date
          ? moment(id?.order_placement_date, "YYYY-MM-DD")
          : moment();
        if (
          action !== "Push_Back" &&
          editedExpectedReceiptDate.isSameOrBefore(placedDate)
        ) {
          isPayloadValid = false;
        }

        if (
          id?.product_details &&
          Array.isArray(id?.product_details) &&
          id?.product_details.length > 0
        ) {
          id.product_details.forEach((order) => {
            if (isPackConfigEnabled && Array.isArray(order.ids)) {
              orderIds.push(...order.ids);
            } else if (Array.isArray(order.id)) {
              orderIds.push(...order.id);
            } else {
              orderIds.push(order.id);
            }
          });
        } else {
          orderIds.push(id.id);
        }
      });

      if (isPayloadValid) {
        let body;

        if (isAllRowsSelected) {
          const selection = {
            data: getValidCheckConfiguration(
              skuSummaryTableGridInstance?.current?.api?.checkConfiguration
            ),
            unique_columns: [UNIQUE_ROW_ID],
          };

          body = {
            action: action,
            comment: comments,
            actionCode: actionCode,
            status: statusCode,
            filters: [...props.selectedFilters],
            selection,
            isSelectAllRecords: isAllRowsSelected,
            meta: manualBodyData || tableConfigurationMetaData.meta,
          };
        } else {
          body = {
            action: action,
            comment: comments,
            order_ids: orderIds,
            actionCode: actionCode,
            status: statusCode,
          };
        }
        let response = await props?.sendOrdersForApproval(
          body,
          props?.isCalledFromVendorStore
        );
        if (response.data.status) {
          if (response.data.data?.failed.length === 0) {
            displaySnackMessages("Successfully Done", "success");
            props.setReloadKpi(true);
            skuSummaryTableGridInstance.current.api.deselectAll();
            skuSummaryTableGridInstance.current.api.refreshServerSideStore({
              purge: true,
            });
          } else if (response.data.data?.success.length === 0) {
            displaySnackMessages("Approval failed for all orders", "error");
          } else {
            if (response.data.data?.failed.length > 0) {
              let orders = [];
              response.data.data?.failed.forEach((order) => {
                orders.push(order);
              });
              let errorText =
                "Approval failed for order IDs:" + orders.join(" , ");
              displaySnackMessages(errorText, "error");
            }
          }
        }
      } else {
        displaySnackMessages(
          "Order Delivery Date should be after Order Placement Date and Current Date.",
          "info"
        );
      }
      props.setTableLoader(false);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setTableLoader(false);
    }
  };

  const getConfirmMessage = (p_msg = "") => {
    return `Are you sure you want to ${p_msg} the selected SKU(s)?`;
  };

  const downloadCsv = async () => {
    if (totalCount > 0) {
      let body = {
        filters: [...props.selectedFilters],
        include_custom_order: true,
        current_cycle_order: false,
        order_status: props?.data[0]?.status,
        meta: manualBodyData?.sort
          ? {
              ...manualBodyData,
              limit: { limit: -1, page: 1 },
            }
          : {
              ...tableConfigurationMetaData.meta,
              limit: { limit: -1, page: 1 },
            },
      };
      displaySnackMessages(FILE_DOWNLOADING_MESSAGE, "info");
      let response = {};
      if (props?.isCalledFromVendorStore) {
        response = await props.getTableDataForVendorStore(body);
      } else {
        response = await props.getTableDataForVendorDC(body);
      }
      if (response.data.status) {
        let csvDwlndData = [];
        let downloadData = agGridRowFormatter(response.data.data);
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
        csvDwlndData = map(csvDwlndData, (obj) =>
          mapValues(obj, (value) => {
            if (!isNaN(value) && value !== null && value !== "") {
              return parseFloat(Number(value).toFixed(2));
            }
            return replaceSpecialCharacter(value);
          })
        );
        setCsvData(cloneDeep(csvDwlndData), csvHeaders);
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
    if (column.colId === "order_quantity") {
      if (value === "") {
        displaySnackMessages(EMPTY_ORDER_QTY, "info");
        return;
      } else {
        const isValidationNotRequiredForOrderQuantity =
          props?.screenConfig?.isValidationNotRequiredForOrderQuantity;
        if (
          !isValidationNotRequiredForOrderQuantity &&
          (parseInt(value) < parseInt(data?.min_order_quantity) ||
            parseInt(data?.order_quantity) > parseInt(data?.max_order_quantity))
        ) {
          displaySnackMessages(INVALID_ORDER_QTY, "error");
          skuSummaryTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: true,
            rowNodes: [cellData.node],
            columns: ["order_quantity"],
          });
          return;
        }

        if (data.order_quantity_copy !== data.order_quantity) {
          cellData.node.data.order_quantity_copy = data.order_quantity;
          //Calculates the OrderCost when Order Qty is changed
          let calculatedOrderCost = parseInt(
            data?.unit_cost * data?.order_quantity
          );
          cellData.node.data.order_cost = calculatedOrderCost;
          if (cellData.node.data?.pack_config) {
            cellData.node.data[ORDER_QUANTITY_EACHES_COLUMN] = parseInt(
              cellData.node.data.order_quantity * cellData.node.data.pack_config
            );
          }
          // Update parent order_quantity_eaches cumulatively if parent exists
          if (cellData.node.parent.data) {
            cellData.node.parent.data.order_quantity =
              cellData.node.parent.data.order_quantity -
              data.order_quantity_copy +
              data.order_quantity;
            const parent = cellData.node.parent;
            if (
              parent.data.product_details &&
              Array.isArray(parent.data.product_details)
            ) {
              parent.data[
                ORDER_QUANTITY_EACHES_COLUMN
              ] = parent.data.product_details.reduce(
                (acc, child) =>
                  acc + (parseInt(child[ORDER_QUANTITY_EACHES_COLUMN]) || 0),
                0
              );
            }
          }
          skuSummaryTableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
            columns: [column, ORDER_QUANTITY_EACHES_COLUMN],
            rowNodes: [cellData.node, cellData.node.parent],
          });
        }
      }
    }

    //edits made - based on the row id - id - for sku level
    if (isChanged) {
      if (
        cellData?.node?.parent?.data?.product_details &&
        Array.isArray(cellData?.node?.parent?.data?.product_details) &&
        cellData?.node?.parent?.data?.product_details.length > 0
      ) {
        cellData?.node?.parent?.data?.product_details.forEach((sku) => {
          updatedOrderQuantity.current[sku["id"]] = sku;
        });
      } else {
        updatedOrderQuantity.current[data["id"]] = data;
      }
      setIsSaveDisabled(false);
    }
  };

  const updateParams = (params) => {
    params.column.colDef.cellStyle = {};
  };

  const updateOrder = async () => {
    try {
      props.setTableLoader(true);
      if (isEmpty(updatedOrderQuantity.current)) {
        displaySnackMessages("Null or Empty values cannot be saved.", "error");
      } else {
        const editedFields = skuSummaryTableGridInstance.current.api
          .getColumnDefs()
          .filter((col) => col.is_editable)
          .map((col) => col.colId);
        let newOrders = Object.values(updatedOrderQuantity.current);
        let updatedOrders = [];
        newOrders.forEach((order) => {
          let updatedOrd = {};
          updatedOrd["id"] = [];

          // Set the ID based on different conditions
          if (isPackConfigEnabled && Array.isArray(order["ids"])) {
            updatedOrd["id"].push(...order["ids"]);
          } else {
            updatedOrd["id"] = order["id"];
          }

          editedFields.forEach((field) => {
            updatedOrd[field] = order[field];
          });
          updatedOrders.push(updatedOrd);
        });

        if (isPackConfigEnabled) {
          let transformedOrders = [];
          updatedOrders?.forEach((order) => {
            if (Array.isArray(order["id"]) && order["id"].length > 0) {
              // Create separate objects for each ID
              order["id"].forEach((individualId) => {
                let newOrder = { ...order };
                newOrder["id"] = individualId;
                transformedOrders.push(newOrder);
              });
            } else {
              transformedOrders.push(order);
            }
          });
          updatedOrders = transformedOrders;
        }

        let body = {
          user: localStorage.getItem("name"),
          orders: updatedOrders,
        };
        let response = await props.updateOrders(
          body,
          props?.isCalledFromVendorStore
        );
        if (response.data.status) {
          setIsSaveDisabled(true);
          props.setReloadKpi(true);
          updatedOrderQuantity.current = {};
          skuSummaryTableGridInstance.current.api.refreshServerSideStore({
            purge: true,
          });
          displaySnackMessages(UPDATED_MESSAGE, "success");
        }
      }
      props.setTableLoader(false);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setTableLoader(false);
    }
  };

  const deleteOrders = async () => {
    setIsDelete(true);
    // DIALOG_POPUP_TITLE = "Delete Selected Sku"
    setShowDeleteDialog(true);
  };

  const approveOrders = async () => {
    setIsDelete(false);
    // DIALOG_POPUP_TITLE = "Approve Selected Sku"
    setShowDeleteDialog(true);
  };

  const onCellValueChanged = (params) => {
    const { colDef, node, data, newValue, value, oldValue } = params;
    if (colDef.column_name === ORDER_REPO_DELIVERY_DATE_COLUMN_NAME) {
      let momentDate = value;
      if (!moment.isMoment(value)) {
        momentDate = moment(value, DATE_FORMAT);
      }
      if (momentDate === "" || !momentDate?.isValid()) {
        displaySnackMessages("Order Delivery Date is invalid", "info");
        return;
      }
      const currentDate = moment();
      if (momentDate.isSameOrBefore(currentDate)) {
        displaySnackMessages(
          "Order Delivery Date should be after Current Date.",
          "info"
        );
        return;
      }

      const placedDate = data?.order_placement_date
        ? moment(data?.order_placement_date, "YYYY-MM-DD")
        : moment();
      if (momentDate.isSameOrBefore(placedDate)) {
        displaySnackMessages(
          "Order Delivery Date should be after Order Placement Date.",
          "info"
        );
        return;
      }
      if (momentDate.format("YYYY-MM-DD") !== oldValue) {
        if (
          node?.data?.product_details &&
          Array.isArray(node?.data?.product_details) &&
          node?.data?.product_details.length > 0
        ) {
          node?.data?.product_details.forEach((sku) => {
            sku[ORDER_REPO_DELIVERY_DATE_COLUMN_NAME] = momentDate.format(
              "YYYY-MM-DD"
            );
            updatedOrderQuantity.current[sku["id"]] = sku;
          });
        } else {
          updatedOrderQuantity.current[data["id"]] = data;
        }
        skuSummaryTableGridInstance.current.api.redrawRows({
          rowNodes: [node],
        });
        setIsSaveDisabled(false);
      }
    }
  };

  const getTopRightOptions = () => {
    let options = [];
    if (configuration?.isEditButton) {
      options.push(
        <>
          <Button
            variant="secondary"
            color="primary"
            className={classes.button}
            disabled={isSaveDisabled}
            onClick={updateOrder}
          >
            Update
          </Button>
        </>
      );
    }

    if (selectedSku?.length > 0) {
      if (configuration?.isPushBackButton?.isVisible) {
        options.push(
          <Button
            variant="secondary"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            disabled={selectedSku.length === 0}
            onClick={() =>
              handleActionWithCommentCheck(
                configuration?.isPushBackButton,
                configuration?.status,
                "push_back"
              )
            }
          >
            {configuration?.isPushBackButton?.name}
          </Button>
        );
      }

      if (configuration?.isApprovalButton?.isVisible) {
        options.push(
          <Button
            variant="primary"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            disabled={selectedSku.length === 0}
            onClick={() =>
              handleActionWithCommentCheck(
                configuration?.isApprovalButton,
                configuration?.status,
                "approve"
              )
            }
          >
            {configuration?.isApprovalButton?.name}
          </Button>
        );
      }

      if (configuration?.isSendForApprovalButton?.isVisible) {
        options.push(
          <Button
            variant="primary"
            color="primary"
            id="productSetAllBtn"
            className={classes.button}
            disabled={selectedSku.length === 0}
            onClick={() =>
              handleActionWithCommentCheck(
                configuration?.isSendForApprovalButton,
                configuration?.status,
                "send_for_approval"
              )
            }
          >
            {configuration?.isSendForApprovalButton?.name}
          </Button>
        );
      }

      if (configuration?.isDeletedButton) {
        options.push(
          <Tooltip title="Delete" variant="tertiary">
            <Button
              variant="secondary"
              color="primary"
              id="createProductBtn"
              type="destructive"
              className={classes.button}
              disabled={selectedSku.length === 0}
              onClick={() =>
                handleActionWithCommentCheck(
                  configuration?.isDeleteButton,
                  configuration?.status,
                  "delete"
                )
              }
            >
              <DeleteIcon fontSize="small"></DeleteIcon>
            </Button>
          </Tooltip>
        );
      }
    }

    if (options.length > 0) {
      options.push(<div className="divider-line"></div>);
    }

    if (configuration?.isDownloadButton) {
      options.push(
        <div>
          <Tooltip title="Download">
            <Button
              variant="text"
              onClick={async () => {
                await downloadCsv();
                downloadLink.current.link.click();
              }}
              disabled={totalCount === 0}
            >
              <DownloadIcon fontSize="small"></DownloadIcon>
            </Button>
          </Tooltip>

          {downloadExcelLink(
            csvData,
            configuration?.label ? configuration?.label : "approved_orders",
            downloadLink,
            csvHeaders,
            "",
            "",
            true
          )}
        </div>
      );
    }
    return options;
  };

  return (
    <>
      <Prompt
        isOpen={showDeleteDialog}
        title={isDelete ? DELETE_PROMPT_TITLE : APPROVE_PROMPT_TITLE}
        variant={isDelete ? "error" : "info"}
        handleClose={() => setShowDeleteDialog(false)}
        onPrimaryButtonClick={() => {
          if (isDelete) {
            confirmDelete();
          } else {
            confirmApprove(configuration?.isApprovalButton?.actionName);
          }
        }}
        onSecondaryButtonClick={() => setShowDeleteDialog(false)}
        primaryButtonLabel={isDelete ? "Yes,Delete" : "Yes,Approve"}
        secondaryButtonLabel="Cancel"
      >
        {isDelete ? getConfirmMessage("delete") : getConfirmMessage("approve")}
      </Prompt>

      <Loader
        loader={props.tableLoader || props.tableConfigLoader}
        minHeight={"260px"}
      >
        {props.renderAgGrid && (
          <>
            <AgGridComponent
              columns={approvedTableColumns}
              manualCallBack={(body, pageIndex, params) =>
                manualCallBack(body, pageIndex, params)
              }
              selectAllHeaderComponent={configuration?.isMultiSelectRows}
              hideSelectAllRecords={configuration?.hideSelectAllRecords ?? true} // enabling select all for all clients globally
              onSelectionChanged={onSelectionChanged}
              loadTableInstance={loadTableInstance}
              rowSelection="multiple"
              rowModelType="serverSide"
              serverSideStoreType="partial"
              onRowSelected
              cacheBlockSize={10}
              uniqueRowId={UNIQUE_ROW_ID}
              pagination={true}
              hideChildSelection={true}
              showSetAll={false}
              purgeClosedRowNodes={true}
              suppressAggFuncInHeader={true}
              suppressClickEdit={true}
              groupDisplayType={"custom"}
              treeData={true}
              childKey={"product_details"}
              onBlur={onBlur}
              onCellValueChanged={onCellValueChanged}
              tableHeader={`${configuration?.label}`}
              topRightOptions={getTopRightOptions()}
              isRowSelectable={(node) => node.level === 0}
              customDateFormatRequired={true}
            />
          </>
        )}
      </Loader>
      {packConfigState.isOpen && (
        <PackConfigBottomSheet
          openPackConfigDetailSheet={packConfigState.isOpen}
          setOpenPackConfigDetailSheet={handlePackConfigClose}
          l1DisplayName={l1DisplayName}
          activeChildHierarchyKey={packConfigState.selectedArticle}
          screenName="order_repository"
        />
      )}
      {showCommentPopup && (
        <CommentPopup
          isOpen={showCommentPopup}
          screenName="order_repository"
          handleClose={handleCommentClosePopup}
          sendForReview={sendForReview}
          saveComments={saveComments}
          isCalledFromSendToReview={isCalledFromSendToReview}
          COMMENT_DROPDOWN_VALUES={commentOptions}
        />
      )}

      {showCommentHistory && (
        <CommentHistoryPanel
          rowData={clickedOrderRow}
          VIEW_API_KEYS={VIEW_COMMENT_HISTORY_API_KEYS}
          onClose={onCommentHistoryPanelClose}
        />
      )}
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    OrderRepoSelectedSku: store.omsReducer?.orderRepositoryService.selectedSku,
    tableConfigLoader:
      store.omsReducer?.orderRepositoryService.tableConfigLoader,
    tableLoader: store.omsReducer?.orderRepositoryService.tableLoader,
    selectedFilters: store.omsReducer?.orderRepositoryService.selectedFilters,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig
        ?.order_repository,
    packOrderingConfig:
      store.omsReducer.orderingCommonService.orderingPackOrderConfig,
    vendorToStoreConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.order_repository,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getTableConfiguration: (payload) => dispatch(getTableConfiguration(payload)),
  getTableDataForVendorDC: (payload) =>
    dispatch(getTableDataForVendorDC(payload)),
  getTableDataForVendorStore: (payload) =>
    dispatch(getTableDataForVendorStore(payload)),
  setTableLoader: (payload) => dispatch(setTableLoader(payload)),
  setTableConfigLoader: (payload) => dispatch(setTableConfigLoader(payload)),
  setOrdersTableData: (payload) => dispatch(setOrdersTableData(payload)),
  sendOrdersForApproval: (payload, isCalledFromVendorStore) =>
    dispatch(sendOrdersForApproval(payload, isCalledFromVendorStore)),
  deleteOrders: (payload, isCalledFromVendorStore) =>
    dispatch(deleteOrders(payload, isCalledFromVendorStore)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
  updateOrders: (payload, isCalledFromVendorStore) =>
    dispatch(updateOrders(payload, isCalledFromVendorStore)),
  saveComment: (payload) => dispatch(saveComment(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OrderRepositoryApprovedTable);
