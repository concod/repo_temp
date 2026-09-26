import { cloneDeep, isEmpty } from "lodash";

const getColAttributes = (column) => {
  return {
    type: column.type,
    label: column.label,
    tc_code: column.tc_code,
    is_frozen: column.pinned ? true : false,
    is_editable: column.is_editable,
    is_hidden: column.is_hidden ? column.is_hidden : false,
    extra: column.extra
  };
};

const getColumnConfig = (column) => {
  const { sub_headers } = column;

  if (isEmpty(sub_headers)) {
    return getColAttributes(column);
  } else {
    const subHeaders = column.sub_headers.map((item) => {
      return getColumnConfig(item);
    });
    return { ...getColAttributes(column), sub_headers: subHeaders };
  }
};

/**
 * Format column config in user preference format
 * getColumnDefs- returns column definitions that were provided
 *  when initializing the grid
 */
export const getColumnDefData = (agGrid) => {
  const columnsList = agGrid.api
    .getColumnDefs()
    .filter((item) => item.colId !== "Selection");

  let tableCode = -1;
  let payload = {
    tc_code: tableCode,
    preference: {}
  };
  columnsList.forEach((item, index) => {
    const { column_name, tc_code } = item;
    if (column_name) {
      const columnConfigPreference = getColumnConfig(item);
      payload.preference = {
        ...payload.preference,
        [column_name]: columnConfigPreference
      };
      tableCode = tc_code;
    }
  });
  payload.tc_code = tableCode;

  return payload;
};

/**
 * Recreate column config from grid instance
 * getAllGridColumns- returns all the columns that are currently visible in the grid,
 * including hidden columns
 */
export const getColumnConfigurationData = (agGrid) => {
  const columnsList = agGrid.columnApi
    .getAllGridColumns()
    .filter((item) => item.colId !== "Selection");
  let tableCode = -1;
  let payload = {
    tc_code: tableCode,
    preference: {}
  };
  columnsList.forEach((item, index) => {
    const {
      column_name,
      is_editable,
      type,
      label,
      tc_code,
      extra
    } = item.colDef;
    if (column_name) {
      payload.preference = {
        ...payload.preference,
        [column_name]: {
          type,
          label,
          tc_code,
          is_frozen: item.pinned ? true : false,
          is_editable,
          order_of_display: index + 1,
          is_hidden: !item.visible,
          extra,
          rowGroupActive: item?.rowGroupActive
        }
      };
      tableCode = tc_code;
    }
  });
  payload.tc_code = tableCode;

  return payload;
};

/**
 * Recreate column config from rows data
 * Used in table view column settings
 */
export const getColumnSettingsRowConfig = (agGrid) => {
  let tableCode = -1;
  let payload = {
    tc_code: tableCode,
    preference: {}
  };
  agGrid.api?.forEachNode((node, index) => {
    let columnData = cloneDeep(node.data);
    const uniqueId = columnData?.column_name || columnData?.label;
    if (uniqueId) {
      delete columnData.is_selected;
      columnData.is_hidden = !node.selected;
      columnData.order_of_display = index;
      payload.preference = {
        ...payload.preference,
        [uniqueId]: columnData
      };
    }
  });
  payload.tc_code = tableCode;
  return payload.preference;
};

/**
 * Flatten nested columns into a tree data
 * Used in table view column settings
 */
export const flattenWithPaths = (columns, path = []) => {
  let flattened = [];
  columns?.forEach((item) => {
    let newPath = [];
    const { sub_headers, ...itemWithoutSubheaders } = item;
    let columnAttributes = { ...itemWithoutSubheaders };
    if (!item?.path) {
      newPath = [...path, item.label];
      columnAttributes = { ...columnAttributes, path: newPath };
    }
    if (!item?.column_name) {
      columnAttributes = { ...columnAttributes, column_name: item.label };
    }
    flattened.push(columnAttributes);
    if (item?.sub_headers && item?.sub_headers.length > 0) {
      flattened = flattened.concat(
        flattenWithPaths(item?.sub_headers, newPath)
      );
    }
  });
  return flattened;
};
