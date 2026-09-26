import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from "react";
import { useDispatch } from "react-redux";
import AgGridComponent from "core/Utils/agGrid";
import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { Button } from "impact-ui-v3";
import { cloneDeep, isEmpty } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import { getReplenishmentMatrix, getColumn, sbcnaFinalise } from "modules/inventorysmart/services-inventorysmart/Create-Allocation/create-allocation-services";
import { getDateRangePayload } from "../helperFunctions";
import "./ReplenishmentMatrixTable.css";

// Controlled input component that resets when external value changes
const UnitInput = memo(({ value: propValue, onChange, onBlur, disabled }) => {
  const [localValue, setLocalValue] = useState(propValue);

  useEffect(() => {
    setLocalValue(propValue);
  }, [propValue]);

  return (
    <input
      type="number"
      value={localValue}
      onChange={(e) => {
        setLocalValue(e.target.value === "" ? "" : parseInt(e.target.value, 10));
        if (onChange) onChange(e);
      }}
      onBlur={onBlur}
      disabled={disabled}
      className="replenishment-matrix__unit-input"
    />
  );
});

// Opportunity-level metrics whose value is identical across all opportunity
// entries in a week, so they should render as a single value instead of a
// stacked list.
const SINGLE_VALUE_OPPORTUNITY_KEYS = new Set(["transfer_multiple"]);

// Transform API weeks array into row-based table data using metric config from tc_code 10
const transformWeeksToRows = (weeks, metricRows) => {
  if (!weeks || !weeks.length || !metricRows || !metricRows.length) return [];
  const rows = metricRows.map((metric) => {
    const dataKey = metric.dataKey || metric.key;
    const row = {
      metric_key: metric.key,
      metric_data_key: dataKey,
      metric_label: metric.label,
      metric_type: metric.type,
    };
    weeks.forEach((week) => {
      const weekKey = `week_${week.week_number}`;
      if (metric.type === "opportunity" || metric.type === "editable") {
        const opportunities = week.opportunities || [];
        if (opportunities.length === 0) {
          row[weekKey] = null;
        } else if (metric.type === "editable") {
          row[weekKey] = opportunities.map((opp) => ({
            value: opp[dataKey] || 0,
            finalised: false,
            is_eligible: opp.is_eligible,
            week_finalised: week.status === "FINALISED",
          }));
        } else if (SINGLE_VALUE_OPPORTUNITY_KEYS.has(dataKey)) {
          // All opportunity entries share the same value for this metric,
          // so collapse to a single scalar (first non-null value).
          const firstWithValue = opportunities.find(
            (opp) => opp[dataKey] !== null && opp[dataKey] !== undefined
          );
          row[weekKey] = firstWithValue ? firstWithValue[dataKey] : null;
        } else {
          row[weekKey] = opportunities.map((opp) => opp[dataKey] || null);
        }
      } else {
        row[weekKey] = week[dataKey] !== undefined ? week[dataKey] : null;
      }
    });
    return row;
  });

  // Compute the default Projected Inventory chain (BOP -> EOP -> Shortfall)
  // using: BOP(W) = EOP(W-1), EOP(W) = BOP(W) - Demand(W) + Receipts(W).
  const orderedWeekKeys = [...weeks]
    .sort((a, b) => a.week_number - b.week_number)
    .map((week) => `week_${week.week_number}`);
  recalculateInventory(rows, orderedWeekKeys);

  return rows;
};

// Build column definitions from weeks array
const buildColumnsFromWeeks = (weeks) => {
  if (!weeks || !weeks.length) return [];
  return weeks.map((week) => ({
    column_name: `week_${week.week_number}`,
    label: `WE ${week.week_end_date}`,
    week_end_date: week.week_end_date,
    week_start_date: week.week_start_date,
    fiscal_year_week: week.fiscal_year_week || "",
    order_of_display: week.week_number,
    width: 300
  }));
};

