import { DEFAULT_DATE_FORMAT, END_DATE } from "config/constants";
import { uniqWith, isEqual, difference, uniq, isNull } from "lodash";
import moment from "moment";
import {
  changeDateStringToOtherFormat,
  stringSplitWithTrim,
} from "core/Utils/functions/utils";
import { isDateRangeConflict } from "core/Utils/functions/helpers/validation-helpers";
import { fetchDynamicConfigFromTenantReducer } from "core/Utils/DynamicLabels";

export const generateUniqueEditedPayload = (editedPayload) => {
  return uniqWith(editedPayload, isEqual);
};

export const refreshCells = (params, columnsList) => {
  params.api.refreshCells({
    columns: columnsList,
    rowNodes: [params.node],
    force: true,
  });
};

export const getRowsToRemove = (node) => {
  return node.childrenAfterGroup || [];
};

export const prepareEditDeletePayload = (
  event,
  selectedStoreOrProdObjects,
  screenName,
  editDeleteChanges,
  type = "edit"
) => {
  const siblingRows = getRowsToRemove(event.node.parent).map(
    (node) => node.data
  );
  /**
   * If we delete the row, payload contains all the time periods as mappinglist except deleted one
   */
  const siblingRowsAfterDelete = siblingRows.filter(
    (node) => node.id !== event.data.id
  );

  const currentRowPayload = {
    ...(screenName === "store_mapping" && {
      store_code: event.data.id[0],
    }),
    ...(screenName === "store_mapping" && {
      product_code:
        selectedStoreOrProdObjects.product_code ||
        selectedStoreOrProdObjects.article,
    }),
    ...(screenName === "product_mapping" && {
      product_code: event.data.id[0],
    }),
    ...(screenName === "product_mapping" && {
      store_code: selectedStoreOrProdObjects.store_code,
    }),
    mappingsList:
      type === "delete" ? [...siblingRowsAfterDelete] : [...siblingRows],
  };
  let existingEditDeletePayload = [...editDeleteChanges];
  existingEditDeletePayload = existingEditDeletePayload.filter((payload) => {
    return !(
      payload.store_code ===
        (screenName === "store_mapping"
          ? event.data.id[0]
          : selectedStoreOrProdObjects.store_code) &&
      payload.product_code ===
        (screenName === "product_mapping"
          ? event.data.id[0]
          : selectedStoreOrProdObjects.product_code)
    );
  });
  existingEditDeletePayload.push(currentRowPayload);
  return existingEditDeletePayload;
};

export const getExisitingUnmappedStores = (selectedStores, selectedRows) => {
  //Get the existing unmapped stores in DB by using mapped_stores for the selected Row
  return difference(
    selectedStores.map((item) => item.store_code),
    selectedRows.mapped_stores
  );
};

export const parseMappings = (editOrDeleteAPIPayload) => {
  let parsedPayload = [];
  editOrDeleteAPIPayload.forEach((mapping) => {
    if (mapping.mappingsList.length === 0) {
      parsedPayload.push({
        store_code: [mapping.store_code],
        product_code: [mapping.product_code],
        valid_from: null,
        valid_to: null,
      });
    } else {
      mapping.mappingsList.forEach((time_range_object) => {
        const [startDate, endDate] = stringSplitWithTrim(
          time_range_object.time_period,
          "-"
        );
        parsedPayload.push({
          store_code: [mapping.store_code],
          product_code: [mapping.product_code],
          valid_from: moment(startDate, DEFAULT_DATE_FORMAT).format(
            "YYYY-MM-DD"
          ),
          valid_to: moment(endDate, DEFAULT_DATE_FORMAT).format("YYYY-MM-DD"),
        });
      });
    }
  });
  return parsedPayload;
};

