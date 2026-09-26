import React, { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import { addSnack, closeSnack } from "core/actions/snackbarActions";
import AgGridComponent from "core/Utils/agGrid";
import { agGridRowFormatter } from "core/Utils/agGrid/row-formatter";
import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import Loader from "core/Utils/Loader/loader";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
} from "modules/oms/constants-oms/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { Button } from "impact-ui-v3";
import { cloneDeep } from "lodash";
import moment from "moment";
import makeStyles from "@mui/styles/makeStyles";
import {
  getOffCycleOrderTableConfig,
  getOffCycleOrderTableData,
  saveOffCycleDraft,
  setOffCycleOrderTableConfigLoader,
  setOffCycleOrderTableDataLoader,
} from "modules/oms/services-oms/Create-New-Order/off-cycle-order-service.js";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import OffCycleOrderSetAllPopUp from "./OffCycleOrderSetAllPopUp";
import OffCycleOrderOptimizationScreen from "./ OffcycleOrder-Optimization-Screen/index.js";
import { useNavigate, useLocation } from "react-router-dom-v5-compat";
import { TENANT_DATE_FORMAT } from "modules/oms/constants-oms/stringConstants";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";
import { DECISION_DASHBOARD } from "modules/oms/constants-oms/routeConstants";
import GenerateRecommendationPopup from "modules/oms/pages-oms/OffCycle Order/GenerateRecommendationPopup";
import { CREATE_NEW_ORDER } from "modules/oms/constants-oms/routeConstants";

/**
 * Component for Off-Cycle Order First Step Table
 * Complex table with conditional editing and business logic
 */
