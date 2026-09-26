/**
 * SimulateBottomSheet
 *
 * Bottom-sheet panel for the Expedite simulate/generate flow.
 * Business logic is a direct port of OffCycleOrderFirstStep + OffCycleOrderSetAllPopUp:
 *   – onCellValueChanged: full demand/buffer/delivery cascades
 *   – customCellRenderer: conditional display/disable per-row state
 *   – validateSelectedRows: pre-generate validation with red-cell highlighting
 *   – onBlur: percentage capping
 *   – Set All popup: field defs from tenant `oms_offcycle_expedite_order_config` →
 *     `expedite_orders.simulated_setall_formdata_fields` (same Redux slice as KPI panel).
 *
 * Row data: POST /expedite/deep-dive/constraints. Column metadata: GET core/table-fields
 * for `inventorysmart_oms_expedite_simulate_recommendations`. Bottom-sheet snapshot in
 * localStorage stores only the grid-selected rows at Generate time (Approach 1).
 */
import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useDispatch, useSelector } from "react-redux";
import { BottomSheet, Button } from "impact-ui-v3";
import AgGridComponent from "core/Utils/agGrid";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import Loader from "core/Utils/Loader/loader";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep } from "lodash";
import moment from "moment";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { TENANT_DATE_FORMAT } from "modules/oms/constants-oms/stringConstants";
import {
  runSimulationAndFetchAfterState,
  setGeneratedOrders,
  fetchExpediteSimulateRecommendationsTableConfig,
} from "modules/oms/services-oms/Decision-Dashboard/expedite-order-service";
import { EXPEDITE_LS_KEYS } from "../constants";
import OffCycleOrderSetAllPopUp from "modules/oms/pages-oms/Create-New-Order/components/OffCycleOrder/OffCycleOrderSetAllPopUp";

/** Run agGridColumnFormatter in view-mode (7th arg = true). */
const buildTableColumnsRaw = (rawColumns) =>
  agGridColumnFormatter(rawColumns, null, null, null, null, null, null, true);

/**
 * Map /constraints session defaults to row objects matching the column names.
 * Returns null when the defaults array is empty (caller shows an empty grid).
 *
 * order_generation_date: use value from API if available, fall back to today.
 * The cascade guards (lead_time ↔ delivery_date) depend on this being non-null.
 */
const constraintsToRowData = (defaults, dateFormat) => {
  if (!defaults?.length) return null;
  return agGridRowFormatter(
    defaults.map((row) => ({
      unique_row_id: `${row.choice}_${row.dc}`,
      choice: row.choice,
      dc: row.dc,
      projected_delivery_date_orig: row.projected_delivery_date_orig || null,
      lead_time_orig: row.lead_time_orig ?? null,
      transportation_mode_orig: row.shipment_mode || null,
      wos_demand_orig: row.wos_demand_orig ?? null,
      lost_sales: row.lost_sales ?? null,
      lost_sales_revenue: row.lost_sales_revenue ?? null,
      stockout_date: row.stockout_date || null,
      demand_period_selection: row.demand_period_selection || "twos",
      demand_start_date: null,
      demand_end_date: null,
      demand_twos: row.demand_twos ?? null,
      buffer_stock_addition_method: row.buffer_stock_addition_method || null,
      service_level_pct: row.service_level_pct ?? null,
      safety_stock_units: row.safety_stock_units ?? null,
      sell_through_pct: row.sell_through_pct ?? null,
      safety_stock_wos: row.safety_stock_wos ?? null,
      min_order_quantity_sku: row.min_order_quantity_sku ?? null,
      min_order_quantity_style_color:
        row.min_order_quantity_style_color ?? null,
      min_order_quantity_style: row.min_order_quantity_style ?? null,
      // Use API value if present; fall back to today so lead_time ↔ delivery_date
      // cascades always have a non-null base date to calculate from.
      order_generation_date:
        row.order_generation_date || moment().format(dateFormat),
      delivery_date: row.projected_delivery_date || null,
      lead_time: row.lead_time ?? null,
      shipment_mode: row.shipment_mode || "Ship",
      // Passed through so onCellValueChanged can cascade lead_time/delivery_date
      // when the user changes shipment mode. When the backend doesn't yet return
      // this field the fallback (no cascade) is acceptable.
      shipment_modes: Array.isArray(row.shipment_modes)
        ? row.shipment_modes
        : null,
    })),
    null,
    "unique_row_id"
  );
};

/**
 * Build changed_values payload for POST /simulate.
 * Maps new column names → backend field names.
 */
