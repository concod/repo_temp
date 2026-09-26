import { API_META_BODY } from "config/constants";
import { isEmpty } from "lodash";
import moment from "moment";
import CellRenderers from "core/Utils/agGrid/cellRenderer";
import { dynamicLabelKeysBasedOnTenant } from "core/Utils/DynamicLabels";

/**
 *
 * @param {List} datesArray
 * @param {str} dimension
 * @returns List
 *
 * This method takes in list of date objects from setall, viewdates dialog and
 * formats the object into format as per the API payload
 */
export const timeBoundDatesArrayFormatting = (
  datesArray,
  dimension = "store"
) => {
  if (dimension === "product") {
    return datesArray.map((attrb) => ({
      product_code: attrb.attribute_value,
      product_name: "",
      start_date: attrb.start_date,
      end_date: attrb.end_date,
    }));
  }
  return datesArray.map((attrb) => ({
    store_code: attrb.attribute_value,
    store_name: "",
    start_date: attrb.start_date,
    end_date: attrb.end_date,
  }));
};

/**
 * Returns the Name of the store or product
 * This is helpful when we select stores using store code, where we don't know complete info
 * of the store
 */
const getRefStoreOrProductName = (
  refStoreProducts,
  storeOrProduct,
  dimension
) => {
  if (storeOrProduct[`${dimension}_name`])
    return storeOrProduct[`${dimension}_name`];
  const filteredStoreOrProductReference = refStoreProducts.filter(
    (storeOrProd) => storeOrProd.id === storeOrProduct[`${dimension}_code`]
  );
  if (filteredStoreOrProductReference.length === 0) {
    return storeOrProduct[`${dimension}_code`];
  }
  if (
    filteredStoreOrProductReference.length > 0 &&
    !filteredStoreOrProductReference[0]["label"]
  ) {
    return storeOrProduct[`${dimension}_code`];
  }
  return filteredStoreOrProductReference[0][`label`];
};
/**
 * This method returns the fields required for set all form for view dates
 */
export const getSetAllFormFields = (
  setAllPopUpFields,
  selectedProdsOrStores,
  commonStoresOrProducts,
  screenName,
  refStoreOrProduct,
  hideMultiRow
) => {
  let disableMultiRow = false;
  let setAllFields = [...setAllPopUpFields];
  if (screenName === "product_mapping_store_group") {
    setAllFields = setAllFields.filter(
      (fields) =>
        !(
          fields.column_name === "store_code" ||
          fields.column_name === "product_code"
        )
    );
  }
  const commonProducts =
    screenName === "product_mapping"
      ? selectedProdsOrStores.filter((prod) =>
          commonStoresOrProducts.includes(
            prod.sku || prod.product_code || prod.article
          )
        )
      : [];
  const commonStores =
    screenName === "store_mapping"
      ? selectedProdsOrStores.filter((store) =>
          commonStoresOrProducts.includes(store.store_code)
        )
      : [];

  return [
    {
      fields: setAllFields.map((field) => {
        if (field.type === "DateTimeField") {
          field.disablePast = true;
        }
        if (field.column_name === "store_code") {
          return {
            ...field,
            isMulti: true,
            column_name: "storecode",
            accessor: "storecode",
            options: commonStores.map((storeDetails) => ({
              ...storeDetails,
              label:
                storeDetails[
                  dynamicLabelKeysBasedOnTenant("store_code", "core")
                ],
              value: storeDetails.store_code,
              id: storeDetails.store_code,
            })),
          };
        }
        if (field.column_name === "product_code") {
          disableMultiRow = commonProducts?.length >= 5000 ? true : false;
          return {
            ...field,
            isMulti: true,
            column_name: "productcode",
            accessor: "productcode",
            options: commonProducts.map((productDetails) => ({
              ...productDetails,
              label:
                productDetails.sku ||
                productDetails.product_code ||
                productDetails.article,
              value: productDetails.product_code || productDetails.article,
              id: productDetails.product_code || productDetails.article,
            })),
          };
        }
        return field;
      }),
      hideRowLabel:
        screenName === "product_mapping_store_group" ||
        !hideMultiRow ||
        disableMultiRow,
      addRowLabel: "Add Date",
      id: screenName === "store_mapping" ? "storecode" : "productcode",
      rowCount: 0,
    },
  ];
};

/**
 *
 * @param {column key} column
 * @param {new Value} newValue
 * @param {*} rowNode
 *
 * This function updates cell value with the new provided value in the params
 */
export const updateCellValueData = (
  column,
  newValue,
  rowNode,
  gridInstance
) => {
  const columnObj = gridInstance.current.columnApi.getColumn(column);
  if (columnObj === null) {
    const updated_data = {
      ...rowNode.data,
      [column]: newValue,
    };
    rowNode.setData(updated_data);
  } else {
    rowNode.setDataValue(column, newValue);
  }
};

export const getDCFCSetAllPayload = (
  dimension,
  filters,
  params,
  fields_values,
  isAggregated = false,
  dc_map_col = {}
) => {
  const is_multiple_selection = isEmpty(dc_map_col)
    ? false
    : dc_map_col?.isMulti;
  const all_dc_options = isEmpty(dc_map_col) ? [] : dc_map_col?.options || [];
  let uniqueColumn = "";
  let uniqueKey = dimension === "product" ? "product_code" : "store_code";
  if (isAggregated) {
    uniqueColumn = "aggregation_code";
  } else {
    uniqueColumn = uniqueKey;
  }
  let setAllPayload = {
    [uniqueKey]: {
      filters: filters,
      meta: {
        ...API_META_BODY,
        limit: { limit: 10, page: 1 },
      },
      selection: {
        data: params?.api?.checkConfiguration,
        unique_columns: [uniqueColumn],
      },
    },
  };
  let dc = {
    map: [],
    unmap: [],
  };

  if (isEmpty(fields_values)) {
    all_dc_options.forEach((dc_option) => {
      dc.unmap.push(dc_option.value);
    });
  } else {
    if (is_multiple_selection) {
      all_dc_options?.forEach((dc_option) => {
        if (
          Array.isArray(fields_values?.dc_map)
            ? fields_values?.dc_map.includes(dc_option.value)
            : fields_values.dc_map === dc_option.value
        ) {
          dc.map.push(dc_option.value);
        } else {
          dc.unmap.push(dc_option.value);
        }
      });
    } else {
      const mapped_dc = fields_values.dc_map;
      all_dc_options.forEach((dc_option) => {
        if (dc_option.value === mapped_dc) {
          dc.map.push(dc_option.value);
        } else {
          dc.unmap.push(dc_option.value);
        }
      });
    }
  }

  setAllPayload = {
    ...setAllPayload,
    dc: dc,
  };
  return setAllPayload;
};

/**
 * Check if the provided date ranges overlap each other
 * @param {Array} timePeriods
 * @returns {Boolean} return tre if ranges has overlap else false
 */
export const hasRangeOverlap = (timePeriods) => {
  // Check for overlaps
  for (let i = 0; i < timePeriods.length; i++) {
    for (let j = 0; j < timePeriods.length; j++) {
      if (
        moment(timePeriods[i][0]).isBefore(moment(timePeriods[j][1])) &&
        moment(timePeriods[j][0]).isBefore(moment(timePeriods[i][1])) &&
        i != j
      ) {
        return true;
      }
      if (moment(timePeriods[j][1]).isBefore(moment(timePeriods[j][0]))) {
        return true;
      }
    }
  }
  return false;
};

/**
 * @function
 * @description Fetch the requied renderer at Grouped level and show empty at root level
 * @param {Object} cellProps
 * @param {Object} extraProps
 * @param {Object} item
 * @returns {Object}
 */
export const setDynamicRenderer = (cellProps, extraProps, item) => {
  if (cellProps.node.level > 0) {
    return (
      <CellRenderers
        cellData={cellProps}
        column={item}
        extraProps={extraProps}
      ></CellRenderers>
    );
  }
  return "";
};

/**
 * @function
 * @description Return formatted date string
 * @param {Array} datesArray
 * @returns {Array}
 */
export const formattedData = (
  datesArray,
  fromFormat = "DD-MM-YYYY",
  toFormat = "DD-MM-YYYY"
) => {
  return datesArray.map((dates) => {
    if (Array.isArray(dates)) {
      return dates.map((date) => moment(date, fromFormat).format(toFormat));
    }
    return [
      moment(dates.from_date, fromFormat).format(toFormat),
      moment(dates.to_date, fromFormat).format(toFormat),
    ];
  });
};

/**
 * Check if the Dates array consists of same dates
 * @param {*} newDates
 * @param {*} oldDates
 * @returns
 */
export const hasSameDates = (newDates, oldDates) => {
  return !newDates.some((dates, i) => {
    return dates.some((_date, j) => {
      return !moment(newDates[i][j]).isSame(moment(oldDates[i][j]));
    });
  });
};

/**
 *
 * @param {stores response object from the API} stores
 * @returns array of records with time_period and their respective store codes
 */
export const prepareGroupedData = (data, key1, key2) => {
  data.forEach((rowData) => {
    let groupedData = [];
    rowData.validity.forEach((time_range) => {
      groupedData.push({
        from_date: time_range[0],
        to_date: time_range[1],
      });
    });
    rowData.id = `${rowData[key1]}~${rowData[key2]}`;
    rowData.validities = [...groupedData];
  });
  return data;
};