export const checkIsNewlyCreatedMapping = (
  event,
  editedChanges,
  selectedStoreOrProdObjects,
  screenName,
  oldValue
) => {
  const [startDate, endDate] = stringSplitWithTrim(oldValue, "-");

  //First check if the edited item is present as individual mapping
  const IndvMappingIndex = editedChanges.findIndex((eachMapObj) => {
    const DateBoolExpression =
      eachMapObj.valid_from ===
        changeDateStringToOtherFormat(
          startDate,
          DEFAULT_DATE_FORMAT,
          "YYYY-MM-DD"
        ) &&
      eachMapObj.valid_to ===
        changeDateStringToOtherFormat(
          endDate,
          DEFAULT_DATE_FORMAT,
          "YYYY-MM-DD"
        );
    return screenName === "store_mapping"
      ? eachMapObj.product_code === selectedStoreOrProdObjects.product_code &&
          eachMapObj.select[0] === event.data.id[0] &&
          DateBoolExpression &&
          !eachMapObj.include_unmapped
      : eachMapObj.store_code === selectedStoreOrProdObjects.store_code &&
          eachMapObj.select[0] === event.data.id[0] &&
          DateBoolExpression &&
          !eachMapObj.include_unmapped;
  });
  //If yes then return it, so we either delete or edit the payload at this index in the editedPayload
  //state variable
  if (IndvMappingIndex !== -1) {
    return IndvMappingIndex;
  }

  //If not check include unmapped object is getting edited or deleted
  //If yes then edit or delete by adding edited_ids or deleted ids to include unmapped object
  //the add respective payload
  //If no, then we are editing the data which is present in the db, so add it in edited payload
  return editedChanges.findIndex((eachMapObj) => {
    const DateBoolExpression =
      eachMapObj.valid_from ===
        changeDateStringToOtherFormat(
          startDate,
          DEFAULT_DATE_FORMAT,
          "YYYY-MM-DD"
        ) &&
      eachMapObj.valid_to ===
        changeDateStringToOtherFormat(
          endDate,
          DEFAULT_DATE_FORMAT,
          "YYYY-MM-DD"
        );
    return screenName === "store_mapping"
      ? eachMapObj.product_code === selectedStoreOrProdObjects.product_code &&
          DateBoolExpression &&
          eachMapObj.include_unmapped
      : eachMapObj.store_code === selectedStoreOrProdObjects.store_code &&
          DateBoolExpression &&
          eachMapObj.include_unmapped;
  });
};

export const shouldDisableIncludeUnmappedSwitch = (rowData) => {
  return rowData["is_include_unmapped_disabled"];
};

export const prepareMappedStoresOrProductsViewData = (APIData) => {
  let mappedData = [];
  APIData.forEach((eachStoreOrProdRow) => {
    eachStoreOrProdRow.validities = [];
    eachStoreOrProdRow.validity.forEach((time_range) => {
      eachStoreOrProdRow.validities.push({
        time_period: `${changeDateStringToOtherFormat(
          time_range[0],
          "YYYY-MM-DD",
          DEFAULT_DATE_FORMAT
        )} - ${changeDateStringToOtherFormat(
          time_range[1],
          "YYYY-MM-DD",
          DEFAULT_DATE_FORMAT
        )}`,
      });
    });
    mappedData.push(eachStoreOrProdRow);
  });
  return mappedData;
};

export const splitMappedAndUnmappedData = (editedPayload, screenName) => {
  let mappedData = [];
  let unmappedData = [];
  editedPayload.forEach((body) => {
    if (
      !body.include_unmapped &&
      body.select.length > 0 &&
      body.unselect.length === 0
    ) {
      mappedData.push(body);
    }
    if (
      !body.include_unmapped &&
      body.select.length === 0 &&
      body.unselect.length > 0
    ) {
      unmappedData.push({
        product_code:
          screenName === "store_mapping"
            ? [body.product_code]
            : [body.unselect[0]],
        store_code:
          screenName === "store_mapping"
            ? [body.unselect[0]]
            : [body.store_code],
        valid_from: null,
        valid_to: null,
      });
    }
  });
  return [mappedData, unmappedData];
};

const getEachMappingPayload = (
  storeOrProdCode,
  screenName,
  select_id,
  valid_from,
  valid_to
) => {
  return {
    ...(screenName === "store_mapping" && {
      product_code: storeOrProdCode,
    }),
    ...(screenName === "product_mapping" && {
      store_code: storeOrProdCode,
    }),
    include_unmapped: false,
    map: true,
    ...((screenName === "store_mapping" ||
      screenName === "product_mapping") && {
      select: [select_id],
    }),
    unselect: [],
    valid_from: valid_from,
    valid_to: valid_to,
  };
};

