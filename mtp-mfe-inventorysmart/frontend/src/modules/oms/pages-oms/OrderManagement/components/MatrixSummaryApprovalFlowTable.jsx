import React, { useEffect, useMemo, useRef, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import globalStyles from "core/Styles/globalStyles";
import { Button, Badge } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import Loader from "core/Utils/Loader/loader";
import EmptyStateWrapper from "core/commonComponents/coreComponentScreen/EmptyStateWrapper";
import { Divider, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";
import CommentModal from "modules/oms/pages-oms/common/CommentModal";
import noDataFound from "assets/noDataFound.png";
import {
  SEND_FOR_APPROVAL,
  ERROR_MESSAGE,
  OMS_ORDER_MANAGEMENT_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  approveOmsApprovalFlow,
  getOmsApprovalFlowColumnConfig,
  setOmsApprovalFlowTableLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { TENANT_LOCALE } from "modules/oms/constants-oms/stringConstants";
import { resolveAppliedOmsFiltersForApproval } from "modules/oms/pages-oms/Order-Management/components/Approval-Flow-Dialog/resolveAppliedOmsFiltersForApproval";
import {
  fetchApprovalPaneFilterOrders,
  sendApprovalPaneForApproval,
} from "../api/approvalPane.api.js";
import {
  buildApprovalPaneFilterOrdersPayload,
  buildApprovalPaneSendForApprovalPayload,
  isApprovalPaneActionReady,
  resolveOrderPlacementDateForPayload,
} from "../utils/buildApprovalPanePayload.util.js";

const useStyles = makeStyles((theme) => ({
  tableHeaderContainer: {
    display: "flex",
    alignItems: "center",
    gap: "1rem",
  },
  gridTitle: {
    fontWeight: 700,
    fontSize: "14px",
    lineHeight: "16px",
  },
  totalOrderQtyContainer: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  totalOrderQtyLabel: {
    fontWeight: 500,
    fontSize: "12px",
    lineHeight: "16px",
  },
  noRowsOverlay: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "0.75rem",
    padding: "1.5rem 1rem",
    textAlign: "center",
    minHeight: "150px",
  },
  noRowsHeading: {
    fontWeight: 600,
    fontSize: "16px",
    lineHeight: "24px",
    color: theme?.palette?.text?.boldHeadingBlue,
  },
  tableSection: {
    minHeight: "420px",
  },
}));

const MatrixSummaryApprovalFlowTable = ({ displaySnackMessages, ...props }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const tableGridInstance = useRef(null);
  const [renderGrid, setRenderGrid] = useState(false);
  const [rowCount, setRowCount] = useState(0);
  const hasLoadedColumnsRef = useRef(false);
  const lastRefreshSignatureRef = useRef(null);

  const [isSendForApprovalButton, setIsSendForApprovalButton] = useState(false);
  const [isApprovalButton, setIsApprovalButton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [totalOrderQty, setTotalOrderQty] = useState(null);
  const [refreshTable, setRefreshTable] = useState(false);
  const [isOrderTypePresent, setIsOrderTypePresent] = useState(false);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingActionType, setPendingActionType] = useState(null);
  const [comment, setComment] = useState("");

  const approvalPaneContext = props.approvalPaneContext || {};
  const orderPlacementDateRef = useRef(null);

  const resolvedOrderPlacementDate = useMemo(
    () =>
      resolveOrderPlacementDateForPayload(
        props.orderPlacementDateRef?.current || props.orderPlacementDate,
        props.selectedApprovalFilters
      ),
    [props.orderPlacementDate, props.selectedApprovalFilters]
  );

  useEffect(() => {
    orderPlacementDateRef.current = resolvedOrderPlacementDate;
  }, [resolvedOrderPlacementDate]);

  const getOrderPlacementDateForPayload = () => {
    const fromParentRef = props.orderPlacementDateRef?.current;
    if (fromParentRef?.start_date && fromParentRef?.end_date) {
      return fromParentRef;
    }
    return (
      orderPlacementDateRef.current ??
      resolveOrderPlacementDateForPayload(
        props.orderPlacementDate,
        props.selectedApprovalFilters
      )
    );
  };

  const generateUniqueId = () => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const formatColumns = (cols) => {
    let formattedColumns = agGridColumnFormatter(
      cols?.data?.data,
      null,
      null,
      null,
      null,
      null,
      null,
      true
    );

    return formattedColumns.map((col) => {
      try {
        if (col.extra?.is_grouping_key) {
          col.cellRenderer = "agGroupCellRenderer";
          if (col.type === "str") {
            col.rowGroup = true;
            col.isEditable = false;
          }
        }

        if (col.column_name === "size") {
          col.cellRenderer = (params) => {
            try {
              if (params.node.level === 0) {
                return "";
              }
              return params.value || "-";
            } catch (error) {
              console.error("Error in size column renderer:", error);
              return params.value || "-";
            }
          };
        }

        return col;
      } catch (error) {
        console.error("Error formatting column:", col, error);
        return col;
      }
    });
  };

  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        if (!hasLoadedColumnsRef.current) {
          setRenderGrid(false);
        }
        const cols = await props?.getOmsApprovalFlowColumnConfig();
        setTableColumns(formatColumns(cols));
        hasLoadedColumnsRef.current = true;
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setRenderGrid(false);
      }
    };
    fetchColumnConfig();
  }, []);

  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        setRenderGrid(false);
        setRefreshTable(false);
        const cols = await props?.getOmsApprovalFlowColumnConfig();
        setTableColumns(formatColumns(cols));
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setRenderGrid(false);
      }
    };
    if (refreshTable) fetchColumnConfig();
  }, [refreshTable]);

  const refreshTableData = () => {
    const api = tableGridInstance.current?.api;
    if (!api) return;
    setIsLoading(true);
    setTotalOrderQty(null);
    props.setOmsApprovalFlowTableLoader(true);
    if (typeof api.refreshServerSideStore === "function") {
      api.refreshServerSideStore({ purge: true });
      return;
    }
    if (typeof api.refreshServerSide === "function") {
      api.refreshServerSide({ purge: true });
    }
  };

  useEffect(() => {
    const signature = JSON.stringify({
      selectedApprovalFilters: props.selectedApprovalFilters,
      orderPlacementDate: getOrderPlacementDateForPayload(),
    });

    if (lastRefreshSignatureRef.current == null) {
      lastRefreshSignatureRef.current = signature;
      return;
    }

    if (lastRefreshSignatureRef.current === signature) {
      return;
    }

    lastRefreshSignatureRef.current = signature;

    if (!renderGrid || !tableGridInstance.current?.api) {
      return;
    }

    refreshTableData();
  }, [
    props.selectedApprovalFilters,
    props.orderPlacementDate,
    resolvedOrderPlacementDate,
    renderGrid,
  ]);

  useEffect(() => {
    if (tableColumns.length > 0) {
      if (isApprovalButton !== false || isSendForApprovalButton !== false) {
        setRenderGrid(true);
      }
    }
  }, [tableColumns, isApprovalButton, isSendForApprovalButton]);

  useEffect(() => {
    const approvalProductFilters = (
      props?.selectedApprovalFilters || []
    ).filter((filter) => filter.attribute_name !== "fiscal_date_range");
    const hasOrderType = approvalProductFilters.some(
      (filter) => filter.attribute_name === "order_type"
    );
    setIsOrderTypePresent(hasOrderType);
  }, [props.selectedApprovalFilters]);

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  const getApprovalPaneFilters = () => {
    const approvalProductFilters = cloneDeep(
      props?.selectedApprovalFilters?.filter(
        (filter) => filter.attribute_name !== "fiscal_date_range"
      ) || []
    );

    let selectedRowKeyPresentInFilters = false;
    if (
      approvalProductFilters?.length &&
      props?.orderManagementProductDetailsFilters?.length
    ) {
      approvalProductFilters.forEach((filter) => {
        if (
          filter?.attribute_name ===
          props?.orderManagementProductDetailsFilters[0]?.column_name
        ) {
          if (filter?.values?.length === 0) {
            filter.values = props?.selectedRowsFilter[0]?.values || [];
          }
          selectedRowKeyPresentInFilters = true;
        }
      });
    }

    if (!selectedRowKeyPresentInFilters && props?.selectedRowsFilter?.length) {
      approvalProductFilters.push(props.selectedRowsFilter[0]);
    }

    return approvalProductFilters;
  };

  const buildV3BaseOptions = () => ({
    screenId: approvalPaneContext.screenId,
    drilldownSelection: approvalPaneContext.drilldownSelection,
    availableHierarchies: approvalPaneContext.availableHierarchies,
    globalFilters: approvalPaneContext.globalFilters,
    approvalPaneFilters: getApprovalPaneFilters(),
    orderPlacementDate: getOrderPlacementDateForPayload(),
    orderIdentifiers: approvalPaneContext.orderIdentifiers,
  });

  const createLegacyApprovalPayload = () => {
    try {
      const appliedOmsFilters = resolveAppliedOmsFiltersForApproval({
        omsFilterConfiguration: props?.omsFilterConfiguration,
        selectedFilters: props?.selectedFilters,
        decisionDashboardDependencyData: undefined,
      });
      let appliedOmsProductFilters = appliedOmsFilters?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
      );

      const dcFilterFromSelectedFilters = props?.selectedFilters?.find(
        (f) => f.dimension === "dc"
      );
      if (
        dcFilterFromSelectedFilters &&
        !appliedOmsProductFilters.find((f) => f.dimension === "dc")
      ) {
        appliedOmsProductFilters = [
          ...appliedOmsProductFilters,
          cloneDeep(dcFilterFromSelectedFilters),
        ];
      }

      const approvalProductFilters = getApprovalPaneFilters();

      return {
        level_of_heirarchy: props?.targetTable,
        approval_date_filters: getOrderPlacementDateForPayload()
          ? [getOrderPlacementDateForPayload()]
          : [],
        approval_filters:
          approvalProductFilters?.length > 0
            ? approvalProductFilters
            : props?.selectedRowsFilter,
        filters: appliedOmsProductFilters,
        date_filter: [],
      };
    } catch (error) {
      console.log("Error in creating Approval Payload", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const manualCallBack = async (manualbody, pageIndex) => {
    try {
      props.setOmsApprovalFlowTableLoader(true);
      const body = buildApprovalPaneFilterOrdersPayload({
        ...buildV3BaseOptions(),
        manualbody,
        pageIndex,
      });
      const response = await fetchApprovalPaneFilterOrders(body);
      if (response?.data?.status) {
        const tableData = response?.data?.data?.data || response?.data?.data;
        let formatedData = agGridRowFormatter(tableData);

        formatedData = formatedData.map((row) => ({
          ...row,
          id: generateUniqueId(),
          status_obj:
            row.status_obj && row.status_obj.length > 0
              ? row.status_obj
              : undefined,
        }));

        setRowCount(formatedData.length);
        setIsLoading(false);
        setTotalOrderQty(response?.data?.grand_total?.total_order_qty ?? 0);
        props.setOmsApprovalFlowTableLoader(false);
        return {
          data: formatedData,
          totalCount: response.data.total || formatedData.length,
        };
      }

      props.setOmsApprovalFlowTableLoader(false);
      setRowCount(0);
      setIsLoading(false);
      return { data: [], totalCount: 0 };
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOmsApprovalFlowTableLoader(false);
    }
  };

  const confirmApproval = async (actionType, overrideComment = null) => {
    try {
      const finalComment = overrideComment !== null ? overrideComment : comment;
      let actionSuccess = false;
      setIsLoading(true);

      if (actionType === SEND_FOR_APPROVAL) {
        const body = buildApprovalPaneSendForApprovalPayload(buildV3BaseOptions());
        const response = await sendApprovalPaneForApproval(body);
        if (response?.data?.status) {
          actionSuccess = true;
          displaySnackMessages(
            `Success - ${SEND_FOR_APPROVAL} | Order ID : [${response?.data?.data?.order_batch_name}]`,
            "success",
            8000
          );
        }
      } else {
        const body = createLegacyApprovalPayload();
        body.action = actionType;
        body.comment = finalComment !== "" ? finalComment : "-";
        const response = await props?.approveOmsApprovalFlow(body);
        if (response?.data?.status) {
          actionSuccess = true;
          displaySnackMessages(
            `Success - Approve | Order ID : [${response?.data?.data?.order_batch_name}]`,
            "success",
            8000
          );
        }
      }

      setShowApprovalDialog(false);
      setComment("");
      setIsLoading(false);

      if (actionSuccess) {
        if (actionType === SEND_FOR_APPROVAL) {
          // setRowCount(0);
          // setTotalOrderQty(null);
        }
        setRefreshTable(true);
      }

      if (actionSuccess && typeof props.onApprovalSuccess === "function") {
        props.onApprovalSuccess();
      }
      if (!actionSuccess) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    } catch (error) {
      setRefreshTable(true);
      setShowApprovalDialog(false);
      setIsLoading(false);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const handleApprovalClick = (actionType) => {
    if (props?.enableCommentDialogWithOptions) {
      setPendingActionType(actionType);
      setShowApprovalDialog(true);
    } else {
      confirmApproval(actionType);
    }
  };

  const handleCommentModalSubmit = async ({
    selectedComment,
    customComment,
  }) => {
    const finalComment =
      customComment?.trim() ||
      selectedComment?.label ||
      selectedComment?.value ||
      "";
    setComment(finalComment);

    if (pendingActionType) {
      confirmApproval(pendingActionType, finalComment);
    }
  };

  const onCancelCommentModal = () => {
    setShowApprovalDialog(false);
    setPendingActionType(null);
    setComment("");
  };

  useEffect(() => {
    if (!isEmpty(props.userAccess)) {
      const approvalFlowAccess = props.userAccess?.find(
        (item) =>
          item.screen === OMS_ORDER_MANAGEMENT_SCREENNAME_KEY &&
          item.module === "approval_flow"
      );

      if (approvalFlowAccess && approvalFlowAccess.isSendForApprovalButton) {
        setIsSendForApprovalButton(approvalFlowAccess.isSendForApprovalButton);
      } else {
        const SHOW_SEND_BY_APPROVAL_BUTTON =
          props?.orderingScreensConfig?.oms_dashboard?.approval_flow
            ?.show_send_by_approval_button;
        setIsSendForApprovalButton({ isVisible: SHOW_SEND_BY_APPROVAL_BUTTON });
      }
      if (approvalFlowAccess && approvalFlowAccess.isApprovalButton) {
        setIsApprovalButton(approvalFlowAccess.isApprovalButton);
      } else {
        const SHOW_APPROVE_BUTTON =
          props?.orderingScreensConfig?.oms_dashboard?.approval_flow
            ?.show_approve_button;
        setIsApprovalButton({ isVisible: SHOW_APPROVE_BUTTON });
      }
    } else {
      if (
        props.orderingAccessControl.hasOwnProperty("isSendForApprovalButton")
      ) {
        setIsSendForApprovalButton(
          props.orderingAccessControl.isSendForApprovalButton
        );
      } else {
        const SHOW_SEND_BY_APPROVAL_BUTTON =
          props?.orderingScreensConfig?.oms_dashboard?.approval_flow
            ?.show_send_by_approval_button;
        setIsSendForApprovalButton({ isVisible: SHOW_SEND_BY_APPROVAL_BUTTON });
      }
      if (props.orderingAccessControl.hasOwnProperty("isApprovalButton")) {
        setIsApprovalButton(props.orderingAccessControl.isApprovalButton);
      } else {
        const SHOW_APPROVE_BUTTON =
          props?.orderingScreensConfig?.oms_dashboard?.approval_flow
            ?.show_approve_button;
        setIsApprovalButton({ isVisible: SHOW_APPROVE_BUTTON });
      }
    }
  }, [
    props.userAccess,
    props.orderingScreensConfig,
    props.orderingAccessControl,
  ]);

  const disableApprovalActions = () =>
    !isApprovalPaneActionReady({
      rowCount,
      isLoading,
      isOrderTypePresent,
      orderPlacementDate: getOrderPlacementDateForPayload(),
    });

  const getTopRightOptions = () => {
    const options = [];
    const actionReady = isApprovalPaneActionReady({
      rowCount,
      isLoading,
      isOrderTypePresent,
      orderPlacementDate: getOrderPlacementDateForPayload(),
    });

    if (isApprovalButton?.isVisible) {
      options.push(
        <Button
          id="approveButton"
          color="primary"
          variant="contained"
          disabled={!actionReady}
          onClick={() => handleApprovalClick("approve")}
        >
          {isApprovalButton?.label || "Approve"}
        </Button>
      );
    }

    if (isSendForApprovalButton?.isVisible) {
      options.push(
        <Button
          id="sendForApprovalButton"
          color="primary"
          variant="contained"
          className={`${globalClasses.marginLeft1rem}`}
          disabled={disableApprovalActions()}
          onClick={() => handleApprovalClick(SEND_FOR_APPROVAL)}
        >
          {isSendForApprovalButton.label || SEND_FOR_APPROVAL}
        </Button>
      );
    }

    return options;
  };

  const getTableHeader = () => {
    return (
      <div className={classes.tableHeaderContainer}>
        <Typography className={classes.gridTitle}>Filtered Orders</Typography>

        {totalOrderQty !== null && totalOrderQty !== undefined ? (
          <>
            <Divider orientation="vertical" flexItem />
            <div className={classes.totalOrderQtyContainer}>
              <Typography className={classes.totalOrderQtyLabel}>
                Total Order Quantity:
              </Typography>
              <Badge
                label={totalOrderQty.toLocaleString(TENANT_LOCALE)}
                color="warning"
                size="default"
                variant="stroke"
              />
            </div>
          </>
        ) : null}
      </div>
    );
  };

  return (
    <div className={classes.tableSection}>
      <Loader
        loader={!renderGrid || props.approvalFlowTableLoader}
        
        
      >
        {renderGrid && (
          <>
            {tableColumns?.length > 0 ? (
              <AgGridComponent
                columns={tableColumns}
                manualCallBack={(body, pageIndex, params) =>
                  manualCallBack(body, pageIndex, params)
                }
                suppressClickEdit={true}
                selectAllHeaderComponent={false}
                hideSelectAllRecords={true}
                loadTableInstance={loadTableInstance}
                rowSelection="multiple"
                rowModelType="serverSide"
                serverSideStoreType="partial"
                onRowSelected
                disablePaginationForSinglePage={true}
                cacheBlockSize={10}
                uniqueRowId={"id"}
                pagination={true}
                loader={props.approvalFlowTableLoader}
                tableHeader={getTableHeader()}
                topRightOptions={
                  getTopRightOptions().length > 0 ? getTopRightOptions() : null
                }
                treeData={true}
                childKey={"status_obj"}
                groupDisplayType={"custom"}
                //disableSkeletonLoader={false}
                noRowOverlayMessage={
                  <div className={classes.noRowsOverlay}>
                    <img
                      src={noDataFound}
                      alt="no data found"
                      width={50}
                      height={50}
                    />
                    <Typography className={classes.noRowsHeading}>
                      No data to display
                    </Typography>
                  </div>
                }
              />
            ) : (
              <div className={globalClasses.centerAlign}>
                <EmptyStateWrapper />
              </div>
            )}
          </>
        )}
      </Loader>

      {props?.enableCommentDialogWithOptions && showApprovalDialog && (
        <CommentModal
          open={true}
          onClose={onCancelCommentModal}
          onSubmit={handleCommentModalSubmit}
        />
      )}
    </div>
  );
};

const mapStateToProps = (store) => {
  return {
    userAccess:
      store.omsReducer.orderingCommonService.orderingUserAccess?.vendor_dc,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "omsApprovalFlowDialogFilterConfiguration"
      ],
    orderingScreensConfig:
      store.omsReducer.orderingCommonService.orderingScreensConfig,
    selectedApprovalFilters:
      store.omsReducer.orderManagementService.selectedApprovalFilters,
    omsFilterConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "orderManagementFilterConfiguration"
      ],
    orderManagementProductDetailsFilters:
      store.omsReducer.orderManagementService
        .orderManagementProductDetailsFilters,
    orderingAccessControl:
      store?.omsReducer.orderingCommonService.orderingAccessControl,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
    approvalFlowTableLoader:
      store.omsReducer.orderManagementService.approvalFlowTableLoader,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsApprovalFlowColumnConfig: () =>
    dispatch(getOmsApprovalFlowColumnConfig()),
  setOmsApprovalFlowTableLoader: (payload) =>
    dispatch(setOmsApprovalFlowTableLoader(payload)),
  approveOmsApprovalFlow: (payload) => dispatch(approveOmsApprovalFlow(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MatrixSummaryApprovalFlowTable);
