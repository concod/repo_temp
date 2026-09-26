export const checkValidation = (data, params) => {
  if (parseInt(data.min_store) > parseInt(data.max_store)) {
    if (params.column.colId === "min_store") {
      params.node.setDataValue("min_store", data.max_store);
    }
    if (params.column.colId === "max_store") {
      params.node.setDataValue("max_store", data.min_store);
    }
    return true;
  } else if (!data.max_store) {
    params.node.setDataValue("max_store", data.min_store);
    return true;
  } else if (!data.min_store) {
    params.node.setDataValue("min_store", 0);
    return true;
  }
  return false;
};