const buildChangedValues = (rows) =>
  rows.map((row) => {
    return {
      choice: row.choice,
      dc: row.dc,
      delivery_input_type: "lead_time_manual",
      lead_time: row.lead_time != null ? Number(row.lead_time) : null,
      ship_mode: row.shipment_mode || null,
      demand_period_selection: row.demand_period_selection || "twos",
      demand_start_date: row.demand_start_date || null,
      demand_end_date: row.demand_end_date || null,
      twos: row.demand_twos != null ? Number(row.demand_twos) : null,
      buffer_stock_addition_method: row.buffer_stock_addition_method || null,
      service_level_pct: row.service_level_pct ?? null,
      safety_stock_units: row.safety_stock_units ?? null,
      safety_stock_wos: row.safety_stock_wos ?? null,
      sell_through_pct: row.sell_through_pct ?? null,
    };
  });

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const SimulateBottomSheet = ({ open, onClose, editCardIndex }) => {
  const dispatch = useDispatch();

  // ── Tenant date format (mirrors OffCycleOrderFirstStep) ──────────────────
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  // ── Redux selectors ───────────────────────────────────────────────────────
  const sessionId = useSelector(
    (s) => s?.omsReducer?.expediteOrdersService?.sessionId
  );
  const baseExpeditePayload = useSelector(
    (s) => s?.omsReducer?.expediteOrdersService?.baseExpeditePayload
  );
  const constraintDefaults = useSelector(
    (s) => s?.omsReducer?.expediteOrdersService?.constraintDefaults
  );
  const generatedOrders = useSelector(
    (s) => s?.omsReducer?.expediteOrdersService?.generatedOrders
  );
  const isSimulating = useSelector(
    (s) => s?.omsReducer?.expediteOrdersService?.isSimulating
  );
  /** Same `getExpediteOrdersConfig` payload as HeaderKPIPanel (`oms_offcycle_expedite_order_config`). */
  const expediteOrdersConfig = useSelector(
    (state) => state?.omsReducer?.expediteOrdersService?.expediteOrdersConfig
  );

  const expediteSimulatedSetAllFormFields = useMemo(() => {
    const raw =
      expediteOrdersConfig?.expedite_orders?.simulated_setall_formdata_fields;
    return Array.isArray(raw) ? cloneDeep(raw) : [];
  }, [expediteOrdersConfig]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [rowData, setRowData] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  /** Incremented on every selection change to re-render topRightOptions. */
  const [selectionCounter, setSelectionCounter] = useState(0);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const tableGridInstance = useRef(null);
  const validationErrorsRef = useRef({});
  /** Per-row shipment modes from /constraints or from persisted bottom-sheet rows. */
  const shipmentModesData = useRef({});

  // ── Column defs from core/table-fields (inventorysmart_oms_expedite_simulate_recommendations)
  const [tableColumns, setTableColumns] = useState([]);
  const [tableConfigLoading, setTableConfigLoading] = useState(false);

  // ── Snack helper ─────────────────────────────────────────────────────────
  const displaySnackMessages = useCallback(
    (message, variant = "error") =>
      dispatch(addSnack({ message, options: { variant } })),
    [dispatch]
  );

  // ── Validation error helpers (identical to OffCycleOrderFirstStep) ────────
  const isFieldEmpty = (value) =>
    value === null || value === undefined || value === "";

  const validateServiceLevel = (data) => {
    let v = data.service_level_pct ?? 0;
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    return Math.round(v * 100) / 100;
  };

  const validateSellThrough = (data) => {
    let v = data.sell_through_pct ?? 0;
    if (v < 0) v = 0;
    if (v > 100) v = 100;
    return Math.round(v * 100) / 100;
  };

  // ── refreshRow helper (identical to OffCycleOrderFirstStep) ──────────────
  const refreshRow = (node, columns = null) => {
    if (tableGridInstance.current?.api) {
      tableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
        rowNodes: [node],
        columns: columns || undefined,
      });
    }
  };

  // ── getCellStyle — red-cell highlighting for validation errors ────────────
  const getCellStyle = (params) => {
    const { colDef, node } = params;
    const rowData = node?.data;
    const columnName = colDef?.column_name;
    const currentErrors = validationErrorsRef.current;

    if (!rowData || !columnName) return { backgroundColor: "inherit" };

    const rowErrors = currentErrors[rowData.unique_row_id];
    if (rowErrors && rowErrors.includes(columnName)) {
      return { backgroundColor: "#ffcccc" };
    }
    return { backgroundColor: "inherit" };
  };

  // ── customCellRenderer — conditional display/disable per cell ─────────────
  const customCellRenderer = (params, extraProps) => {
    const { colDef, node } = params;
    const rowData = node.data;
    const columnName = colDef.column_name;
    const column = cloneDeep(colDef);
    const cellStyle = getCellStyle(params);

    // demand_start_date: show "-" when no period selected
    if (
      columnName === "demand_start_date" &&
      !rowData.demand_period_selection &&
      !rowData.demand_start_date
    ) {
      return <span style={cellStyle}>-</span>;
    }

    // demand_end_date: show "-" when no start date
    if (columnName === "demand_end_date" && !rowData.demand_start_date) {
      return <span style={cellStyle}>-</span>;
    }

    // demand_end_date in TWOS mode: read-only formatted string
    if (
      columnName === "demand_end_date" &&
      rowData.demand_period_selection === "twos"
    ) {
      return (
        <div style={cellStyle}>
          <span>
            {rowData.demand_end_date
              ? moment(rowData.demand_end_date).format(DATE_FORMAT)
              : "-"}
          </span>
        </div>
      );
    }

    // demand_twos: read-only in date_range or no-selection mode
    if (columnName === "demand_twos") {
      if (
        rowData.demand_period_selection === "date_range" ||
        !rowData.demand_period_selection
      ) {
        return <span style={cellStyle}>{rowData.demand_twos || "-"}</span>;
      }
    }

    // Buffer-method conditional rendering
    const selectedBufferField = rowData.buffer_stock_addition_method;

    if (
      columnName === "service_level_pct" &&
      selectedBufferField !== "service_level_pct"
    ) {
      return (
        <span style={cellStyle}>
          {`${parseFloat(rowData.service_level_pct || 0).toFixed(2)}%` || "-"}
        </span>
      );
    }
    if (
      columnName === "safety_stock_units" &&
      selectedBufferField !== "safety_stock_units"
    ) {
      return <span style={cellStyle}>{rowData.safety_stock_units ?? "-"}</span>;
    }
    if (
      columnName === "sell_through_pct" &&
      selectedBufferField !== "sell_through_pct"
    ) {
      return (
        <span style={cellStyle}>
          {`${parseFloat(rowData.sell_through_pct || 0).toFixed(2)}%` || "-"}
        </span>
      );
    }

    // Date shouldDisableDate constraints
    if (columnName === "demand_start_date") {
      column.shouldDisableDate = (day) => day.isBefore(moment(), "day");
    }
    if (columnName === "demand_end_date" && rowData.demand_start_date) {
      column.shouldDisableDate = (day) =>
        day.isBefore(moment(rowData.demand_start_date).add(1, "day"), "day");
    }
    if (columnName === "delivery_date") {
      column.minDate = moment().format(DATE_FORMAT);
      column.shouldDisableDate = (day) => day.isBefore(moment(), "day");
    }

    // Disable demand_start/end_date when no period selected
    let isDisabled = false;
    if (
      (columnName === "demand_start_date" ||
        columnName === "demand_end_date") &&
      !rowData.demand_period_selection
    ) {
      isDisabled = true;
    }

    // Override shipment_mode dropdown options with per-row modes from the API.
    // The static column config has placeholder options; the real modes come from
    // node.data.shipment_modes (populated via constraintsToRowData from /constraints).
    if (
      columnName === "shipment_mode" &&
      Array.isArray(rowData.shipment_modes)
    ) {
      const modeOptions = rowData.shipment_modes.map((m) => ({
        label: m.shipment_mode,
        value: m.shipment_mode,
      }));
      // CellRenderers reads column.options; also sync extra.options for parity.
      column.options = modeOptions;
      column.extra = { ...(column.extra || {}), options: modeOptions };
    }

    return (
      <div style={cellStyle}>
        <CellRenderers
          cellData={params}
          column={{ ...column, disabled: isDisabled || column.disabled }}
          extraProps={extraProps}
          actions={null}
        />
      </div>
    );
  };

  /** Add cellRenderer + cellStyle to the conditional editable columns. */
  const enhanceColumnDefinitions = (columns) => {
    const CONDITIONAL_COLUMNS = [
      "demand_period_selection",
      "demand_start_date",
      "demand_end_date",
      "demand_twos",
      "buffer_stock_addition_method",
      "service_level_pct",
      "safety_stock_units",
      "sell_through_pct",
      "delivery_date",
      "lead_time",
      "shipment_mode",
    ];
    return columns.map((col) => {
      const enhanced = { ...col, cellStyle: getCellStyle };
      if (CONDITIONAL_COLUMNS.includes(col.column_name)) {
        enhanced.cellRenderer = customCellRenderer;
      }
      return enhanced;
    });
  };

  // ── onCellValueChanged — full business logic cascade ──────────────────────
  const onCellValueChanged = (params) => {
    try {
      const { colDef, node, newValue, oldValue } = params;
      const columnName = colDef.column_name;

      if (newValue === oldValue) return;

      // Clear validation error for the edited cell
      if (validationErrors[node.data.unique_row_id]) {
        setValidationErrors((prev) => {
          const updated = { ...prev };
          if (updated[node.data.unique_row_id]) {
            updated[node.data.unique_row_id] = updated[
              node.data.unique_row_id
            ].filter((f) => f !== columnName);
            if (updated[node.data.unique_row_id].length === 0) {
              delete updated[node.data.unique_row_id];
            }
          }
          return updated;
        });
      }

      node.data.isEdited = true;

      // demand_period_selection
      if (columnName === "demand_period_selection") {
        refreshRow(node, [
          "demand_period_selection",
          "demand_start_date",
          "demand_end_date",
          "demand_twos",
        ]);
      }

      // demand_start_date
      if (columnName === "demand_start_date" && newValue) {
        if (
          node.data.demand_period_selection === "twos" &&
          node.data.demand_twos
        ) {
          const endDate = moment(newValue)
            .clone()
            .add(node.data.demand_twos * 7 - 1, "days");
          node.data.demand_end_date = endDate.format(DATE_FORMAT);

          setValidationErrors((prev) => {
            const updated = { ...prev };
            if (updated[node.data.unique_row_id]) {
              updated[node.data.unique_row_id] = updated[
                node.data.unique_row_id
              ].filter((f) => f !== "demand_end_date");
              if (updated[node.data.unique_row_id].length === 0)
                delete updated[node.data.unique_row_id];
            }
            return updated;
          });
        }

        if (node.data.demand_period_selection === "date_range") {
          if (node.data.demand_twos) {
            const endDate = moment(newValue)
              .clone()
              .add(node.data.demand_twos * 7 - 1, "days");
            node.data.demand_end_date = endDate.format(DATE_FORMAT);
            setValidationErrors((prev) => {
              const updated = { ...prev };
              if (updated[node.data.unique_row_id]) {
                updated[node.data.unique_row_id] = updated[
                  node.data.unique_row_id
                ].filter((f) => f !== "demand_end_date");
                if (updated[node.data.unique_row_id].length === 0)
                  delete updated[node.data.unique_row_id];
              }
              return updated;
            });
          } else if (node.data.demand_end_date) {
            const daysDiff = moment(node.data.demand_end_date).diff(
              moment(newValue),
              "days"
            );
            if (daysDiff < 6) {
              node.data.demand_start_date = oldValue;
              displaySnackMessages(
                "The date range is too short. Minimum difference should be at least one week (7 days).",
                "error"
              );
              refreshRow(node, ["demand_start_date"]);
              return;
            }
            node.data.demand_twos = Math.round((daysDiff + 1) / 7);
          }
        }

        refreshRow(node, ["demand_end_date", "demand_twos"]);
      }

      // demand_twos
      if (columnName === "demand_twos") {
        if (newValue < 1 || !newValue) {
          node.data.demand_twos = oldValue || 1;
          displaySnackMessages("TWOS must be at least 1.", "error");
          refreshRow(node, ["demand_twos"]);
          return;
        }
        if (
          node.data.demand_period_selection === "twos" &&
          node.data.demand_start_date
        ) {
          node.data.demand_end_date = moment(node.data.demand_start_date)
            .clone()
            .add(newValue * 7 - 1, "days")
            .format(DATE_FORMAT);
          refreshRow(node, ["demand_end_date"]);
        }
      }

      // demand_end_date (date_range mode)
      if (
        columnName === "demand_end_date" &&
        node.data.demand_period_selection === "date_range" &&
        node.data.demand_start_date
      ) {
        const daysDiff = moment(newValue).diff(
          moment(node.data.demand_start_date),
          "days"
        );
        if (daysDiff < 6) {
          node.data.demand_end_date = oldValue;
          displaySnackMessages(
            "The date range is too short. Minimum difference should be at least one week (7 days).",
            "error"
          );
          refreshRow(node, ["demand_end_date"]);
          return;
        }
        node.data.demand_twos = Math.round((daysDiff + 1) / 7);
        refreshRow(node, ["demand_twos"]);
      }

      // buffer_stock_addition_method
      if (columnName === "buffer_stock_addition_method") {
        refreshRow(node, [
          "service_level_pct",
          "safety_stock_units",
          "sell_through_pct",
        ]);
      }

      // shipment_mode — update lead_time + delivery_date from per-row data when available
      if (columnName === "shipment_mode") {
        // Primary source: shipmentModesData ref (populated in hydration effect).
        // Fallback: node.data.shipment_modes from constraints or persisted edit rows.
        const modes =
          shipmentModesData.current[node.data.unique_row_id] ??
          node.data.shipment_modes;
        if (modes) {
          const selectedMode = modes.find((m) => m.shipment_mode === newValue);
          if (selectedMode) {
            node.data.lead_time = selectedMode.lead_time;
            const deliveryDate = moment(node.data.order_generation_date)
              .clone()
              .add(selectedMode.lead_time, "days");
            node.data.delivery_date = deliveryDate.format(DATE_FORMAT);

            if (
              node.data.demand_start_date &&
              deliveryDate.isBefore(moment(node.data.demand_start_date), "day")
            ) {
              setValidationErrors((prev) => {
                const updated = { ...prev };
                if (updated[node.data.unique_row_id]) {
                  updated[node.data.unique_row_id] = updated[
                    node.data.unique_row_id
                  ].filter((f) => f !== "demand_start_date");
                  if (updated[node.data.unique_row_id].length === 0)
                    delete updated[node.data.unique_row_id];
                }
                return updated;
              });
            }
            refreshRow(node, ["lead_time", "delivery_date"]);
          }
        }
      }

      // delivery_date — back-calculate lead_time
      if (columnName === "delivery_date" && node.data.order_generation_date) {
        node.data.lead_time = moment(newValue).diff(
          moment(node.data.order_generation_date),
          "days"
        );
        if (
          node.data.demand_start_date &&
          moment(newValue).isBefore(moment(node.data.demand_start_date), "day")
        ) {
          setValidationErrors((prev) => {
            const updated = { ...prev };
            if (updated[node.data.unique_row_id]) {
              updated[node.data.unique_row_id] = updated[
                node.data.unique_row_id
              ].filter((f) => f !== "demand_start_date");
              if (updated[node.data.unique_row_id].length === 0)
                delete updated[node.data.unique_row_id];
            }
            return updated;
          });
        }
        refreshRow(node, ["lead_time"]);
      }

      // lead_time — forward-calculate delivery_date
      if (columnName === "lead_time" && node.data.order_generation_date) {
        const deliveryDate = moment(node.data.order_generation_date)
          .clone()
          .add(newValue - 1, "days");
        node.data.delivery_date = deliveryDate.format(DATE_FORMAT);
        if (
          node.data.demand_start_date &&
          deliveryDate.isBefore(moment(node.data.demand_start_date), "day")
        ) {
          setValidationErrors((prev) => {
            const updated = { ...prev };
            if (updated[node.data.unique_row_id]) {
              updated[node.data.unique_row_id] = updated[
                node.data.unique_row_id
              ].filter((f) => f !== "demand_start_date");
              if (updated[node.data.unique_row_id].length === 0)
                delete updated[node.data.unique_row_id];
            }
            return updated;
          });
        }
        refreshRow(node, ["delivery_date"]);
      }

      refreshRow(node, [columnName]);
    } catch (err) {
      console.error("Error in onCellValueChanged:", err);
      displaySnackMessages(
        "An error occurred while updating the cell.",
        "error"
      );
    }
  };

  // ── onBlur — cap percentage values (identical to OffCycleOrderFirstStep) ──
  const onBlur = (_e, data, column) => {
    try {
      if (column.colId === "service_level_pct") {
        const validated = validateServiceLevel(data);
        if (tableGridInstance.current?.api) {
          tableGridInstance.current.api.forEachNode((node) => {
            if (node.data.unique_row_id === data.unique_row_id) {
              node.data.service_level_pct = validated;
              tableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: [column.colId],
              });
            }
          });
        }
      }
      if (column.colId === "sell_through_pct") {
        const validated = validateSellThrough(data);
        if (tableGridInstance.current?.api) {
          tableGridInstance.current.api.forEachNode((node) => {
            if (node.data.unique_row_id === data.unique_row_id) {
              node.data.sell_through_pct = validated;
              tableGridInstance.current.api.refreshCells({
                force: true,
                suppressFlash: false,
                rowNodes: [node],
                columns: [column.colId],
              });
            }
          });
        }
      }
    } catch (err) {
      console.error("Error in onBlur:", err);
    }
  };

  // ── validateSelectedRows — pre-generate validation ────────────────────────
  const getSelectedRowsFromGrid = () => {
    const rows = [];
    if (tableGridInstance.current?.api) {
      tableGridInstance.current.api.forEachNode((node) => {
        if (node.selected && node.data) rows.push(node.data);
      });
    }
    return rows;
  };

  const validateSelectedRows = () => {
    const errorFieldsMap = {};
    let hasErrors = false;
    let hasOnlyDeliveryDateError = false;
    let hasMandatoryFieldErrors = false;
    let hasDemandEndDateError = false;

    getSelectedRowsFromGrid().forEach((row) => {
      const rowErrorFields = [];
      let rowHasMandatoryErrors = false;

      if (isFieldEmpty(row.demand_period_selection)) {
        rowErrorFields.push("demand_period_selection");
        rowHasMandatoryErrors = true;
      }
      if (isFieldEmpty(row.demand_start_date)) {
        rowErrorFields.push("demand_start_date");
        rowHasMandatoryErrors = true;
      }
      if (isFieldEmpty(row.demand_end_date)) {
        rowErrorFields.push("demand_end_date");
        rowHasMandatoryErrors = true;
      } else if (
        !isFieldEmpty(row.demand_end_date) &&
        !isFieldEmpty(row.demand_start_date) &&
        moment(row.demand_end_date).isBefore(
          moment(row.demand_start_date),
          "day"
        )
      ) {
        rowErrorFields.push("demand_end_date");
        hasDemandEndDateError = true;
      }
      if (row.demand_period_selection === "twos") {
        if (isFieldEmpty(row.demand_twos)) {
          rowErrorFields.push("demand_twos");
          rowHasMandatoryErrors = true;
        } else if (row.demand_twos < 1) {
          rowErrorFields.push("demand_twos");
          rowHasMandatoryErrors = true;
        }
      }
      if (isFieldEmpty(row.buffer_stock_addition_method)) {
        rowErrorFields.push("buffer_stock_addition_method");
        rowHasMandatoryErrors = true;
      }

      const selectedBufferField = row.buffer_stock_addition_method;
      if (
        selectedBufferField === "service_level_pct" &&
        isFieldEmpty(row.service_level_pct)
      ) {
        rowErrorFields.push("service_level_pct");
        rowHasMandatoryErrors = true;
      }
      if (
        selectedBufferField === "safety_stock_units" &&
        isFieldEmpty(row.safety_stock_units)
      ) {
        rowErrorFields.push("safety_stock_units");
        rowHasMandatoryErrors = true;
      }
      if (
        selectedBufferField === "sell_through_pct" &&
        isFieldEmpty(row.sell_through_pct)
      ) {
        rowErrorFields.push("sell_through_pct");
        rowHasMandatoryErrors = true;
      }
      if (isFieldEmpty(row.delivery_date)) {
        rowErrorFields.push("delivery_date");
        rowHasMandatoryErrors = true;
      }
      if (isFieldEmpty(row.lead_time)) {
        rowErrorFields.push("lead_time");
        rowHasMandatoryErrors = true;
      }
      if (isFieldEmpty(row.shipment_mode)) {
        rowErrorFields.push("shipment_mode");
        rowHasMandatoryErrors = true;
      }

      if (!rowHasMandatoryErrors) {
        if (
          !isFieldEmpty(row.demand_start_date) &&
          !isFieldEmpty(row.delivery_date) &&
          moment(row.delivery_date).isAfter(
            moment(row.demand_start_date),
            "day"
          )
        ) {
          if (!rowErrorFields.includes("demand_start_date"))
            rowErrorFields.push("demand_start_date");
          hasOnlyDeliveryDateError = true;
        }
      }

      if (rowHasMandatoryErrors) hasMandatoryFieldErrors = true;
      if (rowErrorFields.length > 0) {
        errorFieldsMap[row.unique_row_id] = rowErrorFields;
        hasErrors = true;
      }
    });

    return {
      hasErrors,
      errorFieldsMap,
      hasDeliveryDateError:
        hasOnlyDeliveryDateError && !hasMandatoryFieldErrors,
      hasDemandEndDateError: hasDemandEndDateError && !hasMandatoryFieldErrors,
    };
  };

  // ── Set All helpers ───────────────────────────────────────────────────────
  const clearValidationErrors = (rowId, fieldsToCheck) => {
    setValidationErrors((prev) => {
      const updated = { ...prev };
      if (updated[rowId]) {
        updated[rowId] = updated[rowId].filter(
          (f) => !fieldsToCheck.includes(f)
        );
        if (updated[rowId].length === 0) delete updated[rowId];
      }
      return updated;
    });
  };

  const refreshTableData = () => {
    if (tableGridInstance.current?.api) {
      tableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  };

  const handleOpenSetAll = () => setShowSetAllModal(true);
  const handleCloseSetAll = () => setShowSetAllModal(false);

  const loadTableInstance = useCallback((params) => {
    tableGridInstance.current = params;
  }, []);

  const onSelectionChanged = useCallback(() => {
    setSelectionCounter((prev) => prev + 1);
  }, []);

  /** "Set All" button shown in grid header when rows are selected. */
  const getTopRightOptions = () => {
    const selected = getSelectedRowsFromGrid();
    if (
      selected.length === 0 ||
      expediteSimulatedSetAllFormFields.length === 0
    ) {
      return [];
    }
    return [
      <Button
        key="set-all"
        variant="tertiary"
        color="primary"
        onClick={handleOpenSetAll}
      >
        Set All
      </Button>,
    ];
  };

  // ── Hydrate row data + populate shipmentModesData ─────────────────────────
  // Mirrors OffCycleOrderFirstStep.fetchAllTableData: after building row data
  // we also fill shipmentModesData.current so the shipment_mode cascade can
  // look up lead_time for a selected mode (identical to the off-cycle pattern).
  useEffect(() => {
    if (!open) return;

    shipmentModesData.current = {};

    // Edit: show only rows + values from the last successful Generate (localStorage).
    if (editCardIndex !== null) {
      const stored = localStorage.getItem(EXPEDITE_LS_KEYS.BOTTOM_SHEET_DATA);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRowData(parsed);
            parsed.forEach((row) => {
              const id = row?.unique_row_id;
              if (id && Array.isArray(row.shipment_modes)) {
                shipmentModesData.current[id] = row.shipment_modes;
              }
            });
            return;
          }
        } catch {
          /* fall through to constraints */
        }
      }
    }

    const apiRows = constraintsToRowData(constraintDefaults, DATE_FORMAT);
    if (apiRows?.length) {
      setRowData(apiRows);
      constraintDefaults.forEach((row) => {
        const rowId = `${row.choice}_${row.dc}`;
        if (row.shipment_modes && Array.isArray(row.shipment_modes)) {
          shipmentModesData.current[rowId] = row.shipment_modes;
        }
      });
    } else {
      setRowData([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, constraintDefaults, editCardIndex]); // DATE_FORMAT is a stable tenant-config value

  // ── Fetch column defs when the sheet opens (same pattern as OffCycleOrderFirstStep)
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setTableConfigLoading(true);

    (async () => {
      try {
        const res = await fetchExpediteSimulateRecommendationsTableConfig();
        let columnsData = res?.data?.data;
        if (!Array.isArray(columnsData)) columnsData = [];

        columnsData = columnsData.map((col) => {
          if (col.type === "DateTimeField" && !col.formatter) {
            return { ...col, formatter: DATE_FORMAT };
          }
          return col;
        });

        if (!cancelled) {
          const raw = buildTableColumnsRaw(columnsData);
          setTableColumns(enhanceColumnDefinitions(raw));
        }
      } catch {
        if (!cancelled) {
          displaySnackMessages(
            "Unable to load simulate recommendations table layout.",
            "error"
          );
          setTableColumns([]);
        }
      } finally {
        if (!cancelled) setTableConfigLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refresh columns on each open; DATE_FORMAT stable
  }, [open]);

  // ── Sync validation errors to ref + repaint cells ─────────────────────────
  useEffect(() => {
    validationErrorsRef.current = validationErrors;
    if (tableGridInstance.current?.api) {
      tableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  }, [validationErrors]);

  // ── Generate handler ──────────────────────────────────────────────────────
  const handleGenerate = async () => {
    const selected = getSelectedRowsFromGrid();
    if (selected.length === 0 || isSimulating) return;

    // Pre-generate validation (identical to OffCycleOrderFirstStep)
    const validation = validateSelectedRows();
    if (validation.hasErrors) {
      setValidationErrors(validation.errorFieldsMap);
      if (tableGridInstance.current?.api) {
        tableGridInstance.current.api.refreshCells({
          force: true,
          suppressFlash: false,
        });
      }
      if (validation.hasDeliveryDateError) {
        displaySnackMessages(
          "Delivery date has to be earlier than demand start date",
          "error"
        );
      } else if (validation.hasDemandEndDateError) {
        displaySnackMessages(
          "Demand end date has to be later than demand start date",
          "error"
        );
      } else {
        displaySnackMessages("Please fill all mandatory fields", "error");
      }
      return;
    }

    setValidationErrors({});

    const result = await dispatch(
      runSimulationAndFetchAfterState({
        baseExpeditePayload,
        sessionId,
        changedValues: buildChangedValues(selected),
        editCardIndex,
      })
    );

    if (result?.success) {
      localStorage.setItem(
        EXPEDITE_LS_KEYS.BOTTOM_SHEET_DATA,
        JSON.stringify(cloneDeep(selected))
      );
      const newCard = {
        label: `Simulation ${generatedOrders.length + 1}`,
        choiceDcCount: selected.length,
        revisionId: result.revisionId,
        constraints: buildChangedValues(selected),
      };
      const updatedOrders =
        editCardIndex !== null
          ? generatedOrders.map((o, i) => (i === editCardIndex ? newCard : o))
          : [...generatedOrders, newCard];
      dispatch(setGeneratedOrders(updatedOrders));
      onClose();
    } else {
      displaySnackMessages("Simulation failed. Please try again.", "error");
    }
  };

  // selectionCounter drives re-renders so getTopRightOptions re-evaluates on selection change
  const canGenerate =
    selectionCounter >= 0 &&
    getSelectedRowsFromGrid().length > 0 &&
    !isSimulating &&
    !tableConfigLoading &&
    tableColumns.length > 0;

  const showSimulateGrid =
    rowData.length > 0 && tableColumns.length > 0 && !tableConfigLoading;

  const simulateGridPlaceholderMessage = (() => {
    if (tableConfigLoading) return "Loading table layout…";
    if (rowData.length > 0 && tableColumns.length === 0) {
      return "Unable to load table layout. Please try again.";
    }
    if (rowData.length === 0) return "Loading simulation parameters…";
    return "Loading…";
  })();

  // ── getBufferStockField — map buffer stock method values to field accessors ──
  const getBufferStockField = (methodValue) => methodValue;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <BottomSheet
      label="Default"
      open={open}
      onClose={onClose}
      isExpanded={true}
      title={
        editCardIndex !== null ? "Edit Simulation" : "Create Custom Scenario"
      }
      footerOptions={
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button
            size="large"
            type="default"
            variant="text"
            onClick={onClose}
            disabled={isSimulating}
          >
            Cancel
          </Button>
          <Button
            size="large"
            type="default"
            variant="contained"
            onClick={handleGenerate}
            disabled={!canGenerate}
          >
            Generate
          </Button>
        </div>
      }
    >
      <Loader
        loader={isSimulating}
        text="Running simulation…"
        minHeight="300px"
        wrapperPosition="relative"
      >
        {showSimulateGrid ? (
          <AgGridComponent
            columns={tableColumns}
            rowdata={rowData}
            uniqueRowId="unique_row_id"
            selectAllHeaderComponent
            onSelectionChanged={onSelectionChanged}
            onCellValueChanged={onCellValueChanged}
            onBlur={onBlur}
            loadTableInstance={loadTableInstance}
            topRightOptions={getTopRightOptions()}
            height={500}
            showSkeleton={true}
            tableHeader={"Choice list"}
          />
        ) : (
          <div style={{ padding: 24, textAlign: "center" }}>
            {simulateGridPlaceholderMessage}
          </div>
        )}

        {/* Set All modal — exact reuse of OffCycleOrderSetAllPopUp */}
        {showSetAllModal &&
          (() => {
            // Aggregate unique shipment modes from all loaded rows so the Set All
            // dropdown reflects real API modes rather than a static list.
            const modesMap = new Map();
            rowData.forEach((row) => {
              if (Array.isArray(row.shipment_modes)) {
                row.shipment_modes.forEach((m) => {
                  if (m.shipment_mode && !modesMap.has(m.shipment_mode)) {
                    modesMap.set(m.shipment_mode, {
                      label: m.shipment_mode,
                      value: m.shipment_mode,
                    });
                  }
                });
              }
            });
            const dynamicShipmentModeOptions = Array.from(modesMap.values());
            const setAllFieldsWithModes = expediteSimulatedSetAllFormFields.map(
              (field) =>
                field.accessor === "shipment_mode"
                  ? { ...field, options: dynamicShipmentModeOptions }
                  : field
            );
            return (
              <OffCycleOrderSetAllPopUp
                setShowSetAllModal={handleCloseSetAll}
                agGridInstance={tableGridInstance.current}
                refreshTableData={refreshTableData}
                shipmentModesData={shipmentModesData.current}
                clearValidationErrors={clearValidationErrors}
                dateFormat={DATE_FORMAT}
                OFFCYCLE_SETALL_FIELDS={setAllFieldsWithModes}
                getBufferStockField={getBufferStockField}
              />
            );
          })()}
      </Loader>
    </BottomSheet>
  );
};

export default SimulateBottomSheet;
