import React, { useMemo, useState, useRef, useCallback } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { Button } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import { VIOLATIONS_COLUMNS_CONFIG, VIOLATIONS_TABLE_HEADER } from "./ata-constants";
import AllocationCodesBadges from "./AllocationCodesBadges";

/**
 * Tab 1: Style-Color / Pack / Source - Violations detail table.
 * Client-side table showing ATA exceedance violations.
 */
const ViolationsTable = ({
  violations = [],
  onViewAllCodes,
  onAutoAdjust,
  autoAdjustLoading = false,
  displaySnackMessages,
}) => {
  const [selectedRows, setSelectedRows] = useState([]);
  const [isAdjustMode, setIsAdjustMode] = useState(false);
  const tableInstance = useRef(null);
  const isAdjustModeRef = useRef(false);
  const adjustedRowIdsRef = useRef(new Set());
  const newlyAdjustedIdsRef = useRef(new Set());

  const loadTableInstance = useCallback((params) => {
    tableInstance.current = params;
  }, []);

  const onSelectionChanged = useCallback((event) => {
    // In adjust mode, revert any selection change and show a toast
    if (isAdjustModeRef.current) {
      const lockedIds = adjustedRowIdsRef.current;
      event.api.forEachNode((node) => {
        const isLocked = lockedIds.has(node.data.violation_row_id);
        if (node.isSelected() && !isLocked) {
          node.setSelected(false, false, true);
        } else if (!node.isSelected() && isLocked) {
          node.setSelected(true, false, true);
        }
      });
      displaySnackMessages?.(
        "Please save or cancel the current adjustment before changing selection",
        "warning"
      );
      return;
    }
    const selected = event.api.getSelectedRows();
    setSelectedRows(selected || []);
  }, [displaySnackMessages]);

  /** Calculate new_allocated_qty for selected rows that don't already have it */
  const handleAdjustAllocation = useCallback(() => {
    if (!tableInstance.current?.api || selectedRows.length === 0) return;

    // Only adjust rows that don't already have new_allocated_qty
    const eligibleRows = selectedRows.filter(
      (row) => row.new_allocated_qty === null || row.new_allocated_qty === undefined
    );

    if (eligibleRows.length === 0) {
      displaySnackMessages?.(
        "All selected rows have already been auto-adjusted",
        "warning"
      );
      return;
    }

    setIsAdjustMode(true);
    isAdjustModeRef.current = true;

    const selectedKeys = new Set(
      selectedRows.map((row) => row.violation_row_id)
    );
    adjustedRowIdsRef.current = selectedKeys;

    const eligibleKeys = new Set(
      eligibleRows.map((row) => row.violation_row_id)
    );
    newlyAdjustedIdsRef.current = eligibleKeys;

    tableInstance.current.api.forEachNode((node) => {
      if (eligibleKeys.has(node.data.violation_row_id)) {
        const ata = node.data.ata ?? 0;
        node.data.new_allocated_qty = ata;
      }
    });

    tableInstance.current.api.refreshCells({
      columns: ["new_allocated_qty"],
      force: true,
    });
  }, [selectedRows, displaySnackMessages]);

  /** Cancel: reset new_allocated_qty only for rows adjusted in this session */
  const handleCancel = useCallback(() => {
    const newlyAdjusted = newlyAdjustedIdsRef.current;
    isAdjustModeRef.current = false;
    adjustedRowIdsRef.current = new Set();
    newlyAdjustedIdsRef.current = new Set();
    if (tableInstance.current?.api) {
      tableInstance.current.api.forEachNode((node) => {
        if (newlyAdjusted.has(node.data.violation_row_id)) {
          node.data.new_allocated_qty = null;
        }
      });
      tableInstance.current.api.refreshCells({
        columns: ["new_allocated_qty"],
        force: true,
      });
      tableInstance.current.api.deselectAll();
    }
    setSelectedRows([]);
    setIsAdjustMode(false);
  }, []);

  /** Save: call the auto-adjust API with selected violation keys */
  const handleSave = useCallback(async () => {
    if (!onAutoAdjust) return;

    // Count total rows in the table
    let totalRowCount = 0;
    tableInstance.current?.api?.forEachNode(() => {
      totalRowCount++;
    });

    // Only send violation keys for rows that were newly adjusted (not previously resolved)
    const eligibleRows = selectedRows.filter(
      (row) => !row.resolved
    );

    // If all rows are selected, send adjust_all: true with empty violation_keys
    const isAllSelected = selectedRows.length >= totalRowCount;
    const violationKeys = isAllSelected ? [] : eligibleRows.map((row) => row.violation_key);
    const adjustAll = isAllSelected;

    const success = await onAutoAdjust(violationKeys, adjustAll);

    if (success) {
      isAdjustModeRef.current = false;
      adjustedRowIdsRef.current = new Set();
      newlyAdjustedIdsRef.current = new Set();
      setIsAdjustMode(false);
      setSelectedRows([]);
      // Deselect all rows in the grid
      tableInstance.current?.api?.deselectAll();
    }
  }, [selectedRows, onAutoAdjust]);

  const columns = useMemo(() => {
    const colConfig = cloneDeep(VIOLATIONS_COLUMNS_CONFIG);

    // Attach cellRenderer for allocation_codes column (badges)
    const allocationCodesCol = colConfig.find(
      (col) => col.column_name === "allocation_codes"
    );
    if (allocationCodesCol) {
      allocationCodesCol.cellRenderer = (params) => {
        const codes = params.data?.allocation_codes || [];
        return (
          <AllocationCodesBadges
            codes={codes}
            onViewAll={onViewAllCodes}
          />
        );
      };
    }

    // Attach cellRenderer for status-like display on new_allocated_qty
    const newAllocQtyCol = colConfig.find(
      (col) => col.column_name === "new_allocated_qty"
    );
    if (newAllocQtyCol) {
      newAllocQtyCol.cellRenderer = (params) => {
        const value = params.data?.new_allocated_qty;
        return value !== null && value !== undefined ? value : "-";
      };
    }

    return agGridColumnFormatter(colConfig);
  }, [onViewAllCodes]);

  const topRightOptions = useMemo(() => {
    const options = [];

    if (isAdjustMode) {
      options.push(
        <Button
          key="cancel-adjust"
          variant="tertiary"
          onClick={handleCancel}
        >
          Cancel
        </Button>
      );
      options.push(
        <Button
          key="save-adjust"
          variant="primary"
          onClick={handleSave}
          loading={autoAdjustLoading}
        >
          Save
        </Button>
      );
    } else if (selectedRows.length > 0) {
      const allAlreadyAdjusted = selectedRows.every(
        (row) => row.new_allocated_qty !== null && row.new_allocated_qty !== undefined
      );
      options.push(
        <Button
          key="adjust-allocation"
          variant="primary"
          onClick={handleAdjustAllocation}
          disabled={allAlreadyAdjusted}
        >
          Adjust Allocation
        </Button>
      );
    }

    return options;
  }, [isAdjustMode, selectedRows, handleCancel, handleSave, handleAdjustAllocation, autoAdjustLoading]);

  return (
    <Loader loader={autoAdjustLoading} minHeight="200px">
      <AgGridComponent
        rowdata={violations}
        columns={columns}
        uniqueRowId="violation_row_id"
        tableHeader={VIOLATIONS_TABLE_HEADER}
        topRightOptions={topRightOptions}
        selectAllHeaderComponent={true}
        rowSelection="multiple"
        onSelectionChanged={onSelectionChanged}
        loadTableInstance={loadTableInstance}
        sizeColumnsToFitFlag
        paginationPageSize={6}
        adjustTableHeight={true}
        downloadAsExcel={true}
        hideSelectAllRecords={violations.length <= 6}
      />
    </Loader>
  );
};

export default ViolationsTable;
