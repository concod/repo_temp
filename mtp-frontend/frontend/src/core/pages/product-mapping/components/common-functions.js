import { API_META_BODY } from "config/constants";
import { isEmpty } from "lodash";
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
        screenName === "product_mapping_store_group" || !hideMultiRow,
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
