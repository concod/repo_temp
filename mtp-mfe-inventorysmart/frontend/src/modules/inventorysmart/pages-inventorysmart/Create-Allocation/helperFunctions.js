import { cloneDeep, intersection, isEmpty, isEqual, union } from "lodash";
import { PLAN_STATUS_TO_HIDE_FINALIZE_BUTTON } from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { dynamicLabelsBasedOnTenant } from "core/Utils/DynamicLabels";
import store from "store";
import { getSelectedRowsForInfiniteRowModel } from "core/Utils/agGrid/table-functions";
import { resolveProductProfile } from "./productProfilePayload";

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

// Derive the finalise "week" token from the clicked Action column.
export const getWeekFromActionCell = (cellProps) => {
  const clickedColDef =
    cellProps?.colDef || cellProps?.column?.getColDef?.() || {};
  const actionColId =
    clickedColDef?.column_name ||
    clickedColDef?.field ||
    cellProps?.colId ||
    cellProps?.column?.getColId?.() ||
    "";
  return actionColId.replace(/^action_/, "");
};

// Recursively collect every leaf week-level Action column (named
// `action_<week>`) from a (possibly nested) column definition tree.
const collectWeekActionColumns = (columns = [], collected = []) => {
  columns.forEach((column) => {
    if (!isEmpty(column?.children)) {
      collectWeekActionColumns(column.children, collected);
      return;
    }
    if (
      typeof column?.column_name === "string" &&
      column.column_name.startsWith("action_")
    ) {
      collected.push(column);
    }
  });
  return collected;
};

// Recursively wrap the cellRenderer of every week-level Action column so a
// "Finalised" label is shown (instead of the Finalise button) when that
// specific week is already finalised. Finalise state is tracked per week via
// `is_finalized_<week>` flags (e.g. is_finalized_we_2026_08_08), and the Action
// columns are nested sub-headers named `action_<week>`.
//
// Additionally, drop-date weeks must be finalised sequentially: a week's
// Finalise button stays disabled for a given row until the immediately
// preceding week has been finalised for that same row. Weeks follow the
// `we_YYYY_MM_DD` token format, so a lexicographic sort yields chronological
// order.
export const applyWeekLevelFinalisedRenderer = (columns = []) => {
  const actionColumns = collectWeekActionColumns(columns);

  // Chronological order of the weeks present in this table.
  const orderedWeeks = actionColumns
    .map((column) => column.column_name.replace(/^action_/, ""))
    .sort();

  actionColumns.forEach((column) => {
    const week = column.column_name.replace(/^action_/, "");
    const finalizedKey = `is_finalized_${week}`;
    const weekIndex = orderedWeeks.indexOf(week);
    // The week that must be finalised before this one becomes actionable.
    const previousWeek = weekIndex > 0 ? orderedWeeks[weekIndex - 1] : null;
    const previousFinalizedKey = previousWeek
      ? `is_finalized_${previousWeek}`
      : null;

    // Disable the Finalise button (honoured by ReviewButtonCell) until the
    // preceding week is finalised for the same row.
    const previousDisabled = column.disabled;
    column.disabled = (rowData, columnName) => {
      if (
        typeof previousDisabled === "function" &&
        previousDisabled(rowData, columnName)
      ) {
        return true;
      }
      if (previousFinalizedKey && !rowData?.[previousFinalizedKey]) {
        return true;
      }
      return false;
    };

    const originalCellRenderer = column.cellRenderer;
    column.cellRenderer = (params) => {
      if (params.data?.[finalizedKey]) {
        return "Finalised";
      }
      return typeof originalCellRenderer === "function"
        ? originalCellRenderer(params)
        : null;
    };
  });
  return columns;
};

// Build { date_range: { start_date, end_date } } payload field when both dates
// are present. Used by the allocation preview flow (also rendered inside View
// Past Allocations preview mode) to forward the custom range-picker dates to
// every API call.
export const getDateRangePayload = (startEndDate) => {
  if (startEndDate?.start_date && startEndDate?.end_date) {
    return {
      date_range: {
        start_date: startEndDate.start_date,
        end_date: startEndDate.end_date,
      },
    };
  }
  return {};
};

export const COLUMNS_TO_BE_DISABLED_BASED_ON_DEMANDTYPE = [
  "user_def_inv_perc",
  "user_def_inv",
];

