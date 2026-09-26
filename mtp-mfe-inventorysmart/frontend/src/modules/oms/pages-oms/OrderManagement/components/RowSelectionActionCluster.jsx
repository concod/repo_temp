import React, { useState } from "react";
import { Button } from "impact-ui-v3";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import {
  selectOrderManagementView,
  setSelectedRowKeys,
  setSelectedRowTraces,
} from "../slices/orderManagementView.slice.js";
import { setMatrixHandoff } from "../slices/matrixHandoff.slice.js";
import ApprovalFlowDialog from "./MatrixSummaryApprovalFlowDialog";
import { ORDER_MANAGEMENT_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import { ORDER_MANAGEMENT_V3_PRODUCT_DETAILS } from "modules/oms/constants-oms/routeConstants";
import {
  setOrderManagementDeepDiveFiltersData,
  setOrderManagementDeepDiveFiltersPayload,
  setSelectedRowsFromMatrixSummary,
} from "modules/oms/services-oms/Order-Management/order-management-service";
import {
  buildSelectedRowsForApproval,
  flattenFiscalCalendarForApproval,
} from "../utils/approvalSelectionAdapter.util.js";
import { buildHierarchySelectionPayload } from "../utils/selectionTrace.util.js";
import { buildMatrixApprovalPaneContext } from "../utils/buildApprovalPanePayload.util.js";
import { PRESERVE_OM_VIEW_SESSION_KEY } from "../constants/navigation.constants.js";
import { cloneDeep } from "lodash";
import {
  deriveNextPlacementRangeFromNodes,
  NEXT_PLACEMENT_DATE_FIELD,
} from "../utils/nextPlacementRange.util.js";
import { resolveOmIsV3Schema } from "../utils/resolveOmIsV3Schema.util.js";

const clusterStyle = {
  display: "flex",
  alignItems: "center",
  gap: 8,
};

function RowSelectionActionCluster({
  onAfterMutation,
  viewMode,
  getSelectedNodesData,
  placementCalendarData = [],
  screenId,
}) {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const view = useSelector(selectOrderManagementView);
  const selectedFilters = useSelector(
    (store) => store.omsReducer.orderManagementService.selectedFilters
  );
  const selectedDcs = useSelector(
    (store) => store.omsReducer.orderManagementService.selectedDcs
  );

  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [preselectRange, setPreselectRange] = useState(null);

  const selectedCount = view.selectedRowKeys.length;

  const handleApprovalDialogClose = (reloadFlag) => {
    setIsApproveOpen(false);
    if (reloadFlag === false || reloadFlag === undefined) return;
    dispatch(setSelectedRowKeys([]));
    dispatch(setSelectedRowTraces([]));
    onAfterMutation?.({ clearSelection: true });
  };

  const handleApproveClick = () => {
    const nodesData =
      typeof getSelectedNodesData === "function" ? getSelectedNodesData() : [];
    const range = deriveNextPlacementRangeFromNodes(
      nodesData,
      placementCalendarData,
      NEXT_PLACEMENT_DATE_FIELD
    );
    setPreselectRange(range);
    setIsApproveOpen(true);
  };

  const adaptedSelectedRows = isApproveOpen
    ? buildSelectedRowsForApproval(view.selectedRowKeys)
    : [];
  const flatFiscalCalendar = isApproveOpen
    ? flattenFiscalCalendarForApproval(
        view.fiscalCalendar,
        view.selectedRoqDateTab
      )
    : [];

  const approvalPaneContext = isApproveOpen
    ? buildMatrixApprovalPaneContext({
        screenId,
        pivotOrder: view.appliedPivotOrder || [],
        selectedRowTraces: view.selectedRowTraces || [],
        isSelectAll: view.isSelectAll,
        selectedFilters,
        selectedDateRange: view.selectedDateRange,
        selectedRoqDateTab: view.selectedRoqDateTab,
      })
    : null;

  const handleProductDetailsClick = () => {
    const pivotOrder = view.appliedPivotOrder || [];
    const inputTraces = view.selectedRowTraces || [];
    const hierarchyPayload = buildHierarchySelectionPayload({
      traces: inputTraces,
      pivotOrder,
      selectedFilters,
      isSelectAll: view.isSelectAll,
    });

    const activeTab = view.selectedRoqDateTab || "roq_placement_date";
    const selectedDateRange =
      view.selectedDateRange?.[activeTab] ||
      view.selectedDateRange?.roq_placement_date ||
      null;

    const fiscalCalendarRows = flattenFiscalCalendarForApproval(
      view.fiscalCalendar,
      activeTab
    );

    const panelFilters = Array.isArray(selectedFilters)
      ? cloneDeep(selectedFilters)
      : [];

    dispatch(
      setMatrixHandoff({
        selectedHierarchies: hierarchyPayload.selected_hierarchies,
        availableHierarchies: hierarchyPayload.available_hierarchies,
        globalFilters: hierarchyPayload.global_filters,
        dynamicHierarchy: hierarchyPayload.dynamic_hierarchy,
        frequency: view.hlsDateFilter,
        fiscalView: view.fiscalView,
        selectedDateRange,
        fiscalCalendarRows,
        selectedFilters: panelFilters,
        selectedDcs: Array.isArray(selectedDcs) ? selectedDcs : [],
        isPackEnabled: false,
        selectedRoqDateTab: activeTab,
        isSelectAll: view.isSelectAll,
        sourcePath: location.pathname,
        isV3Schema: resolveOmIsV3Schema({ pathname: location.pathname }),
      })
    );

    // Seed deep-dive Redux BEFORE navigate so Product Details does not mount
    // with payload=[] then re-fetch after a post-mount seed effect.
    dispatch(setOrderManagementDeepDiveFiltersData({}));
    dispatch(setSelectedRowsFromMatrixSummary({}));
    dispatch(
      setOrderManagementDeepDiveFiltersPayload({
        filters: panelFilters,
      })
    );

    // Skip view-slice reset on matrix unmount so returning restores pivot/time/selection.
    sessionStorage.setItem(PRESERVE_OM_VIEW_SESSION_KEY, "1");
    navigate(ORDER_MANAGEMENT_V3_PRODUCT_DETAILS);
  };

  return (
    <div style={clusterStyle}>
      {viewMode === "edit" && <div className="divider-line" />}
      <Button variant="tertiary" onClick={handleProductDetailsClick}>
        Product Details
      </Button>
      <div className="divider-line" />
      <Button variant="primary" onClick={handleApproveClick}>
        Approve
      </Button>

      {isApproveOpen && (
        <ApprovalFlowDialog
          setShowApprovalModal={setIsApproveOpen}
          screenName={ORDER_MANAGEMENT_FILTER_CONFIG}
          fiscalCalendarDetails={flatFiscalCalendar}
          selectedRows={adaptedSelectedRows}
          targetTable={"matrix_summary"}
          reloadComponent={handleApprovalDialogClose}
          showNextCycleHelper={Boolean(preselectRange)}
          selectedFilters={selectedFilters}
          approvalPaneContext={approvalPaneContext}
          {...(preselectRange
            ? {
                styleOrderSummaryPayload: {
                  recommendedOrderPlacementDateRange: preselectRange,
                },
              }
            : {})}
        />
      )}
    </div>
  );
}

export default RowSelectionActionCluster;