const OffCycleOrderFirstStep = (props) => {
  const globalClasses = globalStyles();
  const customClasses = useStyles();
  const [tableColumns, setTableColumns] = useState([]);
  const [tableData, setTableData] = useState([]); // Client-side table data
  const [render, setRender] = useState(false);
  const [selectionCounter, setSelectionCounter] = useState(0); // Counter to trigger re-render on selection change
  const [isGeneratingRecommendation, setIsGeneratingRecommendation] = useState(
    false
  );
  const [showSetAllModal, setShowSetAllModal] = useState(false);
  const [showOptimizationMessage, setShowOptimizationMessage] = useState(false);
  const [calculationData, setCalculationData] = useState(null);
  const [validationErrors, setValidationErrors] = useState({}); // Store validation errors per row

  const [showDraftNamePopup, setShowDraftNamePopup] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const tableGridInstance = useRef(null);
  const shipmentModesData = useRef({}); // Store shipment modes per row
  const validationErrorsRef = useRef({}); // Ref to always have latest validation errors

  const navigate = useNavigate();
  const location = useLocation();

  // Extract draft_id directly from URL
  const urlParams = new URLSearchParams(location.search);
  const draftIdFromUrl = urlParams.get("draft_id");

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  // Read-only mode when draft_id is present (user navigated back from Step 2)
  const isReadOnlyMode = Boolean(draftIdFromUrl);

  const getBufferStockField = (methodValue) => {
    return props?.OffCycleOrderScreenConfig?.buffer_stock_field_mapping[
      methodValue
    ];
  };

  // Extract min/max values from tenant config for percentage fields
  const OFF_CYCLE_SETALL_FIELDS =
    props?.OffCycleOrderScreenConfig?.offcycle_setall_formdata_fields || [];

  const SERVICE_LEVEL_MIN_VALUE =
    OFF_CYCLE_SETALL_FIELDS?.find(
      (data) => data.accessor === "service_level_pct"
    )?.min_value || 0;

  const SERVICE_LEVEL_MAX_VALUE =
    OFF_CYCLE_SETALL_FIELDS?.find(
      (data) => data.accessor === "service_level_pct"
    )?.max_value || 100;

  const SELL_THROUGH_MIN_VALUE =
    OFF_CYCLE_SETALL_FIELDS?.find(
      (data) => data.accessor === "sell_through_pct"
    )?.min_value || 0;

  const SELL_THROUGH_MAX_VALUE =
    OFF_CYCLE_SETALL_FIELDS?.find(
      (data) => data.accessor === "sell_through_pct"
    )?.max_value || 100;

  /**
   * Validate and cap service_level_pct value
   */
  const validateServiceLevelPct = (data) => {
    let validatedValue = data.service_level_pct ?? 0;
    if (validatedValue < SERVICE_LEVEL_MIN_VALUE) {
      validatedValue = SERVICE_LEVEL_MIN_VALUE;
    }
    if (validatedValue > SERVICE_LEVEL_MAX_VALUE) {
      validatedValue = SERVICE_LEVEL_MAX_VALUE;
    }
    // Round to 2 decimal places for percentage values
    validatedValue = Math.round(validatedValue * 100) / 100;
    return validatedValue;
  };

  /**
   * Validate and cap sell_through_pct value
   */
  const validateSellThroughPct = (data) => {
    let validatedValue = data.sell_through_pct ?? 0;
    if (validatedValue < SELL_THROUGH_MIN_VALUE) {
      validatedValue = SELL_THROUGH_MIN_VALUE;
    }
    if (validatedValue > SELL_THROUGH_MAX_VALUE) {
      validatedValue = SELL_THROUGH_MAX_VALUE;
    }
    // Round to 2 decimal places for percentage values
    validatedValue = Math.round(validatedValue * 100) / 100;
    return validatedValue;
  };

  const displaySnackMessages = (message, variance) => {
    props.closeSnack();
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  /**
   * Check if a row is already in a draft (non-selectable and non-editable)
   */
  const isRowInDraft = (rowData) => {
    return rowData?.is_already_in_draft === true;
  };

  /**
   * Enhanced cell style rules for validation errors and draft rows
   * Uses ref to always access latest validation errors (avoids closure issue)
   * Rows with is_already_in_draft=true are greyed out
   */
  const getCellStyle = (params) => {
    const { colDef, node } = params;
    const rowData = node?.data;
    const columnName = colDef?.column_name;

    // Use ref to get current validation errors (not closure captured value)
    const currentValidationErrors = validationErrorsRef.current;

    if (!rowData || !columnName) {
      return { backgroundColor: "inherit" };
    }

    // Grey out rows that are already in a draft
    if (isRowInDraft(rowData)) {
      return { backgroundColor: "#f5f5f5", color: "#9e9e9e" };
    }

    // Check if this cell has a validation error (red color takes priority)
    const rowErrors = currentValidationErrors[rowData.unique_row_id];

    if (rowErrors && rowErrors.includes(columnName)) {
      return { backgroundColor: "#ffcccc" }; // Light red for error cells
    }

    return { backgroundColor: "inherit" };
  };

  /**
   * Callback to determine if a row is selectable
   * Rows with is_already_in_draft=true cannot be selected
   */
  const isRowSelectable = (node) => {
    const rowData = node?.data;
    // Prevent selection if row is already in a draft
    if (isRowInDraft(rowData)) {
      return false;
    }
    // In read-only mode (viewing draft), no rows are selectable
    if (isReadOnlyMode) {
      return false;
    }
    return true;
  };

  /**
   * Custom cell renderer for conditional editability
   * Also applies cell styling from getCellStyle
   */
  const customCellRenderer = (params, extraProps) => {
    const { colDef, node } = params;
    const rowData = node.data;
    const columnName = colDef.column_name;
    const column = cloneDeep(colDef);

    // Get cell style to apply background color
    const cellStyle = getCellStyle(params);

    // Determine if cell should be disabled
    let isDisabled = false;

    // Display "-" when both start and end dates are null
    if (
      columnName === "demand_start_date" &&
      !rowData.demand_period_selection &&
      !rowData.demand_start_date
    ) {
      return <span style={cellStyle}>-</span>;
    }

    if (columnName === "demand_end_date" && !rowData.demand_start_date) {
      return <span style={cellStyle}>-</span>;
    }

    // Demand Period Selection conditional disabling
    if (
      columnName === "demand_start_date" &&
      !rowData.demand_period_selection
    ) {
      isDisabled = true;
    }

    if (columnName === "demand_end_date" && !rowData.demand_period_selection) {
      isDisabled = true;
    }

    // Buffer Stock Addition Method conditional disabling
    const selectedBufferStockField = getBufferStockField(
      rowData.buffer_stock_addition_method
    );

    if (
      columnName === "service_level_pct" &&
      selectedBufferStockField !== "service_level_pct"
    ) {
      return (
        <span style={cellStyle}>
          {`${parseFloat(rowData.service_level_pct || 0).toFixed(2)}%` || "-"}
        </span>
      );
    }

    if (
      columnName === "safety_stock_units" &&
      selectedBufferStockField !== "safety_stock_units"
    ) {
      const value = rowData.safety_stock_units ?? "-";
      return <span style={cellStyle}>{value}</span>;
    }

    if (
      columnName === "sell_through_pct" &&
      selectedBufferStockField !== "sell_through_pct"
    ) {
      return (
        <span style={cellStyle}>
          {`${parseFloat(rowData.sell_through_pct || 0).toFixed(2)}%` || "-"}
        </span>
      );
    }

    // Date fields - only allow future dates with shouldDisableDate
    if (columnName === "demand_start_date") {
      column.shouldDisableDate = (day) => {
        return day.isBefore(moment(), "day");
      };
    }

    // Demand End Date - show as formatted date string in TWOS mode (not editable), editable in date_range mode
    if (
      columnName === "demand_end_date" &&
      rowData.demand_period_selection === "twos"
    ) {
      // Apply cellStyle from getCellStyle to show error highlighting
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

    // Demand TWOS - show as read-only in date_range mode (auto-calculated), editable only in twos mode
    if (columnName === "demand_twos") {
      // Show as read-only in date_range mode (auto-calculated)
      if (rowData.demand_period_selection === "date_range") {
        return <span style={cellStyle}>{rowData.demand_twos || "-"}</span>;
      }
      // Show as disabled when no demand period selection is made
      if (!rowData.demand_period_selection) {
        return <span style={cellStyle}>{rowData.demand_twos || "-"}</span>;
      }
    }

    if (columnName === "demand_end_date") {
      if (rowData.demand_start_date) {
        column.shouldDisableDate = (day) => {
          return day.isBefore(
            moment(rowData.demand_start_date).add(1, "day"),
            "day"
          );
        };
      }
    }

    if (columnName === "delivery_date") {
      column.minDate = moment().format(DATE_FORMAT);
      column.shouldDisableDate = (day) => {
        return day.isBefore(moment(), "day");
      };
    }

    // Create modified column with disabled flag and cell style
    // Disable editing for rows that are already in a draft or in read-only mode
    const modifiedColumn = {
      ...column,
      disabled:
        isDisabled ||
        column.disabled ||
        isReadOnlyMode ||
        isRowInDraft(rowData),
      cellStyle: cellStyle, // Pass the cell style to the renderer
    };

    // Wrap CellRenderers with a div that has the background color
    return (
      <div style={cellStyle}>
        <CellRenderers
          cellData={params}
          column={modifiedColumn}
          extraProps={extraProps}
          actions={null}
        />
      </div>
    );
  };

  /**
   * Update column definitions with custom cell styles and renderers
   */
  const enhanceColumnDefinitions = (columns) => {
    return columns.map((col) => {
      const enhancedCol = { ...col };

      // Add cell style for all columns
      enhancedCol.cellStyle = getCellStyle;

      // Add custom renderer for conditional editable columns
      const conditionalEditableColumns = [
        "demand_start_date",
        "demand_end_date",
        "demand_twos",
        "service_level_pct",
        "safety_stock_units",
        "sell_through_pct",
        "delivery_date",
        "lead_time",
        "demand_period_selection",
        "buffer_stock_addition_method",
        "shipment_mode",
      ];

      if (conditionalEditableColumns.includes(col.column_name)) {
        enhancedCol.cellRenderer = customCellRenderer;
      }

      return enhancedCol;
    });
  };

  /**
   * Fetch column configuration from API
   */
  const fetchColumnConfig = async () => {
    try {
      props.setOffCycleOrderTableConfigLoader(true);
      let columns = await props.getOffCycleOrderTableConfig();
      let columnsData = columns?.data?.data;

      // Add date format to DateTimeField columns
      columnsData = columnsData.map((col) => {
        if (col.type === "DateTimeField" && !col.formatter) {
          col.formatter = DATE_FORMAT;
        }
        if (col.column_name === "draft_name") {
          col.onClick = (tableInfo) => {
            onClickColumn(tableInfo?.cellData?.data || {});
          };
        }
        return col;
      });

      let formattedColumns = agGridColumnFormatter(
        columnsData,
        null,
        null,
        null,
        null,
        null,
        null,
        true
      );

      let enhancedColumns = enhanceColumnDefinitions(formattedColumns);
      setTableColumns(enhancedColumns);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setOffCycleOrderTableConfigLoader(false);
      setRender(true);
    }
  };

  /**
   * Fetch all table data for client-side table
   * When draft_id is present (navigating back from Step 2), include it in the payload
   * to fetch the draft data instead of fresh data from selected orders
   */
  const fetchAllTableData = async () => {
    try {
      props.setOffCycleOrderTableDataLoader(true);

      const selectedOrders = props.selectedOrdersFromCNO || [];

      const selectedArticleDcCombinations = selectedOrders.map((order) => ({
        article: order.article,
        loc_code: order.linked_store_code || order?.loc_code,
      }));

      // Build request body - fetch all data at once (no pagination)
      // If draft_id is present (user navigated back from Step 2), include it to fetch draft data
      // Remove 'limit' from meta to fetch all records without pagination
      const { limit, ...metaWithoutLimit } = tableConfigurationMetaData.meta;
      let body = {
        ...(draftIdFromUrl
          ? { draft_id: draftIdFromUrl }
          : { orders: selectedArticleDcCombinations }),
        meta: {
          ...metaWithoutLimit,
        },
      };

      let response = await props.getOffCycleOrderTableData(body);

      if (response.data.status) {
        const dataResponse = cloneDeep(response.data.data);

        // Process each row
        dataResponse.forEach((row) => {
          // Store shipment modes data
          if (row.shipment_modes && Array.isArray(row.shipment_modes)) {
            shipmentModesData.current[row.unique_row_id] = row.shipment_modes;
            // Find default shipment mode
            const defaultMode = row.shipment_modes.find(
              (mode) => mode.default_mode === 1
            );

            if (defaultMode) {
              row.shipment_mode = defaultMode.shipment_mode;
              row.lead_time = defaultMode.lead_time;

              // Calculate default delivery date: order_generation_date + lead_time
              row.delivery_date = moment(row.order_generation_date)
                .add(defaultMode.lead_time, "days")
                .format(DATE_FORMAT);
            } else if (row.lead_time) {
              // Fallback if no default mode but lead_time exists
              row.delivery_date = moment(row.order_generation_date)
                .add(row.lead_time, "days")
                .format(DATE_FORMAT);
            }
          }
        });

        let formatedData = agGridRowFormatter(
          dataResponse,
          null,
          "unique_row_id"
        );

        setTableData(formatedData);
        props.setOffCycleOrderTableDataLoader(false);
      } else {
        displaySnackMessages(ERROR_MESSAGE, "error");
        setTableData([]);
        props.setOffCycleOrderTableDataLoader(false);
      }
    } catch (err) {
      console.log("Error in Fetching Off-Cycle Order Table Data", err);
      displaySnackMessages(ERROR_MESSAGE, "error");
      setTableData([]);
      props.setOffCycleOrderTableDataLoader(false);
    }
  };

  /**
   * Handle cell value changes and implement business logic
   */
  const onCellValueChanged = (params) => {
    try {
      const { colDef, node, newValue, oldValue } = params;
      const columnName = colDef.column_name;

      // Skip if value hasn't changed
      if (newValue === oldValue) {
        return;
      }

      // Skip if row is already in a draft (should not be editable)
      if (isRowInDraft(node.data)) {
        return;
      }

      // Clear validation error for this cell if it exists
      if (validationErrors[node.data.unique_row_id]) {
        setValidationErrors((prev) => {
          const updated = { ...prev };
          if (updated[node.data.unique_row_id]) {
            updated[node.data.unique_row_id] = updated[
              node.data.unique_row_id
            ].filter((field) => field !== columnName);
            // Remove the row from errors if no more errors exist
            if (updated[node.data.unique_row_id].length === 0) {
              delete updated[node.data.unique_row_id];
            }
          }
          return updated;
        });
      }

      // Mark row as edited
      node.data.isEdited = true;

      // Business logic for Demand Period Selection
      if (columnName === "demand_period_selection") {
        // Refresh all affected cells to update disabled state
        refreshRow(node, [
          "demand_period_selection",
          "demand_start_date",
          "demand_end_date",
          "demand_twos",
        ]);
      }

      // Business logic for Demand Start Date
      if (columnName === "demand_start_date" && newValue) {
        if (
          node.data.demand_period_selection === "twos" &&
          node.data.demand_twos
        ) {
          // Calculate end date: Start Date + (TWOS * 7) - 1
          const startDate = moment(newValue);
          const endDate = startDate
            .clone()
            .add(node.data.demand_twos * 7 - 1, "days");
          node.data.demand_end_date = endDate.format(DATE_FORMAT);

          // Clear validation error for demand_end_date since it's now auto-filled
          setValidationErrors((prev) => {
            const updated = { ...prev };
            if (updated[node.data.unique_row_id]) {
              updated[node.data.unique_row_id] = updated[
                node.data.unique_row_id
              ].filter((field) => field !== "demand_end_date");
              if (updated[node.data.unique_row_id].length === 0) {
                delete updated[node.data.unique_row_id];
              }
            }
            return updated;
          });
        }

        // Date Range mode logic
        if (node.data.demand_period_selection === "date_range") {
          // If we have TWOS, calculate end date from start date + TWOS
          if (node.data.demand_twos) {
            const startDate = moment(newValue);
            const endDate = startDate
              .clone()
              .add(node.data.demand_twos * 7 - 1, "days");
            node.data.demand_end_date = endDate.format(DATE_FORMAT);

            // Clear validation error for demand_end_date since it's now auto-filled
            setValidationErrors((prev) => {
              const updated = { ...prev };
              if (updated[node.data.unique_row_id]) {
                updated[node.data.unique_row_id] = updated[
                  node.data.unique_row_id
                ].filter((field) => field !== "demand_end_date");
                if (updated[node.data.unique_row_id].length === 0) {
                  delete updated[node.data.unique_row_id];
                }
              }
              return updated;
            });
          }
          // If we have end date but no TWOS, calculate TWOS from dates
          else if (node.data.demand_end_date) {
            const startDate = moment(newValue);
            const endDate = moment(node.data.demand_end_date);
            const daysDiff = endDate.diff(startDate, "days");

            // Validate minimum one week range (at least 7 days)
            if (daysDiff < 6) {
              // Revert to old value and show error
              node.data.demand_start_date = oldValue;
              displaySnackMessages(
                "The date range is too short. Minimum difference should be at least one week (7 days).",
                "error"
              );
              refreshRow(node, ["demand_start_date"]);
              return;
            }

            const calculatedTwos = Math.round((daysDiff + 1) / 7);
            node.data.demand_twos = calculatedTwos;
          }
        }

        refreshRow(node, ["demand_end_date", "demand_twos"]);
      }

      // Business logic for Demand TWOS (TWOS mode)
      if (columnName === "demand_twos") {
        // Validate TWOS is at least 1
        if (newValue < 1 || !newValue) {
          // Revert to old value and show error
          node.data.demand_twos = oldValue || 1;
          displaySnackMessages("TWOS must be at least 1.", "error");
          refreshRow(node, ["demand_twos"]);
          return;
        }

        if (
          node.data.demand_period_selection === "twos" &&
          node.data.demand_start_date
        ) {
          // Recalculate end date: Start Date + (TWOS * 7) - 1
          const startDate = moment(node.data.demand_start_date);
          const endDate = startDate.clone().add(newValue * 7 - 1, "days");
          node.data.demand_end_date = endDate.format(DATE_FORMAT);

          refreshRow(node, ["demand_end_date"]);
        }
      }

      // Business logic for Demand End Date (Date Range mode)
      if (
        columnName === "demand_end_date" &&
        node.data.demand_period_selection === "date_range" &&
        node.data.demand_start_date
      ) {
        // Calculate TWOS based on date range
        const startDate = moment(node.data.demand_start_date);
        const endDate = moment(newValue);
        const daysDiff = endDate.diff(startDate, "days");

        // Validate minimum one week range (at least 7 days)
        if (daysDiff < 6) {
          // Revert to old value and show error
          node.data.demand_end_date = oldValue;
          displaySnackMessages(
            "The date range is too short. Minimum difference should be at least one week (7 days).",
            "error"
          );
          refreshRow(node, ["demand_end_date"]);
          return;
        }

        const calculatedTwos = Math.round((daysDiff + 1) / 7);
        node.data.demand_twos = calculatedTwos;

        refreshRow(node, ["demand_twos"]);
      }

      // Business logic for Buffer Stock Addition Method
      if (columnName === "buffer_stock_addition_method") {
        // Refresh all related cells
        refreshRow(node, [
          "service_level_pct",
          "safety_stock_units",
          "sell_through_pct",
        ]);
      }

      // Business logic for Shipment Mode
      if (columnName === "shipment_mode") {
        const shipmentModes =
          shipmentModesData.current[node.data.unique_row_id];
        if (shipmentModes) {
          const selectedMode = shipmentModes.find(
            (mode) => mode.shipment_mode === newValue
          );
          if (selectedMode) {
            // Update lead time from selected mode
            node.data.lead_time = selectedMode.lead_time;

            // Recalculate delivery date
            const orderDate = moment(node.data.order_generation_date);
            const deliveryDate = orderDate
              .clone()
              .add(selectedMode.lead_time, "days");
            node.data.delivery_date = deliveryDate.format(DATE_FORMAT);

            // Clear demand_start_date validation error if new delivery date is now before demand start date
            if (node.data.demand_start_date) {
              const demandStartDate = moment(node.data.demand_start_date);
              // Check if delivery date is now valid (before or same as demand start date)
              if (deliveryDate.isBefore(demandStartDate, "day")) {
                setValidationErrors((prev) => {
                  const updated = { ...prev };
                  if (updated[node.data.unique_row_id]) {
                    updated[node.data.unique_row_id] = updated[
                      node.data.unique_row_id
                    ].filter((field) => field !== "demand_start_date");
                    if (updated[node.data.unique_row_id].length === 0) {
                      delete updated[node.data.unique_row_id];
                    }
                  }
                  return updated;
                });
              }
            }

            refreshRow(node, ["lead_time", "delivery_date"]);
          }
        }
      }

      // Business logic for Delivery Date
      if (columnName === "delivery_date" && node.data.order_generation_date) {
        // Update Lead Time: Delivery Date - Order Generation Date + 1
        const orderDate = moment(node.data.order_generation_date);
        const deliveryDate = moment(newValue);
        const daysDiff = deliveryDate.diff(orderDate, "days");
        node.data.lead_time = daysDiff;

        // Clear demand_start_date validation error if delivery date is now before demand start date
        if (node.data.demand_start_date) {
          const demandStartDate = moment(node.data.demand_start_date);
          // Check if delivery date is now valid (before or same as demand start date)
          if (deliveryDate.isBefore(demandStartDate, "day")) {
            setValidationErrors((prev) => {
              const updated = { ...prev };
              if (updated[node.data.unique_row_id]) {
                updated[node.data.unique_row_id] = updated[
                  node.data.unique_row_id
                ].filter((field) => field !== "demand_start_date");
                if (updated[node.data.unique_row_id].length === 0) {
                  delete updated[node.data.unique_row_id];
                }
              }
              return updated;
            });
          }
        }

        refreshRow(node, ["lead_time"]);
      }

      // Business logic for Lead Time
      if (columnName === "lead_time" && node.data.order_generation_date) {
        // Update Delivery Date: Order Generation Date + Lead Time - 1
        const orderDate = moment(node.data.order_generation_date);
        const deliveryDate = orderDate.clone().add(newValue - 1, "days");
        node.data.delivery_date = deliveryDate.format(DATE_FORMAT);

        // Clear demand_start_date validation error if new delivery date is now before demand start date
        if (node.data.demand_start_date) {
          const demandStartDate = moment(node.data.demand_start_date);
          // Check if delivery date is now valid (before or same as demand start date)
          if (deliveryDate.isBefore(demandStartDate, "day")) {
            setValidationErrors((prev) => {
              const updated = { ...prev };
              if (updated[node.data.unique_row_id]) {
                updated[node.data.unique_row_id] = updated[
                  node.data.unique_row_id
                ].filter((field) => field !== "demand_start_date");
                if (updated[node.data.unique_row_id].length === 0) {
                  delete updated[node.data.unique_row_id];
                }
              }
              return updated;
            });
          }
        }

        refreshRow(node, ["delivery_date"]);
      }

      // Refresh the specific cell
      refreshRow(node, [columnName]);
    } catch (error) {
      console.error("Error in onCellValueChanged:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  /**
   * Handle cell blur event to validate and cap percentage values
   */
  const onBlur = (_e, data, column, isChanged) => {
    try {
      // Skip if row is already in a draft (should not be editable)
      if (isRowInDraft(data)) {
        return;
      }

      // Validate service_level_pct
      if (column.colId === "service_level_pct") {
        const validatedValue = validateServiceLevelPct(data);

        // Update the cell value if it was changed
        if (tableGridInstance.current?.api) {
          tableGridInstance.current.api.forEachNode((node) => {
            if (node.data.unique_row_id === data.unique_row_id) {
              if (node.data.service_level_pct !== validatedValue) {
                node.data.service_level_pct = validatedValue;
              }
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

      // Validate sell_through_pct
      if (column.colId === "sell_through_pct") {
        const validatedValue = validateSellThroughPct(data);

        // Update the cell value if it was changed
        if (tableGridInstance.current?.api) {
          tableGridInstance.current.api.forEachNode((node) => {
            if (node.data.unique_row_id === data.unique_row_id) {
              if (node.data.sell_through_pct !== validatedValue) {
                node.data.sell_through_pct = validatedValue;
              }
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
    } catch (error) {
      console.error("Error in onBlur:", error);
    }
  };

  /**
   * Refresh specific row and columns in grid
   */
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

  const loadTableInstance = (params) => {
    tableGridInstance.current = params;
  };

  /**
   * Get currently selected rows from AG Grid
   * This is the single source of truth for selected rows
   */
  const getSelectedRowsFromGrid = () => {
    const selectedRowsData = [];
    if (tableGridInstance.current?.api) {
      tableGridInstance.current.api.forEachNode((node) => {
        if (node.selected && node.data) {
          selectedRowsData.push(node.data);
        }
      });
    }
    return selectedRowsData;
  };

  /**
   * Handle selection changes in the grid
   * Increments counter to trigger re-render for UI elements that depend on selection
   * Note: We don't store selected rows in state - always fetch fresh from grid
   */
  const onSelectionChanged = (event) => {
    try {
      // Increment counter to trigger re-render of buttons and UI elements
      setSelectionCounter((prev) => prev + 1);
    } catch (error) {
      console.error("Error in onSelectionChanged:", error);
    }
  };

  /**
   * Helper to check if value is empty (null, undefined, or empty string, but not 0)
   */
  const isFieldEmpty = (value) => {
    return value === null || value === undefined || value === "";
  };

  /**
   * Validate selected rows before generating recommendations
   * Fetches fresh data from AG Grid to ensure validation is against current state
   * Returns object with hasErrors flag, errorFieldsMap, and specific error message
   */
  const validateSelectedRows = () => {
    const errorFieldsMap = {}; // Map of row unique_id to array of error field names
    let hasErrors = false;
    let hasOnlyDeliveryDateError = false;
    let hasMandatoryFieldErrors = false;
    let hasDemandEndDateError = false;

    const selectedRows = getSelectedRowsFromGrid();

    selectedRows.forEach((row, index) => {
      let rowErrorFields = [];
      let rowHasMandatoryErrors = false;

      // Validate Demand Period Selection
      if (isFieldEmpty(row.demand_period_selection)) {
        rowErrorFields.push("demand_period_selection");
        rowHasMandatoryErrors = true;
      }

      // Validate Demand Start Date (required for both modes)
      if (isFieldEmpty(row.demand_start_date)) {
        rowErrorFields.push("demand_start_date");
        rowHasMandatoryErrors = true;
      }

      // Validate Demand End Date
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

      // Validate Demand TWOS (only for TWOS mode)
      if (row.demand_period_selection === "twos") {
        if (isFieldEmpty(row.demand_twos)) {
          rowErrorFields.push("demand_twos");
          rowHasMandatoryErrors = true;
        } else if (row.demand_twos < 1) {
          rowErrorFields.push("demand_twos");
          rowHasMandatoryErrors = true;
        }
      }

      // Validate Buffer Stock Addition Method
      if (isFieldEmpty(row.buffer_stock_addition_method)) {
        rowErrorFields.push("buffer_stock_addition_method");
        rowHasMandatoryErrors = true;
      }

      // Validate based on Buffer Stock Addition Method
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

      // Validate Delivery Date
      if (isFieldEmpty(row.delivery_date)) {
        rowErrorFields.push("delivery_date");
        rowHasMandatoryErrors = true;
      }

      // Validate Lead Time
      if (isFieldEmpty(row.lead_time)) {
        rowErrorFields.push("lead_time");
        rowHasMandatoryErrors = true;
      }

      // Validate Shipment Mode
      if (isFieldEmpty(row.shipment_mode)) {
        rowErrorFields.push("shipment_mode");
        rowHasMandatoryErrors = true;
      }

      // Only check delivery date vs demand start date if all mandatory fields are filled
      if (!rowHasMandatoryErrors) {
        if (
          !isFieldEmpty(row.demand_start_date) &&
          !isFieldEmpty(row.delivery_date)
        ) {
          if (
            moment(row.delivery_date).isAfter(
              moment(row.demand_start_date),
              "day"
            ) ||
            moment(row.demand_start_date).isBefore(
              moment(row.delivery_date),
              "day"
            )
          ) {
            if (!rowErrorFields.includes("demand_start_date")) {
              rowErrorFields.push("demand_start_date");
            }
            hasOnlyDeliveryDateError = true;
          }
        }
      }

      // Track if any row has mandatory field errors
      if (rowHasMandatoryErrors) {
        hasMandatoryFieldErrors = true;
      }

      // Store row errors if any exist
      if (rowErrorFields.length > 0) {
        errorFieldsMap[row.unique_row_id] = rowErrorFields;
        hasErrors = true;
      }
    });

    // hasOnlyDeliveryDateError should only be true if there are ONLY delivery date errors, no mandatory errors
    const showDeliveryDateMessage =
      hasOnlyDeliveryDateError && !hasMandatoryFieldErrors;

    const showDemandEndDateMessage =
      hasDemandEndDateError && !hasMandatoryFieldErrors;

    return {
      hasErrors,
      errorFieldsMap,
      hasDeliveryDateError: showDeliveryDateMessage,
      hasDemandEndDateError: showDemandEndDateMessage,
    };
  };

  /**
   * Generate recommendations API call
   */
  const handleGenerateRecommendation = async (draftName) => {
    try {
      // Validate
      const validation = validateSelectedRows();

      if (validation.hasErrors) {
        // Set validation errors to highlight cells in red
        setValidationErrors(validation.errorFieldsMap);

        // Refresh cells to apply red styling
        if (tableGridInstance.current?.api) {
          tableGridInstance.current.api.refreshCells({
            force: true,
            suppressFlash: false,
          });
        }

        // Show specific error message for delivery date, or generic message
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

      // Clear any previous validation errors
      setValidationErrors({});

      setIsGeneratingRecommendation(true);

      openDraftNamePopup();
    } catch (error) {
      console.error("Error in handleGenerateRecommendation:", error);
      displaySnackMessages(ERROR_MESSAGE, "error");
    }
  };

  /**
   * View Recommendation - navigates to Step 2 without validation
   * Used when draft_id is present (read-only mode)
   */
  const handleViewRecommendation = () => {
    // Navigate to Step 2 by calling the parent's onProceedToNext
    if (props.onProceedToNext) {
      props.onProceedToNext();
    }
  };

  const prepareGenerateRecommendationPayload = (draftName) => {
    const selectedRows = getSelectedRowsFromGrid();
    return {
      draft_name: draftName,
      selected_rows: selectedRows.map((row) => ({ ...row })),
    };
  };

  const callGenerateRecommendation = async (draftName) => {
    try {
      setIsLoading(true);
      const payload = prepareGenerateRecommendationPayload(draftName);

      const response = await props.saveOffCycleDraft(payload);

      if (response?.data?.status) {
        // Store calculation data and draft ID
        setCalculationData({
          sku: response?.data?.data?.sku,
          dc: response?.data?.data?.dc,
          vendor: response?.data?.data?.vendor,
          data_points: response?.data?.data?.data_points,
          draft_id: response?.data?.data?.draft_id,
        });

        // Show optimization bot message instead of proceeding
        setShowOptimizationMessage(true);

        displaySnackMessages(
          response.data.message || "Optimization started successfully",
          "success"
        );
      } else {
        displaySnackMessages(
          response.data.message || "Failed to generate recommendations",
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
      closeDraftNamePopup();
      setIsLoading(false);
    }
  };

  const handleOpenSetAll = () => {
    setShowSetAllModal(true);
  };

  const handleCloseSetAll = () => {
    setShowSetAllModal(false);
  };

  const refreshTableData = () => {
    // For client-side, refresh the grid cells and update state
    if (tableGridInstance?.current?.api) {
      // Get updated data from grid
      const updatedData = [];
      tableGridInstance.current.api.forEachNode((node) => {
        if (node.data) {
          updatedData.push(node.data);
        }
      });

      // Update state to trigger re-render if needed
      setTableData([...updatedData]);

      // Refresh cells
      tableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  };

  /**
   * Clear validation errors for specific fields in a row
   * Used by Set All modal to clear errors as fields are updated
   */
  const clearValidationErrors = (rowId, fieldsToCheck) => {
    setValidationErrors((prev) => {
      const updated = { ...prev };
      if (updated[rowId]) {
        // Remove the specified fields from the error list
        updated[rowId] = updated[rowId].filter(
          (field) => !fieldsToCheck.includes(field)
        );
        // Remove the row from errors if no more errors exist
        if (updated[rowId].length === 0) {
          delete updated[rowId];
        }
      }
      return updated;
    });
  };

  useEffect(() => {
    fetchColumnConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch table data when component mounts or when dependencies change
  useEffect(() => {
    if (render && tableColumns.length > 0) {
      fetchAllTableData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [render, draftIdFromUrl]);

  // Sync validation errors to ref and refresh cells
  useEffect(() => {
    // Update ref so getCellStyle always has latest validation errors
    validationErrorsRef.current = validationErrors;

    // Refresh cells when validation errors change
    if (tableGridInstance.current?.api) {
      tableGridInstance.current.api.refreshCells({
        force: true,
        suppressFlash: false,
      });
    }
  }, [validationErrors]);

  const getTopRightOptions = () => {
    let options = [];

    // Hide Set All button in read-only mode (when draft_id is present)
    if (isReadOnlyMode) {
      return options;
    }

    const selectedRows = getSelectedRowsFromGrid();

    if (selectedRows.length > 0) {
      options.push(
        <Button
          variant="tertiary"
          color="primary"
          onClick={handleOpenSetAll}
          className={customClasses.button}
        >
          Set All
        </Button>
      );
    }

    return options;
  };

  // If optimization message should be shown, render it instead of the table
  if (showOptimizationMessage) {
    return (
      <OffCycleOrderOptimizationScreen
        view_type="manual_off_cycle"
        optimizationDetails={calculationData}
        onPrimaryButtonClick={() => {
          setShowOptimizationMessage(false);
          navigate(DECISION_DASHBOARD);
        }}
        value={[
          calculationData.sku,
          calculationData.dc,
          calculationData.vendor,
          calculationData.data_points,
        ]}
      />
    );
  }

  const openDraftNamePopup = () => {
    setShowDraftNamePopup(true);
  };

  const closeDraftNamePopup = () => {
    setShowDraftNamePopup(false);
    setIsGeneratingRecommendation(false);
  };

  const onClickColumn = async (data) => {
    navigate(
      `${CREATE_NEW_ORDER}?type=offcycle&step=1&draft_id=${data.draft_id}`,
      {
        replace: false,
      }
    );

    if (props.onProceedToNext) {
      props.onProceedToNext();
    }
  };

  return (
    <div>
      <Loader
        loader={
          props.offCycleOrderTableConfigLoader ||
          props.offCycleOrderTableDataLoader
        }
        minHeight={"260px"}
      >
        {render && (
          <AgGridComponent
            columns={tableColumns}
            rowdata={tableData}
            selectAllHeaderComponent={!isReadOnlyMode}
            hideSelectAllRecords={false}
            loadTableInstance={loadTableInstance}
            onCellValueChanged={isReadOnlyMode ? undefined : onCellValueChanged}
            onBlur={isReadOnlyMode ? undefined : onBlur}
            onSelectionChanged={isReadOnlyMode ? undefined : onSelectionChanged}
            pagination={true}
            paginationPageSize={100}
            hidePaginationPageSizeSelector={false}
            paginationPageSizeSelector={[10, 20, 50, 100]}
            height={"600px"}
            uniqueRowId={"unique_row_id"}
            rowSelection={isReadOnlyMode ? undefined : "multiple"}
            isRowSelectable={isRowSelectable}
            tableHeader="Details"
            suppressClickEdit={isReadOnlyMode}
            suppressRowClickSelection={isReadOnlyMode}
            topRightOptions={getTopRightOptions()}
          />
        )}

        {/* Set All Modal */}
        {showSetAllModal && (
          <OffCycleOrderSetAllPopUp
            setShowSetAllModal={handleCloseSetAll}
            agGridInstance={tableGridInstance.current}
            refreshTableData={refreshTableData}
            shipmentModesData={shipmentModesData.current}
            clearValidationErrors={clearValidationErrors}
            dateFormat={DATE_FORMAT}
            OFFCYCLE_SETALL_FIELDS={
              props?.OffCycleOrderScreenConfig?.offcycle_setall_formdata_fields
            }
            getBufferStockField={getBufferStockField}
          />
        )}

        {/* Bottom Navigation Buttons */}
        <div className={`${globalClasses.stickyFooter}`}>
          <Button
            className={customClasses.button}
            variant="tertiary"
            onClick={props.onCancel}
          >
            {"Cancel"}
          </Button>

          {isReadOnlyMode ? (
            // View Recommendation button - navigates to Step 2 without validation
            <Button
              className={customClasses.button}
              variant="primary"
              onClick={handleViewRecommendation}
            >
              {"View Recommendation"}
            </Button>
          ) : (
            // Generate Recommendation button - requires selection and validation
            <Button
              className={customClasses.button}
              variant="primary"
              onClick={handleGenerateRecommendation}
              disabled={getSelectedRowsFromGrid().length === 0}
              loading={isGeneratingRecommendation}
              loadingPosition="end"
            >
              {"Generate Recommendation"}
            </Button>
          )}
        </div>

        {showDraftNamePopup && (
          <GenerateRecommendationPopup
            callGenerateRecommendation={callGenerateRecommendation}
            closeDraftNamePopup={closeDraftNamePopup}
            isLoading={isLoading}
          />
        )}
      </Loader>
    </div>
  );
};

const useStyles = makeStyles((theme) => ({
  bottomButtonsContainer: {
    padding: "1rem 1.5rem",
    marginTop: "1rem",
    borderTop: "1px solid #e0e0e0",
  },
  button: {
    minWidth: "150px",
  },
}));

const mapStateToProps = (store) => {
  return {
    offCycleOrderTableConfigLoader:
      store.omsReducer.offCycleOrderService?.offCycleOrderTableConfigLoader ||
      false,
    offCycleOrderTableDataLoader:
      store.omsReducer.offCycleOrderService?.offCycleOrderTableDataLoader ||
      false,
    selectedArticleDCCombination:
      store.omsReducer.offCycleOrderService?.selectedArticleDCCombination || [],
    selectedOrdersFromCNO:
      store.omsReducer.offCycleOrderService?.selectedOrdersFromCNO || [],
    filtersFromCNO: store.omsReducer.offCycleOrderService?.filtersFromCNO || [],
    startEndDateFromCNO:
      store.omsReducer.offCycleOrderService?.startEndDateFromCNO || {},
    OffCycleOrderScreenConfig:
      store.omsReducer.offCycleOrderService.offCycleOrderConfiguration,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getOffCycleOrderTableConfig: () => dispatch(getOffCycleOrderTableConfig()),
  getOffCycleOrderTableData: (payload) =>
    dispatch(getOffCycleOrderTableData(payload)),
  saveOffCycleDraft: (payload) => dispatch(saveOffCycleDraft(payload)),
  setOffCycleOrderTableConfigLoader: (payload) =>
    dispatch(setOffCycleOrderTableConfigLoader(payload)),
  setOffCycleOrderTableDataLoader: (payload) =>
    dispatch(setOffCycleOrderTableDataLoader(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  closeSnack: (payload) => dispatch(closeSnack(payload)),
});

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(OffCycleOrderFirstStep);
