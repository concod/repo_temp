import React, { useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import {
  Popover,
  IconButton,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import globalStyles from "core/Styles/globalStyles";
import { getBudgetData } from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import { fetchBudgetDataV3 } from "modules/oms/pages-oms/OrderManagement/api/getBudgetData.api.js";
import {
  DEFAULT_OMS_BUDGET_INFO_POPOVER_LABELS,
  resolveOmsBudgetInfoPopoverLabels,
} from "modules/oms/utils-oms/omsBudgetConfig.util.js";

const useStyles = makeStyles(() => ({
  infoPopoverPaper: {
    marginTop: "6px",
    borderRadius: "6px",
    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.1)",
    backgroundColor: "#f5f5f5",
    minWidth: "300px",
  },
  infoPopoverContent: {
    padding: "8px 12px 12px",
  },
  infoPopoverHeader: {
    marginBottom: "8px",
    width: "100%",
  },
  infoPopoverTitle: {
    fontWeight: 700,
    fontSize: "14px",
    color: "#424242",
  },
  infoPopupMetricsRow: {
    display: "flex",
    alignItems: "stretch",
    gap: 0,
  },
  infoPopupMetric: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    padding: "4px 6px",
  },
  infoPopupValue: {
    fontWeight: 700,
    fontSize: "14px",
    color: "#424242",
  },
  infoPopupValuePillPositive: {
    fontWeight: 700,
    fontSize: "14px",
    color: "#fff",
    backgroundColor: "#4caf50",
    borderRadius: "12px",
    padding: "2px 8px",
  },
  infoPopupValuePillNegative: {
    fontWeight: 700,
    fontSize: "14px",
    color: "#fff",
    backgroundColor: "#f44336",
    borderRadius: "12px",
    padding: "2px 8px",
  },
  infoPopupLabel: {
    fontSize: "11px",
    color: "#616161",
    marginTop: "2px",
  },
  infoPopupDivider: {
    width: "1px",
    backgroundColor: "#e0e0e0",
  },
}));

const formatTo2Decimals = (value) => {
  if (value == null || value === "") return "-";
  const n = Number(value);
  return Number.isNaN(n) ? "-" : n.toFixed(2);
};

/** Legacy path: only order_cost comes from row data; Planned/Available/Excess come from API in new flow */
const normalizePopoverDataLegacy = (weekData) => {
  if (!weekData || typeof weekData !== "object") {
    return {
      plannedReceipts: null,
      availableReceipts: null,
      orderCost: null,
      excessOrDeficit: null,
    };
  }
  const num = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
  return {
    plannedReceipts: null,
    availableReceipts: null,
    orderCost: num(weekData?.order_cost),
    excessOrDeficit: null,
  };
};

/**
 * Info popover shown when the user clicks the info icon on order qty cells
 * (Total row, L0 table, or L1 table) in edit hierarchy. Displays Planned Receipts,
 * Available Receipts (from get-budget-data API), Order Cost (from matrix summary),
 * and Excess Or Deficit (computed as available_budget_cost - order_cost).
 * data: either { cellData, budgetRequestPayload } or legacy week object.
 */
