import agGridColumnFormatter from "core/Utils/agGrid/column-formatter";
import { getColumnsAg } from "core/actions/tableColumnActions";
import { isEmpty } from "lodash";
import {
  displaySnackMessages,
  handleErrorMessage,
} from "modules/inventorysmart/pages-inventorysmart/inventorysmart-utility";

/**
 * Fetches AgGrid columns for a given table name and applies optional formatting.
 *
 * @param {string} tableName - The table name to fetch columns for
 * @param {Function} [columnFormatter] - Optional callback to transform columns after formatting
 * @param {Object} [actions] - Optional actions map passed to agGridColumnFormatter (3rd param)
 * @returns {Promise<Array>} Formatted columns array
 */
export const fetchTableColumns = async (
  tableName,
  columnFormatter,
  actions
) => {
  const rawColumns = await getColumnsAg(`table_name=${tableName}`)();
  if (rawColumns && rawColumns.length > 0) {
    let formattedColumns = agGridColumnFormatter(
      rawColumns,
      null,
      actions || null
    );
    if (columnFormatter) {
      formattedColumns = columnFormatter(formattedColumns, actions);
    }
    return formattedColumns;
  }
  return [];
};

/**
 * Fetches table data from an API and optionally transforms it.
 *
 * @param {Function} apiFunction - The API function to call (returns a promise)
 * @param {Object} payload - The payload to pass to the API
 * @param {Function} [dataTransformer] - Optional callback to transform the response data
 * @param {string} [key] - key to add to the grand total object
 * @returns {Promise<{ data: Array, message: string|null, grandTotal: Object }>}
 */
export const fetchTableData = async (
  apiFunction,
  payload,
  dataTransformer,
  key
) => {
  const response = await apiFunction(payload);
  if (response?.data?.status) {
    const tableData = response.data.data.data || response.data.data || [];
    const grandTotalData = response.data.data.grand_total || {};
    const grandTotal = !isEmpty(grandTotalData)
      ? {
          ...grandTotalData,
          isGrandTotal: true,
          [key]: "Grand Total",
        }
      : {};
    const transformedData = dataTransformer
      ? dataTransformer(tableData)
      : tableData;
    return {
      data: transformedData,
      message: null,
      grandTotal,
    };
  }
  return {
    data: [],
    message: response?.data?.message || "Failed to load table data",
    grandTotal: {},
  };
};

/**
 * Loads table columns + data in one call, managing loading state, error handling, and snack messages.
 * No need to handle errors or show messages in the component — this does it all.
 *
 * @param {Object} config
 * @param {string} config.tableName - Table name for fetching columns
 * @param {Function} config.apiFunction - API function to fetch data
 * @param {Object} config.payload - Payload for the API call
 * @param {Function} config.setColumns - State setter for columns
 * @param {Function} config.setData - State setter for data
 * @param {Function} config.setLoading - State setter for loading
 * @param {Function} config.setGrandTotalRow - State setter for grand total
 * @param {Object} config.props - Component props (must include addSnack for snack messages)
 * @param {Function} [config.columnFormatter] - Optional column formatter (applied after agGridColumnFormatter)
 * @param {Object} [config.actions] - Optional actions map passed to agGridColumnFormatter
 * @param {Object} [config.key] - key to add the Grand Total
 * @param {Function} [config.dataTransformer] - Optional data transformer
 */
export const loadTableData = async ({
  tableName,
  apiFunction,
  payload,
  setColumns,
  setData,
  setLoading,
  setGrandTotalRow,
  props,
  columnFormatter,
  actions,
  dataTransformer,
  key,
}) => {
  try {
    setLoading(true);

    let columns = [];
    try {
      columns = await fetchTableColumns(tableName, columnFormatter, actions);
      setColumns(columns);
    } catch (columnError) {
      setColumns([]);
      setData([]);
      handleErrorMessage(columnError, props);
      return;
    }

    try {
      const result = await fetchTableData(
        apiFunction,
        payload,
        dataTransformer,
        key
      );

      if (result.message) {
        setData([]);
        if (setGrandTotalRow) setGrandTotalRow({});
        displaySnackMessages(result.message, "error", props);
      } else {
        setData(result.data);
        if (setGrandTotalRow) setGrandTotalRow(result.grandTotal);
      }
    } catch (dataError) {
      setData([]);
      if (setGrandTotalRow) setGrandTotalRow({});
      handleErrorMessage(dataError, props);
    }
  } finally {
    setLoading(false);
  }
};
