/**
 * CreateOffCycleBottomSheet
 *
 * Bottom-sheet panel for Create Off-Cycle from the Expedite Orders page.
 * Mirrors OffCycleOrderFirstStep: same table config/data APIs and grid business logic.
 * Row data: POST /new-off-cycle-order with orders from OFF_CYCLE_ARTICLE_LOC_PAYLOAD LS.
 * Column metadata: GET core/table-fields for inventorysmart_oms_off_cycle_orders.
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
import {
  ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";
import {
  getOffCycleOrderTableConfig,
  getOffCycleOrderTableData,
  saveOffCycleDraft,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service.js";
import { EXPEDITE_LS_KEYS } from "../constants";
import OffCycleOrderSetAllPopUp from "modules/oms/pages-oms/Create-New-Order/components/OffCycleOrder/OffCycleOrderSetAllPopUp";
import GenerateRecommendationPopup from "modules/oms/pages-oms/OffCycle Order/GenerateRecommendationPopup";

/** Run agGridColumnFormatter in view-mode (7th arg = true). */
const buildTableColumnsRaw = (rawColumns) =>
  agGridColumnFormatter(rawColumns, null, null, null, null, null, null, true);

const parseOffCycleArticleLocPayload = () => {
  const raw = localStorage.getItem(
    EXPEDITE_LS_KEYS.OFF_CYCLE_ARTICLE_LOC_PAYLOAD
  );
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed?.orders) || parsed.orders.length === 0)
      return null;
    return parsed;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
