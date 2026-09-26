import React, { useEffect, useLayoutEffect, useState } from "react";
import { Popover } from "@mui/material";
import Loader from "core/Utils/Loader/loader";
import { EmptyState } from "impact-ui-v3";
import {
  ERROR_MESSAGE,
  EXPEDITE_RECOVERY_WINDOW_VISIBLE_CHART_LABELS,
} from "modules/oms/constants-oms/stringConstants";
import ExpediteOrdersDeepDiveChart from "modules/oms/pages-oms/OffCycle Order/Expedite-Orders/components/Deep-Dive/DeepDiveChart";
import {
  fetchExpediteRecoveryWindowChart,
  normalizeExpediteChartRows,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import { buildExpediteRecoveryWindowChartRequest } from "../utils/helper";
const POPOVER_APPROX_HEIGHT = 380;
const VIEWPORT_GUTTER = 16;

/**
 * @typedef {{ vertical: "top" | "bottom" | "center", horizontal: "left" | "right" | "center" }} PopoverOrigin
 * @typedef {{ anchorOrigin: PopoverOrigin, transformOrigin: PopoverOrigin }} PopoverPlacement
 */

/** @type {PopoverPlacement} */
const PLACEMENT_BELOW = {
  anchorOrigin: { vertical: "bottom", horizontal: "left" },
  transformOrigin: { vertical: "top", horizontal: "left" },
};

/** @type {PopoverPlacement} */
const PLACEMENT_ABOVE = {
  anchorOrigin: { vertical: "top", horizontal: "left" },
  transformOrigin: { vertical: "bottom", horizontal: "left" },
};

const RecoveryWindowGraphPopover = ({
  anchorEl,
  rowData,
  selectedFilters,
  alertTopRightOptions,
  dateRange,
  onClose,
  displaySnackMessages,
}) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);

  const [placement, setPlacement] = useState(PLACEMENT_BELOW);
  const open = Boolean(anchorEl);
  const rowKey = rowData?.unique_row_id ?? rowData?.article;


  useLayoutEffect(() => {
    if (!open || !anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GUTTER;
    const spaceAbove = rect.top - VIEWPORT_GUTTER;
    const shouldFlipAbove =
      spaceBelow < POPOVER_APPROX_HEIGHT && spaceAbove > spaceBelow;
    setPlacement(shouldFlipAbove ? PLACEMENT_ABOVE : PLACEMENT_BELOW);
  }, [open, anchorEl, rowKey]);

  useEffect(() => {
    if (!open || !rowData) {
      setChartData(null);
      setLoading(false);
      return undefined;
    }

    let cancelled = false;

    const loadChart = async () => {
      setLoading(true);
      setChartData(null);
      try {
        const baseRequest = buildExpediteRecoveryWindowChartRequest(
          rowData,
          selectedFilters,
          alertTopRightOptions,
          dateRange
        );
        if (!baseRequest) {
          if (!cancelled) {
            displaySnackMessages(ERROR_MESSAGE, "error");
          }
          return;
        }

        const requestPayload = { ...baseRequest, graph_type: "mini" };
        const envelope = await fetchExpediteRecoveryWindowChart(requestPayload);
        if (!cancelled) {
          setChartData(envelope);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          setChartData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadChart();

    return () => {
      cancelled = true;
    };
  }, [open, rowKey, rowData, selectedFilters, alertTopRightOptions, dateRange]);

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={placement.anchorOrigin}
      transformOrigin={placement.transformOrigin}

      disableScrollLock

      PaperProps={{
        sx: {
          borderRadius: "8px",
          boxShadow: "0 4px 20px rgba(0, 0, 0, 0.12)",
          maxHeight: `calc(100vh - ${VIEWPORT_GUTTER * 2}px)`,
          overflowY: "auto",
        },
      }}
    >
      <div style={{ padding: 4, width: 720 }}>
        {loading ? (
          <Loader loader minHeight="280px" />
        ) : normalizeExpediteChartRows(chartData)?.length ? (
          <ExpediteOrdersDeepDiveChart
            sessionChartData={chartData}
            isLoadingSession={false}
            isSessionChartLoading={false}
            showInDashboard={true}
            forceLegacyChart={true}

            compactLayout={true}
            chartHeight={280}
            visibleChartLabels={EXPEDITE_RECOVERY_WINDOW_VISIBLE_CHART_LABELS}
            showChartHighlights={true}
          />
        ) : (
          <div style={{ minHeight: 280, display: "flex", alignItems: "center" }}>
            <EmptyState
              heading="No Data Found"
              description="Recovery window chart is unavailable for this row."
              primaryButtonLabel={null}
              secondaryButtonLabel={null}
            />
          </div>
        )}
      </div>
    </Popover>
  );
};

export default RecoveryWindowGraphPopover;
