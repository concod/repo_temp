/**
 * GeneratedOrderCard — step-2 carousel card (Figma 3184:95537).
 * Edit/delete actions show on card hover only (12px gap between icons).
 *
 * Card metrics + display order id come from POST …/post-simulation-summary.
 */
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import Typography from "@mui/material/Typography";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import { Button } from "impact-ui-v3";
import { useExpediteOrdersCardsStyles } from "./styles.js";
import { fetchExpeditePostSimulationSummary } from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import ExpediteOrderImage from "assets/Expedite_order_image.png";

const formatStatNumber = (v) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    n
  );
};

const formatStatCurrency = (v) => {
  if (v == null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.-]/g, ""));
  if (!Number.isFinite(n)) return String(v);
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
};

const StatColumn = ({ label, display, classes }) => (
  <div className={classes.generatedOrderCardStatCol}>
    <Typography
      className={classes.generatedOrderCardStatLabel}
      component="span"
    >
      {label}
    </Typography>
    <Typography
      className={classes.generatedOrderCardStatValue}
      component="span"
    >
      {display ?? "--"}
    </Typography>
  </div>
);

const GeneratedOrderCard = ({ order, onEdit, onDelete }) => {
  const sessionId = useSelector(
    (s) => s?.omsReducer?.expediteOrdersService?.sessionId
  );
  const classes = useExpediteOrdersCardsStyles();
  const [iconFailed, setIconFailed] = useState(false);
  const [summaryDetails, setSummaryDetails] = useState(null);

  useEffect(() => {
    let cancelled = false;
    if (!order?.revisionId || !sessionId) {
      setSummaryDetails(null);
      return undefined;
    }
    fetchExpeditePostSimulationSummary({
      session_id: sessionId,
      revision_id: order.revisionId,
    })()
      .then((res) => {
        if (cancelled) return;
        const row = res?.data?.data?.data;
        if (res?.data?.status === false || !row || typeof row !== "object") {
          setSummaryDetails(null);
          return;
        }
        setSummaryDetails({
          orderId: row.order_id != null ? String(row.order_id) : null,
          lostSalesUnits: row.lost_sales_units,
          lostSalesRevenue: row.lost_sales_revenue,
          roqUnits: row.roq_units,
          roqCost: row.roq_cost,
        });
      })
      .catch(() => {
        if (!cancelled) setSummaryDetails(null);
      });
    return () => {
      cancelled = true;
    };
  }, [order?.revisionId, sessionId]);

  const merged = { ...order, ...(summaryDetails || {}) };

  const orderIdLine =
    merged.orderId != null && String(merged.orderId).length > 0
      ? String(merged.orderId)
      : merged.revisionId != null && String(merged.revisionId).length > 0
      ? String(merged.revisionId)
      : merged.label || "—";

  const lostUnits =
    merged.lostSalesUnits != null
      ? formatStatNumber(merged.lostSalesUnits)
      : merged.lostUnits != null
      ? formatStatNumber(merged.lostUnits)
      : null;

  const lostRevenue =
    merged.lostSalesRevenue != null
      ? formatStatCurrency(merged.lostSalesRevenue)
      : merged.lostSales != null
      ? formatStatCurrency(merged.lostSales)
      : null;

  const roqUnitsDisp =
    merged.roqUnits != null ? formatStatNumber(merged.roqUnits) : null;
  const roqCostDisp =
    merged.roqCost != null ? formatStatCurrency(merged.roqCost) : null;

  return (
    <div className={classes.generatedOrderCard}>
      <div className={classes.generatedOrderCardTopRow}>
        <div className={classes.generatedOrderCardTitleGroup}>
          <div className={classes.generatedOrderCardIconBox}>
            {!iconFailed ? (
              <img
                src={ExpediteOrderImage}
                alt=""
                onError={() => setIconFailed(true)}
              />
            ) : (
              <InventoryOutlinedIcon />
            )}
          </div>
          <Typography
            className={classes.generatedOrderCardOrderId}
            component="p"
          >
            Order ID : {orderIdLine}
          </Typography>
        </div>
        <div className={classes.generatedOrderCardActions}>
          <Button
            variant="tertiary"
            size="small"
            className={classes.generatedOrderCardIconAction}
            onClick={onEdit}
            aria-label="Edit simulation"
            icon={<EditOutlinedIcon sx={{ fontSize: 16 }} />}
          />
          <Button
            variant="tertiary"
            size="small"
            className={classes.generatedOrderCardIconAction}
            onClick={onDelete}
            aria-label="Delete simulation"
            icon={<DeleteOutlineIcon sx={{ fontSize: 16 }} />}
          />
        </div>
      </div>

      <div className={classes.generatedOrderCardStatsRow}>
        <StatColumn
          label="Lost sales units"
          display={lostUnits}
          classes={classes}
        />
        <StatColumn
          label="Lost sales revenue"
          display={lostRevenue}
          classes={classes}
        />
        <StatColumn
          label="ROQ units"
          display={roqUnitsDisp}
          classes={classes}
        />
        <StatColumn label="ROQ cost" display={roqCostDisp} classes={classes} />
      </div>
    </div>
  );
};

export default GeneratedOrderCard;
