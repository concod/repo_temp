import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import globalStyles from "core/Styles/globalStyles";
import { Button, Badge } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import LoadingOverlay from "core/Utils/Loader/loader";
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
  getOmsApprovalFlowTableData,
  sendForApprovalOmsApprovalFlow,
  setOmsApprovalFlowTableLoader,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import { TENANT_LOCALE } from "modules/oms/constants-oms/stringConstants";
import { resolveAppliedOmsFiltersForApproval } from "./resolveAppliedOmsFiltersForApproval";

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
  }
}));

const ApprovalFlowTable = ({ displaySnackMessages, ...props }) => {
  const globalClasses = globalStyles();
  const classes = useStyles();

  const [tableColumns, setTableColumns] = useState([]);
  const tableGridInstance = useRef(null);
  const [renderGrid, setRenderGrid] = useState(false);
  const [rowCount, setRowCount] = useState(0);

  const [isSendForApprovalButton, setIsSendForApprovalButton] = useState(false);
  const [isApprovalButton, setIsApprovalButton] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [totalOrderQty, setTotalOrderQty] = useState(null);
  const [refreshTable, setRefreshTable] = useState(false);
  const [isOrderTypePresent, setIsOrderTypePresent] = useState(false); // New state to track presence of order_type
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [pendingActionType, setPendingActionType] = useState(null);
  const [comment, setComment] = useState("");

  const generateUniqueId = () => {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  //Renders with OMS Approval Flow Filters
  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        setRenderGrid(false);
        let cols = await props?.getOmsApprovalFlowColumnConfig();
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

        formattedColumns = formattedColumns.map((col) => {
          try {
            if (col.extra?.is_grouping_key) {
              col.cellRenderer = "agGroupCellRenderer";
              if (col.type === "str") {
                col.rowGroup = true;
                col.isEditable = false;
              }
            }

            if (col.column_name === "size") {
              // size column in child rows
              col.cellRenderer = (params, extraProps) => {
                try {
                  if (params.node.level === 0) {
                    return "";
                  } else {
                    return params.value || "-";
                  }
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

        setTableColumns(formattedColumns);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setRenderGrid(false);
      }
    };
    fetchColumnConfig();
  }, [props.selectedApprovalFilters]);

  //Refreshes the AG Grid when the user send the order for approval / approve the order
  useEffect(() => {
    const fetchColumnConfig = async () => {
      try {
        setRenderGrid(false);
        setRefreshTable(false);
        let cols = await props?.getOmsApprovalFlowColumnConfig();
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

        formattedColumns = formattedColumns.map((col) => {
          try {
            if (col.extra?.is_grouping_key) {
              col.cellRenderer = "agGroupCellRenderer";
              if (col.type === "str") {
                col.rowGroup = true;
                col.isEditable = false;
              }
            }
            if (col.column_name === "size") {
              // size column in child rows
              col.cellRenderer = (params, extraProps) => {
                try {
                  if (params.node.level === 0) {
                    return "";
                  } else {
                    return params.value || "-";
                  }
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
        setTableColumns(formattedColumns);
      } catch (error) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setRenderGrid(false);
      }
    };
    if (refreshTable) fetchColumnConfig();
  }, [refreshTable]);

  //Renders Grid when tablec columns are fetched
  useEffect(() => {
    if (tableColumns.length > 0) {
      if (isApprovalButton !== false || isSendForApprovalButton !== false)
        setRenderGrid(true);
    }
  }, [tableColumns, isApprovalButton, isSendForApprovalButton]);

  // Add useEffect to check for 'order_type' in approvalProductFilters whenever selectedApprovalFilters changes
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

  const createApprovalPayload = () => {
    try {
      const appliedOmsFilters = resolveAppliedOmsFiltersForApproval({
        omsFilterConfiguration: props?.omsFilterConfiguration,
        selectedFilters: props?.selectedFilters,
        decisionDashboardDependencyData: undefined,
      });
      let appliedOmsProductFilters = appliedOmsFilters?.filter(
        (filter) => filter.display_type !== "fiscalCalendar"
      );
      
      // CRITICAL FIX: Ensure DC filter from props.selectedFilters is always included
      // The DC filter may not be in omsFilterConfiguration but exists in selectedFilters
      const dcFilterFromSelectedFilters = props?.selectedFilters?.find(
        (f) => f.dimension === "dc"
      );
      if (dcFilterFromSelectedFilters && !appliedOmsProductFilters.find(f => f.dimension === "dc")) {
        appliedOmsProductFilters = [...appliedOmsProductFilters, cloneDeep(dcFilterFromSelectedFilters)];
      }

      let appliedOmsDateFilters = [];
      if (
        props?.recommRecieptDate?.start_date &&
        props?.recommRecieptDate?.end_date
      ) {
        appliedOmsDateFilters.push(props?.recommRecieptDate);
      }
      if (props?.ropDate?.start_date && props?.ropDate?.end_date) {
        appliedOmsDateFilters.push(props?.ropDate);
      }

      //Approval Flow Filters
      const approvalProductFilters = cloneDeep(
        props?.selectedApprovalFilters?.filter(
          (filter) => filter.attribute_name !== "fiscal_date_range"
        )
      );

      //To check if the user has reset the filters or removed styles/l6_id/articles/skus
      let selectedRowKeyPresentInFilters = false;
      if (
        approvalProductFilters?.length &&
        props?.orderManagementProductDetailsFilters?.length
      ) {
        approvalProductFilters.map((filter) => {
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

      //If there is no filter available on the Approval Filters for selected styles/l6_id/articles/skus
      if (
        !selectedRowKeyPresentInFilters &&
        props?.selectedRowsFilter?.length
      ) {
        approvalProductFilters.push(props?.selectedRowsFilter[0]);
      }

      let payload = {
        level_of_heirarchy: props?.targetTable,
        approval_date_filters: isEmpty(props?.orderPlacementDate)
          ? []
          : [props?.orderPlacementDate],
        approval_filters:
          approvalProductFilters?.length > 0
            ? approvalProductFilters
            : props?.selectedRowsFilter,
        filters: appliedOmsProductFilters,
        date_filter: appliedOmsDateFilters,
      };

      if (props?.isExpeditePosRawROQAlert) {
        payload.isExpeditePosRawROQAlert = true;
      }

      //If the Approval Flow pane is called from Style Order Summary screen, then add the order_group_id, article, order_placement_date to the payload
      if (props?.targetTable === "style_order_summary") {
        const checkConfig = props?.getCheckConfigurationForStyleOrderSummary();
        const ordersSelectedFromStyleOrderSummary = filterObjectKeys(
          props?.selectedRows
        );
        payload.orders = ordersSelectedFromStyleOrderSummary;
        Object.assign(payload, checkConfig);
        Object.assign(payload, props?.styleOrderSummaryPayload);
      }

      return payload;
    } catch (error) {
      console.log("Error in creating Approval Payload", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const filterObjectKeys = (data) => {
    try {
      const productDetailsKey =
        props?.orderManagementProductDetailsFilters[0]?.column_name;
      const desiredKeys = [
        "order_group_id",
        productDetailsKey,
        "order_placement_date",
      ];
      return data.map((obj) => {
        return desiredKeys.reduce((acc, key) => {
          if (
            key === "order_placement_date" &&
            !obj[key] &&
            obj["order_placement_recom_date"]
          ) {
            acc[key] = obj["order_placement_recom_date"];
          } else {
            acc[key] = obj[key];
          }
          return acc;
        }, {});
      });
    } catch (error) {
      console.log("Error in filtering Object Keys", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  const manualCallBack = async (manualbody, pageIndex, params) => {
    try {
      props.setOmsApprovalFlowTableLoader(true);
      let body = createApprovalPayload();
      body.meta = {
        ...manualbody,
        limit: { limit: 10, page: pageIndex + 1 },
      };
      let response = await props.getOmsApprovalFlowTableData(body);
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
        setTotalOrderQty(response?.data?.data?.total_order_qty ?? 0);
        return {
          data: formatedData,
          totalCount: response.data.total || formatedData.length,
        };
      } else {
        props.setOmsApprovalFlowTableLoader(false);
        setRowCount(0);
        setIsLoading(false);
        return { data: [], totalCount: 0 };
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setOmsApprovalFlowTableLoader(false);
    }
  };

  const confirmApproval = async (actionType, overrideComment = null) => {
    try {
      let body = createApprovalPayload();
      body.action = actionType;
      // Use overrideComment if provided, otherwise use state comment
      const finalComment = overrideComment !== null ? overrideComment : comment;
      body.comment = finalComment !== "" ? finalComment : "-";
      
      if (props?.isExpeditePosRawROQAlert) {
        body.isExpeditePosRawROQAlert = true;
      }
      let actionSuccess = false;
      setIsLoading(true);
      if (actionType === SEND_FOR_APPROVAL) {
        const response = await props?.sendForApprovalOmsApprovalFlow(body);
        if (response?.data?.status) {
          actionSuccess = true;
          displaySnackMessages(
            `Success - ${SEND_FOR_APPROVAL} | Order ID : [${response?.data?.data?.order_batch_name}]`,
            "success",
            8000
          );
        }
      } else {
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
      setRefreshTable(true);
      setShowApprovalDialog(false);
      setComment("");
      setIsLoading(false);
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
    // If customComment exists and has content, use it; otherwise use selectedComment
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
      // New access control: Check props.userAccess first
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
      // Fallback to existing access control logic
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

  const getTopRightOptions = () => {
    let options = [];
    const showApproveButton = isApprovalButton?.isVisible && (rowCount > 0 && !isLoading && isOrderTypePresent && !isEmpty(props?.orderPlacementDate));
    // Only show Approve button if order_type is present
    if (showApproveButton) {
      options.push(
        <Button
          id="approveButton"
          color="primary"
          variant="contained"
          onClick={() => handleApprovalClick("approve")}
        >
          {isApprovalButton?.label || "Approve"}
        </Button>
      );
    }
    const showSendForApprovalButton = isSendForApprovalButton?.isVisible && (rowCount > 0 && !isLoading && isOrderTypePresent && !isEmpty(props?.orderPlacementDate));
    // Only show Send For Approval button if order_type is present AND orderPlacementDate is not empty
    if (showSendForApprovalButton) {
      options.push(
        <Button
          id="sendForApprovalButton"
          color="primary"
          variant="contained"
          className={`${globalClasses.marginLeft1rem}`}
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
    <>
      {renderGrid ? (
        tableColumns?.length > 0 ? (
          <>
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
              tableHeader={getTableHeader()}
              topRightOptions={getTopRightOptions().length > 0 ? getTopRightOptions() : null}
              treeData={true}
              childKey={"status_obj"}
              groupDisplayType={"custom"}
              noRowOverlayMessage={
                <div className={classes.noRowsOverlay}>
                  <img src={noDataFound} alt="no data found" width={50} height={50}/>
                  <Typography className={classes.noRowsHeading}>
                    No data to display
                  </Typography>
                </div>
              }
            />
          </>
        ) : (
          <div className={globalClasses.centerAlign}>
            <EmptyStateWrapper />
          </div>
        )
      ) : (
        <LoadingOverlay loader={!renderGrid} />
      )}

      {props?.enableCommentDialogWithOptions && showApprovalDialog && (
        <CommentModal
          open={true}
          onClose={onCancelCommentModal}
          onSubmit={handleCommentModalSubmit}
        />
      )}
    </>
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
    recommRecieptDate:
      store.omsReducer.orderManagementService.recommRecieptDate,
    ropDate: store.omsReducer.orderManagementService.ropDate,
    orderManagementProductDetailsFilters:
      store.omsReducer.orderManagementService
        .orderManagementProductDetailsFilters,
    orderingAccessControl:
      store?.omsReducer.orderingCommonService.orderingAccessControl,
    selectedFilters: store.omsReducer.orderManagementService.selectedFilters,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOmsApprovalFlowColumnConfig: () =>
    dispatch(getOmsApprovalFlowColumnConfig()),
  getOmsApprovalFlowTableData: (payload) =>
    dispatch(getOmsApprovalFlowTableData(payload)),
  setOmsApprovalFlowTableLoader: (payload) =>
    dispatch(setOmsApprovalFlowTableLoader(payload)),
  sendForApprovalOmsApprovalFlow: (payload) =>
    dispatch(sendForApprovalOmsApprovalFlow(payload)),
  approveOmsApprovalFlow: (payload) =>
    dispatch(approveOmsApprovalFlow(payload)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ApprovalFlowTable);
