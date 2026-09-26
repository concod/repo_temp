import React, { useEffect, useState } from "react";
import { makeStyles } from "@mui/styles";
import {
  Popover,
  IconButton,
  Typography,
  CircularProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { fetchBudgetDataV3 } from "modules/oms/pages-oms/OrderManagement/api/getBudgetData.api.js";
import {
  DEFAULT_OMS_BUDGET_INFO_POPOVER_LABELS,
  resolveOmsBudgetInfoPopoverLabels,
} from "modules/oms/utils-oms/omsBudgetConfig.util.js";

const OPERATOR_ORANGE = "#FB6D45";

const useStyles = makeStyles(() => ({
  paper: {
    marginTop: 6,
    borderRadius: 12,
    boxShadow: "0 0 4px rgba(0, 0, 0, 0.12)",
    backgroundColor: "#FFFFFF",
    overflow: "visible",
  },
  content: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    padding: 12,
    minWidth: 420,
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    width: "100%",
    minHeight: 24,
  },
  title: {
    flex: 1,
    fontWeight: 800,
    fontSize: 14,
    lineHeight: "21px",
    color: "#0D152C",
  },
  closeButton: {
    padding: 4,
    borderRadius: 8,
    width: 24,
    height: 24,
  },
  metricsPanel: {
    display: "flex",
    alignItems: "center",
    gap: 20,
    width: "100%",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F5F6FA",
    boxSizing: "border-box",
  },
  metric: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 12,
    flexShrink: 0,
  },
  metricValue: {
    fontWeight: 800,
    fontSize: 14,
    lineHeight: "21px",
    color: "#1F2B4D",
    whiteSpace: "nowrap",
  },
  metricLabel: {
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "16px",
    color: "#60697D",
    textTransform: "capitalize",
    maxWidth: 72,
  },
  divider: {
    width: 1,
    height: 28,
    backgroundColor: "#D5D9E3",
    flexShrink: 0,
  },
  formulaGroup: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    flex: 1,
    minWidth: 0,
  },
  operatorChip: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 999,
    border: `1px solid ${OPERATOR_ORANGE}`,
    backgroundColor: "#FFFFFF",
    color: OPERATOR_ORANGE,
    fontSize: 14,
    fontWeight: 600,
    lineHeight: 1,
    flexShrink: 0,
    boxSizing: "border-box",
  },
  availableBadgePositive: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 47,
    height: 20,
    padding: "2px 8px",
    borderRadius: 999,
    backgroundColor: "#108431",
    color: "#FFFFFF",
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "16px",
    boxSizing: "border-box",
  },
  availableBadgeNegative: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 47,
    height: 20,
    padding: "2px 8px",
    borderRadius: 999,
    backgroundColor: "#D32F2F",
    color: "#FFFFFF",
    fontWeight: 500,
    fontSize: 12,
    lineHeight: "16px",
    boxSizing: "border-box",
  },
  loadingWrap: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 21,
  },
}));

const formatBudgetValue = (value) => {
  if (value == null || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
};

/**
 * Order Management budget info popover — Figma Ordering Master
 * (node 6535:170654). OM-only; legacy EditHierarchyInfoPopover is unchanged.
 */
function OrderQtyBudgetInfoPopover({
  anchorEl,
  onClose,
  data,
  labels: labelsProp,
}) {
  const classes = useStyles();
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

    fetchBudgetDataV3(budgetRequestPayload)
      .then((result) => {
        if (!cancelled) setBudgetResult(result ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setBudgetError(
            err?.response?.data?.message ??
              err?.message ??
              "Failed to load budget data"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setBudgetLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, budgetRequestPayload]);

  const num = (v) => (v != null && !Number.isNaN(Number(v)) ? Number(v) : null);
  const orderCost = num(cellData?.order_cost);
  const plannedOtb = num(budgetResult?.planned_budget_cost);
  const availableOtb = num(budgetResult?.available_budget_cost);
  const availableBalance =
    availableOtb != null && orderCost != null ? availableOtb - orderCost : null;

  const renderValue = (value) => {
    if (budgetLoading) {
      return (
        <span className={classes.loadingWrap}>
          <CircularProgress size={16} />
        </span>
      );
    }
    if (budgetError) {
      return <Typography className={classes.metricValue}>-</Typography>;
    }
    return (
      <Typography className={classes.metricValue}>
        {formatBudgetValue(value)}
      </Typography>
    );
  };

  const renderAvailableBadge = () => {
    if (budgetLoading) {
      return (
        <span className={classes.loadingWrap}>
          <CircularProgress size={16} />
        </span>
      );
    }
    if (budgetError || availableBalance == null) {
      return <Typography className={classes.metricValue}>-</Typography>;
    }
    return (
      <span
        className={
          availableBalance >= 0
            ? classes.availableBadgePositive
            : classes.availableBadgeNegative
        }
      >
        {formatBudgetValue(Math.abs(availableBalance))}
      </span>
    );
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      transformOrigin={{ vertical: "top", horizontal: "left" }}
      PaperProps={{ className: classes.paper }}
    >
      <div className={classes.content}>
        <div className={classes.header}>
          <Typography component="span" className={classes.title}>
            {labels.title}
          </Typography>
          <IconButton
            onClick={onClose}
            size="small"
            aria-label="close"
            className={classes.closeButton}
          >
            <CloseIcon sx={{ fontSize: 16, color: "#60697D" }} />
          </IconButton>
        </div>

        <div className={classes.metricsPanel}>
          <div className={classes.metric}>
            {renderValue(plannedOtb)}
            <Typography className={classes.metricLabel}>
              {labels.planned_otb}
            </Typography>
          </div>

          <div className={classes.divider} />

          <div className={classes.formulaGroup}>
            <div className={classes.metric}>
              {renderValue(availableOtb)}
              <Typography className={classes.metricLabel}>
                {labels.available_otb}
              </Typography>
            </div>

            <span className={classes.operatorChip} aria-hidden>
              −
            </span>

            <div className={classes.metric}>
              <Typography className={classes.metricValue}>
                {formatBudgetValue(orderCost)}
              </Typography>
              <Typography className={classes.metricLabel}>
                {labels.order_cost}
              </Typography>
            </div>

            <span className={classes.operatorChip} aria-hidden>
              =
            </span>

            <div className={classes.metric}>
              {renderAvailableBadge()}
              <Typography className={classes.metricLabel}>
                {labels.available}
              </Typography>
            </div>
          </div>
        </div>
      </div>
    </Popover>
  );
}

export default OrderQtyBudgetInfoPopover;