const CreateOffCycleBottomSheet = ({ open, onClose, onDraftCreated }) => {
  const dispatch = useDispatch();

  // ── Tenant date format (mirrors OffCycleOrderFirstStep) ──────────────────
  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  const offCycleOrderConfiguration = useSelector(
    (state) =>
      state?.omsReducer?.offCycleOrderService?.offCycleOrderConfiguration
  );

  const offCycleSetAllFields = useMemo(() => {
    const raw = offCycleOrderConfiguration?.offcycle_setall_formdata_fields;
    return Array.isArray(raw) ? cloneDeep(raw) : [];
  }, [offCycleOrderConfiguration]);

  const getBufferStockField = useCallback(
    (methodValue) =>
      offCycleOrderConfiguration?.buffer_stock_field_mapping?.[methodValue],
    [offCycleOrderConfiguration]
  );

  const isRowInDraft = (rowData) => rowData?.is_already_in_draft === true;

  const isRowSelectable = (node) => {
    const rowData = node?.data;
    if (isRowInDraft(rowData)) return false;
    return true;
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [rowData, setRowData] = useState([]);
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});
  const [selectionCounter, setSelectionCounter] = useState(0);
  const [showDraftNamePopup, setShowDraftNamePopup] = useState(false);
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(
    false
  );
  const [isLoading, setIsLoading] = useState(false);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const tableGridInstance = useRef(null);
  const validationErrorsRef = useRef({});
  /** Per-row shipment modes from /constraints or from persisted bottom-sheet rows. */
  const shipmentModesData = useRef({});

  // ── Column defs from core/table-fields (inventorysmart_oms_expedite_simulate_recommendations)
  const [tableColumns, setTableColumns] = useState([]);
  const [tableConfigLoading, setTableConfigLoading] = useState(false);
  const [tableDataLoading, setTableDataLoading] = useState(false);

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

    if (isRowInDraft(rowData)) {
      return { backgroundColor: "#f5f5f5", color: "#9e9e9e" };
    }

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
    const selectedBufferField = getBufferStockField(
      rowData.buffer_stock_addition_method
    );

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

    // Disable editing for rows already in a draft
    let isDisabled = false;
    if (
      (columnName === "demand_start_date" ||
        columnName === "demand_end_date") &&
      !rowData.demand_period_selection
    ) {
      isDisabled = true;
    }
    if (isRowInDraft(rowData)) {
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

      if (isRowInDraft(node.data)) return;

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

      const selectedBufferField = getBufferStockField(
        row.buffer_stock_addition_method
      );
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
    if (selected.length === 0 || offCycleSetAllFields.length === 0) {
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

  const fetchAllTableData = useCallback(async () => {
    const payload = parseOffCycleArticleLocPayload();
    if (!payload?.orders?.length) {
      displaySnackMessages(
        "No off-cycle selection found. Please go to Decision Dashboard and select alerts.",
        "error"
      );
      onClose();
      return;
    }

    setTableDataLoading(true);
    try {
      const { limit, ...metaWithoutLimit } = tableConfigurationMetaData.meta;
      const body = {
        orders: payload.orders,
        is_expedite: payload.is_expedite ?? true,
        meta: { ...metaWithoutLimit },
      };

      const response = await dispatch(getOffCycleOrderTableData(body));

      if (response?.data?.status) {
        const dataResponse = cloneDeep(response.data.data);
        shipmentModesData.current = {};

        dataResponse.forEach((row) => {
          if (row.shipment_modes && Array.isArray(row.shipment_modes)) {
            shipmentModesData.current[row.unique_row_id] = row.shipment_modes;
            const defaultMode = row.shipment_modes.find(
              (mode) => mode.default_mode === 1
            );
            if (defaultMode) {
              row.shipment_mode = defaultMode.shipment_mode;
              row.lead_time = defaultMode.lead_time;
              row.delivery_date = moment(row.order_generation_date)
                .add(defaultMode.lead_time, "days")
                .format(DATE_FORMAT);
            } else if (row.lead_time) {
              row.delivery_date = moment(row.order_generation_date)
                .add(row.lead_time, "days")
                .format(DATE_FORMAT);
            }
          }
        });

        setRowData(agGridRowFormatter(dataResponse, null, "unique_row_id"));
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setRowData([]);
      }
    } catch (err) {
      console.error("Error fetching off-cycle table data:", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setRowData([]);
    } finally {
      setTableDataLoading(false);
    }
  }, [DATE_FORMAT, dispatch, displaySnackMessages, onClose]);

  // ── Hydrate row data from off-cycle API when sheet opens ─────────────────
  useEffect(() => {
    if (!open) return;

    const payload = parseOffCycleArticleLocPayload();
    if (!payload?.orders?.length) {
      displaySnackMessages(
        "No off-cycle selection found. Please go to Decision Dashboard and select alerts.",
        "error"
      );
      onClose();
      return;
    }

    fetchAllTableData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ── Fetch column defs when the sheet opens ───────────────────────────────
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    setTableConfigLoading(true);

    (async () => {
      try {
        const res = await dispatch(getOffCycleOrderTableConfig());
        let columnsData = res?.data?.data;
        if (!Array.isArray(columnsData)) columnsData = [];

        columnsData = columnsData
          .filter((col) => col.column_name !== "draft_name")
          .map((col) => {
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
            "Unable to load off-cycle order table layout.",
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const prepareGenerateRecommendationPayload = (draftName) => {
    const selectedRows = getSelectedRowsFromGrid();
    return {
      draft_name: draftName,
      selected_rows: selectedRows.map((row) => ({
        ...row,
        is_expedite: true,
      })),
    };
  };

  const callGenerateRecommendation = async (draftName) => {
    try {
      setIsLoading(true);
      const payload = prepareGenerateRecommendationPayload(draftName);
      const response = await dispatch(saveOffCycleDraft(payload));

      if (response?.data?.status) {
        const calculationData = {
          sku: response?.data?.data?.sku,
          dc: response?.data?.data?.dc,
          vendor: response?.data?.data?.vendor,
          data_points: response?.data?.data?.data_points,
          draft_id: response?.data?.data?.draft_id,
        };

        displaySnackMessages(
          response.data.message || "Optimization started successfully",
          "success"
        );

        if (onDraftCreated) {
          onDraftCreated(calculationData);
        }
        onClose();
        props?.setSelectedMetricCard("loading_scenario");
      } else {
        displaySnackMessages(
          response?.data?.message || "Failed to generate recommendations",
          "error"
        );
      }
    } catch (error) {
      console.error("Error generating recommendations:", error);
      displaySnackMessages(
        "Error generating recommendations. Please try again.",
        "error"
      );
    } finally {
      setIsGeneratingRecommendation(false);
      setShowDraftNamePopup(false);
      setIsLoading(false);
    }
  };

  const handleGenerateRecommendation = () => {
    const selected = getSelectedRowsFromGrid();
    if (selected.length === 0 || isGeneratingRecommendation) return;

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
    setIsGeneratingRecommendation(true);
    setShowDraftNamePopup(true);
  };

  const closeDraftNamePopup = () => {
    setShowDraftNamePopup(false);
    setIsGeneratingRecommendation(false);
  };

  const canGenerate =
    selectionCounter >= 0 &&
    getSelectedRowsFromGrid().length > 0 &&
    !isGeneratingRecommendation &&
    !isLoading &&
    !tableConfigLoading &&
    !tableDataLoading &&
    tableColumns.length > 0;

  const showOffCycleGrid =
    rowData.length > 0 && tableColumns.length > 0 && !tableConfigLoading;

  const gridPlaceholderMessage = (() => {
    if (tableConfigLoading || tableDataLoading) return "Loading table…";
    if (rowData.length > 0 && tableColumns.length === 0) {
      return "Unable to load table layout. Please try again.";
    }
    if (rowData.length === 0 && !tableDataLoading) {
      return "No off-cycle order data available.";
    }
    return "Loading…";
  })();

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <BottomSheet
      label="Default"
      open={open}
      onClose={onClose}
      isExpanded={true}
      title="Simulate Recommendations"
      footerOptions={
        <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
          <Button
            size="large"
            type="default"
            variant="text"
            onClick={onClose}
            disabled={isGeneratingRecommendation || isLoading}
          >
            Cancel
          </Button>
          <Button
            size="large"
            type="default"
            variant="contained"
            onClick={handleGenerateRecommendation}
            disabled={!canGenerate}
          >
            Generate
          </Button>
        </div>
      }
    >
      <Loader
        loader={isGeneratingRecommendation || isLoading || tableDataLoading}
        text="Generating recommendations…"
        minHeight="300px"
        wrapperPosition="relative"
      >
        {showOffCycleGrid ? (
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
            tableHeader="Style-Color List"
            isRowSelectable={isRowSelectable}
          />
        ) : (
          <div style={{ padding: 24, textAlign: "center" }}>
            {gridPlaceholderMessage}
          </div>
        )}

        {showDraftNamePopup && (
          <GenerateRecommendationPopup
            callGenerateRecommendation={callGenerateRecommendation}
            closeDraftNamePopup={closeDraftNamePopup}
            isLoading={isLoading}
          />
        )}

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
            const setAllFieldsWithModes = offCycleSetAllFields.map((field) =>
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

export default CreateOffCycleBottomSheet;
