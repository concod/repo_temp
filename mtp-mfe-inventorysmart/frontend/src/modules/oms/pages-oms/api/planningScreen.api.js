import { v4 as uuidv4 } from "uuid";
import axiosInstance from "../../../../core/Utils/axios/index";
import {
  OMS_ORDER_MANAGEMENT_PIVOT_DESCRIPTION,
  OMS_ORDER_MANAGEMENT_COLUMNS,
  OMS_VIEW_CONFIG_API,
} from "../../constants-oms/apiConstants";
import {
  setPivotDescriptionData,
  setPivotDescriptionDataLoader,
} from "../OrderManagement/slices/pivot.slice";
import { setCalculationUUID } from "../OrderManagement/slices/edit.slice";
import {
  setOrderManagementResp,
  setOrderManagementLoader,
} from "../OrderManagement/slices/grid.slice";
import { addSnack } from "actions/snackbarActions";

/** View-config API uses `is_alternate`; pivot UI expects `is_alternate_hierarchy`. */
export function normalizePivotDescriptionData(raw) {
  if (!raw || typeof raw !== "object") return raw;
  const dimension_values = {};
  for (const [key, items] of Object.entries(raw.dimension_values || {})) {
    dimension_values[key] = (items || []).map((item) => ({
      ...item,
      is_alternate_hierarchy: Boolean(
        item?.is_alternate_hierarchy ?? item?.is_alternate
      ),
    }));
  }
  return { ...raw, dimension_values };
}

// ─── Plansmart-compatible column-def processing utilities ────────────────────
// Mirrors planningScreen.util.js in mtp-mfe-plansmart so the OMS pivot applies
// the same splitColumns → parseColumnDefs → groupColumnDefsByKpi pipeline.

const splitColumns = (columnDefs, nonEditableCount) => ({
  nonEditableColumns: columnDefs.slice(0, nonEditableCount),
  editableColumns: columnDefs.slice(nonEditableCount),
});

const parseColumnDefs = (columnDefs) =>
  columnDefs.map((column) => {
    if (column.sub_headers) {
      return {
        ...column,
        sub_headers: parseColumnDefs(column.sub_headers),
        columnGroupShow: "open",
      };
    }
    return {
      ...column,
      type: "float",
      is_editable: false,
      columnGroupShow: column.is_total ? undefined : "open",
    };
  });

const groupColumnDefsByKpi = (columnDefs) => {
  if (columnDefs.length && columnDefs[0].sub_headers) {
    return columnDefs.map((group) => ({
      ...group,
      sub_headers: groupColumnDefsByKpi(group.sub_headers),
    }));
  }
  const grouped = columnDefs.reduce((acc, col) => {
    const kpi = col?.measurement?.kpi ?? col.column_name;
    if (!acc[kpi]) acc[kpi] = [];
    acc[kpi].push(col);
    return acc;
  }, {});
  return Object.values(grouped).flat();
};

/**
 * Transforms the Plansmart-format metadata response into the shape stored in
 * Redux, exactly mirroring Plansmart's processBudgetTablePivotData.
 *
 * Input  : responseData from BE  { columnDefs, group_keys, data, ... }
 * Output : { column_config, rowDimensions, columnDimensions, isKPIWiseRows,
 *             group_keys, data, is_updated_data }
 */
