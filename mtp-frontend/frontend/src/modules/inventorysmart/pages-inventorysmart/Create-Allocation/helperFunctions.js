import { cloneDeep, intersection, isEmpty, isEqual, union } from "lodash";
import { PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import store from "store";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { COLUMNS_TO_DELETE_STRATEGY_PO, DC_COLUMN_FOR_PO, DISABLED_COLUMNS_FOR_STRATEGY_PO, UN_EDITABLE_COLUMNS_FOR_STRATEGY_PO } from "./strategyConstants";

export const isNonPrimitiveArray = (p_array) => {
  const isNonPrimitive = (item) => typeof item === "object";
  if (p_array.every(isNonPrimitive)) return true;
  return false;
};

export const removeDuplicates = (p_array, p_key) => {
  const l_seen = new Set();
  return p_array.filter((item) => {
    const l_itemKey = item[p_key];
    if (!l_seen.has(l_itemKey)) {
      l_seen.add(l_itemKey);
      return true;
    }
    return false;
  });
};

export const COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE = [
  "user_def_inv_perc",
  "user_def_inv",
];

export const getUpdatedColumnConfig = (p_columnConfig, isPO, p_type, client, poName = "") => {
  if (isPO) {
    p_columnConfig = p_columnConfig?.map((columnConfig) =>
      columnConfig.column_name === "inventory_source" &&
      !columnConfig.extra.options_column
        ? {
            ...columnConfig,
            extra: columnConfig.extra?.["po"] || columnConfig.extra,
          }
        : columnConfig
    );
    // Custom logic to disable and remove some columns for NA PO.
    if (client == "_NA") {
      p_columnConfig = formatColumnsForPO(p_columnConfig,`is_editable`, UN_EDITABLE_COLUMNS_FOR_STRATEGY_PO);
      p_columnConfig = formatColumnsForPO(p_columnConfig,`disabled`, DISABLED_COLUMNS_FOR_STRATEGY_PO);
      p_columnConfig = formatColumnsForPO(p_columnConfig,`delete`, COLUMNS_TO_DELETE_STRATEGY_PO);
      if (poName === "PFS Jewellery & Fragrance PO") p_columnConfig = formatColumnsForPO(p_columnConfig,`add`, DC_COLUMN_FOR_PO);
    }

    const l_columnConfig = cloneDeep(p_columnConfig);
    const itemToBeRemoved = { column_name: "dcs" };
    const findIndex = l_columnConfig.findIndex(
      (column) => column.column_name === itemToBeRemoved.column_name
    );
    findIndex !== -1 && l_columnConfig.splice(findIndex, 1);

    return l_columnConfig;
  }
  p_columnConfig = p_columnConfig?.map((columnConfig) =>
    columnConfig.column_name === "inventory_source" &&
    !columnConfig.extra.options_column
      ? {
          ...columnConfig,
          extra:
            columnConfig.extra?.[p_type === "userReserve" ? "reserve" : "dc"] ||
            columnConfig.extra,
        }
      : columnConfig
  );
  return p_columnConfig;
};

export const getLastIndex = (p_array = []) => {
  return p_array.length - 1 === -1 ? 0 : p_array.length - 1;
};

const getSumOfSkus = (p_articleSizStoreMapping, p_size, p_code, p_childSku) => {
  if (p_childSku === "") {
    let l_allSkusValues = Object.values(
      p_articleSizStoreMapping?.[p_size]?.[p_code] || {}
    );
    return l_allSkusValues?.reduce((partialSum, val) => +partialSum + +val, 0);
  } else if (p_childSku) {
    return +p_articleSizStoreMapping?.[p_size]?.[p_code]?.[p_childSku];
  }
  // use case to handle SKUs without sub-skus
  else {
    return +p_articleSizStoreMapping?.[p_size]?.[p_code];
  }
};

function filterObjectByReference(p_ohMap, p_rqMap, columnName = "") {
  const result = {};
  if (isEmpty(p_ohMap)) return ;
  for (const [key, value] of Object.entries(p_rqMap || {})) {
    // Initialize the result object for this key
    result[key] = {};

    if (key in p_ohMap) {
      for (const [nestedKey, nestedValue] of Object.entries(value || {})) {
        if (nestedKey in p_ohMap[key]) {
          // Compute the new value as p_ohMap[nestedKey] - nestedValue
          const newValue = columnName.includes("no_purge") ? nestedValue : p_ohMap[key][nestedKey] - nestedValue;
          result[key][nestedKey] = newValue >= 0 ? nestedValue : 0;
        } else {
          // If the nested key is not in `p_ohMap`, set value to 0
          result[key][nestedKey] = 0;
        }
      }
    } else {
      // If the key in `p_rqMap` is not in `p_ohMap`, set all nested keys to 0
      for (const nestedKey of Object.keys(value)) {
        result[key][nestedKey] = 0;
      }
    }
  }

  return result;
}

export const mutateRqMapping = (p_articleData) => {
  try {
    const l_mutatedData = p_articleData.map((row) => {
      return {
        ...row,
        rq_map: {
          ...filterObjectByReference(row?.oh_map, row?.rq_map, 'rq_map'),
        },
        rq_map_no_purge: {
          ...filterObjectByReference(row?.oh_map, row?.rq_map_no_purge, 'rq_map_no_purge'),
        },
        rq_map_eaches: {
          ...filterObjectByReference(row?.oh_eaches_map, row?.rq_map_eaches, 'rq_map_eaches'),
        },
        rq_map_eaches_no_purge: {
          ...filterObjectByReference(row?.oh_eaches_map, row?.rq_map_eaches_no_purge, 'rq_map_eaches_no_purge'),
        },
        rq_map_packs: { 
          ...filterObjectByReference(row?.oh_packs_map, row?.rq_map_packs, 'rq_map_packs'),
        },
        rq_map_packs_no_purge: { 
          ...filterObjectByReference(row?.oh_packs_map, row?.rq_map_packs_no_purge, 'rq_map_packs_no_purge'),
        },
      };
    });
    return l_mutatedData;
  } catch (err) {
    console.log(err);
  }
};

export const getInvComponent = (p_req, isPrepack = false) => {
  let l_selectedChildSku = p_req?.data?.child_skus?.[0]?.value;
  let invCompList = isPrepack ? ["oh_eaches_map", "rq_map_eaches", "au_eaches_map", "po_eaches_map", "rq_map_eaches_no_purge"]: ["oh_map", "rq_map", "au_map", "po_map", "rq_map_no_purge"];
  const finalMapping = {};
  while (invCompList.length) {
    let invComp = invCompList[invCompList.length - 1];
    let articleSizStoreMapping = Object.fromEntries?.(
      Object.entries?.(p_req.data?.[invComp] || {})?.filter(([key, _value]) =>
        p_req?.size.includes(key)
      )
    );
    let sum = 0;
    for (let size in articleSizStoreMapping) {
      for (let code of p_req.dc_code) {
        sum +=
          getSumOfSkus(
            articleSizStoreMapping,
            size,
            code,
            invComp === "rq_map" ? null : l_selectedChildSku
          ) || 0;
      }
    }
    finalMapping[invComp] = sum;
    invCompList.pop();
  }
  return finalMapping;
};

export const getPackInv = (p_req, isPrepack = false) => {
  let l_selectedChildSku = p_req?.data?.child_skus?.[0]?.value;
  let invCompList = ["oh_packs_map", "rq_map_packs", "au_packs_map"]
  const sizes = p_req.data?.pack_configuration ? Object.keys(p_req.data?.pack_configuration) : [];
  const finalMapping = {};
  while (invCompList.length) {
    let invComp = invCompList[invCompList.length - 1];
    let articleSizStoreMapping = Object.fromEntries?.(
      Object.entries?.(p_req.data?.[invComp] || {})?.filter(([key, _value]) =>
        sizes.includes(key)
      )
    );
    let sum = 0;
    for (let size in articleSizStoreMapping) {
      for (let code of p_req.dc_code) {
        sum +=
          getSumOfSkus(
            articleSizStoreMapping,
            size,
            code,
            invComp === "rq_map" ? null : l_selectedChildSku
          ) || 0;
      }
    }
    finalMapping[invComp] = sum;
    invCompList.pop();
  }
  return finalMapping;
};


const getSEGOptions = (p_storeGroupCode, p_channel) => {
  return p_channel?.map((channel) => {
    return p_storeGroupCode?.[channel];
  });
};
// this function will be removed on sending SEG code from BE itself

export const getUpdatedGroupCode = (
  p_storeGroups,
  p_storeGroupCode,
  p_channel,
  p_storeGroupOptions
) => {
  let l_storeGroup = p_storeGroups,
    l_storeGroupCodes = [];
  if (p_storeGroupOptions) {
    l_storeGroupCodes = p_storeGroupOptions?.map(
      (val) => val.valueArray || val.value
    );
    l_storeGroup = p_storeGroups?.filter((val) =>
      [...l_storeGroupCodes, -1]?.includes(val.valueArray || val.value)
    );
  }
  return l_storeGroup.map((obj) => {
    return +obj.value === -1
      ? { ...obj, valueArray: getSEGOptions(p_storeGroupCode, p_channel) }
      : obj;
  });
};

export const checkSizes = (a, b) => {
  // Combine all sizes from `a` into a single unique list
  const allSizes = [...new Set(Object.values(a).flat())];
    
  // Check if every size in `allSizes` is included in `b`
  return allSizes.every(size => b.includes(size));
}

export const mutateInventoryCalculations = (p_req, isPO) => {
  const dcResponse = getInvComponent(p_req);
  const dcResponseEaches = getInvComponent(p_req, true);

  const dcResponsePacks = getPackInv(p_req);
  
  let l_netAvailableInventory =
    (+dcResponse?.po_map || 0) +
    (+dcResponse?.oh_map || 0) -
    (+dcResponse?.rq_map || 0) -
    (+dcResponse?.au_map || 0);

  let l_netAvailableEachesInventory =
    (+dcResponseEaches?.po_eaches_map || 0) +
    (+dcResponseEaches?.oh_eaches_map || 0) -
    (+dcResponseEaches?.rq_map_eaches || 0) -
    (+dcResponseEaches?.au_eaches_map || 0);
    
  let l_allocatedUnits = +dcResponse?.au_map || 0;
  let l_totalInventory = +dcResponse?.po_map || 0 + +dcResponse?.oh_map || 0;
  let l_totalInventoryEaches = +dcResponseEaches?.po_eaches_map || 0 + +dcResponseEaches?.oh_eaches_map || 0;
  let l_reserveQuantity =
    +dcResponse?.rq_map_no_purge || +dcResponse?.rq_map || 0;

  let l_reserveQuantityEaches =
    +dcResponseEaches?.rq_map_eaches_no_purge || +dcResponseEaches?.rq_map_eaches || 0;

  let l_reserveQuantityPacks =  p_req?.data?.rq_packs_no_purge || p_req?.data?.rq_packs || 0;

  let allSizesSelected = p_req?.data?.pack_configuration ? checkSizes(p_req?.data?.pack_configuration, p_req?.size) : [];

  if (p_req?.type === "userReserve") {
    return {
      allocated_units: 0,
      oh: l_reserveQuantity,
      net_available_inventory: l_reserveQuantity,
      net_available_eaches: l_reserveQuantityEaches,
      net_available_packs: Math.max(0, p_req?.data?.rq_packs_no_purge),
      reserve_quantity: 0,
      final_tot_inventory: l_reserveQuantity,
      user_def_inv_perc: 100,
      reserve_quantity_eaches: 0,
      rq_packs_no_purge: 0,
    };
  }
  return {
    allocated_units: l_allocatedUnits,
    oh: allSizesSelected ? l_totalInventory : l_totalInventoryEaches,
    net_available_inventory: allSizesSelected ? Math.max(0, l_netAvailableInventory) : Math.max(0, l_netAvailableEachesInventory),
    net_available_eaches: Math.max(0, l_netAvailableEachesInventory),
    net_available_packs: allSizesSelected ? Math.max(0, dcResponsePacks?.oh_packs_map - dcResponsePacks?.rq_map_packs - (dcResponsePacks?.au_packs_map || null)): 0,
    reserve_quantity_eaches: l_reserveQuantityEaches,
    rq_packs_no_purge: l_reserveQuantityPacks,
    reserve_quantity: l_reserveQuantity, 
    ...(isPO
    ? { final_tot_inventory: Math.max(0, l_netAvailableInventory)} :
    {}
    ),
  };
};

export const getInventorySourceOptions = (p_row, p_po, p_columns) => {
  try {
    let l_column = p_columns.current?.filter(
      (val) => val.accessor === "inventory_source"
    )[0];
    if (p_po) return l_column?.extra?.["po"]?.options;
    if (p_row?.rq_map) {
      return [
        ...l_column?.extra?.["dc"]?.options,
        ...l_column?.extra?.["reserve"]?.options,
      ];
    }
    return l_column?.extra?.["dc"]?.options;
  } catch (err) {
    console.log(err, "");
  }
};

export const mutateStoreGroupCode = (
  p_articleData,
  p_defaultStoreGroupCode,
  p_po,
  p_columns,
  p_type,
  isPO
) => {
  const l_mutatedData = p_articleData.map((row) => {
    return {
      ...row,
      store_groups: getUpdatedGroupCode(
        row["store_groups"],
        p_defaultStoreGroupCode,
        row["channel"],
        row["store_groups_options"]
      ),
      store_groups_options: getUpdatedGroupCode(
        row["store_groups_options"],
        p_defaultStoreGroupCode,
        row["channel"]
      ),
      // inventory_source_options: getInventorySourceOptions(row, p_po, p_columns),
      ...mutateInventoryCalculations({
        size: row.sizes?.map((val) => val.value),
        dc_code: row.dcs?.map((val) => val.value),
        data: row,
        type: p_type,
      }, isPO),
    };
  });
  return l_mutatedData;
};

export const getUpdatedRows = (
  p_responseData,
  p_updatedRows,
  p_storeGroupStoreMap,
  p_selectedStoreFilter
) => {
  let l_updatedResponseData = [];
  p_responseData.forEach((row, ind) => {
    let l_rowData = p_updatedRows?.[row.article]
      ? {
          ...p_updatedRows[row.article],
          is_selected: row.is_selected,
        }
      : {
          ...row,
          max: row.net_available_inventory,
          intersected_stores: includesCommonStores(
            p_storeGroupStoreMap,
            row.store_groups,
            row.mapped_stores,
            p_selectedStoreFilter
          ),
          mapped_stores_count: includesCommonStores(
            p_storeGroupStoreMap,
            row.store_groups,
            row.mapped_stores,
            p_selectedStoreFilter
          ).length,
        };
    l_updatedResponseData[ind] = l_rowData;
  });
  return l_updatedResponseData;
};

export const addMinMaxforUserDefinedInv = (
  p_responseData,
  p_storeGroupStoreMap,
  p_selectedStoreFilter
) => {
  let l_updatedResponseData = [];
  p_responseData.forEach((row, ind) => {
    let l_rowData = {
      ...row,
      mapped_stores_count: includesCommonStores(
        p_storeGroupStoreMap,
        row.store_groups,
        row.mapped_stores,
        p_selectedStoreFilter
      ).length,
      max: row.net_available_inventory,
      intersected_stores: includesCommonStores(
        p_storeGroupStoreMap,
        row.store_groups,
        row.mapped_stores,
        p_selectedStoreFilter
      ),
    };
    l_updatedResponseData[ind] = l_rowData;
  });
  return l_updatedResponseData;
};

export const onlySpaces = (p_str) => {
  return /^\s*$/.test(p_str);
};

export const getValuesFromObject = (p_array, p_mapping) => {
  let l_object = {};
  for (let key in p_mapping) {
    l_object[p_mapping[key]] = p_array?.map((val) => val[key]);
  }
  return l_object;
};

const getValue = (p_cellData, p_dataType) => {
  let l_cellData =
    (Array.isArray(p_cellData)
      ? p_cellData?.map((val) => val?.valueArray || val?.value)
      : p_cellData?.value) || p_cellData;
  if (p_dataType === "string") {
    l_cellData = Array.isArray(l_cellData) ? l_cellData[0] : l_cellData;
  }
  return l_cellData;
};

export const roundZeroDecimal = (value) => +value.toFixed();

export const getRequestForStoreAndDC = (
  p_dispalyedRows,
  p_selectedStores,
  p_channel,
  p_poCode,
  p_expeditedFlow = false,
  p_planName
) => {
  let l_storeRequest = {};
  p_dispalyedRows.forEach((row) => {
    l_storeRequest[row?.article] = {
      Product_Profile_Code: getValue(row?.product_profiles, "string"),
      Product_Code: row?.article,
      Store_Group_Code: getValue(row?.store_groups).flat(),
      Size_List: getValue(row?.sizes),
      Demand_Type: getValue(row?.demand_type, "string"),
      Inventory_Source: [getValue(row?.inventory_source, "string")],
      Original_Total_Inventory: row?.net_available_inventory,
      Planned_APS: row?.aps,
      Planned_WOS: row?.wos,
      User_Defined_Inventory: onlySpaces(row?.final_tot_inventory)
        ? null
        : row?.final_tot_inventory,
      hasEdited: row?.final_tot_inventory ? true : false,
      ...(!p_poCode && { DC_Codes: getValue(row?.dcs) }),
      User_Selected_Stores: !isEmpty(p_selectedStores)
        ? p_selectedStores
        : null,
      mapped_stores: row?.intersected_stores,
      sub_sku: getValue(row?.child_skus, "string"),
      po_ids: p_poCode ? p_poCode : p_poCode,
      source: p_poCode ? "po" : "",
      product_channel: row?.product_channel_name || p_channel?.[0],
      isWosEdited: row?.isWosEdited || false,
      ...(p_expeditedFlow && { Allocation_Name: null, Modified_Flag: false }),
      ...(p_planName && { Allocation_Name: p_planName }),
    };
  });

  let l_dcRequest = {};
  p_dispalyedRows.forEach((row) => {
    l_dcRequest[row?.article] = {
      Size_List: getValue(row?.sizes, "sizes"),
      Product_Code: row?.article,
      Inventory_Source: getValue(row?.inventory_source, "inventory_source"),
      ...(!p_poCode && { DC_Codes: getValue(row?.dcs, "dcs") }),
      ...(!p_poCode && { sub_sku: getValue(row?.child_skus, "string") }),
      channel: p_channel,
      product_channel: row?.product_channel_name || p_channel?.[0],
      po_ids: p_poCode ? p_poCode : p_poCode,
      source: p_poCode ? "po" : "",
      selectedInvSourceActual: p_poCode ? ["po"] : null,
    };
  });

  return {
    l_storeRequest,
    l_dcRequest,
  };
};

export const getPollingRequest = (
  p_articleTableGridInstance,
  p_articleAgGridParams
) => {
  let l_dispalyedRows = getSelectedRowsForInfiniteRowModel(
    p_articleTableGridInstance.current,
    true
  )
    ?.filter((val) => val.displayed)
    ?.map((val) => val.data);
  let l_hiddenRowsMap = cloneDeep(
    p_articleTableGridInstance?.current?.api?.reConciledSelectedRowIds
  );
  let keysToDelete = l_dispalyedRows?.map((val) => val?.article);
  keysToDelete.forEach((key) => {
    l_hiddenRowsMap.delete(key);
  });

  let l_hiddenRows = Array.from(l_hiddenRowsMap.values());

  l_hiddenRows.push(
    ...(p_articleAgGridParams?.hiddenRows || []),
    ...(p_articleAgGridParams?.displayedRows || [])
  );
  let checkConfig = [
    ...p_articleTableGridInstance.current?.api?.checkConfiguration,
  ];
  let checked = checkConfig?.filter((val) => val.checkAll);
  let unchecked = checkConfig?.filter((val) => val.unCheckAll);
  for (let i = 0; i < checked.length; i++) {
    for (let j = 0; j < unchecked.length; j++) {
      if (
        isEqual(checked[i].searchColumns, unchecked[j].searchColumns) &&
        !checked[i]["ignore"] &&
        !unchecked[j]["ignore"]
      ) {
        checked[i]["ignore"] = true;
        unchecked[j]["ignore"] = true;
      }
    }
  }
  let l_pollingReq = checked?.filter((val) => !val.ignore);
  if (!isEmpty(l_hiddenRows)) {
    l_pollingReq.push({
      hiddenCheckedRows: true,
      articles: l_hiddenRows.map((val) => val.article),
      hiddenRows: l_hiddenRows,
    });
  }
  return {
    l_dispalyedRows,
    l_pollingReq,
  };
};

export const getNoofStores = (
  p_storeGroupCode,
  p_mappedStores,
  p_storeGroupStoreMap
) => {
  let l_storeGroupStoreMap = { ...p_storeGroupStoreMap };
  if (p_storeGroupCode.includes(-1)) {
    return p_mappedStores;
  }
  let l_noOfStores = [];

  for (let i in l_storeGroupStoreMap) {
    if (p_storeGroupCode.includes(Number(i))) {
      l_noOfStores.push(l_storeGroupStoreMap[i]);
    }
  }
  // flat method used with infinity as param as l_noOfStores can be nested array with n levels, we require flat array to get exact length of the array hence using infinity as param
  l_noOfStores = [...new Set(l_noOfStores.flat(Infinity))];
  return l_noOfStores;
};

export const includesCommonStores = (
  p_storeGroupStoreMapping,
  p_storeGroups,
  p_mappedStores,
  l_filterStores
) => {
  let l_selectedStores = getNoofStores(
    p_storeGroups?.map((val) => val.valueArray || val.value)?.flat(),
    p_mappedStores,
    p_storeGroupStoreMapping
  );
  // (stores from filters) union (stores from store group intersection mapped stores)
  // let l_intersectionStores = intersection(l_selectedStores, p_mappedStores);
  // let l_unionFilterStoreGroupStores = union(
  //   l_intersectionStores,
  //   l_filterStores
  // );
  // return l_unionFilterStoreGroupStores;

  // (stores from filters union mapped stores) intersection (stores from store group)
  let l_unionFilterStoreGroupStores = union(p_mappedStores, l_filterStores);
  let l_intersectionStores = intersection(
    l_selectedStores,
    l_unionFilterStoreGroupStores
  );
  return l_intersectionStores;
};

const checkValidationForArticlesKey = (
  p_articleData,
  p_uniqueColumn,
  p_key,
  p_type,
  p_storeGroupStoreMapping,
  p_filterStores
) => {
  let l_articlesWithValidationError = [];
  let l_invSources = { onhand: 0, reserve: 0 };
  p_articleData.forEach((article) => {
    switch (p_type) {
      case "isEmpty":
        if (isEmpty(article?.[p_key])) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        }
        break;
      case "equalToZero":
        if (+article?.[p_key] === 0) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        }
        break;
      case "lteToZero":
        if (+article?.[p_key] <= 0) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        }
        break;
      case "isNull":
        if (article?.[p_key] === null) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        }
        break;
      case "custom":
        if (
          p_key === "demand_type" &&
          (article?.[p_key] === "Fixed" ||
            article?.[p_key]?.[0]?.value === "Fixed") &&
          !Number(article.final_tot_inventory)
        ) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        } else if (
          p_key === "mapped_stores" &&
          !includesCommonStores(
            p_storeGroupStoreMapping,
            article?.["store_groups"],
            article?.[p_key],
            p_filterStores
          ).length
        ) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        } else if (p_key === "reserve_quantity") {
          if (
            +article?.[p_key] > 0 &&
            +article?.["net_available_inventory"] <= 0
          ) {
            l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
          }
        } else if (p_key === "inventory_source") {
          let l_invSource = article?.[p_key]?.[0]?.value;

          l_invSources[l_invSource] = (+l_invSource || 0) + 1;
          let areAllNonZero = Object.values(l_invSources).every(
            (value) => value !== 0
          );
          areAllNonZero
            ? l_articlesWithValidationError?.push(l_invSources)
            : [];
        }
        break;
      default:
        break;
    }
  });
  return l_articlesWithValidationError;
};