// ─── Helper: find row by metric_key in data array ───────────────────────────
const findRow = (data, metricKey) =>
  data.find((row) => row.metric_key === metricKey);

// Find the Projected Inventory (EOP) row. Both BOP and EOP share the same
// column_name ("beginning_inventory"), so they are distinguished by label.
const findProjectedEOPRow = (data) =>
  data.find(
    (row) =>
      row.metric_data_key === "beginning_inventory" &&
      /EOP/i.test(row.metric_label || "")
  ) || data.find((row) => row.metric_data_key === "beginning_inventory");

// Find the Projected Inventory (BOP) row - the beginning_inventory row that is
// NOT the EOP row. BOP(W) = EOP(W-1).
const findProjectedBOPRow = (data) =>
  data.find(
    (row) =>
      row.metric_data_key === "beginning_inventory" &&
      !/EOP/i.test(row.metric_label || "")
  );

// Recalculate the Projected Inventory chain across all weeks using:
//   BOP(W) = EOP(W-1)                          (first week's BOP is the seed)
//   EOP(W) = BOP(W) - Demand(W) + Receipts(W)
//   Shortfall(W) = EOP(W) < 0
// Mutates the provided data rows in place.
const recalculateInventory = (data, weekKeys) => {
  const bopRow = findProjectedBOPRow(data);
  const eopRow = findProjectedEOPRow(data);
  const demandRow = findRow(data, "demand");
  const receiptsRow = findRow(data, "receipts_confirmed");
  const shortfallRow = findRow(data, "shortfall_flag");
  if (!bopRow || !eopRow) return;

  let prevEop = null;
  weekKeys.forEach((wk, idx) => {
    // BOP(W) = EOP(W-1) for every week after the first
    if (idx > 0 && prevEop !== null && prevEop !== undefined) {
      bopRow[wk] = prevEop;
    }

    const bop = bopRow[wk];
    if (bop === null || bop === undefined) {
      // No inventory data for this week - leave EOP untouched and reset chain
      prevEop = eopRow[wk] ?? null;
      return;
    }

    const demand = demandRow?.[wk] ?? 0;
    const receipts = receiptsRow?.[wk] ?? 0;
    const eop = bop - demand + receipts;
    eopRow[wk] = eop;
    if (shortfallRow) shortfallRow[wk] = eop < 0;
    prevEop = eop;
  });
};