export const prepareCreatePayload = (
  createPayload,
  selectedStoreOrProdObjects,
  screenName
) => {
  let mappedData = [];
  createPayload.forEach((eachPayloadObject) => {
    let isPushed = false;
    if (
      eachPayloadObject.include_unmapped &&
      eachPayloadObject?.edited_ids?.length === 0 &&
      eachPayloadObject?.deleted_ids?.length === 0
    ) {
      let tempEachPayloadObject = { ...eachPayloadObject };
      delete eachPayloadObject["edited_ids"];
      delete eachPayloadObject["deleted_ids"];
      mappedData.push(tempEachPayloadObject);
      isPushed = true;
    }
    if (
      eachPayloadObject.include_unmapped &&
      (eachPayloadObject?.edited_ids?.length > 0 ||
        eachPayloadObject?.deleted_ids?.length > 0)
    ) {
      selectedStoreOrProdObjects.forEach((eachObj) => {
        let mapped_entries =
          screenName === "store_mapping"
            ? eachPayloadObject?.mapped_stores
            : eachPayloadObject?.mapped_products;
        if (mapped_entries) {
          mapped_entries = mapped_entries.filter((entry) => entry); //removing null
        }
        if (
          !(
            eachPayloadObject?.edited_ids?.includes(
              eachObj[
                screenName === "store_mapping" ? "store_code" : "product_code"
              ]
            ) ||
            eachPayloadObject?.deleted_ids?.includes(
              eachObj[
                screenName === "store_mapping" ? "store_code" : "product_code"
              ]
            ) ||
            mapped_entries?.includes(
              eachObj[
                screenName === "store_mapping" ? "store_code" : "product_code"
              ]
            )
          )
        ) {
          const eachUnmappedObjPayload = getEachMappingPayload(
            screenName === "store_mapping"
              ? eachPayloadObject.product_code
              : eachPayloadObject.store_code,
            screenName,
            eachObj[
              screenName === "store_mapping" ? "store_code" : "product_code"
            ],
            eachPayloadObject.valid_from,
            eachPayloadObject.valid_to
          );
          mappedData.push(eachUnmappedObjPayload);
        }
      });
      isPushed = true;
    }
    !isPushed && mappedData.push(eachPayloadObject);
  });
  return mappedData;
};

//make product/store count as hard coded variable "view"
export const configureViewButton = (responseData, Key) => {
  return responseData.map((data) => {
    if (!data[Key] && data[Key] !== null) {
      return {
        ...data,
        [Key]: "View",
      };
    }
    return {
      ...data,
      [Key]:
        data[Key] === null || isNaN(data[Key]) || data[Key] === 0
          ? null
          : "View",
    };
  });
};

/**
 *
 * @param {*} parentNode
 * @returns
 * This function returns unique Id integer for a node of time periods
 * This need to be written because if we delete an entry, we are not shuffling the ids,
 * so when we try to add a new time period, there is an issue
 */
export const generateUniqueId = (parentNode) => {
  let maxIdUsed = 0;
  const childNodes = getRowsToRemove(parentNode);
  childNodes.forEach((childNode) => {
    const splitDates = childNode.data.id[1].split("_");
    let lastElement = splitDates.pop();
    if (lastElement > maxIdUsed) {
      maxIdUsed = lastElement;
    }
  });
  return maxIdUsed + 1;
};

/**
 *
 * @param {*} timePeriodNodesList
 * @returns boolean
 * checks if there is conflict in time periods
 */
export const checkConflictInTimePeriods = (timePeriodNodesList) => {
  const timePeriodRangeList = timePeriodNodesList?.map((node) => {
    const [startDate, endDate] = stringSplitWithTrim(
      node.data.time_period,
      "-"
    );
    return {
      start_time: startDate,
      end_time: endDate,
    };
  });
  return isDateRangeConflict(timePeriodRangeList, "YYYY-MM-DD", "[]");
};