const processOmsPivotData = (responseData, params) => {
  const columnDefs = responseData.columnDefs || [];
  const pivotRows = params?.view?.pivot_rows || params?.pivot_rows || [];
  const kpiWiseRows = params?.view?.kpi_wise_rows || false;

  const { nonEditableColumns, editableColumns } = splitColumns(
    columnDefs,
    pivotRows.length
  );

  let parsedEditableColumns = parseColumnDefs(editableColumns);
  if (!kpiWiseRows) {
    parsedEditableColumns = groupColumnDefsByKpi(parsedEditableColumns);
  }

  // Dim columns: mark last one as visible (mirrors Plansmart's is_hidden logic)
  const processedDimColumns = nonEditableColumns.map((col, index) => ({
    ...col,
    is_hidden: index === nonEditableColumns.length - 1 ? false : !!col.hide,
  }));

  const column_config = [...processedDimColumns, ...parsedEditableColumns];

  return {
    column_config,
    rowDimensions: pivotRows,
    columnDimensions:
      params?.view?.pivot_columns || params?.pivot_columns || [],
    isKPIWiseRows: kpiWiseRows,
    group_keys: responseData.group_keys || [],
    data: responseData.data,
    is_updated_data: responseData.is_updated_data,
  };
};

/**
 * Fetches pivot dimension + measure config for the OMS PivotPanel.
 *
 * When a `screenId` is provided (preferred), calls the new unified config endpoint:
 *   GET /api/v3/inventory-smart/oms/views/configs/:screenId
 * This replaces the old pivot-description POST endpoint.
 *
 * The response `dimension_values.measures` items have `{ value, label }` shape.
 * `usePivotDescriptionData` normalises them to add `name` and `versions` so the
 * shared PivotPanel component works without any backend schema change.
 */
export const getOrderManagementPivotDescription = (params = {}) => async (
  dispatch
) => {
  const { screenId, ...rest } = params;
  dispatch(setPivotDescriptionDataLoader(true));
  try {
    let response;
    if (screenId) {
      response = await axiosInstance({
        url: `${OMS_VIEW_CONFIG_API}/${screenId}`,
        method: "GET",
        isV3: true,
      });
    } else {
      response = await axiosInstance({
        url: OMS_ORDER_MANAGEMENT_PIVOT_DESCRIPTION,
        method: "POST",
        data: { module: "order-management", ...rest },
        isV3: true,
      });
    }
    dispatch(setCalculationUUID(uuidv4()));
    const payload = normalizePivotDescriptionData(
      response?.data?.data ?? response?.data
    );
    dispatch(setPivotDescriptionData(payload));
  } catch (error) {
    console.error("[OMS] view-config API failed", error);
    dispatch(
      addSnack({
        message: "Could not load pivot configuration from server.",
        options: { variant: "error" },
      })
    );
  } finally {
    dispatch(setPivotDescriptionDataLoader(false));
  }
};

/**
 * Fetches AG-Grid column schema from the BE /columns endpoint.
 *
 * Request may include `row_dimensions` and `column_dimensions` from the applied
 * view; BE echoes them back alongside `columnDefs`.
 *
 * Response: { columnDefs, group_keys, row_dimensions?, column_dimensions? }
 */
export const getOrderManagementPivotData = (params = {}, { silent = false } = {}) => async (
  dispatch
) => {
  if (!silent) dispatch(setOrderManagementLoader(true));
  try {
    const response = await axiosInstance({
      url: OMS_ORDER_MANAGEMENT_COLUMNS,
      method: "POST",
      data: params,
      isV3: true,
    });
    const rawData = response?.data?.data ?? response?.data ?? {};
    const result = {
      column_config: rawData.columnDefs || [],
      group_keys: rawData.group_keys || [],
      rowDimensions: rawData.row_dimensions || [],
      columnDimensions: rawData.column_dimensions || [],
      isKPIWiseRows: false,
    };
    dispatch(setOrderManagementResp(result));
    return result;
  } catch (error) {
    console.error("[OMS] /columns call failed", error);
    const fallback = {
      column_config: [],
      rowDimensions: [],
      columnDimensions: [],
      isKPIWiseRows: false,
    };
    dispatch(setOrderManagementResp(fallback));
    dispatch(
      addSnack({
        message: "Could not load order management column configuration.",
        options: { variant: "error" },
      })
    );
    return fallback;
  } finally {
    if (!silent) dispatch(setOrderManagementLoader(false));
  }
};
