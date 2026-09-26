import { cloneDeep } from "lodash";
import axiosInstance from "core/Utils/axios";
import { DOWNLOAD_TABLE_DATA } from "config/api";

/**
 * @function
 * @param {Object} data
 * @returns {Object} Promise
 */
export const downloadTableDataRequest = async (postBody) => {
  return axiosInstance({
    url: DOWNLOAD_TABLE_DATA,
    method: "POST",
    data: postBody,
  });
};

const flattenVisibleColumns = (cols, colsMap) =>
  cols.flatMap((item) =>
    item.sub_headers?.length
      ? item.sub_headers.filter((s) => s.column_name && colsMap[s.column_name]?.visible)
          .map((s) => ({ label: s.label, column_name: s.column_name }))
      : item.column_name && colsMap[item.column_name]?.visible
        ? [{ label: item.label, column_name: item.column_name }]
        : []
  );

export const downloadTableData = async ({ tableRef, columns, filters, totalRowsCount, tableApi, uniqueColumns }) => {
  const grid = tableRef.current;
  const colsMap = cloneDeep(grid?.columnApi?.columnModel?.primaryColumnsMap);
  const filterBody = grid?.api?.gridOptionsWrapper?.gridOptions?.filterBody || { search: [], range: [], sort: [] };

  const body = {
    table_payload: {
      total_count: Number(totalRowsCount),
      columns: flattenVisibleColumns(columns, colsMap),
      filters,
      meta: { ...filterBody, limit: { limit: -1, page: 0 } },
      headers: [],
      selection: { data: grid?.api?.checkConfiguration, unique_columns: uniqueColumns },
    },
    table_api: `${window.location.origin}/api/v2/${tableApi}`,
  };

  const response = await downloadTableDataRequest(body);
  return response.data.status
    ? { success: true }
    : { success: false, message: response.data.message || "Download failed" };
};

export const downloadWithSnack = async (params, snackFn) => {
  try {
    const { success, message } = await downloadTableData(params);
    snackFn(
      success ? "Please wait for download notification to be received shortly" : message,
      success ? "success" : "error"
    );
  } catch (error) {
    snackFn(error?.response?.data?.message || "Something went wrong", "error");
  }
};