const ReplenishmentMatrixTable = (props) => {
  const dispatch = useDispatch();
  const globalClasses = globalStyles();
  const [columns, setColumns] = useState([]);
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [finalisedWeeks, setFinalisedWeeks] = useState(new Set());
  const [metricRows, setMetricRows] = useState([]);
  const [finaliseLoading, setFinaliseLoading] = useState(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const tableInstance = useRef(null);
  const pendingEditsRef = useRef({});
  const preFinalisedDataRef = useRef({});
  const rawWeeksRef = useRef([]);
  const handlersRef = useRef({});

  // Fetch metric row configuration from table config API
  useEffect(() => {
    const fetchMetricConfig = async () => {
      try {
        const response = await dispatch(getColumn("inventorysmart_replenishment_matrix_table"));
        if (response?.data?.data) {
          const configColumns = response.data.data;
          const keyCounts = {};
          const rows = configColumns
            .sort((a, b) => a.order_of_display - b.order_of_display)
            .map((col) => {
              const baseKey = col.column_name;
              keyCounts[baseKey] = (keyCounts[baseKey] || 0) + 1;
              const uniqueKey =
                keyCounts[baseKey] > 1
                  ? `${baseKey}__${keyCounts[baseKey]}`
                  : baseKey;
              return {
                key: uniqueKey,
                dataKey: baseKey,
                label: col.label,
                type: col.extra?.type || "single",
              };
            });
          setMetricRows(rows);
        }
      } catch (e) {
        console.error("Error fetching metric config:", e);
      }
    };
    fetchMetricConfig();
  }, []);

  const weekKeys = useMemo(() => columns.map((col) => col.column_name), [columns]);

  // Build payload for replenishment matrix API
  const buildPayload = (productCode) => {
    const filters = props.parentFilterPayload?.filters || [];
    const shipColName = props.shipLinkColumnName;
    const shipCode = props.selectedShip?.[shipColName] || "";

    return {
      filters,
      ship_code: String(shipCode),
      product_code: productCode || props.selectedProductCode || "",
      meta: {
        search: [],
        range: [],
        sort: [],
      },
      ...getDateRangePayload(props.startEndDate),
    };
  };

  // Fetch replenishment matrix data
  const fetchMatrixData = async (productCode) => {
    if (!props.selectedShip || isEmpty(metricRows)) return;

    setTableData([]);
    setColumns([]);
    setLoading(true);
    try {
      const payload = buildPayload(productCode);
      const response = await dispatch(getReplenishmentMatrix(payload));
      if (response?.data?.status) {
        const responseData = response.data.data;
        const weeks = responseData.weeks || [];

        // Transform weeks into columns and row-based data
        const generatedColumns = buildColumnsFromWeeks(weeks);
        const transformedData = transformWeeksToRows(weeks, metricRows);

        rawWeeksRef.current = weeks;
        setIsFinalized(responseData.is_finalized || false);
        setColumns(generatedColumns);
        setTableData(cloneDeep(transformedData));
        setFinalisedWeeks(new Set());
        pendingEditsRef.current = {};
        preFinalisedDataRef.current = {};
      }
    } catch (e) {
      console.error("Error fetching replenishment matrix data:", e);
    } finally {
      setLoading(false);
    }
  };

  // Fetch data when product code is provided and metricRows config is available
  useEffect(() => {
    if (props.selectedShip && props.selectedProductCode && !isEmpty(metricRows)) {
      fetchMatrixData(props.selectedProductCode);
    }
  }, [props.selectedProductCode, metricRows]);

  // Check if a week can be finalised (sequential enforcement).
  // Weeks that have no recommended units data are skipped, so finalise is
  // enabled when all *previous weeks that actually have data* are finalised.
  const canFinaliseWeek = useCallback(
    (weekIndex) => {
      // Finalise is restricted to only the first two weeks.
      if (weekIndex > 1) return false;
      if (weekIndex === 0) return true;
      const recRow = findRow(tableData, "recommended_units");
      for (let i = weekIndex - 1; i >= 0; i--) {
        const weekKey = weekKeys[i];
        const cellValue = recRow?.[weekKey];
        const hasData = Array.isArray(cellValue) && cellValue.length > 0;
        if (!hasData) continue;
        return finalisedWeeks.has(i);
      }
      return true;
    },
    [finalisedWeeks, tableData, weekKeys]
  );

  // Handle unit value change - store in ref to avoid re-render and focus loss
  const handleUnitChange = useCallback((weekIndex, rowIndex, newValue) => {
    const key = `${weekIndex}_${rowIndex}`;
    pendingEditsRef.current[key] = newValue === "" ? 0 : parseInt(newValue, 10);
  }, []);

  // Validate that a value is a multiple of the week's transfer_multiple.
  // Shows a warning snackbar and returns false when it is not; returns true
  // when valid, when the value is 0, or when no transfer_multiple is defined.
  const validateTransferMultiple = useCallback(
    (data, weekKey, value) => {
      const transferMultiple = findRow(data, "transfer_multiple")?.[weekKey];
      if (!transferMultiple || value === 0 || value % transferMultiple === 0) {
        return true;
      }
      dispatch(
        addSnack({
          message: `Recommended units should be a multiple of the transfer multiple (${transferMultiple}).`,
          options: { variant: "warning", disableOnClose: true, autoHideDuration: 3000 },
        })
      );
      return false;
    },
    [dispatch]
  );

  // Apply pending edit to data on blur
  const handleUnitBlur = useCallback(
    (weekIndex, rowIndex) => {
      const key = `${weekIndex}_${rowIndex}`;
      const pendingValue = pendingEditsRef.current[key];
      if (pendingValue !== undefined) {
        const updatedData = cloneDeep(tableData);
        const recRow = findRow(updatedData, "recommended_units");
        const weekKey = weekKeys[weekIndex];
        if (recRow && Array.isArray(recRow[weekKey]) && recRow[weekKey][rowIndex]) {
          recRow[weekKey][rowIndex].value = pendingValue;
          delete pendingEditsRef.current[key];
          setTableData(updatedData);

          // Warn if the entered value is not a multiple of transfer_multiple
          validateTransferMultiple(updatedData, weekKey, pendingValue);
        }
      }
    },
    [tableData, weekKeys, validateTransferMultiple]
  );

  // Handle finalise action for a recommended unit
  const handleFinalise = useCallback(
    (weekIndex, rowIndex) => {
      if (!canFinaliseWeek(weekIndex)) return;

      // Apply any pending edit before finalising
      const key = `${weekIndex}_${rowIndex}`;
      const pendingValue = pendingEditsRef.current[key];
      const weekKey = weekKeys[weekIndex];

      const updatedData = cloneDeep(tableData);
      const recRow = findRow(updatedData, "recommended_units");
      const receiptsRow = findRow(updatedData, "receipts_confirmed");
      const projInvRow = findProjectedEOPRow(updatedData);
      const bopRow = findProjectedBOPRow(updatedData);
      const shortfallRow = findRow(updatedData, "shortfall_flag");
      const deliveryRow = findRow(updatedData, "delivery_date");

      if (!recRow || !Array.isArray(recRow[weekKey]) || !recRow[weekKey][rowIndex]) return;

      // Block finalisation if the value is not a multiple of transfer_multiple
      const valueToFinalise =
        pendingValue !== undefined ? pendingValue : recRow[weekKey][rowIndex].value;
      if (!validateTransferMultiple(updatedData, weekKey, valueToFinalise)) return;

      // Save pre-finalise state for undo BEFORE applying pending edits
      const undoKey = `${weekIndex}_${rowIndex}`;
      preFinalisedDataRef.current[undoKey] = {
        recommendedValue: recRow[weekKey][rowIndex].value,
        receipts: weekKeys.reduce((acc, wk) => { acc[wk] = receiptsRow?.[wk]; return acc; }, {}),
        projected: weekKeys.reduce((acc, wk) => { acc[wk] = projInvRow?.[wk]; return acc; }, {}),
        bop: weekKeys.reduce((acc, wk) => { acc[wk] = bopRow?.[wk]; return acc; }, {}),
        shortfall: weekKeys.reduce((acc, wk) => { acc[wk] = shortfallRow?.[wk]; return acc; }, {}),
      };

      // Apply pending edit AFTER saving undo state
      if (pendingValue !== undefined) {
        recRow[weekKey][rowIndex].value = pendingValue;
        delete pendingEditsRef.current[key];
      }

      recRow[weekKey][rowIndex].finalised = true;
      const finalisedValue = recRow[weekKey][rowIndex].value;

      // Determine delivery date for this unit
      const deliveryCell = deliveryRow?.[weekKey];
      let deliveryDate = null;
      if (Array.isArray(deliveryCell)) {
        deliveryDate = deliveryCell[rowIndex] || null;
      } else if (typeof deliveryCell === "string") {
        deliveryDate = deliveryCell;
      }

      // Map delivery date to the week column it falls within
      let targetWeekIndex = weekIndex;
      if (deliveryDate) {
        for (let i = 0; i < columns.length; i++) {
          if (deliveryDate >= columns[i].week_start_date && deliveryDate <= columns[i].week_end_date) {
            targetWeekIndex = i;
            break;
          }
        }
        // If delivery date is beyond all available weeks, place in the last week
        if (targetWeekIndex === weekIndex && deliveryDate > columns[columns.length - 1]?.week_end_date) {
          targetWeekIndex = columns.length - 1;
        }
      }
      const targetWeekKey = weekKeys[targetWeekIndex];

      // Update Receipts (Confirmed) for the delivery week
      if (receiptsRow) {
        receiptsRow[targetWeekKey] = (receiptsRow[targetWeekKey] || 0) + finalisedValue;
      }

      // Recalculate the Projected Inventory chain (BOP -> EOP -> Shortfall):
      //   BOP(W) = EOP(W-1), EOP(W) = BOP(W) - Demand(W) + Receipts(W)
      recalculateInventory(updatedData, weekKeys);

      const updatedFinalisedWeeks = new Set(finalisedWeeks);
      updatedFinalisedWeeks.add(weekIndex);
      setFinalisedWeeks(updatedFinalisedWeeks);
      setTableData(updatedData);
    },
    [tableData, weekKeys, columns, finalisedWeeks, canFinaliseWeek, validateTransferMultiple]
  );

  // Handle undo action - revert a finalised unit
  const handleUndo = useCallback(
    (weekIndex, rowIndex) => {
      const undoKey = `${weekIndex}_${rowIndex}`;
      const savedState = preFinalisedDataRef.current[undoKey];
      if (!savedState) return;

      const weekKey = weekKeys[weekIndex];
      const updatedData = cloneDeep(tableData);
      const recRow = findRow(updatedData, "recommended_units");
      const receiptsRow = findRow(updatedData, "receipts_confirmed");
      const projInvRow = findProjectedEOPRow(updatedData);
      const bopRow = findProjectedBOPRow(updatedData);
      const shortfallRow = findRow(updatedData, "shortfall_flag");

      if (!recRow || !Array.isArray(recRow[weekKey]) || !recRow[weekKey][rowIndex]) return;

      recRow[weekKey][rowIndex].finalised = false;
      recRow[weekKey][rowIndex].value = savedState.recommendedValue;

      // Restore saved state
      weekKeys.forEach((wk) => {
        if (receiptsRow) receiptsRow[wk] = savedState.receipts[wk];
        if (projInvRow) projInvRow[wk] = savedState.projected[wk];
        if (bopRow && savedState.bop) bopRow[wk] = savedState.bop[wk];
        if (shortfallRow) shortfallRow[wk] = savedState.shortfall[wk];
      });

      delete preFinalisedDataRef.current[undoKey];

      const updatedFinalisedWeeks = new Set(finalisedWeeks);
      updatedFinalisedWeeks.delete(weekIndex);
      setFinalisedWeeks(updatedFinalisedWeeks);
      setTableData(updatedData);
    },
    [tableData, weekKeys, finalisedWeeks]
  );

  // Keep handler refs in sync so cellRenderer stays stable across state changes
  handlersRef.current = { handleFinalise, handleUndo, canFinaliseWeek, handleUnitChange, handleUnitBlur };

  // Cell renderer for week columns
  const weekCellRenderer = useCallback(
    (params) => {
      const { value, data, colDef } = params;
      const metricKey = data?.metric_key;
      const metricType = data?.metric_type;
      const weekIndex = weekKeys.indexOf(colDef?.field);

      if (value === null || value === undefined) return "-";

      // A week whose status is FINALISED (from the API) is locked - the
      // recommended units render as plain text with no editing.
      const isWeekFinalised = (Array.isArray(value) && value[0]?.week_finalised) || props?.isProductFinalized;

      // Editable: recommended_units with input + Finalise/Undo.
      // Restricted to the first two weeks only. From the 3rd week onward (or in
      // view-only mode e.g. View Past Allocations, or when the week is already
      // finalised), show the recommended units as plain text (no input box /
      // Finalise button).
      if (metricType === "editable" && Array.isArray(value) && (weekIndex > 1 || props.isViewOnly || isWeekFinalised)) {
        return (
          <div className={globalClasses.flexColumn}>
            {value.map((item, idx) => (
              <div
                key={idx}
                className={
                  idx < value.length - 1
                    ? "replenishment-matrix__multi-row-separator"
                    : ""
                }
              >
                {item.value !== null && item.value !== undefined ? item.value : "-"}
              </div>
            ))}
          </div>
        );
      }

      if (metricType === "editable" && Array.isArray(value)) {
        return (
          <div>
            {value.map((item, rowIdx) => (
              <div
                key={rowIdx}
                className={`replenishment-matrix__unit-row ${
                  rowIdx < value.length - 1
                    ? "replenishment-matrix__multi-row-separator"
                    : ""
                }`}
              >
                <UnitInput
                  value={item.value}
                  onChange={(e) => handlersRef.current.handleUnitChange(weekIndex, rowIdx, e.target.value)}
                  onBlur={() => handlersRef.current.handleUnitBlur(weekIndex, rowIdx)}
                  disabled={item.finalised}
                />
                {item.finalised ? (
                  <Button
                    variant="outlined"
                    size="small"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlersRef.current.handleUndo(weekIndex, rowIdx)}
                  >
                    Undo
                  </Button>
                ) : (
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!handlersRef.current.canFinaliseWeek(weekIndex)}
                    className={
                      item.is_eligible === false
                        ? "replenishment-matrix__finalise-btn--ineligible"
                        : ""
                    }
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handlersRef.current.handleFinalise(weekIndex, rowIdx)}
                  >
                    Finalise
                  </Button>
                )}
              </div>
            ))}
          </div>
        );
      }

      // Shortfall Flag
      if (metricKey === "shortfall_flag") {
        if (value === true) {
          return <span className="replenishment-matrix__error-text">TRUE</span>;
        }
        if (value === false) return "FALSE";
        return "-";
      }

      // Multi-row: arrays displayed as stacked values
      if (Array.isArray(value)) {
        return (
          <div className={globalClasses.flexColumn}>
            {value.map((val, idx) => (
              <div
                key={idx}
                className={
                  idx < value.length - 1
                    ? "replenishment-matrix__multi-row-separator"
                    : ""
                }
              >
                {val !== null && val !== undefined ? val : "-"}
              </div>
            ))}
          </div>
        );
      }

      return value;
    },
    [weekKeys, globalClasses.flexColumn]
  );

  // Cell style callback
  const getCellStyle = useCallback((params) => {
    const metricKey = params.data?.metric_key;
    if (metricKey.includes("beginning_inventory") && params.value < 0) {
      return { color: "#ab3939" };
    }
    return {};
  }, []);

  // Build AG Grid column definitions (memoized to prevent AG Grid re-init on data changes)
  const columnDefs = useMemo(() => {
    const metricCol = {
      headerName: "Metric",
      field: "metric_label",
      pinned: "left",
      minWidth: 250,
      suppressSizeToFit: true,
      sortable: false,
      filter: false,
    };

    const weekCols = columns
      .sort((a, b) => a.order_of_display - b.order_of_display)
      .map((col) => ({
        headerName: col.label,
        field: col.column_name,
        minWidth: 250,
        sortable: false,
        filter: false,
        cellRenderer: weekCellRenderer,
        cellStyle: getCellStyle,
        autoHeight: true,
        wrapText: true,
      }));

    return [metricCol, ...weekCols];
  }, [columns, weekCellRenderer, getCellStyle]);

  const loadTableInstance = (params) => {
    tableInstance.current = params;
  };

  // Calculate row height based on multi-row content
  const getRowHeight = useCallback(
    (params) => {
      const data = params?.data;
      if (!data) return 40;
      if (data.metric_type === "multi" || data.metric_type === "editable") {
        let maxSubRows = 1;
        weekKeys.forEach((wk) => {
          const cellVal = data[wk];
          if (Array.isArray(cellVal) && cellVal.length > maxSubRows) {
            maxSubRows = cellVal.length;
          }
        });
        return Math.max(40, maxSubRows * 30);
      }
      return 40;
    },
    [weekKeys]
  );

  // Build week-level recommendations from finalised data
  const handleFinaliseAll = async () => {
    const recRow = findRow(tableData, "recommended_units");
    if (!recRow) return;

    const recommendations = [];
    weekKeys.forEach((weekKey, weekIndex) => {
      const cellValue = recRow[weekKey];
      if (!Array.isArray(cellValue)) return;

      const finalisedOpportunities = [];
      cellValue.forEach((item, oppIndex) => {
        if (item.finalised) {
          const rawWeek = rawWeeksRef.current[weekIndex];
          const rawOpp = rawWeek?.opportunities?.[oppIndex] || {};
          finalisedOpportunities.push({
            ...rawOpp,
            recommended_units: item.value,
          });
        }
      });

      if (finalisedOpportunities.length > 0) {
        const col = columns[weekIndex];
        recommendations.push({
          week_number: col?.order_of_display || weekIndex + 1,
          fiscal_year_week: col?.fiscal_year_week || "",
          week_start_date: col?.week_start_date || "",
          week_end_date: col?.week_end_date || "",
          opportunities: finalisedOpportunities,
        });
      }
    });

    const shipColName = props.shipLinkColumnName;
    const shipCode = props.selectedShip?.[shipColName] || "";

    const payload = {
      level: "week",
      product_code: props.selectedProductCode || "",
      ship_code: String(shipCode),
      status: "SAVED",
      recommendations,
      ...getDateRangePayload(props.startEndDate),
      ...(props.articleFilter?.values?.length > 0 && { article: props.articleFilter.values }),
    };

    setFinaliseLoading(true);
    try {
      const response = await dispatch(sbcnaFinalise(payload));
      if (response?.data?.status) {
        dispatch(addSnack({ message: response?.data?.message || "Finalised successfully", options: { variant: "success" } }));
        fetchMatrixData(props.selectedProductCode);
        props.refreshParent?.();
      } else {
        dispatch(addSnack({ message: response?.data?.message || "Failed to finalise", options: { variant: "error" } }));
      }
    } catch (e) {
      console.error("Error finalising week:", e);
      const errMsg = e?.response?.data?.message || "Error finalising. Please try again.";
      dispatch(addSnack({ message: errMsg, options: { variant: "error" } }));
    } finally {
      setFinaliseLoading(false);
    }
  };

  const shipColName = props.shipLinkColumnName;
  const shipDisplayValue = props.selectedShip?.[shipColName] || "";
  const productCode = props.selectedProductCode || "";
  const tableTitle = `Replenishment Matrix${
    shipDisplayValue ? ` - ${shipDisplayValue}` : ""
  }${productCode ? ` - ${productCode}` : ""}`;

  const hasFinalised = useMemo(() => {
    const recRow = findRow(tableData, "recommended_units");
    if (!recRow) return false;
    return weekKeys.some((weekKey) => {
      const cellValue = recRow[weekKey];
      return Array.isArray(cellValue) && cellValue.some((item) => item.finalised);
    });
  }, [tableData, weekKeys]);

  return (
    <div className={globalClasses.marginTop}>
      <Loader loader={loading}>
        <AgGridComponent
          columns={columnDefs}
          rowdata={tableData}
          uniqueRowId="metric_key"
          tableHeader={tableTitle}
          sizeColumnsToFitFlag
          suppressFieldDotNotation
          pagination={false}
          loadTableInstance={loadTableInstance}
          getRowHeight={getRowHeight}
          headerHeight={40}
          height="600px"
        />
      </Loader>
      {!props.isViewOnly && !isEmpty(tableData) && (
        <div className={`${globalClasses.flexRow} ${globalClasses.layoutAlignEnd} ${globalClasses.marginTop}`}>
          <Button
            variant="primary"
            onClick={handleFinaliseAll}
            disabled={isFinalized || props.isProductFinalized || !hasFinalised || finaliseLoading}
          >
            {finaliseLoading ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ReplenishmentMatrixTable;
