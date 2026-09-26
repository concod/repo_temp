import { addSnack } from "core/actions/snackbarActions";

export const getFlattenColumn = (column, agGridRef) => {
  const originalParent = column?.getOriginalParent();
  if (column?.colId === "total" || column?.colId === "total_53") {
    const allColumns = agGridRef.columnApi.columnModel.gridColumns
      ?.filter(
        (column) =>
          isWeekNumber(column.colId) ||
          column.colId?.toLowerCase().includes("total")
      )
      .map((col) => col.colDef);
    return allColumns;
  }
  const result = [];
  function recursion(params) {
    if (!params.children) {
      result.push(params);
    } else if (params?.children?.length > 0) {
      params.children.forEach((child) => {
        recursion(child);
      });
    }
  }
  function getColGroupDef(colGroup) {
    if (Object.keys(colGroup?.colGroupDef || {}).length > 0) {
      return colGroup?.colGroupDef;
    } else {
      return getColGroupDef(colGroup?.originalParent || {});
    }
  }
  const colGroupDef = getColGroupDef(originalParent);
  recursion(colGroupDef);
  return result || {};
};

export const isWeekNumber = (key) => !isNaN(key);

export const getReference = (key) =>
  key === "current" ? "variance" : key === "variance" ? "current" : "";

export const getColumnExtra = (column) => column?.colDef?.extra || {};

export const getCompareKey = (varianceKey) => {
  const varianceType = varianceKey.split("_")[1];
  return varianceKey === "variance" ? "compare" : `compare_${varianceType}`;
};

export const callbackFetchFnc = async ({
  apiCall,
  dispatch,
  successCallback,
  failureCallback,
}) => {
  try {
    const response = await apiCall();
    if (response.data.status) {
      if (successCallback) {
        successCallback(response?.data);
      }
      return response?.data;
    } else {
      if (failureCallback) {
        failureCallback(response);
      }
      dispatch(
        addSnack({
          message: response.data.message,
          options: {
            variant: "error",
          },
        })
      );
      return null;
    }
  } catch (error) {
    if (failureCallback) {
      failureCallback();
    }
    dispatch(
      addSnack({
        message: "Something went wrong",
        options: {
          variant: "error",
        },
      })
    );
    return null;
  }
};