export const changeRowStyle = (node, conflictStatus) => {
  node.setData({ ...node.data, hasConflict: conflictStatus });
};

// checks and manages conflict error in store and product mapping data
export const conflictResolutionCheck = (
  parentRowNode,
  displaySnackMessages
) => {
  const currentDateRangeConflict = parentRowNode.data.hasConflict;
  const children = getRowsToRemove(parentRowNode);
  if (children && children.length > 0) {
    const newDateRangeConflict = checkConflictInTimePeriods(children);
    if (!currentDateRangeConflict && newDateRangeConflict) {
      changeRowStyle(parentRowNode, true);
      displaySnackMessages("Please resolve overlapping date ranges", "error");
      return true;
    }
    if (currentDateRangeConflict && !newDateRangeConflict) {
      changeRowStyle(parentRowNode, false);
      displaySnackMessages(
        "Successfully resolved overlapping date ranges",
        "success"
      );
      return false;
    }
  }
};

/**
 *
 * @param {*} key
 * @param {*} value
 * @param {*} conflictObject
 * @param {*} setconflictObjectFunc
 * This method adds store-product or product-store key mapping to conflict object
 * when there is conflict observed
 */
export const addDataToConflictObject = (
  key,
  value,
  conflictObject,
  setconflictObjectFunc
) => {
  if (key in conflictObject) {
    const updatedConflictObject = {
      ...conflictObject,
      [key]: uniq(conflictObject[key].push(value)),
    };
    setconflictObjectFunc(updatedConflictObject);
  } else {
    const updatedConflictObject = {
      ...conflictObject,
      [key]: [value],
    };
    setconflictObjectFunc(updatedConflictObject);
  }
};

/**
 *
 * @param {*} key
 * @param {*} value
 * @param {*} conflictObject
 * @param {*} setconflictObjectFunc
 *
 * This function removes product-store or store-product key mapping from the conflict object
 * once we resolve the conflict
 */
export const deleteDataFromConflictObject = (
  key,
  value,
  conflictObject,
  setconflictObjectFunc
) => {
  if (key in conflictObject) {
    const updatedConflictObject = {
      ...conflictObject,
      [key]: conflictObject[key].filter((val) => val !== value),
    };
    if (updatedConflictObject[key].length === 0) {
      delete updatedConflictObject[key];
    }
    setconflictObjectFunc(updatedConflictObject);
  }
};

/**
 *
 * @param {*} key
 * @param {*} value
 * @param {*} conflictObject
 * @returns boolean
 * If conflict store-product combination has conflict
 */
export const checkIfDataExistsInConflictObject = (
  key,
  value,
  conflictObject
) => {
  return key in conflictObject && conflictObject[key].includes(value);
};

/**
 *
 * @param {*} tableRef
 * @param {*} screenName
 * @param {*} selectedProdOrStoreObject
 * @param {*} conflictObject
 * When there is conflict, that row style will be changed to error color
 */
export const renderConflictStyle = (
  tableRef,
  screenName,
  selectedProdOrStoreObject,
  conflictObject,
  isAggregated = false
) => {
  if (tableRef.current) {
    const conflictKey =
      screenName === "store_mapping"
        ? selectedProdOrStoreObject[isAggregated ? "article" : "product_code"]
        : selectedProdOrStoreObject.store_code;
    tableRef.current.api.getRenderedNodes().forEach((node) => {
      changeRowStyle(
        node,
        checkIfDataExistsInConflictObject(
          conflictKey,
          node.data.id[0],
          conflictObject
        )
      );
    });
  }
};
/**
 *
 * @param {array} editDeleteChanges
 * @param {string} product_code
 * @param {string} store_code
 * @returns
 * This method checks if the store to product or vice versa already has
 * edited time periods. When we edit any time period, we add that combination
 * to list of editDeleteChanges payload variable. So we check using this method,
 * if the store-product combination is already edited
 */
