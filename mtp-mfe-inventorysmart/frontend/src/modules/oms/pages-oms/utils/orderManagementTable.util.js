import { get } from "lodash";
import { PAGE_SIZE } from "../OrderManagement/constants/grid.constants";
import { MODULE_ORDER_MANAGEMENT } from "../OrderManagement/constants/ui.constants";
import { orderManagementTableCalculateApi } from "../api/orderManagementTable.api";

// ---------------------------------------------------------------------------
// Grid grouping helpers
// ---------------------------------------------------------------------------

export const isAnyColumnGroupOpen = (agTableRef) => {
  const columnGroupState = agTableRef?.current?.api?.getColumnGroupState();
  if (!columnGroupState || columnGroupState.length === 0) return false;
  return columnGroupState.some((group) => group.open);
};

export const createGroupUniqueId = (groupKeys) =>
  Object.keys(groupKeys)
    .sort()
    .map((key) => `${key}:${groupKeys[key]}`)
    .join("|");

export const updateGroupPageNumber = (paginatedGroupDetails, groupKeys, endRow) => {
  const groupUniqueId = createGroupUniqueId(groupKeys);
  if (paginatedGroupDetails.current.length === 0) {
    paginatedGroupDetails.current.push({ groupKeys, groupUniqueId, pageNumber: 1 });
    return;
  }
  const existingEntry = paginatedGroupDetails.current.find(
    (page) => page.groupUniqueId === groupUniqueId
  );
  if (existingEntry) {
    existingEntry.pageNumber = Math.floor(endRow / PAGE_SIZE);
  } else {
    paginatedGroupDetails.current.push({
      groupKeys,
      groupUniqueId,
      pageNumber: Math.floor(endRow / PAGE_SIZE),
    });
  }
};

export const getGroupKeysForCell = (cellProps, rowDimensions = []) => {
  if (!cellProps || !Array.isArray(rowDimensions)) {
    return { groupKeys: [], groupKeysValues: {} };
  }
  const cellLevel = get(cellProps, "node.level", 0);
  const groupKeys =
    cellLevel <= rowDimensions.length ? rowDimensions.slice(0, cellLevel + 1) : [];
  const groupKeysValues = groupKeys.reduce((acc, key) => {
    acc[key] = get(cellProps, `data.${key}`, null);
    return acc;
  }, {});
  return { groupKeys, groupKeysValues };
};

export const buildPaginatedGroupKeys = (paginatedGroupDetails) => {
  const source = paginatedGroupDetails?.current || [];
  return source.map((item) => ({
    keys: item.groupKeys,
    start_page: 1,
    page_size: PAGE_SIZE * item.pageNumber,
    page: 1,
    level: Object.keys(item.groupKeys).length,
  }));
};

// ---------------------------------------------------------------------------
// Cell change handler — routes edits to the OMS calculate API
// ---------------------------------------------------------------------------

export const handleCellChange = ({
  changeDetected,
  cellMetaData,
  cellProps,
  pivotPayload,
  tableRef,
  calculationUUIDRef,
  paginatedGroupDetails,
  dispatch,
  syncSettingsData,
  onError,
  selectedCurrency,
}) => {
  if (!cellProps) return;

  const beforeValue = get(changeDetected, "before_user_entered_value", null);
  const enteredValue = get(changeDetected, "user_entered_value", null);
  const formattedInitialValue = get(changeDetected, "formatted_initial_value", null);
  const isContribution = get(cellMetaData, "is_contribution", false);

  if (formattedInitialValue === enteredValue && enteredValue !== null) return;
  if (isContribution && enteredValue > 100) return;

  const groupKey = buildPaginatedGroupKeys(paginatedGroupDetails);

  const payload = {
    session_id: calculationUUIDRef?.current,
    module: MODULE_ORDER_MANAGEMENT,
    pkey: get(cellMetaData, "pkey", null),
    kpi: pivotPayload?.kpi_wise_rows
      ? get(cellProps, "data.measurement.kpi", null)
      : get(cellProps, "column.userProvidedColDef.measurement[0].kpi", null),
    old_value: beforeValue,
    new_value: enteredValue,
    row_id: get(cellProps, "data.unique_id", null),
    column_id: get(cellProps, "column.colId", null),
    view: {
      ...pivotPayload,
      module: MODULE_ORDER_MANAGEMENT,
      uuid: calculationUUIDRef?.current,
      group_keys: groupKey,
      page_size: PAGE_SIZE,
      page: 1,
      level: get(cellProps, "node.level", 0),
      start_page: 1,
      fetch_meta_data: true,
      fetch_group_count: true,
    },
  };

  dispatch(orderManagementTableCalculateApi(payload));
};

// ---------------------------------------------------------------------------
// Column group menu items (AG-Grid context menu for row-group columns)
// ---------------------------------------------------------------------------

export const addGroupingMenuItems = (params) => {
  const defaultItems = params.defaultItems || [];
  const separator = "separator";
  const groupMenuItems = [];

  const hasColumnGroup = params.column?.getParent?.();
  if (!hasColumnGroup) return defaultItems;

  return [...defaultItems, separator, ...groupMenuItems];
};

// ---------------------------------------------------------------------------
// Row data helpers
// ---------------------------------------------------------------------------

export const getRowGroupFields = (columnDefs) => {
  if (!columnDefs) return [];
  return columnDefs
    .filter((col) => col.rowGroup)
    .map((col) => col.column_name || col.field || col.colId);
};

export const getSortedRowData = (rowData, rowGroupFields) => {
  if (!rowGroupFields?.length || !rowData?.length) return rowData;

  const toStr = (val) =>
    val == null
      ? ""
      : typeof val === "object"
      ? String(val.label ?? val.value ?? "")
      : String(val);

  const orderMaps = rowGroupFields.map((field) => {
    const map = new Map();
    rowData.forEach((row) => {
      const key = toStr(row[field]);
      if (key && !map.has(key)) map.set(key, map.size);
    });
    return { field, map };
  });

  return [...rowData].sort((rowA, rowB) => {
    for (const { field, map } of orderMaps) {
      const keyA = toStr(rowA[field]);
      const keyB = toStr(rowB[field]);
      if (!keyA !== !keyB) return !keyA ? -1 : 1;
      const diff = (map.get(keyA) ?? Infinity) - (map.get(keyB) ?? Infinity);
      if (diff) return diff;
    }
    return (
      String(rowA.unique_id ?? "").split("#").length -
      String(rowB.unique_id ?? "").split("#").length
    );
  });
};