export const checkValidationForArticles = (
  p_articleData,
  p_uniqueColumn,
  p_storeGroupStoreMapping,
  p_filterStores,
  p_ignoreAlert,
  p_isPolledResult = false, 
  p_isPO = false
) => {
  let l_dispalyedRows = [];

  if (p_isPolledResult) {
    l_dispalyedRows = p_articleData;
  } else {
    l_dispalyedRows = getSelectedRowsForInfiniteRowModel(
      p_articleData?.current,
      true
    )
      ?.filter((val) => val.displayed)
      ?.map((val) => val.data);
  }

  let l_validationKeysTypeMapping = {
    reserve_quantity: "custom",
    net_available_inventory: "lteToZero",
    product_profiles: "isEmpty",
    store_groups: "isEmpty",
    wos: "lteToZero",
    dcs: "isEmpty",
    demand_type: "custom",
    mapped_stores: "custom",
    aps: "isNull",
  };

  // Ignoring the following validations for PO
  if (p_isPO) {
    delete l_validationKeysTypeMapping.reserve_quantity;
    delete l_validationKeysTypeMapping.dcs;
    delete l_validationKeysTypeMapping.demand_type;
  }

  let l_validationKeysErrorMessageMapping = {
    reserve_quantity:
      store.getState()?.inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.["validationMessage"]?.[
        "reserve_quantity"
      ] ||
      `${dynamicLabelsBasedOnTenant(
        "net_available_inventory"
      )} of above ${dynamicLabelsBasedOnTenant(
        "article"
      )}(s) less than or equal to zero due to user reserve, Please reduce user reserve quantity in next step before creating allocation.`,
    net_available_inventory: `${dynamicLabelsBasedOnTenant(
      "net_available_inventory"
    )} of above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) less than or equal to zero .`,
    product_profiles: `${dynamicLabelsBasedOnTenant(
      "article"
    )} Profile of above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) is not Mapped.`,
    wos: `${dynamicLabelsBasedOnTenant(
      "wos"
    )} of above ${dynamicLabelsBasedOnTenant("article")}(s) is less than or equal to Zero.`,
    store_groups: `Store Eligibility  ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) is not Mapped.`,
    dcs: `DC of above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) is not Mapped.`,
    demand_type: `Please Enter ${dynamicLabelsBasedOnTenant(
      "user_def_inv_perc"
    )} for above ${dynamicLabelsBasedOnTenant("article")}(s) .`,
    mapped_stores: `None of the stores are mapped for above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) with respect to selected store eligibility groups`,
    aps: `Please Enter Planned APS for above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) .`,
    inventory_source: `Please make sure all ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) are of same Inventory Source.`,
  };

  let l_validationErrorMessage = "",
    l_articlesWithValidationError = [];

  for (const [key, value] of Object.entries(l_validationKeysTypeMapping)) {
    if (
      (key === "reserve_quantity" || key === "net_available_inventory") &&
      p_ignoreAlert
    )
      continue;
    l_articlesWithValidationError = checkValidationForArticlesKey(
      l_dispalyedRows,
      p_uniqueColumn,
      key,
      value,
      p_storeGroupStoreMapping,
      p_filterStores
    );
    if (!isEmpty(l_articlesWithValidationError)) {
      l_validationErrorMessage = `${l_validationKeysErrorMessageMapping[key]}`;
      break;
    }
  }
  return {
    validationErrorMessage: l_validationErrorMessage,
    articlesWithValidationError:
      typeof l_articlesWithValidationError[0] === "object"
        ? [""]
        : l_articlesWithValidationError,
  };
};