const EditHierarchyInfoPopover = ({
  anchorEl,
  onClose,
  data,
  useV3BudgetData = false,
  labels: labelsProp,
}) => {
  const classes = useStyles();
  const globalClasses = globalStyles();
  const open = Boolean(anchorEl);
  const labels = {
    ...DEFAULT_OMS_BUDGET_INFO_POPOVER_LABELS,
    ...(labelsProp || resolveOmsBudgetInfoPopoverLabels(null)),
  };

  const isNewShape =
    data &&
    typeof data === "object" &&
    "cellData" in data &&
    "budgetRequestPayload" in data;
  const cellData = isNewShape ? data.cellData : data;
  const budgetRequestPayload = isNewShape ? data.budgetRequestPayload : null;

  const [budgetResult, setBudgetResult] = useState(null);
  const [budgetLoading, setBudgetLoading] = useState(false);
  const [budgetError, setBudgetError] = useState(null);

  useEffect(() => {
    if (!open) {
      setBudgetResult(null);
      setBudgetError(null);
      setBudgetLoading(false);
      return;
    }
    if (!budgetRequestPayload) {
      setBudgetResult(null);
      setBudgetError(null);
      return;
    }
    let cancelled = false;
    setBudgetLoading(true);
    setBudgetError(null);
    setBudgetResult(null);

    const fetchBudgetData = async () => {
      try {
        // New OM flow only — v3 ClickHouse; legacy matrix-summary keeps v2.
        const result = useV3BudgetData
          ? await fetchBudgetDataV3(budgetRequestPayload)
          : await getBudgetData(budgetRequestPayload);
        if (!cancelled) {
          setBudgetResult(result ?? null);
        }
      } catch (err) {
        if (!cancelled) {
          setBudgetError(
            err?.response?.data?.message ??
              err?.message ??
              "Failed to load budget data"
          );
        }
      } finally {
        if (!cancelled) {
          setBudgetLoading(false);
        }
      }
    };

    fetchBudgetData();
    return () => {
      cancelled = true;
    };
  }, [open, budgetRequestPayload, useV3BudgetData]);

  const num = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
  const orderCost = num(cellData?.order_cost);
  const plannedReceipts = num(budgetResult?.planned_budget_cost);
  const availableReceipts = num(budgetResult?.available_budget_cost);
  const excessOrDeficit =
    availableReceipts != null && orderCost != null
      ? availableReceipts - orderCost
      : null;

  const display = isNewShape
    ? {
        plannedReceipts: budgetLoading
          ? undefined
          : budgetError
          ? null
          : plannedReceipts,
        availableReceipts: budgetLoading
          ? undefined
          : budgetError
          ? null
          : availableReceipts,
        orderCost,
        excessOrDeficit: budgetLoading
          ? undefined
          : budgetError
          ? null
          : excessOrDeficit,
        budgetLoading,
        budgetError,
      }
    : normalizePopoverDataLegacy(data);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{ className: classes.infoPopoverPaper }}
    >
      <div className={classes.infoPopoverContent}>
        <div
          className={`${globalClasses.flexAlignBetweenCenter} ${classes.infoPopoverHeader}`}
        >
          <Typography component="span" className={classes.infoPopoverTitle}>
            {labels.title}
          </Typography>
          <IconButton onClick={onClose} size="small" aria-label="close">
            <CloseIcon fontSize="small" />
          </IconButton>
        </div>
        <div className={classes.infoPopupMetricsRow}>
          <div className={classes.infoPopupMetric}>
            {display.budgetLoading === true ? (
              <CircularProgress size={20} />
            ) : (
              <Typography className={classes.infoPopupValue}>
                {formatTo2Decimals(display.plannedReceipts)}
              </Typography>
            )}
            <Typography className={classes.infoPopupLabel}>
              {labels.planned_otb}
            </Typography>
          </div>
          <div className={classes.infoPopupDivider} />
          <div className={classes.infoPopupMetric}>
            {display.budgetLoading === true ? (
              <CircularProgress size={20} />
            ) : (
              <Typography className={classes.infoPopupValue}>
                {formatTo2Decimals(display.availableReceipts)}
              </Typography>
            )}
            <Typography className={classes.infoPopupLabel}>
              {labels.available_otb}
            </Typography>
          </div>
          <div className={classes.infoPopupDivider} />
          <div className={classes.infoPopupMetric}>
            <Typography className={classes.infoPopupValue}>
              {formatTo2Decimals(display.orderCost)}
            </Typography>
            <Typography className={classes.infoPopupLabel}>
              {labels.order_cost}
            </Typography>
          </div>
          <div className={classes.infoPopupDivider} />
          <div className={classes.infoPopupMetric}>
            {display.budgetLoading === true ? (
              <CircularProgress size={20} />
            ) : display.excessOrDeficit != null ? (
              <Typography
                className={
                  display.excessOrDeficit >= 0
                    ? classes.infoPopupValuePillPositive
                    : classes.infoPopupValuePillNegative
                }
              >
                {formatTo2Decimals(Math.abs(display.excessOrDeficit))}
              </Typography>
            ) : (
              <Typography className={classes.infoPopupValue}>-</Typography>
            )}
            <Typography className={classes.infoPopupLabel}>
              {labels.available}
            </Typography>
          </div>
        </div>
      </div>
    </Popover>
  );
};

export default EditHierarchyInfoPopover;