export const getUpdatedColumnConfig = (
  p_columnConfig,
  isPO,
  p_type,
  asnCode
) => {
  if (isPO) {
    p_columnConfig = p_columnConfig?.map((columnConfig) =>
      columnConfig.column_name === "inventory_source" &&
      !columnConfig.extra?.options_column
        ? {
            ...columnConfig,
            extra: {
              ...(columnConfig.extra?.["po"] || columnConfig.extra),
              includeInSetAll: columnConfig.extra?.includeInSetAll,
            },
          }
        : columnConfig
    );
    const l_columnConfig = cloneDeep(p_columnConfig);
    const itemToBeRemoved = { column_name: "dcs" };
    const findIndex = l_columnConfig.findIndex(
      (column) => column.column_name === itemToBeRemoved.column_name
    );
    findIndex !== -1 && l_columnConfig.splice(findIndex, 1);

    return l_columnConfig;
  }
  if (asnCode) {
    p_columnConfig = p_columnConfig?.map((columnConfig) =>
      columnConfig.column_name === "inventory_source" &&
      !columnConfig.extra?.options_column
        ? {
            ...columnConfig,
            extra: {
              ...(columnConfig.extra?.["asn"] || columnConfig.extra),
              includeInSetAll: columnConfig.extra?.includeInSetAll,
            },
          }
        : columnConfig
    );

    return p_columnConfig;
  }
  if (p_type === "pdq") {
    p_columnConfig = p_columnConfig?.map((columnConfig) =>
      columnConfig.column_name === "inventory_source" &&
      !columnConfig.extra?.options_column
        ? {
            ...columnConfig,
            extra: {
              ...(columnConfig.extra?.["pdq"] || columnConfig.extra),
              includeInSetAll: columnConfig.extra?.includeInSetAll,
            },
          }
        : columnConfig
    );

    return p_columnConfig;
  }
  p_columnConfig = p_columnConfig?.map((columnConfig) =>
    columnConfig.column_name === "inventory_source" &&
    !columnConfig.extra?.options_column
      ? {
          ...columnConfig,
          extra: {
            ...(columnConfig.extra?.[
              p_type === "userReserve" ? "reserve" : "dc"
            ] || columnConfig.extra),
            includeInSetAll: columnConfig.extra?.includeInSetAll,
          },
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

export const getInvComponent = (p_req) => {
  let l_selectedChildSku = p_req?.data?.child_skus?.[0]?.value;
  let invCompList = [
    "oh_oo_map",
    "oh_map",
    "rq_map",
    "au_map",
    "po_map",
    "beginning_available_to_allocate_eaches_oh_map",
    "beginning_available_to_allocate_eaches_oh_oo_map",
    "beginning_available_to_allocate_packs_oh_map",
    "beginning_available_to_allocate_packs_oh_oo_map",
    "ctat_map",
    "ctat_oh_map",
    "ctat_oh_oo_map",
    "it_map",
    "oh_it_map",
    "ctat_it_map",
    "ctat_oh_it_map"
  ];
  const finalMapping = {};
  while (invCompList.length) {
    let invComp = invCompList[invCompList.length - 1];
    let articleSizStoreMapping = Object.fromEntries?.(
      Object.entries?.(p_req.data?.[invComp] || {})?.filter(([key, _value]) =>
        p_req?.size?.includes(key)
      )
    );

    // Check if articleSizStoreMapping is empty
    if (Object.keys(articleSizStoreMapping).length === 0) {
      finalMapping[invComp] = undefined;
    } else {
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
    }
    invCompList.pop();
  }
  return finalMapping;
};

const getSEGOptions = (p_storeGroupCode, p_channel) => {
  if ([p_channel[0] === "NC"]) {
    return 0;
  } else {
    return p_channel?.map((channel) => {
      return p_storeGroupCode[channel];
    });
  }
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
      ? {
          ...obj,
          value: 0,
          valueArray: getSEGOptions(p_storeGroupCode, p_channel),
        }
      : obj;
  });
};

export const mutateInventoryCalculations = (p_req) => {
  const dcResponse = getInvComponent(p_req);
  const baseObject = {
    allocated_units: dcResponse?.au_map ?? p_req?.data?.allocated_units ?? 0,
    oh: dcResponse?.oh_map ?? p_req?.data?.oh ?? 0,
    oh_oo: dcResponse?.oh_oo_map ?? p_req?.data?.oh_oo ?? 0,
    reserve_quantity: dcResponse?.rq_map ?? p_req?.data?.reserve_quantity ?? 0,
    it: dcResponse?.it_map ?? p_req?.data?.it ?? 0,
    oh_it: dcResponse?.oh_it_map ?? p_req?.data?.oh_it ?? 0,
    net_available_inventory:
      dcResponse?.ctat_map ?? p_req?.data?.net_available_inventory ?? null,
    net_available_inventory_oh:
      dcResponse?.ctat_oh_map ?? p_req?.data?.net_available_inventory_oh ?? null,
    net_available_inventory_oh_oo:
      dcResponse?.ctat_oh_oo_map ??
      p_req?.data?.net_available_inventory_oh_oo ??
      null,
    net_available_inventory_it:
      dcResponse?.ctat_it_map ?? p_req?.data?.net_available_inventory_it ?? null,
    net_available_inventory_oh_it:
      dcResponse?.ctat_oh_it_map ?? p_req?.data?.net_available_inventory_oh_it ?? null,
    beginning_available_to_allocate_packs_oh_oo:
      dcResponse?.beginning_available_to_allocate_packs_oh_oo_map ??
      p_req?.data?.beginning_available_to_allocate_packs_oh_oo ??
      0,
    beginning_available_to_allocate_packs_oh:
      dcResponse?.beginning_available_to_allocate_packs_oh_map ??
      p_req?.data?.beginning_available_to_allocate_packs_oh ??
      0,
    beginning_available_to_allocate_eaches_oh:
      dcResponse?.beginning_available_to_allocate_eaches_oh_map ??
      p_req?.data?.beginning_available_to_allocate_eaches_oh ??
      0,
    beginning_available_to_allocate_eaches_oh_oo:
      dcResponse?.beginning_available_to_allocate_eaches_oh_oo_map ??
      p_req?.data?.beginning_available_to_allocate_eaches_oh_oo ??
      0,
  };
  return baseObject;
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
  p_type
) => {
  const l_mutatedData = p_articleData?.map((row) => {
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
      }),
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
          // mapped_stores_count: includesCommonStores(
          //   p_storeGroupStoreMap,
          //   row.store_groups,
          //   row.mapped_stores,
          //   p_selectedStoreFilter
          // ).length,
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
      // mapped_stores_count: includesCommonStores(
      //   p_storeGroupStoreMap,
      //   row.store_groups,
      //   row.mapped_stores,
      //   p_selectedStoreFilter
      // ).length,
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
    l_object[p_mapping[key]] = p_array?.map((val) => {
      if (
        ["APS_ROS", "original_forecast", "lt_forecast"].indexOf(key) > -1 &&
        !val[key]
      ) {
        val[key] = 0;
      }
      if (["isWosEdited"].indexOf(key) > -1 && !val[key]) {
        val[key] = false;
      }

      return val[key];
    });
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

export function getAvailableInventory(rowData) {
  if (
    rowData?.["inventory_source"] === "oh_oo" ||
    rowData?.inventory_source?.[0]?.value === "oh_oo"
  ) {
    return rowData?.["net_available_inventory_oh_oo"];
  } else if (
    (rowData?.["inventory_source"] === "on_hand" ||
      rowData?.inventory_source?.[0]?.value === "on_hand" ||
      rowData?.["inventory_source"] === "po" ||
      rowData?.inventory_source?.[0]?.value === "po" ||
      rowData?.["inventory_source"] === "pdq" ||
      rowData?.inventory_source?.[0]?.value === "pdq") &&
    rowData?.["net_available_inventory_oh"] !== undefined &&
    rowData?.["net_available_inventory_oh"] !== null
  ) {
    return rowData?.["net_available_inventory_oh"];
  } else if (
    rowData?.["inventory_source"] === "it" ||
    rowData?.inventory_source?.[0]?.value === "it"
  ) {
    return rowData?.["net_available_inventory_it"];
  } else if (
    rowData?.["inventory_source"] === "oh_it" ||
    rowData?.inventory_source?.[0]?.value === "oh_it"
  ) {
    return rowData?.["net_available_inventory_oh_it"];
  }
  else {
    return rowData?.["net_available_inventory"];
  }
}
//helper to fetch config entry from tam-111
export const getEffectiveChannelKey = (
  createAllocationConfig,
  screenChannelKey
) => {
  const { enableProductChannelMapping, productChannelHierarchyLevel } =
    createAllocationConfig || {};
  if (enableProductChannelMapping && productChannelHierarchyLevel) {
    return productChannelHierarchyLevel;
  }
  return screenChannelKey || "channel";
};

export const getRequestForStoreAndDC = (
  p_dispalyedRows,
  p_selectedStores,
  p_channel,
  p_poCode,
  p_expeditedFlow = false,
  isDOSAvailable = false,
  s1_name,
  p_planName,
  l0_name,
  psa_name_list,
  articleKey,
  isStoreBand,  
  l1_name = null
) => {
  let l_storeRequest = {};
  let key = articleKey ? articleKey : "article";
  p_dispalyedRows.forEach((row) => {
    if (!row?.[key]) {
      key = "article";
    }
    l_storeRequest[row?.[key]] = {
      ...resolveProductProfile(row?.product_profiles),
      article_data: row?.[key],
      product_code: row?.article,
      store_group_code: getValue(row?.store_groups).flat(),
      size_list: getValue(row?.sizes),
      demand_type: getValue(row?.demand_type, "string"),
      inventory_source: [getValue(row?.inventory_source, "string")],
      original_total_inventory: getAvailableInventory(row),
      planned_aps: row?.aps || 0,
      planned_wos: isDOSAvailable ? (row?.wos / 7).toFixed(3) : row?.wos || 0,
      user_defined_inventory: onlySpaces(row?.final_tot_inventory)
        ? null
        : row?.final_tot_inventory,
      has_edited: row?.final_tot_inventory ? true : false,
      ...(!p_poCode && { dc_codes: getValue(row?.dcs) }),
      user_selected_stores: !isEmpty(p_selectedStores)
        ? p_selectedStores
        : null,
      // mapped_stores: row?.mapped_stores, // will revert this change
      mapped_stores: row?.intersected_stores || row?.mapped_stores, // will revert this change
      alloc_type: row.alloc_type ? row.alloc_type : "default",
      sub_sku: getValue(row?.child_skus, "string"),
      po_ids: p_poCode ? p_poCode : p_poCode,
      asn_ids: row?.asn_id ? row?.asn_id[0] : row?.asn_id,
      source: p_poCode ? "po" : "",
      product_channel: row?.channel || p_channel?.[0],
      l0_name: l0_name?.[0],
      psa_name_list: psa_name_list,
      is_wos_edited: row?.isWosEdited || false,
      ...(p_expeditedFlow && { Allocation_Name: null, Modified_Flag: false }),
      ...(p_planName && { Allocation_Name: p_planName }),
      s1_name: s1_name?.values?.length ? s1_name.values[0] : "",
      ...(Array.isArray(l1_name) && l1_name.length > 0 && l1_name[0]
        ? { l1_name: l1_name[0] }
        : {}),
    };
    if (isStoreBand) {
      l_storeRequest[row?.[key]].l4_name = row.l4_name;
    }
    //commented as this is handled in getOriginalTotalInventory function
    // if (p_poCode) {
    //   l_storeRequest[row?.[key]].original_total_inventory = row?.oh_oo
    //     ? row?.oh_oo
    //     : row?.net_available_inventory;
    // }

    if ((row?.min_stock || row?.min_stock === 0) && row.isMinEdited) {
      l_storeRequest[row?.[key]].setall_min_stock = row.min_stock;
    }
    if ((row?.max_stock || row?.max_stock === 0) && row.isMaxEdited) {
      l_storeRequest[row?.[key]].setall_max_stock = row.max_stock;
    }
    if (!isStoreBand && row.allocation_strategy) {
      l_storeRequest[row?.[key]].prioritization_strategy = getValue(
        row?.prioritization_strategy,
        "string"
      );
      l_storeRequest[row?.[key]].allocation_strategy = getValue(
        row?.allocation_strategy,
        "string"
      );
    }
    if (row?.vir_constraint) {
      l_storeRequest[row?.[key]].vir_constraint = getValue(
        row?.vir_constraint,
        "string"
      );
    }
  });

  let l_dcRequest = {};
  p_dispalyedRows.forEach((row) => {
    l_dcRequest[row?.[key]] = {
      Size_List: getValue(row?.sizes, "sizes"),
      article_data: row?.[key],
      Product_Code: row?.article,
      Inventory_Source: [getValue(row?.inventory_source, "string")],
      ...(!p_poCode && { dc_codes: getValue(row?.dcs, "dcs") }),
      ...(!p_poCode && { sub_sku: getValue(row?.child_skus, "string") }),
      channel: p_channel,
      product_channel: row?.product_channel_name || p_channel?.[0],
      asn_ids: row?.asn_id ? row?.asn_id[0] : row?.asn_id,
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

const hasExplicitZeroUserDefinedInventory = (article) =>
  (article?.user_def_inv_perc != null &&
    article?.user_def_inv_perc !== "" &&
    Number(article.user_def_inv_perc) === 0) ||
  (article?.user_def_inv != null &&
    article?.user_def_inv !== "" &&
    Number(article.user_def_inv) === 0);

const checkValidationForArticlesKey = (
  p_articleData,
  p_uniqueColumn,
  p_key,
  p_type,
  p_storeGroupStoreMapping,
  p_filterStores,
  p_allowZeroUserDefinedInventory = false
) => {
  let l_articlesWithValidationError = [];
  let l_invSources = { onhand: 0, reserve: 0 };
  p_articleData.forEach((article) => {
    let availableInventoryKey = p_key;
    const l_inventorySource = Array.isArray(article?.inventory_source)
      ? article?.inventory_source?.[0]?.value
      : article?.inventory_source;
    if ( l_inventorySource === "oh_oo") {
      availableInventoryKey = "net_available_inventory_oh_oo";
    }
    else if (l_inventorySource === "on_hand" || l_inventorySource === "po" || l_inventorySource === "pdq") {
      availableInventoryKey = "net_available_inventory_oh";
    }
    else if (l_inventorySource === "it") {
      availableInventoryKey = "net_available_inventory_it";
    }
    else if (l_inventorySource === "oh_it") {
      availableInventoryKey = "net_available_inventory_oh_it";
    }
    else {
      availableInventoryKey = "net_available_inventory";
    }
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
        if (+article?.[availableInventoryKey] <= 0) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        }
        break;
      case "isNull":
        if (article?.[p_key] === null) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        }
        break;
      case "aps":
        if (article?.["demand_type"] === "APS" && !Number(article.aps)) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        }
        break;
      case "custom":
        if (
          p_key === "demand_type" &&
          (article?.[p_key] === "Fixed" ||
            article?.[p_key]?.[0]?.value === "Fixed") &&
          !Number(article.final_tot_inventory) &&
          !(
            p_allowZeroUserDefinedInventory &&
            hasExplicitZeroUserDefinedInventory(article)
          )
        ) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        } else if (
          p_key === "mapped_stores" &&
          !article?.["mapped_stores_count"]
          // !includesCommonStores(
          //   p_storeGroupStoreMapping,
          //   article?.["store_groups"],
          //   article?.[p_key],
          //   p_filterStores
          // ).length
        ) {
          l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
        } else if (p_key === "reserve_quantity") {
          if (+article?.[p_key] > 0 && +article?.[availableInventoryKey] <= 0) {
            l_articlesWithValidationError.push(article?.[p_uniqueColumn]);
          }
        } else if (p_key === "inventory_source") {
          let l_invSource = article?.[p_key]?.[0]?.value;

          l_invSources[l_invSource] = (+l_invSource || 0) + 1;
          let areAllNonZero = Object.values(l_invSources).every(
            (value) => value !== 0
          );
          if (areAllNonZero) {
            l_articlesWithValidationError?.push(l_invSources);
          }
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
  isPO = false,
  p_allowZeroUserDefinedInventory = false,
  dynamicIaProfile
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

  const getAvailableInventoryKey = (article) => {
    const l_inventorySource = Array.isArray(article?.inventory_source)
      ? article?.inventory_source?.[0]?.value
      : article?.inventory_source;

    if (l_inventorySource === "oh_oo") {
      return "net_available_inventory_oh_oo";
    } else if (
      (l_inventorySource === "on_hand" ||
        l_inventorySource === "po" ||
        l_inventorySource === "pdq") &&
      article?.["net_available_inventory_oh"] !== undefined &&
      article?.["net_available_inventory_oh"] !== null
    ) {
      return "net_available_inventory_oh";
    } else if (l_inventorySource === "it") {
      return "net_available_inventory_it";
    } else if (l_inventorySource === "oh_it") {
      return "net_available_inventory_oh_it";
    }
    return "net_available_inventory";
  };

  let l_validationKeysTypeMapping = {
    reserve_quantity: "custom",
    net_available_inventory: "lteToZero",
    net_available_inventory_oh_oo: "lteToZero",
    net_available_inventory_oh: "lteToZero",
    net_available_inventory_it: "lteToZero",
    net_available_inventory_oh_it: "lteToZero",
    product_profiles: "isEmpty",
    store_groups: "isEmpty",
    // wos: "equalToZero", //WOS validation not required
    dcs: "isEmpty",
    demand_type: "custom",
    mapped_stores: "custom",
    aps: "aps",
  };
  if (isPO) {
    delete l_validationKeysTypeMapping.net_available_inventory;
  }
  if (dynamicIaProfile) {
    delete l_validationKeysTypeMapping.product_profiles;
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
    net_available_inventory_oh: `Net DC Available OH of above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) less than or equal to zero .`,
    net_available_inventory_oh_oo: `Net DC Available OH-OO of above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) less than or equal to zero .`,
    net_available_inventory_it: `Net DC Available IT of above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) less than or equal to zero .`,
    net_available_inventory_oh_it: `Net DC Available OH-IT of above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) less than or equal to zero .`,
    product_profiles: `${dynamicLabelsBasedOnTenant(
      "article"
    )} Profile of above ${dynamicLabelsBasedOnTenant(
      "article"
    )}(s) is not Mapped.`,
    wos: `${dynamicLabelsBasedOnTenant(
      "wos"
    )} of above ${dynamicLabelsBasedOnTenant("article")}(s) is Zero.`,
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
      (key === "reserve_quantity" ||
        key === "net_available_inventory" ||
        key === "net_available_inventory_oh" ||
        key === "net_available_inventory_oh_oo" ||
        key === "net_available_inventory_it" ||
        key === "net_available_inventory_oh_it") &&
      p_ignoreAlert
    )
      continue;

    // Filter rows so that only relevant articles are validated per net key
    let rowsForKey = l_dispalyedRows;
    if (
      key === "net_available_inventory" ||
      key === "net_available_inventory_oh" ||
      key === "net_available_inventory_oh_oo" ||
      key === "net_available_inventory_it" ||
      key === "net_available_inventory_oh_it"
    ) {
      rowsForKey = l_dispalyedRows?.filter(
        (article) => getAvailableInventoryKey(article) === key
      );
      if (!rowsForKey?.length) continue; // No rows to validate for this key
    }

    l_articlesWithValidationError = checkValidationForArticlesKey(
      rowsForKey,
      p_uniqueColumn,
      key,
      value,
      p_storeGroupStoreMapping,
      p_filterStores,
      p_allowZeroUserDefinedInventory
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

// Values posted as check-create-scenario `styles`. Default keeps the historical
// article prefix (split on "-") so existing tenants are unchanged. Set
// finalizeAllocationConfig.createScenarioStylesField to a row field (e.g.
// "article") when the pickle filter key is the full article, as for AllSaints.
export const getScenarioStyleIds = (rows = [], finalizeAllocationConfig) => {
  const field = finalizeAllocationConfig?.createScenarioStylesField;
  if (!field || field === "article_prefix") {
    return rows.map((item) => item.article?.split("-")[0]).filter(Boolean);
  }
  return rows.map((item) => item[field]).filter(Boolean);
};

export const updateVIRAndIOB = (rowData, selectedDcs) => {
  let updateVIRValue = 0;
  let updateIOBValue = 0;
  selectedDcs?.forEach((val) => {
    updateVIRValue += rowData?.vir_by_dc_map[val.value];
    updateIOBValue += rowData?.iob_by_dc_map[val.value];
  });
  rowData.vir_pdu_remaining = updateVIRValue;
  rowData.iob = updateIOBValue;
  return rowData;
};

export const extractAllocationCodeFromUrl = (urlString) => {
  if (!urlString || typeof urlString !== "string") return null;
  try {
    const pathAndSearch = urlString.includes("://")
      ? new URL(urlString).pathname + new URL(urlString).search
      : urlString;
    const qIndex = pathAndSearch.indexOf("?");
    const search = qIndex >= 0 ? pathAndSearch.slice(qIndex) : "";
    if (!search) return null;
    return new URLSearchParams(search).get("allocation_code");
  } catch {
    return null;
  }
};