// finalize

export const shouldDisplayDownloadButton = (
  p_buttonConfig,
  p_downloadPlanData
) => {
  return !isEmpty(p_downloadPlanData) && !isEmpty(p_buttonConfig);
};

export const shouldDisplayFinalizeButtons = (
  p_planStatus,
  p_planType,
  p_flowType
) => {
  if (p_flowType === "viewAllocation") return true;
  if (p_planType && p_planType === "Auto Allocation") {
    return false;
  }
  return PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON.includes(p_planStatus);
};

export const shouldDisplaySelectComponent = (
  p_finalized,
  p_planStatus,
  p_planType,
  p_flowType
) =>
  p_finalized ||
  shouldDisplayFinalizeButtons(p_planStatus, p_planType, p_flowType) ||
  p_planStatus === "Finalized";

export const shouldDisplayGridBulkEditButtons = (
  p_planStatus,
  p_planType,
  p_finalizeButtonType
) => {
  if (p_finalizeButtonType === "triageButton") {
    if (PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON.includes(p_planStatus)) {
      return true;
    }
    return false;
  } else if (p_finalizeButtonType === "finalizeButton") {
    if (
      (p_planType && p_planType === "Auto Allocation") ||
      !PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON.includes(p_planStatus)
    ) {
      return false;
    } else if (PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON.includes(p_planStatus)) {
      return true;
    }
    return true;
  } else {
    return true;
  }
};

export const getIgnoreAllocationCode = (p_originalAllocationCode) =>
  p_originalAllocationCode ? p_originalAllocationCode : "";

/**
 * Formats the columns based on the provided keyParam and columnsToBeEdited.
 * @param {Array} columns - The array of column configurations.
 * @param {string} keyParam - The key parameter to be modified in the column configurations.
 * @param {Array} columnsToBeEdited - The array of column names to be disabled or removed.
 * @returns {Array} - The modified array of column configurations.
 */
export const formatColumnsForPO = (columns, keyParam, columnsToBeEdited) => {
  if (keyParam === "delete") {
    // Remove the columns that are present in the columnsToBeEdited array
    return columns?.filter(
      (columnConfig) => !columnsToBeEdited.includes(columnConfig.column_name)
    );
  }

  if (keyParam === "add") {
    // Remove the columns that are present in the columnsToBeEdited array
    columns?.push(columnsToBeEdited);
    return columns;
  }

  // Modify the keyParam value for the columns that are present in the columnsToBeEdited array
  return columns?.map((columnConfig) =>
    columnsToBeEdited.includes(columnConfig.column_name)
      ? {
          ...columnConfig,
          [keyParam]: keyParam === "disabled" ? true : false,
        }
      : columnConfig
  );
}