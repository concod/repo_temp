import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
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

export const setTimeConstraintPostRequestBody = (arr) => {
  const finalArray = arr.map((item) => {
    item.stores = item.stores.map((subRow) => {
      subRow.action = subRow.action ? subRow.action : "update";
      subRow.max =
        subRow.max_store || subRow.max_store === 0
          ? `${subRow.max_store}`
          : null;
      subRow.min =
        subRow.min_store || subRow.min_store === 0
          ? `${subRow.min_store}`
          : null;
      return subRow;
    });
    return item;
  });
  return [...finalArray];
};

export const checkValidationforTimeConstraint = (reqBody) => {
  let requiredFields = false;
  for (let item of reqBody) {
    for (let store of item.stores) {
      if (store.action === "delete") {
        requiredFields = false;
      } else {
        if (
          (store.min_store || store.min_store === 0) &&
          (store.max_store || store.max_store === 0) &&
          (store.wos || store.wos === 0) &&
          store.start_date &&
          store.end_date
        ) {
          requiredFields = false;
        } else {
          requiredFields = true;
          break;
        }
      }
    }
    if (requiredFields) {
      break;
    }
  }
  return requiredFields;
};
const getAllRows = (tableRef) => {
  let rowData = [];
  tableRef.current.api.forEachNode((node) => rowData.push(node.data));
  return rowData;
};

export const checkValidationforTimeConstraintDate = (reqBody, tableRef) => {
  let hasConflictsDate = false;
  let rowData = getAllRows(tableRef);
  for (let item of reqBody) {
    let dateData = rowData.filter(
      (row) => row.uniqueKey === item.uniqueParentKey
    );
    dateData[0].stores = dateData[0]?.stores.map((row) => {
      row.start_time = row.start_date;
      row.end_time = row.end_date;
      return row;
    });
    hasConflictsDate = isDateRangeConflict(dateData[0].stores, "YYYY-MM-DD");
    if (hasConflictsDate) {
      break;
    }
  }
  return hasConflictsDate;
};

export const setTimeConstraintSavePayload = (reqBody) => {
  return reqBody.map((item) => {
    item.stores = item.stores.map((subRow) => {
      let actionNumber = null;
      if (subRow.action === "delete") {
        actionNumber = 1;
      }
      if (subRow.action === "update") {
        actionNumber = 2;
      }
      if (subRow.action === "insert") {
        actionNumber = 3;
      }
      return {
        actionNumber: actionNumber,
        store_code: subRow.store_code,
        wos: subRow.wos,
        start_date: subRow.start_date,
        end_date: subRow.end_date,
        action: subRow.action,
        max: subRow.max,
        min: subRow.min,
        original_start_date: subRow.original_start_date
          ? subRow.original_start_date
          : null,
      };
    });
    item.stores = item.stores.filter((subRow) => {
      if (subRow.action === "delete" && !subRow.original_start_date) {
        return false;
      }
      return true;
    });
    item.stores = item.stores.sort((a, b) => {
      return a.actionNumber - b.actionNumber;
    });
    return {
      product_code: item.product_code,
      channel: item.channel,
      stores: [...item.stores],
    };
  });
};