export const isMappingAlreadyEdited = (
  editDeleteChanges,
  product_code,
  store_code
) => {
  return editDeleteChanges.filter(
    (change) =>
      change.product_code === product_code && change.store_code === store_code
  );
};

export const getSelectedStoresOrProducts = (
  screenName,
  selectedProductObjects,
  selectedStoreObjects
) => {
  return screenName === "store_mapping"
    ? selectedProductObjects
    : selectedStoreObjects;
};

/**
 *
 * @param {"string" either product or store} selectedDimension
 * @param {array} selectedProducts
 * @param {reference of aggrid table} params
 * @param {int} pageIndex
 * @param {meta of table} meta
 * @param {for client side bulk edit} selectedIds
 * @param {boolean} isBulkEdit
 * @returns default payload for mapping apis
 */
export const getModifyTablePayloadMeta = (
  selectedFilters,
  selectedDimension,
  selectedProducts,
  params,
  pageIndex,
  meta,
  selectedIds = [],
  isAggregated,
  isBulkEdit = false
) => {
  if (selectedDimension === "store") {
    return {
      selected_stores: selectedProducts.map((item) => item.store_code),
      filters:
        params.api.alignment !== "reference_store"
          ? params.api.filterDependency || selectedFilters
          : [],
      ...(params.api.alignment === "reference_store" && {
        reference_store: params.api.selectedRefStore,
      }),
      meta: {
        ...meta,
        limit: {
          limit: 10,
          page: pageIndex + 1,
        },
      },
      selection: {
        data: !isBulkEdit
          ? params?.api?.checkConfiguration
          : [
              {
                checkedRows: selectedIds,
              },
            ],
        unique_columns: isAggregated ? ["aggregation_code"] : ["product_code"],
      },
    };
  }
  if (selectedDimension === "store_groups") {
    return {
      selected_store_groups: selectedProducts.map((item) => item.sg_code),
      filters: params.api.filterDependency || selectedFilters,
      meta: {
        ...meta,
      },
    };
  }

  if (selectedDimension === "product") {
    return {
      selected_products: selectedProducts.map(
        (item) => item.product_code || item.article
      ),
      filters: params.api.filterDependency || selectedFilters,
      meta: {
        ...meta,
        limit: {
          limit: 10,
          page: pageIndex + 1,
        },
      },
      selection: {
        data: !isBulkEdit
          ? params?.api?.checkConfiguration
          : [
              {
                checkedRows: selectedIds,
              },
            ],
        unique_columns: ["store_code"],
      },
    };
  }

  if (selectedDimension === "product_groups") {
    return {
      selected_products: selectedProducts.map((item) => item.pg_code),
      filters: params.api.filterDependency || selectedFilters,
      meta: {
        ...meta,
      },
    };
  }
};

/**
 *
 * @param {edited Data list} dataChanges
 * @param {rowNode} selectedRow
 * @param {string} screenName
 * @returns newly mapped values
 */
export const getNewlyMappedData = (
  dataChanges,
  selectedRow,
  screenName = "store_mapping"
) => {
  let uniqueKey = "product_code";
  if (screenName === "product_mapping") {
    uniqueKey = "store_code";
  }
  //Get the objects which have select value because if select list is non empty
  //It means it means, the product/store is mapped to the values in the select list
  let newlyMappedValues = dataChanges.filter(
    (apiPayloadObject) =>
      apiPayloadObject[uniqueKey] === selectedRow.data[uniqueKey] &&
      apiPayloadObject.select.length > 0
  );
  //Returns distinct newly mapped values
  return uniqWith(newlyMappedValues, function (currentVal, otherVal) {
    return (
      JSON.stringify(currentVal.select) === JSON.stringify(otherVal.select)
    );
  });
};

/**
 *
 * @param {rowNode} selectedRow
 * @param {list} selectedProductsOrStores
 * @param {list} newlyMappedValues
 * @param {list} newValues
 * @param {string} screenName
 * @returns updated payload for the inline save API
 * newly Mapped values are the values that are mapped using the individual mapped flow
 * newValues are the payload changes for the inline save API
 * In this function, we update the payload list with the products/stores that are
 * yet to be mapped. We remove the already mapped data from the selected data(from dashboard)
 * and for the difference values we prepare individual mapped objects and add it to payload
 */
