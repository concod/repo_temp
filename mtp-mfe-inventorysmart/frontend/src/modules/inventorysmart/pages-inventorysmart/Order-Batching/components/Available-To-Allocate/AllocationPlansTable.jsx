import React, { useMemo, useState, useRef, useCallback } from "react";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import { Button, Menu, Prompt } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import { ALLOCATION_PLANS_COLUMNS_CONFIG } from "./ata-constants";
import { useATAStyles } from "./ata-styles";

/**
 * Tab 2: Allocation Plans table.
 * Client-side table showing breached allocation plans.
 */
const AllocationPlansTable = ({
  allocationPlans = [],
  onFinalizePlans,
  onReviewRecommendation,
  displaySnackMessages,
}) => {
  const classes = useATAStyles();
  const [selectedRows, setSelectedRows] = useState([]);
  const [menuAnchorEl, setMenuAnchorEl] = useState(null);
  const [confirmPrompt, setConfirmPrompt] = useState(null);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const tableInstance = useRef(null);

  const loadTableInstance = useCallback((params) => {
    tableInstance.current = params;
  }, []);

  const onSelectionChanged = useCallback(() => {
    if (!tableInstance.current?.api) return;
    const selected = tableInstance.current.api.getSelectedRows();
    setSelectedRows(selected || []);
  }, []);

  /** Wraps onFinalizePlans with loading state */
  const executeFinalize = useCallback(async (mode, codes) => {
    try {
      setFinalizeLoading(true);
      await onFinalizePlans?.(mode, codes);
    } finally {
      setFinalizeLoading(false);
    }
  }, [onFinalizePlans]);

  /** Finalize All Plans — requires confirmation listing all plan codes */
  const handleFinalizeAllPlans = useCallback(() => {
    const allCodes = allocationPlans.map((p) => p.allocation_code);
    const hasPlans = allCodes.length > 0;
    setConfirmPrompt({
      title: "Finalize All Plans",
      message: hasPlans ? (
        <div>
          <p className={classes.promptParagraph}>
            This will finalize all plans including breached ones with unresolved violations. The following plans will be overridden:
          </p>
          <ul className={classes.promptList}>
            {allCodes.map((code) => (
              <li key={code} className={classes.promptListItem}>{code}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={classes.promptParagraph}>
          There are no plans to override. This will finalize all resolved plans. Do you want to proceed?
        </p>
      ),
      onConfirm: () => {
        setConfirmPrompt(null);
        executeFinalize("all_override", allCodes);
      },
    });
  }, [allocationPlans, executeFinalize, classes]);

  /** Finalize Resolved Plans — no confirmation needed */
  const handleFinalizeResolvedPlans = useCallback(() => {
    executeFinalize("resolved_only", []);
  }, [executeFinalize]);

  /** Finalize Resolved & Selected Plans — requires confirmation listing selected plan codes */
  const handleFinalizeResolvedAndSelected = useCallback(() => {
    const hasPlans = allocationPlans.length > 0;
    if (hasPlans && selectedRows.length === 0) {
      displaySnackMessages?.(
        "Please select at least one plan to finalize",
        "warning"
      );
      return;
    }
    const selectedCodes = selectedRows.map((r) => r.allocation_code);
    setConfirmPrompt({
      title: "Finalize Resolved & Selected Plans",
      message: hasPlans ? (
        <div>
          <p className={classes.promptParagraph}>
            This will finalize resolved plans and override the following selected plans:
          </p>
          <ul className={classes.promptList}>
            {selectedCodes.map((code) => (
              <li key={code} className={classes.promptListItem}>{code}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className={classes.promptParagraph}>
          There are no plans to select for override. This will finalize all resolved plans. Do you want to proceed?
        </p>
      ),
      onConfirm: () => {
        setConfirmPrompt(null);
        executeFinalize("resolved_and_selected", selectedCodes);
      },
    });
  }, [allocationPlans, selectedRows, executeFinalize, displaySnackMessages, classes]);

  const menuOptions = useMemo(
    () => [
      {
        label: "Finalize All Plans",
        value: "all",
        onClick: () => {
          handleFinalizeAllPlans();
          setMenuAnchorEl(null);
        },
      },
      {
        label: "Finalize Resolved Plans",
        value: "resolved",
        onClick: () => {
          handleFinalizeResolvedPlans();
          setMenuAnchorEl(null);
        },
      },
      {
        label: "Finalize Resolved & Selected Plans",
        value: "resolved_selected",
        onClick: () => {
          handleFinalizeResolvedAndSelected();
          setMenuAnchorEl(null);
        },
      },
    ],
    [handleFinalizeAllPlans, handleFinalizeResolvedPlans, handleFinalizeResolvedAndSelected]
  );

  const columns = useMemo(() => {
    const colConfig = cloneDeep(ALLOCATION_PLANS_COLUMNS_CONFIG);

    // Attach cellRenderer for status column (badge)
    const statusCol = colConfig.find((col) => col.column_name === "status");
    if (statusCol) {
      statusCol.cellRenderer = (params) => {
        const status = params.data?.status;
        if (!status) return null;
        return (
          <span className={classes.statusBadge}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </span>
        );
      };
    }

    // Set onClick on the review_action link column (same pattern as main table)
    const reviewCol = colConfig.find(
      (col) => col.column_name === "review_action"
    );
    if (reviewCol) {
      reviewCol.onClick = (params) => {
        onReviewRecommendation?.(params);
      };
    }

    return agGridColumnFormatter(colConfig);
  }, [onReviewRecommendation]);

  const topRightOptions = useMemo(() => {
    return [
      <div key="finalize-menu" className={classes.finalizeMenuWrapper}>
        <Button
          variant="primary"
          onClick={(e) => setMenuAnchorEl(e.currentTarget)}
        >
          Finalize Plans
        </Button>
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={() => setMenuAnchorEl(null)}
          selected=""
          options={menuOptions}
        />
      </div>,
    ];
  }, [menuAnchorEl, menuOptions, classes]);

  return (
    <>
      <Loader loader={finalizeLoading} minHeight="200px">
        <AgGridComponent
          rowdata={allocationPlans}
          columns={columns}
          uniqueRowId="allocation_code"
          tableHeader="Detail table"
          topRightOptions={topRightOptions}
          selectAllHeaderComponent={true}
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
          loadTableInstance={loadTableInstance}
          sizeColumnsToFitFlag
          paginationPageSize={6}
          adjustTableHeight={true}
          downloadAsExcel={true}
          hideSelectAllRecords={allocationPlans.length <= 6}
        />
      </Loader>
      <Prompt
        variant="warning"
        isOpen={Boolean(confirmPrompt)}
        title={confirmPrompt?.title || ""}
        primaryButtonLabel="Confirm"
        secondaryButtonLabel="Cancel"
        onPrimaryButtonClick={() => confirmPrompt?.onConfirm?.()}
        onSecondaryButtonClick={() => setConfirmPrompt(null)}
        handleClose={() => setConfirmPrompt(null)}
      >
        {confirmPrompt?.message || ""}
      </Prompt>
    </>
  );
};

export default AllocationPlansTable;