export const includeOnlyUnmappedData = (
  selectedRow,
  selectedProductsOrStores,
  newlyMappedValues,
  newValues,
  screenName = "store_mapping"
) => {
  const mappedKey =
    screenName === "store_mapping" ? "mapped_stores" : "mapped_products";
  const uniqueKey =
    screenName === "store_mapping" ? "store_code" : "product_code";
  let alreadyMappedData = selectedRow.data?.[mappedKey] || [];
  //If the selected row has already some mapped data
  alreadyMappedData = alreadyMappedData.filter((data) => data !== null);
  let newlyMappedData = [];
  //Newly mapped data through individual flow
  newlyMappedValues.forEach((eachObj) => {
    newlyMappedData.push(...(eachObj?.select || []));
  });
  //Get the remaining unmapped data
  const unmappedData = difference(
    selectedProductsOrStores.map((item) => item[uniqueKey]),
    [...alreadyMappedData, ...newlyMappedData]
  );

  //For the remaining unmapped data, prepare the individual mapped objects
  //and push it to payload api list
  unmappedData.forEach((data) => {
    let body = {
      ...(screenName === "product_mapping" && {
        store_code: selectedRow.data.store_code,
      }),
      ...(screenName === "store_mapping" && {
        product_code: selectedRow.data.product_code,
      }),
      include_unmapped: false,
      map: true,
      select: [data],
      unselect: [],
      valid_from: moment().format("YYYY-MM-DD"),
      valid_to: END_DATE,
      edited_ids: [],
      deleted_ids: [],
      ...(screenName === "product_mapping" && {
        mapped_products: selectedRow.data.mapped_products,
      }),
      ...(screenName === "store_mapping" && {
        mapped_stores: selectedRow.data.mapped_stores,
      }),
      from_include_unmapped: true,
    };
    newValues.push(body);
  });
  return newValues;
};

/**
 * @func
 * @desc structure object for edit api payload for unmapped objects
 * @param {String} screenName
 * @param {String} code
 * @param {Array} mappedCodes
 * @returns {Array} unmapped structured objects
 */
export const getUnmappedData = (screenName, code, mappedCodes) => {
  const unmappedData = [];
  mappedCodes.forEach((data) => {
    const body = {
      ...(screenName === "store_mapping"
        ? {
            product_code: code,
          }
        : { store_code: code }),
      include_unmapped: false,
      map: true,
      select: [],
      unselect: [data],
      valid_from: moment().format("YYYY-MM-DD"),
      valid_to: END_DATE,
      ...(screenName === "store_mapping"
        ? {
            mapped_products: mappedCodes,
          }
        : { mapped_stores: mappedCodes }),
    };
    unmappedData.push(body);
  });

  return unmappedData;
};

export const fetchSelectAllStatus = () => {
  /**
   * This function is used to return the select all enabling/disabling status
   * for each client based on db config
   * DB config should be added to core_screen_configuration
   * For that json, add "productMapping" : {"hideSelectAll" : ["product"]}
   * to disable select all for product level table
   */
  const productMappingConfig = fetchDynamicConfigFromTenantReducer(
    "core",
    "productMapping"
  );
  if (
    productMappingConfig &&
    productMappingConfig["hideSelectAll"] &&
    Array.isArray(productMappingConfig["hideSelectAll"]) &&
    productMappingConfig["hideSelectAll"].includes("product")
  ) {
    return true;
  }
  return false;
};
export const addDateFieldSelection = (startDate, endDate, body, dimension) => {
  if (!isNull(startDate)) {
    const endDateValue = !isNull(endDate) ? endDate : moment(END_DATE);
    body.filters = [
      ...body.filters,
      {
        attribute_name: "validity",
        operator: "in",
        values: [
          startDate.format(DEFAULT_DATE_FORMAT),
          endDateValue.format(DEFAULT_DATE_FORMAT),
        ],
        filter_type: "cascaded",
        dimension: dimension,
        system_filter: true,
      },
    ];
  }

  return body;
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
