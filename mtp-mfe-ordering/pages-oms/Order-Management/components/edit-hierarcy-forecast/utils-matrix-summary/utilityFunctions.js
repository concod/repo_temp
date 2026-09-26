import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import { decimalsFormatter } from "core/Utils/formatter";
import {
  EXPECTED_ADA_FILTER_DIMENSIONS,
  FISCAL_KEY_MAPPING,
  LEVEL_0,
  LEVEL_1,
  LEVEL_2,
} from "modules/oms/constants-oms/adaConstants";
import {
  getProductData,
  setHistoricActuals,
  setCompareWithSelectedDate,
  setIsCompareWithDropdown,
  getChartData,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-dashboard-services";
import {
  setAllForecastMultiplierData,
  setForecastMultiplierData,
  setHistoricalActualData,
} from "modules/oms/services-oms/Order-Management/matrix-summary-services/ordering-marix-summary/matrix-summary-multiplier-services";
import {
  formatActualsData,
  mergeResponse,
  mergeHistoricDataHandler,
} from "./customHooks/useHostoricActuals";

export const DEFAULT_WEEK = {
  value: 1,
  label: "1 week",
};
export const forecastMultiplierTabNamelabelmapping = {
  IA: "Original",
  adjusted: "Adjusted",
  scenario1: "Scenario 1",
  scenario2: "Scenario 2",
  Comparison: "Adjusted",
};

export const configureAttributeOptions = (options) => {
  return options.map((item) => {
    return {
      value: item.attribute || item,
      label: item.attribute || item,
      id: item.attribute || item,
    };
  });
};

export const configureWeekAttributeOptions = (options) => {
  return options.map((item) => {
    return {
      value: item.start_week_id,
      label: item.start_week_id,
      id: item.start_week_id,
    };
  });
};

export const configureMonthAttributeOptions = (options) => {
  return options.map((item) => {
    return {
      value: item.fm_id,
      label: item.fm_id,
      id: item.fm_id,
    };
  });
};

export const filterByDimension = (filters, dimension) => {
  return filters.filter((filter) => filter.dimension === dimension);
};

export const configureYearOptions = (options) => {
  return options.map((item) => {
    return {
      value: item,
      label: item,
      id: item,
    };
  });
};

const getSKUConfig = (config) => {
  if (!config || !config.length)
    return { check_all: true, unchecked: [], codes: [] };
  const checkedRowsList = config.filter((rows) => rows?.checkedRows);
  const unCheckedRowsList = config.filter((rows) => rows?.unCheckedRows);
  const checkedRows =
    checkedRowsList && checkedRowsList?.length > 0
      ? checkedRowsList[checkedRowsList.length - 1].checkedRows
      : [];
  const unCheckedRows = unCheckedRowsList.length
    ? unCheckedRowsList[unCheckedRowsList.length - 1].unCheckedRows
    : [];
  const checklAll = config.find((elem) => elem.checkAll)?.checkAll || false;

  return {
    check_all: checklAll,
    codes: [...checkedRows],
    unchecked: [...unCheckedRows],
  };
};
export const graphSKUPayload = (
  data,
  promoValue = null,
  week,
  ia_default_flag = false,
  promoType = "promo_percentage",
  isEligible,
  config
) => {
  const product_hierarchy =
    data?.product?.reduce((acc, curr) => {
      if (curr.filter_id !== "product_code")
        acc[curr.filter_id] = curr.values.map(({ value }) => value);
      return acc;
    }, {}) || [];
  return {
    filters: {
      aggregation_level:
        data?.switchTimeLine?.value || data?.switchTimeLine[0]?.value,
      timeline: {
        // start_week_id: week || data?.fiscalDates?.start_fw,
        // end_week_id: week || data?.fiscalDates?.end_fw,

        start_week_id: data?.fiscalDates?.start_fw,
        end_week_id: data?.fiscalDates?.end_fw,
        future_start_week_id: data?.future?.start_fw,
        future_end_week_id: data?.future?.end_fw,
      },
      compare_timeline: data?.historicActuals,
      channel: data?.channel?.map(({ value }) => value) || [],
      product_hierarchy: {
        ...product_hierarchy,
        product_code: getSKUConfig(config),
      },
      store_hierarchy:
        data?.store?.reduce((acc, curr) => {
          acc[curr.filter_id] = curr.values.map(({ value }) => value);
          return acc;
        }, {}) || [],
      product_group: data?.productGroup?.map(({ value }) => value) || [],
      store_group: data?.storeGroup?.map(({ value }) => value) || [],
      hier_code: [],
      graph: true,
      promo_percentage: null,
      price_point: null,
      selected_items: {},
      ia_default_flag: ia_default_flag ? true : false,
      only_eligible: isEligible,
      // [promoType]:
      //   isNumber(promoValue) && promoValue !== null ? String(promoValue) : null,

      [promoType]: null,
    },
  };
};
export const chartDataPayload = (
  data,
  promoValue = null,
  week,
  ia_default_flag = false,
  isDataWeekLevel,
  fiscalDates,
  promoType = "promo_percentage",
  isEligible,
  isCalledFromMFPDashboard,
  iscalledFromCharts,
  selectedRowsFromMFP,
  tableName,
  isHistoricMFPRequired
) => {
  let productFilters =
    data?.product?.reduce((acc, curr) => {
      acc[curr.filter_id] = curr.values.map(({ value }) => value);
      return acc;
    }, {}) || [];
  let productStoreFilters =
    data?.product_store?.reduce((acc, curr) => {
      acc[curr.filter_id] = curr.values.map(({ value }) => value);
      return acc;
    }, {}) || [];
  if (!isEmpty(productStoreFilters)) {
    Object.assign(productFilters, productStoreFilters);
  }

  return {
    filters: {
      aggregation_level: isDataWeekLevel ? "W" : "M",
      timeline: {
        // start_week_id: week || data?.fiscalDates?.start_fw,
        // end_week_id: week || data?.fiscalDates?.end_fw,

        start_week_id: fiscalDates?.start_fw || data?.fiscalDates?.start_fw,
        end_week_id: fiscalDates?.end_fw || data?.fiscalDates?.end_fw,
        future_start_week_id: data?.future?.start_fw,
        future_end_week_id: data?.future?.end_fw,
      },
      compare_timeline: data?.historicActuals,
      channel: data?.channel?.map(({ value }) => value) || [],
      product_hierarchy:
        isCalledFromMFPDashboard && !iscalledFromCharts
          ? {
              l0_name: [selectedRowsFromMFP[0]?.choice],
              product_channel_name: [selectedRowsFromMFP[0]?.channel],
            }
          : productFilters || [],
      store_hierarchy:
        data?.store?.reduce((acc, curr) => {
          acc[curr.filter_id] = curr.values.map(({ value }) => value);
          return acc;
        }, {}) || [],
      product_group: data?.productGroup?.map(({ value }) => value) || [],
      store_group: data?.storeGroup?.map(({ value }) => value) || [],
      hier_code: [],
      graph: true,
      promo_percentage: null,
      price_point: null,
      selected_items: {},
      ia_default_flag: ia_default_flag ? true : false,
      only_eligible: isEligible,
      // mfp: isEpFeedAvailable,
      // [promoType]:
      //   isNumber(promoValue) && promoValue !== null ? String(promoValue) : null,

      [promoType]: null,
    },
  };
};

export const handleCompareBtnClick = (currYear, prevYear) => {
  let currFormattedYear = String(currYear)?.slice(0, 4);
  let labelYear = String(currFormattedYear - prevYear);

  return {
    value: labelYear,
    label: labelYear,
    id: labelYear,
  };
};

export const handleTotalRow = (
  rowData,
  columns,
  activeChildHierarchyKey,
  editHierarchyTotalRowInstance,
  isL0SiblingsUnLockedForEmptyForecast,
  maintainNullValues,
  selectedKpi
) => {
  const totalRowData = {
    total_rows: rowData?.length,
    row: "total",

    [columns?.[0].column_name]: "Grand Total",
  };

  let totalNode = editHierarchyTotalRowInstance?.current?.api?.getRowNode(
    "total"
  );

  let emptyIAForecast = [];
  let emptyAdjustedForecast = [];
  let emptyKpiForecast = [];

  // Skip totals calculation for min_order_quantity_style
  const shouldCalculateKpiTotal = selectedKpi !== "min_order_quantity_style";

  for (let elem of rowData) {
    for (let key of Object.keys(elem)) {
      if (isNumber(key) || isNumber(key?.slice(0, -1))) {
        if (!totalRowData[key]) totalRowData[key] = {};
        //Edge Case : When forecast unavailable for any child hierarchy, total is set as "-"
        if (elem[key].IA === null && emptyIAForecast.indexOf(key) === -1) {
          emptyIAForecast.push(key);
        }
        if (
          elem[key].adjusted === null &&
          emptyAdjustedForecast.indexOf(key) === -1
        ) {
          emptyAdjustedForecast.push(key);
        }
        // Track empty KPI forecasts
        if (elem[key].Kpi === null && emptyKpiForecast.indexOf(key) === -1) {
          emptyKpiForecast.push(key);
        }

        if (isL0SiblingsUnLockedForEmptyForecast && elem[key].IA === null) {
          continue;
        } else {
          totalRowData[key]["IA"] =
            (totalRowData[key]?.IA || 0) + (Number(elem[key].IA) || 0);
          totalRowData[key]["adjusted"] =
            (totalRowData[key]?.adjusted || 0) +
            (Number(elem[key].adjusted) || 0);

          // Sum KPI values only if not min_order_quantity_style
          if (shouldCalculateKpiTotal) {
            totalRowData[key]["Kpi"] =
              (totalRowData[key]?.Kpi || 0) + (Number(elem[key].Kpi) || 0);
          } else {
            // For min_order_quantity_style, set Kpi to null or another indicator
            totalRowData[key]["Kpi"] = null;
          }
        }

        if (totalNode?.data[key]?.isLocked)
          totalRowData[key]["isLocked"] = true;
      }
    }
  }

  //Edge Case : When forecast unavailable for any child hierarchy, total is set as "-"
  if (!isL0SiblingsUnLockedForEmptyForecast && maintainNullValues) {
    emptyIAForecast.forEach((key) => (totalRowData[key]["IA"] = null));
    emptyAdjustedForecast.forEach(
      (key) => (totalRowData[key]["adjusted"] = null)
    );
  }
  // Set null values for empty KPI forecasts only if not min_order_quantity_style
  if (shouldCalculateKpiTotal) {
    emptyKpiForecast.forEach((key) => (totalRowData[key]["Kpi"] = null));
  }

  return [totalRowData];
};

const setDefaultDateRedirect = (fiscalDates, dispatch, isDropdown = false) => {
  try {
    if (fiscalDates?.end_fw) {
      getFiscalCompareWithRedirect(
        [handleCompareBtnClick(fiscalDates?.end_fw, 1)],
        isDropdown,
        fiscalDates,
        dispatch
      );
    }
  } catch (error) {
    console.log(error, "error in setDefaultDateRedirect");
  }
};

const getFiscalCompareWithRedirect = async (
  selectedDate,
  isDropdown,
  fiscalDates,
  dispatch
) => {
  try {
    const payload = selectedDate.map(({ value }) => ({
      year: Number(value),
      start_week_id: fiscalDates?.start_fw,
      end_week_id: fiscalDates?.end_fw,
      complete_year: false,
    }));
    dispatch(setHistoricActuals(payload));
    dispatch(setCompareWithSelectedDate(selectedDate));
    dispatch(setIsCompareWithDropdown(isDropdown));
  } catch (error) {
    console.log("Something went wrong", error);
  }
};

export const handleAppendResponse = (allRowData, appendResponse) => {
  if (!allRowData?.length) {
    return appendResponse;
  }

  allRowData?.forEach((rowData, i) => {
    Object.assign(rowData, appendResponse[i]);
  });

  return allRowData;
};

export const updateRatioBasedValue = (IAValue, newTotal, IATotal) => {
  return Number(IAValue) * Number(newTotal / IATotal);
};

export const calculateHistoricFiscalWeek = (
  historicDataPayload,
  historicalWeekSelected
) => {
  const { fiscalCalendarDetails } = historicDataPayload;

  let currentDate = new Date();
  let currentYear = currentDate.getFullYear();

  let weekNumber = moment().isoWeek();
  let startFiscalWeekData =
    fiscalCalendarDetails?.[currentYear]?.[weekNumber - historicalWeekSelected];
  let endFiscalWeekData =
    fiscalCalendarDetails?.[currentYear]?.[weekNumber - 1];

  if (weekNumber <= historicalWeekSelected) {
    let weeksInYear = fiscalCalendarDetails?.[currentYear - 1]?.[53] ? 53 : 52;
    startFiscalWeekData =
      fiscalCalendarDetails?.[currentYear - 1]?.[
        weeksInYear + historicalWeekSelected - weekNumber
      ];
    if (weekNumber === 1) {
      endFiscalWeekData =
        fiscalCalendarDetails?.[currentYear - 1]?.[weeksInYear];
    }
  }

  historicDataPayload.fiscalDates = {
    start_fw: startFiscalWeekData.fy + startFiscalWeekData.fw,
    end_fw: endFiscalWeekData.fy + endFiscalWeekData.fw,
  };
  // Revisit historic actuals logic
  historicDataPayload.historicActuals = {
    start_fw: Number(startFiscalWeekData.fy) - 1 + startFiscalWeekData.fw,
    end_fw: Number(endFiscalWeekData.fy) - 1 + endFiscalWeekData.fw,
  };

  return historicDataPayload;
};

export const isNumber = (value) =>
  typeof Number(value) === "number" && !isNaN(Number(value));

export const isNumberOrString = (x) => {
  return parseFloat(x) == x;
};

export const PERIOD_MAPPING = {
  W: "Week",
  M: "Month",
  Q: "Quarter",
};

export const sortByNumber = (data, order, key) => {
  if (order === "desc") {
    data.sort((a, b) => b?.[key] - a?.[key]);
  } else {
    data.sort((a, b) => a?.[key] - b?.[key]);
  }

  return data;
};

export const getFilterDimensions = (filerConfig) => {
  let expectedFilterDimensions = cloneDeep(EXPECTED_ADA_FILTER_DIMENSIONS);
  let visibleFilterDimensions = [];

  filerConfig.forEach((config) => {
    if (!expectedFilterDimensions[config.dimension].visible) {
      expectedFilterDimensions[config.dimension].visible = true;
      visibleFilterDimensions.push(expectedFilterDimensions[config.dimension]);
    }
  });

  visibleFilterDimensions = sortByNumber(
    visibleFilterDimensions,
    "asc",
    "order"
  ).map((dimension) => dimension.label);

  return visibleFilterDimensions;
};

export const adaLabelFormatter = (label) => {
  let labelArray = label.split("_");
  for (let i in labelArray) {
    if (labelArray[i] === "ia") {
      labelArray[i] = "IA";
    }
  }

  return (
    labelArray
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") + " Forecast"
  );
};

export const getEditHierarchyPayload = (
  payload,
  editHierarchyActionMap,
  allowEdit,
  showIAData,
  matrixSummaryReducer
) => {
  let decimalsToShow =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.EditHierarchyForecast;
  let formatter = "roundOff";
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    editHierarchyActionMap,
    allowEdit,
    showIAData,
    matrixSummaryReducer: matrixSummaryReducer?.switchTimeLine?.[0]?.value,
    extra: {
      fullWidth: true,
      roundOffTo: 0,
      ignoreValueGetter: true,
    },
    timeline: matrixSummaryReducer?.switchTimeLine?.[0]?.value,
  };
};
export const getEditHierarchyChildPayload = (
  payload,
  allowEdit,
  showIAData,
  matrixSummaryReducer
) => {
  let decimalsToShow =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.EditHierarchyForecast;
  let formatter = "roundOff";
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    allowEdit,
    showIAData,
    timeline: matrixSummaryReducer?.switchTimeLine?.[0]?.value,
    aggLevelCount:
      matrixSummaryReducer?.clientConfig?.attribute_value?.aggLevelCount || 3,
    extra: {
      fullWidth: true,
      roundOffTo: 0,
      ignoreValueGetter: true,
    },
  };
};
export const getUpdatedResponse = (
  response,
  allowEdit,
  matrixSummaryReducer
) => {
  const isWeekEndDateLabelEnabled =
    matrixSummaryReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_end_date_label_enabled;

  let showWeekEndDateLabelEnabled =
    isWeekEndDateLabelEnabled &&
    matrixSummaryReducer?.switchTimeLine?.[0]?.value === "W";

  return response?.data?.data.map((el, i) => {
    if (i !== 0) {
      return {
        ...el,
        is_lockable: false,
        disabled: !allowEdit,
        is_sortable: false,
        is_searchable: false,
        label:
          i === 1
            ? el.label
            : showWeekEndDateLabelEnabled
            ? weekEndDateLabel(el.label, matrixSummaryReducer)
            : `F${matrixSummaryReducer?.switchTimeLine?.[0]?.value}-${el.label}`,
      };
    }
    return { ...el, is_sortable: false, is_searchable: false };
  });
};

export const getfetchEditHierarchyGrandChild = (
  payload,
  allowEdit,
  showIAData,
  matrixSummaryReducer
) => {
  let decimalsToShow =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.EditHierarchyForecast;
  let formatter = "roundOff";
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    allowEdit,
    showIAData,
    timeline: matrixSummaryReducer?.switchTimeLine?.[0]?.value,
    extra: {
      fullWidth: true,
      roundOffTo: 0,
      ignoreValueGetter: true,
    },
  };
};
export const getPromoPayload = (
  payload,
  showIAData,
  matrixSummaryReducer,
  allPromoFactors
) => {
  let decimalsToShow =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.driverForecast;
  let formatter =
    matrixSummaryReducer?.clientConfig?.attribute_value
      ?.decimal_rounding_off_mapping?.[decimalsToShow];
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    showIAData,
    extra: {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      options: allPromoFactors,
      onChangeCustomFunction: true,
    },
  };
};

export const AllDriverForecastPayload = (
  payload,
  showIAData,
  matrixSummaryReducer
) => {
  let decimalsToShow =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.decimalConfig?.driverForecast;
  let formatter =
    matrixSummaryReducer?.clientConfig?.attribute_value
      ?.decimal_rounding_off_mapping?.[decimalsToShow];
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    showIAData,
    extra: {
      fullWidth: true,
      roundOffTo: decimalsToShow,
    },
  };
};

export const currentHistoricDates = (weeks) => {
  let currDate = moment().subtract(1, "week").format("YYYY/MM/DD");

  let historicDate = moment()
    .subtract(weeks.value, "week")
    .format("YYYY/MM/DD");
  return { currDate, historicDate };
};

export const replaceValueByValue = (obj, oldValue, newValue) => {
  return (function traverse(currentObj) {
    for (const key in currentObj) {
      if (currentObj[key] === oldValue) {
        // Replace value
        return { ...currentObj, [key]: newValue };
      } else if (
        typeof currentObj[key] === "object" &&
        currentObj[key] !== null
      ) {
        // Recursively traverse nested object
        currentObj[key] = traverse(currentObj[key]);
      }
    }
    // Value not found or not an object
    return currentObj;
  })(obj);
};

export const getSelectedProductStoreFilters = (matrixSummaryReducer) => {
  const clonedReducer = cloneDeep(matrixSummaryReducer);
  let selectedPayload = [
    ...(clonedReducer.product || []),
    ...(clonedReducer.store || []),
    ...(clonedReducer.product_store || []),
  ];
  return selectedPayload;
};

export const getFormattedChartFilters = (matrixSummaryReducer, selected) => {
  const clonedReducer = cloneDeep(matrixSummaryReducer);

  let selectedFilterId = selected.map((el) => el?.filter_id);

  for (let item of selectedFilterId) {
    let productIndex = clonedReducer.product?.findIndex(
      (elem) => elem?.filter_id === item
    );

    if (productIndex > -1) {
      clonedReducer.product.splice(productIndex, 1);
    }

    let storeIndex = clonedReducer.store?.findIndex(
      (elem) => elem?.filter_id === item
    );

    if (storeIndex > -1) {
      clonedReducer.store.splice(storeIndex, 1);
    }
  }
  let selectedProductStoreFilters = getSelectedProductStoreFilters(
    clonedReducer
  );
  let selectedPayload = [...selectedProductStoreFilters, ...selected];

  return selectedPayload;
};

const getDimensionPayload = (type, crossFilterData, matrixSummaryReducer) => {
  let clonedUpdatedFilter = cloneDeep(matrixSummaryReducer?.[type]) || [];

  let appliedFilters = crossFilterData?.filter(
    (elem) => elem.dimension === type
  );

  let selectedFilters = [];
  appliedFilters.forEach((elem) => {
    selectedFilters.push({
      attribute_name: elem.filter_keyword,
      dimension: type,
      display_type: "dropdown",
      filter_id: elem.filter_keyword,
      filter_type: "cascaded",
      operator: "in",
      values: elem.initialData,
    });
  });

  if (selectedFilters?.length) {
    for (let filter of selectedFilters) {
      let currSelectFilterIndex = clonedUpdatedFilter?.findIndex(
        ({ filter_id }) => {
          return filter_id === filter?.filter_id;
        }
      );

      if (currSelectFilterIndex > -1) {
        clonedUpdatedFilter[currSelectFilterIndex] = filter;
      } else {
        clonedUpdatedFilter.push(filter);
      }
    }
  }
  return clonedUpdatedFilter;
};

export const getEligibleSKU = async (
  matrixSummaryReducer,
  crossFilterData,
  id,
  config
) => {
  const clonedReducer = cloneDeep(matrixSummaryReducer);

  let updatedStoreFilter = getDimensionPayload(
    "store",
    crossFilterData,
    matrixSummaryReducer
  );

  let updatedProductFilter = getDimensionPayload(
    "product",
    crossFilterData,
    matrixSummaryReducer
  );

  clonedReducer.store = updatedStoreFilter;
  clonedReducer.product = updatedProductFilter;

  const payload = graphSKUPayload(
    clonedReducer,
    null,
    null,
    id === "IA",
    null,
    null,
    config
  );
  let filterResponse = await getProductData(payload);

  let updatedFilterResponse = filterResponse.map((elem) => ({
    label: elem,
    value: elem,
  }));
  return updatedFilterResponse;
};

export const updateForecastMultiplier = (
  editHierarchyTotalRowInstance,
  column,
  id,
  dispatch
) => {
  let totalRowData = editHierarchyTotalRowInstance.current?.api?.getRowNode(
    "total"
  )?.data;
  let updatedWeek = column.colId?.split(".")?.[0];
  let formattedData = {
    [updatedWeek]: {
      IA: totalRowData?.[updatedWeek]?.IA,
      ratio:
        totalRowData?.[updatedWeek]?.adjusted / totalRowData?.[updatedWeek]?.IA,
      adjusted: totalRowData?.[updatedWeek]?.adjusted,
    },
  };

  dispatch(
    setForecastMultiplierData({
      key: id,
      value: formattedData,
    })
  );
};

export const updateAllForecastMultiplier = (totalRowData, id, dispatch) => {
  if (id === "IA") {
    return;
  }
  let formattedData = {
    row: "forecast",
    forecast_multiplier: "Adjusted IA Forecast",
  };
  if (id !== "adjusted") {
    formattedData = {
      row: "forecast",
      forecast_multiplier: "Scenario 1 IA Forecast",
    };
  }

  for (let key in totalRowData || {}) {
    if (isNumber(key)) {
      let value = totalRowData[key];
      formattedData[key] = {
        IA: value?.IA,
        ratio: value?.adjusted / value?.IA,
        adjusted: value?.adjusted,
      };
    }
  }

  dispatch(
    setAllForecastMultiplierData({
      key: id,
      value: formattedData,
    })
  );
};

export const updateKeyInPlace = (data, oldKeyName, newKeyName) => {
  data?.forEach((elem) => {
    elem[newKeyName] = elem[oldKeyName];
    delete elem[oldKeyName];
  });

  return data;
};

export const getAllRows = (gridRef) => {
  try {
    let rowData = [];
    gridRef?.current?.api?.forEachNode((node) => rowData.push(node.data));
    return rowData;
  } catch (error) {
    return [];
  }
};

// TO DO - Use recursion

export const transformSavePayload = (payload, matrixSummaryReducer) => {
  let clonedPayload = cloneDeep(payload);
  let finalPayload = [];

  clonedPayload.forEach((el, index) => {
    el.ratio = el.ratio + "";
    let modified = [];
    let clonedElem = cloneDeep(el);
    clonedElem.modified = [];
    (clonedElem.update_level = matrixSummaryReducer?.displayDataToWeekLevel
      ? "Week"
      : "Month"),
      finalPayload.push(clonedElem);
    let newObj = el["modified"][LEVEL_0] || {};

    for (let [key, value] of Object.entries(newObj)) {
      let newStructureL0 = {
        name: key,
        value: "",
        locked: false,
        ...value,
        ratio: adjustedRatio(value?.ratio, el?.ratio),
        pack_id: value?.pack_id,
      };

      if (newStructureL0[LEVEL_1]) {
        let level1Payload = [];
        for (let [key, value] of Object.entries(newStructureL0[LEVEL_1])) {
          let newStructureL1 = {
            name: key,
            value: "",
            locked: false,
            ...value,
            ratio: adjustedRatio(value?.ratio, newStructureL0?.ratio),
            pack_id: value?.pack_id,
          };

          if (newStructureL1[LEVEL_2]) {
            let level2Payload = [];
            for (let [key, value] of Object.entries(newStructureL1[LEVEL_2])) {
              let newStructureL2 = {
                name: key,
                value: "",
                locked: false,
                ...value,
                ratio: adjustedRatio(value?.ratio, newStructureL1?.ratio),
                pack_id: value?.pack_id,
              };

              level2Payload.push(newStructureL2);
            }
            newStructureL1[LEVEL_2] = level2Payload;
          }

          level1Payload.push(newStructureL1);
        }
        newStructureL0[LEVEL_1] = level1Payload;
      }

      modified.push({ [LEVEL_0]: newStructureL0 });
    }
    if (modified.length) {
      finalPayload[index].modified = modified;
    }
  });
  let updatedFinalpayload = finalPayload.filter((elem) => {
    return elem.ratio || elem.modified?.length;
  });

  return updatedFinalpayload;
};

export const updatedRatio = (
  currentFiscalDataKey,
  currentFiscalDataAdjusted,
  currentFiscalDataIA,
  childInstance,
  grandChildInstance,
  activeChildHierarchyKey
) => {
  // if child is not mounted then ratio will be adjusted by IA
  if (!childInstance?.current?.api) {
    return currentFiscalDataAdjusted / currentFiscalDataIA;
  }
  let nonModifiedIASum = 0;
  let nonModifiedAdjustedSum = 0;
  let isChildEdited = false;
  let expandedNode = null;
  childInstance.current?.api?.forEachNode((node) => {
    if (node.expanded) {
      expandedNode = node;
    }
  });
  childInstance?.current?.api?.forEachNode((node) => {
    for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
      if (isNumber(fiscalDataKey)) {
        if (
          fiscalData.isEdited ||
          fiscalData.isLocked ||
          fiscalData.isChildEdited
        ) {
          if (
            activeChildHierarchyKey === node.data.row &&
            fiscalData.isEdited
          ) {
            isChildEdited = true;
          }
        } else {
          if (+currentFiscalDataKey === +fiscalDataKey) {
            nonModifiedIASum += fiscalData.IA;
            nonModifiedAdjustedSum += fiscalData.adjusted;
            if (expandedNode?.data?.row === node.data.row) {
              grandChildInstance?.current?.api?.forEachNode((node) => {
                // if (node.data.isEdited) {
                for (let [
                  grandChildfiscalDataKey,
                  grandChildfiscalData,
                ] of Object.entries(node.data)) {
                  if (
                    isNumber(grandChildfiscalDataKey) &&
                    (grandChildfiscalData.isEdited ||
                      grandChildfiscalData.isLocked)
                  ) {
                    if (Number(grandChildfiscalData.IA)) {
                      if (grandChildfiscalDataKey === currentFiscalDataKey) {
                        nonModifiedIASum -= grandChildfiscalData.IA;
                        nonModifiedAdjustedSum -= grandChildfiscalData.adjusted;
                      }
                      //ratio.ratio = grandChildfiscalData.adjusted / grandChildfiscalData.IA;
                    } else {
                      // if (Number(grandChildfiscalData.adjusted)) {
                      //   ratio.value = updatedValue(
                      //     grandChildfiscalDataKey,
                      //     grandChildfiscalData.adjusted,
                      //     grandChildfiscalData.level_count
                      //   );
                      //   ratio.ratio = “”;
                      // }
                    }
                  }
                  // }
                }
              });
            }
          }
        }
      }
    }
    // }
  });
  // if (!isChildEdited && grandChildInstance?.current?.api) {
  //   grandChildInstance?.current?.api?.forEachNode((node) => {
  //     for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
  //       if (isNumber(fiscalDataKey)) {
  //         if (fiscalData.isEdited) {
  //           nonModifiedIASum -= fiscalData.IA;
  //           nonModifiedAdjustedSum -= fiscalData.adjusted;
  //         }
  //       }
  //     }
  //     // }
  //   });
  // }
  // WIP - handle non active for updated logic on readjustement when parent is locked
  // nonActiveChildData?.forEach((data) => {
  //   if (data) {
  //     for (let [fiscalDataKey, fiscalData] of Object.entries(data)) {
  //       if (isNumber(fiscalDataKey)) {
  //         if (fiscalData.isEdited || fiscalData.isLocked) {
  //           let value = fiscalData.adjusted;
  //           if (fiscalData.hasOwnProperty(“adjusted_manual”)) {
  //             value = fiscalData.adjusted_manual;
  //           }
  //           if (+currentFiscalDataKey === +fiscalDataKey) {
  //             modifiededAdjustedSum += value;
  //           }
  //         } else {
  //           nonModifiedIASum += fiscalData.IA;
  //         }
  //       }
  //     }
  //   }
  // });
  // if child node doesn’t exist, then current adjusted value’s respective IA will be same as nonModifiedIASum
  if (!childInstance?.current?.api) {
    nonModifiedIASum = currentFiscalDataIA;
  }
  // allEditedGrandChildRowData?.current
  let ratio = nonModifiedAdjustedSum / nonModifiedIASum;
  if (isNaN(ratio)) {
    return "";
  }
  return ratio;
};

export const updatedValue = (
  currentFiscalDataKey,
  value,
  levelCount,
  childInstance
) => {
  // if child is not mounted then ration will be adjusted by IA
  if (!childInstance?.current?.api) {
    return value / levelCount;
  }
  let modifiededAdjustedSum = 0;
  let modifiedAdjustedRespectiveLevelCountSum = 0;

  childInstance?.current?.api?.forEachNode((node) => {
    for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
      if (isNumber(fiscalDataKey)) {
        if (fiscalData.isEdited || fiscalData.isLocked) {
          let value = fiscalData.adjusted;
          if (fiscalData.hasOwnProperty("adjusted_manual")) {
            value = fiscalData.adjusted_manual;
          }

          if (+currentFiscalDataKey === +fiscalDataKey) {
            modifiededAdjustedSum += value;
            modifiedAdjustedRespectiveLevelCountSum += fiscalData?.level_count;
          }
        }
      }
    }
    // }
  });

  // WIP - handle non active for updated logic on readjustement when parent is locked

  // nonActiveChildData?.forEach((data) => {
  //   if (data) {
  //     for (let [fiscalDataKey, fiscalData] of Object.entries(data)) {
  //       if (isNumber(fiscalDataKey)) {
  //         if (fiscalData.isEdited || fiscalData.isLocked) {
  //           let value = fiscalData.adjusted;
  //           if (fiscalData.hasOwnProperty("adjusted_manual")) {
  //             value = fiscalData.adjusted_manual;
  //           }

  //           if (+currentFiscalDataKey === +fiscalDataKey) {
  //             modifiededAdjustedSum += value;
  //           }
  //         } else {
  //           nonModifiedIASum += fiscalData.IA;
  //         }
  //       }
  //     }
  //   }
  // });

  // allEditedGrandChildRowData?.current

  let ratio =
    (value - modifiededAdjustedSum) /
    (levelCount - modifiedAdjustedRespectiveLevelCountSum);

  return ratio;
};

export const adjustedPayload = (
  editHierarchyTotalRowInstance,
  lastEditedDrivers,
  editHierarchyInstance,
  allEditedChildRowData,
  editHierarchyChildInstance,
  activeChildHierarchyKey,
  allEditedGrandChildRowData,
  allEditedGrandChildRowMapping,
  editHierarchyGrandChildInstance,
  isCalledFromMFPDashboard,
  matrixSummaryReducer,
  isChart = false // if isisChart is true then for 0 forecast, level count is considered as a hack
  // as computation on BE is getting complex
) => {
  try {
    const savepayload = [];
    let L0TotalData = editHierarchyTotalRowInstance?.current?.api?.getRowNode(
      "Total"
    )?.data;
    if (!L0TotalData) {
      return;
    }

    // Handles L0 total row & payload structure
    for (let [fiscalDataKey, fiscalData] of Object.entries(L0TotalData)) {
      if (isNumber(fiscalDataKey)) {
        const currentWeekDriver =
          lastEditedDrivers?.find(
            ({ fiscal_timeperiod_id }) =>
              +fiscal_timeperiod_id === fiscalDataKey
          )?.promo_percentage || null;

        let fiscalWeekpayload = {
          fiscal_timeperiod_id: fiscalDataKey,
          promo_percentage: currentWeekDriver,
          modified: {},
          locked: !!fiscalData.isLocked,
          ratio:
            fiscalData.isEdited || fiscalData.isLocked
              ? updatedRatio(
                  fiscalDataKey,
                  fiscalData.adjusted_manual,
                  fiscalData.IA,
                  editHierarchyInstance,
                  editHierarchyChildInstance,
                  activeChildHierarchyKey,
                  editHierarchyGrandChildInstance
                )
              : "",
        };
        savepayload.push(fiscalWeekpayload);
      }
    }

    // To check if L1 is edited Note : this snippet is useful to form payload for L0, when L0 total and L1 is edited

    let isActiveL1Edited = {};
    editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
      for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
        if (
          isNumber(fiscalDataKey) &&
          (fiscalData.isEdited || fiscalData.isLocked)
        ) {
          isActiveL1Edited[fiscalDataKey] = true;
        }
      }
    });

    // Handles all L0's
    editHierarchyInstance?.current?.api?.forEachNode((node) => {
      // if (node.data.isEdited) {
      for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
        if (
          isNumber(fiscalDataKey) &&
          (fiscalData.isEdited || fiscalData.isLocked)
          //  ||
          // In Progress
          // checkParentChildBothEditedForL0(
          //   isActiveL1Edited,
          //   fiscalDataKey,
          //   activeChildHierarchyKey,
          //   savepayload
          // )
        ) {
          const ratio = {};
          ratio.locked = !!fiscalData.isLocked;

          let value = fiscalData.adjusted;
          if (
            fiscalData.isEdited &&
            fiscalData.hasOwnProperty("adjusted_manual")
          ) {
            value = fiscalData.adjusted_manual;
          }

          if (Number(fiscalData.IA)) {
            ratio.ratio = updatedRatio(
              fiscalDataKey,
              value,
              fiscalData.IA,
              node.data.row === activeChildHierarchyKey &&
                editHierarchyChildInstance,
              editHierarchyGrandChildInstance,
              activeChildHierarchyKey
            );
            ratio.value = "";
          } else {
            // if (Number(value)) {
            ratio.value = updatedValue(
              fiscalDataKey,
              fiscalData.adjusted,
              1,
              editHierarchyChildInstance
            );
            // ratio.value = value / fiscalData.level_count;
            ratio.ratio = "";
            // }
          }
          if (node.data.pack_identifier) {
            ratio.pack_id = node.data.pack_identifier;
            ratio.value = fiscalData.adjusted;
          }
          if (!node.data.pack_identifier && matrixSummaryReducer?.packValue) {
            ratio.pack_id = matrixSummaryReducer.packValue;
            ratio.value = fiscalData.adjusted;
          }
          let currFiscalData = savepayload.find(
            ({ fiscal_timeperiod_id }) => fiscal_timeperiod_id === fiscalDataKey
          );

          if (currFiscalData.modified[LEVEL_0]) {
            currFiscalData.modified[LEVEL_0] = {
              ...currFiscalData.modified[LEVEL_0],
              [node.data.row]: ratio,
            };
          } else {
            currFiscalData.modified[LEVEL_0] = {
              [node.data.row]: ratio,
            };
          }
        }
      }

      // }
    });

    let expandedNode = null;
    editHierarchyChildInstance.current?.api?.forEachNode((node) => {
      if (node.expanded) {
        expandedNode = node;
      }
    });

    // Handles all active L1's
    editHierarchyChildInstance?.current?.api?.forEachNode((node) => {
      if (node.data.isEdited) {
        for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
          if (
            isNumber(fiscalDataKey) &&
            (fiscalData.isEdited ||
              fiscalData.isLocked ||
              checkParentChildBothEdited(
                fiscalData,
                fiscalDataKey,
                activeChildHierarchyKey,
                savepayload
              ))
          ) {
            const ratio = {};
            ratio.locked = !!fiscalData.isLocked;

            let value = fiscalData.adjusted;

            if (fiscalData.hasOwnProperty("adjusted_manual")) {
              value = fiscalData.adjusted_manual;
            }
            if (Number(fiscalData.IA)) {
              console.log("ratio123", fiscalData.IA);
              ratio.ratio = updatedRatio(
                fiscalDataKey,
                value,
                fiscalData.IA,
                node.data.row === expandedNode?.data?.row &&
                  editHierarchyGrandChildInstance
              );
              ratio.value = "";
            } else {
              // if (Number(value)) {
              ratio.value = updatedValue(
                fiscalDataKey,
                fiscalData.adjusted,
                1,
                editHierarchyGrandChildInstance,
                expandedNode?.data?.row
              );
              ratio.ratio = "";
              // }
            }
            if (fiscalData?.pack_identifier) {
              ratio.pack_id = fiscalData.pack_identifier;
              ratio.value = fiscalData.adjusted;
            }
            if (
              !fiscalData.pack_identifier &&
              matrixSummaryReducer?.packValue
            ) {
              ratio.pack_id = matrixSummaryReducer.packValue;
              ratio.value = fiscalData.adjusted;
            }
            if ("user_profile_data" in node.data) {
              ratio.user_profile =
                node.data.user_profile_data[fiscalDataKey]?.user_profile;

              if (
                node.data[fiscalDataKey].user_profile === 0 ||
                node.data.user_profile_data[fiscalDataKey]?.[node.data.row]
                  ?.skipRatioCalculate
              ) {
                ratio.ratio = node.data.user_profile_data[fiscalDataKey]?.ratio;
              } else {
                ratio.ratio =
                  node.data.user_profile_data[fiscalDataKey].ratio /
                  node.data[fiscalDataKey].user_profile;
              }
            }

            let currFiscalData = savepayload.find(
              ({ fiscal_timeperiod_id }) =>
                fiscal_timeperiod_id === fiscalDataKey
            );
            createAssignNestedValL1(
              currFiscalData,
              ratio,
              node.data.row,
              activeChildHierarchyKey
            );
          }
        }
      }
    });

    // Handles all Non active L1's
    for (let [fiscalL1DataKey, fiscalData] of Object.entries(
      allEditedChildRowData?.current
    )) {
      if (fiscalL1DataKey === activeChildHierarchyKey) continue;

      fiscalData.forEach((data) => {
        // if (data.isEdited) {
        for (let [fiscalDataKey, fiscalData] of Object.entries(data)) {
          if (
            isNumber(fiscalDataKey) &&
            (fiscalData.isEdited || fiscalData.isLocked)
          ) {
            const ratio = {};
            ratio.locked = !!fiscalData.isLocked;

            let value = fiscalData.adjusted;

            if (fiscalData.hasOwnProperty("adjusted_manual")) {
              value = fiscalData.adjusted_manual;
            }
            if (Number(fiscalData.IA)) {
              ratio.ratio = fiscalData.adjusted / fiscalData.IA;
              ratio.value = "";
              // ratio.ratio = updatedRatio(
              //   fiscalDataKey,
              //   value,
              //   fiscalData.IA,
              //   allEditedGrandChildRowData?.current?.[fiscalData?.row]
              // );
            } else {
              // if (Number(value)) {
              ratio.value = updatedValue(
                fiscalDataKey,
                fiscalData.adjusted,
                1,
                editHierarchyChildInstance
              );
              ratio.ratio = "";
              // }
            }
            if (fiscalData?.pack_identifier) {
              ratio.pack_id = fiscalData.pack_identifier;
              ratio.value = fiscalData.adjusted;
            }
            if (
              !fiscalData.pack_identifier &&
              matrixSummaryReducer?.packValue
            ) {
              ratio.pack_id = matrixSummaryReducer.packValue;
              ratio.value = fiscalData.adjusted;
            }
            let currFiscalData = savepayload.find(
              ({ fiscal_timeperiod_id }) =>
                fiscal_timeperiod_id === fiscalDataKey
            );
            createAssignNestedValL1(
              currFiscalData,
              ratio,
              data.row,
              fiscalL1DataKey
            );
          }
        }
        // }
      });
    }

    // Handles all Non active L2's

    for (let [l1Key, l2Data] of Object.entries(
      allEditedGrandChildRowData?.current
    )) {
      l2Data?.forEach((data) => {
        if (data) {
          for (let [fiscalDataKey, fiscalData] of Object.entries(data)) {
            if (
              isNumber(fiscalDataKey) &&
              (fiscalData.isEdited || fiscalData.isLocked)
            ) {
              const ratio = {};
              ratio.locked = !!fiscalData.isLocked;

              if (Number(fiscalData.IA)) {
                ratio.ratio = fiscalData.adjusted / fiscalData.IA;
                ratio.value = "";
              } else {
                if (Number(fiscalData.adjusted)) {
                  ratio.value = fiscalData.adjusted / 1;

                  // ratio.value = updatedValue(
                  //   fiscalDataKey,
                  //   fiscalData.adjusted,
                  //   fiscalData.level_count,
                  //   editHierarchyChildInstance
                  // );
                  ratio.ratio = "";
                }
              }
              if (fiscalData?.pack_identifier) {
                ratio.pack_id = fiscalData.pack_identifier;
                ratio.value = fiscalData.adjusted;
              }
              if (
                !fiscalData.pack_identifier &&
                matrixSummaryReducer?.packValue
              ) {
                ratio.pack_id = matrixSummaryReducer.packValue;
                ratio.value = fiscalData.adjusted;
              }
              let currFiscalData = savepayload.find(
                ({ fiscal_timeperiod_id }) =>
                  fiscal_timeperiod_id === fiscalDataKey
              );

              // get corresponding L0
              for (let [editedL0, editedL1] of Object.entries(
                allEditedGrandChildRowMapping?.current
              )) {
                if (editedL1[l1Key]) {
                  createAssignNestedValL2(
                    currFiscalData,
                    ratio,
                    l1Key,
                    data.row,
                    editedL0
                  );
                }
              }
            }
          }
        }
      });
    }

    // Handles all active L2's

    editHierarchyGrandChildInstance?.current?.api?.forEachNode((node) => {
      if (node.data.isEdited) {
        for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
          if (
            isNumber(fiscalDataKey) &&
            (fiscalData.isEdited || fiscalData.isLocked)
          ) {
            const ratio = {};
            ratio.locked = !!fiscalData.isLocked;

            if (Number(fiscalData.IA)) {
              ratio.ratio = fiscalData.adjusted / fiscalData.IA;
              ratio.value = "";
            } else {
              // if (Number(fiscalData.adjusted)) {

              ratio.value = updatedValue(fiscalDataKey, fiscalData.adjusted, 1);

              ratio.ratio = "";
              // }
            }
            if (fiscalData?.pack_identifier) {
              ratio.pack_id = fiscalData.pack_identifier;
              ratio.value = fiscalData.adjusted;
            }
            if (
              !fiscalData.pack_identifier &&
              matrixSummaryReducer?.packValue
            ) {
              ratio.pack_id = matrixSummaryReducer.packValue;
              ratio.value = fiscalData.adjusted;
            }
            if ("user_profile_data" in node.data) {
              ratio.user_profile =
                node.data.user_profile_data[fiscalDataKey]?.user_profile;
              if (node.data[fiscalDataKey].user_profile == 0) {
                ratio.ratio = node.data.user_profile_data[fiscalDataKey].ratio;
              } else {
                ratio.ratio =
                  node.data.user_profile_data[fiscalDataKey].ratio /
                  node.data[fiscalDataKey].user_profile;
              }
            }

            let currFiscalData = savepayload.find(
              ({ fiscal_timeperiod_id }) =>
                fiscal_timeperiod_id === fiscalDataKey
            );
            createAssignNestedValL2(
              currFiscalData,
              ratio,
              expandedNode.data.row,
              node.data.row,
              activeChildHierarchyKey
            );
          }
          // }
        }
      }
    });

    const adjusted = transformSavePayload(savepayload, matrixSummaryReducer);

    return adjusted;
  } catch (err) {
    console.log("error1234", err);
  }
};

// This fn is needed to form payload for L0 when L0 totaL and active L1 is edited
function checkParentChildBothEditedForL0(
  isActiveL1Edited,
  fiscalDataKey,
  activeChildHierarchyKey,
  savepayload
) {
  let currFiscalData = savepayload.find(
    ({ fiscal_timeperiod_id }) => fiscal_timeperiod_id === fiscalDataKey
  );

  if (
    !currFiscalData ||
    (currFiscalData && !isActiveL1Edited[currFiscalData])
  ) {
    return;
  }

  if (currFiscalData?.ratio || currFiscalData?.locked) {
    return true;
  }
}

function checkParentChildBothEdited(
  fiscalData,
  fiscalDataKey,
  activeChildHierarchyKey,
  savepayload
) {
  if (!fiscalData.isChildEdited) {
    return false;
  }

  let currFiscalData = savepayload.find(
    ({ fiscal_timeperiod_id }) => fiscal_timeperiod_id === fiscalDataKey
  );

  if (
    currFiscalData?.modified?.[LEVEL_0]?.[activeChildHierarchyKey]?.ratio ||
    currFiscalData?.modified?.[LEVEL_0]?.[activeChildHierarchyKey]?.locked
  ) {
    return true;
  }
}

const adjustedRatio = (ratio, parentRatio) => {
  if (isNumber(ratio)) {
    return ratio + "";
  }
  if (isNumber(parentRatio)) {
    return parentRatio + "";
  }
  return "";
};
// TO DO - Refactor createAssignNestedValL1 & createAssignNestedValL2 to use nested object recursive approach

export const createAssignNestedValL1 = (
  currFiscalData,
  ratio,
  l1,
  activeChildHierarchyKey
) => {
  if (currFiscalData.modified[LEVEL_0]?.[activeChildHierarchyKey]?.[LEVEL_1]) {
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][
      l1
    ] = ratio;
    return;
  }
  if (currFiscalData.modified[LEVEL_0]?.[activeChildHierarchyKey]) {
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][
      l1
    ] = ratio;
    return;
  }
  if (currFiscalData.modified[LEVEL_0]) {
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][
      l1
    ] = ratio;
    return;
  }
  currFiscalData.modified[LEVEL_0] = {};
  currFiscalData.modified[LEVEL_0][activeChildHierarchyKey] = {};
  currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1] = {};
  currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][
    l1
  ] = ratio;
  return;
};

export const createAssignNestedValL2 = (
  currFiscalData,
  ratio,
  l1,
  l2,
  activeChildHierarchyKey
) => {
  if (
    currFiscalData.modified[LEVEL_0]?.[activeChildHierarchyKey]?.[LEVEL_1]?.[
      l1
    ]?.[LEVEL_2]
  ) {
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ][l2] = ratio;
    return;
  }
  if (
    currFiscalData.modified[LEVEL_0]?.[activeChildHierarchyKey]?.[LEVEL_1]?.[l1]
  ) {
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ][l2] = ratio;
    return;
  }
  if (currFiscalData.modified[LEVEL_0]?.[activeChildHierarchyKey]?.[LEVEL_1]) {
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ][l2] = ratio;
    return;
  }
  if (currFiscalData.modified[LEVEL_0]?.[activeChildHierarchyKey]) {
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ][l2] = ratio;
    return;
  }
  if (currFiscalData.modified[LEVEL_0]) {
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ] = {};
    currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
      LEVEL_2
    ][l2] = ratio;
    return;
  }
  currFiscalData.modified[LEVEL_0] = {};
  currFiscalData.modified[LEVEL_0][activeChildHierarchyKey] = {};
  currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1] = {};
  currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1] = {};
  currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
    LEVEL_2
  ] = {};
  currFiscalData.modified[LEVEL_0][activeChildHierarchyKey][LEVEL_1][l1][
    LEVEL_2
  ][l2] = ratio;
  return;
};

export const formattedAdjustedPayload = (
  adjustedPayload,
  lastEditedDrivers,
  matrixSummaryReducer
) => {
  let predictedFiscalWeeks =
    matrixSummaryReducer?.xAxisStaticDates?.fiscal_ids || [];
  let formattedAdjustedPayload = [];

  predictedFiscalWeeks?.forEach((elem) => {
    formattedAdjustedPayload.push({
      fiscal_timeperiod_id: +elem,
      promo_percentage: null,
      price_point: null,
      modified: [],
      ratio: "",
    });
  });

  lastEditedDrivers?.forEach((elem) => {
    let currAdjustedPayload = formattedAdjustedPayload?.find(
      ({ fiscal_timeperiod_id }) =>
        +fiscal_timeperiod_id === +elem.fiscal_timeperiod_id
    );

    if (isNumber(elem.price_point) && elem.price_point !== null) {
      currAdjustedPayload.price_point = isNumber(elem.price_point)
        ? String(elem.price_point)
        : null;
    } else {
      currAdjustedPayload.promo_percentage = isNumber(elem.promo_percentage)
        ? String(elem.promo_percentage)
        : null;
    }
  });

  adjustedPayload?.forEach((elem) => {
    let currAdjustedPayload = formattedAdjustedPayload?.find(
      ({ fiscal_timeperiod_id }) =>
        +fiscal_timeperiod_id === +elem.fiscal_timeperiod_id
    );
    currAdjustedPayload.modified = elem.modified;
    currAdjustedPayload.ratio = elem.ratio;
  });

  let updatedAdjustedPricePointPayload = [];
  let updatedAdjustedDiscountPayload = [];

  formattedAdjustedPayload?.forEach((elem) => {
    if (isNumber(elem.price_point) && elem.price_point !== null) {
      updatedAdjustedPricePointPayload.push(elem);
    } else {
      updatedAdjustedDiscountPayload.push(elem);
    }
  });

  return [updatedAdjustedDiscountPayload, updatedAdjustedPricePointPayload];
};

// chart data set new data in existing chart data on change of DF
export const overrideDeepNestedObject = (
  chartData,
  newChartData,
  matrixSummaryReducer
) => {
  let oldChartData = cloneDeep(chartData);
  let aggLevelSelected = matrixSummaryReducer?.switchTimeLine?.[0]?.value;

  for (const key in newChartData) {
    if (oldChartData.hasOwnProperty(key)) {
      if (
        Array.isArray(oldChartData[key]) &&
        Array.isArray(newChartData[key])
      ) {
        // Merge arrays based on fiscal_year_week
        oldChartData[key] = oldChartData[key].map((item1) => {
          let fiscal_year_week = [FISCAL_KEY_MAPPING[aggLevelSelected]];

          const item2 = newChartData[key].find(
            (item) => item[fiscal_year_week] === item1[fiscal_year_week]
          );

          if (key === "historical_actuals_data") {
            // on change of DF, there won't be any change in
            //   historical_actuals_data, hence skipping the override,
            return item1;
          }

          return item2 ? { ...item1, ...item2 } : item1;
        });
      } else {
        // Recursively override nested objects
        oldChartData[key] = overrideDeepNestedObject(
          oldChartData[key],
          newChartData[key]
        );
      }
    } else {
      // Override other properties
      oldChartData[key] = newChartData[key];
    }
  }

  return oldChartData;
};

export const resetValuesonInstance = (instance) => {
  instance?.current?.api?.forEachNode((node) => {
    for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
      if (isNumber(fiscalDataKey)) {
        delete fiscalData.isEdited;
        delete fiscalData.adjusted_manual;
      }
    }
  });
};

export const resetActiveDeepDive = (
  editHierarchyTotalRowInstance,
  editHierarchyInstance,
  editHierarchyChildInstance,
  editHierarchyGrandChildInstance,
  editHierarchyChildTotalRowInstance,
  allEditedChildRowData,
  allEditedGrandChildRowData
) => {
  resetValuesonInstance(editHierarchyTotalRowInstance);
  resetValuesonInstance(editHierarchyInstance);
  resetValuesonInstance(editHierarchyChildTotalRowInstance);
  resetValuesonInstance(editHierarchyChildInstance);
  resetValuesonInstance(editHierarchyGrandChildInstance);

  allEditedChildRowData.current = {};
  allEditedGrandChildRowData.current = {};
};

export function formatNumberThreeDecimal(value) {
  let formattedValue = value;
  if (Number.isInteger(+formattedValue)) {
    return formattedValue;
  } else {
    formattedValue = parseFloat(+value.toFixed(3));
  }
  if (isNaN(formattedValue)) {
    return formattedValue;
  }
  return formattedValue;
}

const showCalendarStartEndLabelHandler = (week, matrixSummaryReducer) => {
  const fiscalCalendarData = matrixSummaryReducer?.fiscalCalendarDetails;
  let dateFormat =
    matrixSummaryReducer?.clientConfig?.attribute_value
      ?.calendar_start_end_both_label_config?.date_formatting;
  let fiscalSeasonBeginDate =
    matrixSummaryReducer?.clientConfig?.attribute_value
      ?.calendar_start_end_both_label_config?.calendar_start_label_config;
  let fiscalSeasonEndDate =
    matrixSummaryReducer?.clientConfig?.attribute_value
      ?.calendar_start_end_both_label_config?.calendar_end_label_config;

  let calendarWeekDate = fiscalCalendarData?.find(
    (elem) => elem?.fiscal_year_week == week
  );

  let startWeekDay = moment(calendarWeekDate?.[fiscalSeasonBeginDate]); //milliseconds
  let endWeekDay = moment(calendarWeekDate?.[fiscalSeasonEndDate]); //milliseconds
  let startWeekDayFormatted = startWeekDay.format(dateFormat);
  let endWeekDayFormatted = endWeekDay.format(dateFormat);
  return `${startWeekDayFormatted}-${endWeekDayFormatted}`;
  // show_calendar_start_end_both_label
};

export const weekEndDateLabel = (week, matrixSummaryReducer) => {
  let dateFormat =
    matrixSummaryReducer?.clientConfig?.attribute_value
      ?.week_end_date_label_config?.week_end_date_label_formatting;

  let isShowCalendarStartEndLabel =
    matrixSummaryReducer?.clientConfig?.attribute_value?.show_features
      ?.show_calendar_start_end_both_label;

  if (isShowCalendarStartEndLabel) {
    return showCalendarStartEndLabelHandler(week, matrixSummaryReducer);
  }

  let fiscalSeasonDate =
    matrixSummaryReducer?.clientConfig?.attribute_value
      ?.week_end_date_label_config?.week_end_date_label_key;

  const fiscalCalendarData = matrixSummaryReducer?.fiscalCalendarDetails;

  let calendarWeekStartDate = fiscalCalendarData?.find(
    (elem) => elem?.fiscal_year_week == week
  );

  let day = moment(calendarWeekStartDate?.[fiscalSeasonDate]); //milliseconds

  let formattedDay = day.format(dateFormat);
  let updatedDay = `WE ${formattedDay}`;
  return updatedDay || week + "";
};

export const addIdToAggridScrollElem = (id) => {
  var node = document?.getElementById(id);
  var scrollNode = node?.getElementsByClassName(
    "ag-body-horizontal-scroll-viewport"
  )?.[0];
  if (scrollNode) {
    scrollNode.id = `${id}-scrollbar`;
  }
};

export const numberFormattingWithCommas = (value, roundOff) => {
  if (isNaN(value)) {
    return "";
  }
  if (value === undefined || value === null) {
    return value;
  }
  let num = decimalsFormatter({ value: +value }, roundOff);
  let commaSeparatedValue = num
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return commaSeparatedValue;
};

export function checkIfCellIsDisabledForViewEdit(
  cellProps,
  matrixSummaryReducer,
  id
) {
  if (id === "IA") return false;
  if (id === "Comparison") return true;

  if (cellProps?.colDef?.disabled) return true;

  const column_name = cellProps?.colDef?.id.split(".")[0];
  const predictedColumnNames =
    matrixSummaryReducer?.xAxisStaticDates?.fiscal_ids || [];
  if (
    predictedColumnNames?.includes(column_name) ||
    predictedColumnNames?.includes(+column_name)
  ) {
    return false;
  }
  return true;
}

export function checkIfForecastIsEmptyForViewEdit(
  cellProps,
  column,
  columnDisplayName
) {
  return (
    cellProps.colDef?.is_editable &&
    column !== columnDisplayName &&
    (cellProps.data?.[column]?.IA === null ||
      cellProps.data?.[column]?.IA === undefined)
  );
}

export function displayEmptyForecastForViewEdit() {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        justifyContent: "space-between",
      }}
    >
      <span>-</span>
    </div>
  );
}

export const getRowDataPayload = (
  payload,
  updatedLastEditedDrivers = [],
  matrixSummaryReducer,
  week,
  selected_promo_type,
  promo_percentage,
  price_point
) => {
  let rowDataPayload = cloneDeep(payload);
  rowDataPayload.filters.promo_percentage =
    isNumber(promo_percentage) && promo_percentage !== null
      ? String(promo_percentage)
      : null;
  rowDataPayload.filters.price_point =
    isNumber(price_point) && price_point !== null ? String(price_point) : null;

  if (week) {
    if (rowDataPayload?.filters?.aggregation_level === "W") {
      rowDataPayload.filters.timeline = {
        start_week_id: week,
        end_week_id: week,
      };
    } else {
      rowDataPayload.filters.timeline = {
        start_week_id:
          rowDataPayload?.filters?.compare_timeline?.[0]?.start_week_id,
        end_week_id:
          rowDataPayload?.filters?.compare_timeline?.[0]?.end_week_id,
      };
    }
  }
  rowDataPayload.filters.selected_promo_type = selected_promo_type;

  let [
    adjustedDiscountPayload,
    adjustedPricePointPayload,
  ] = formattedAdjustedPayload(
    [],
    updatedLastEditedDrivers,
    matrixSummaryReducer
  );

  rowDataPayload.adjusted = adjustedDiscountPayload;
  rowDataPayload.adjusted_price_point = adjustedPricePointPayload;
  if (week) {
    rowDataPayload.adjusted = adjustedDiscountPayload.filter(
      ({ promo_percentage }) => promo_percentage
    );

    rowDataPayload.adjusted_price_point = adjustedPricePointPayload.filter(
      ({ price_point }) => price_point
    );
  }
  return rowDataPayload;
};

export const getEditForecastRowData = (
  payload,
  matrixSummaryReducer,
  getAllWeeksResponse,
  lastEditedDrivers,
  isPredictedDataFetched,
  isCalledFromMFPDashboard = false,
  selectedRowsFromMFP
) => {
  let forecastMultiplierPayload = cloneDeep(payload);
  var Mfp_Key =
    matrixSummaryReducer?.clientConfig?.attribute_value?.attribute_value?.mfp
      ?.mfp_level;

  if (isCalledFromMFPDashboard) {
    forecastMultiplierPayload.filters.mfp = true;
    forecastMultiplierPayload.filters.mfp_flag = selectedRowsFromMFP[0]?.flag;
    forecastMultiplierPayload.filters.product_hierarchy[Mfp_Key] = [
      selectedRowsFromMFP[0]?.choice,
    ];
    forecastMultiplierPayload.filters.store_hierarchy.channel = [
      selectedRowsFromMFP[0]?.channel,
    ];
  }

  let [
    adjustedDiscountPayload,
    adjustedPricePointPayload,
  ] = formattedAdjustedPayload([], lastEditedDrivers, matrixSummaryReducer);

  let updatedAdjustedDiscountPayload = cloneDeep(adjustedDiscountPayload);
  let updatedAdjustedPricePointPayload = cloneDeep(adjustedPricePointPayload);

  // if component is already loaded and changes made DF, then fetch only for week for which value is updated
  if (isPredictedDataFetched) {
    let filteredAdjustedDiscountPayload = adjustedDiscountPayload.filter(
      ({ promo_percentage }) => promo_percentage
    );
    let filteredAdjustedPricePointPayload = adjustedPricePointPayload.filter(
      ({ price_point }) => price_point
    );

    if (filteredAdjustedDiscountPayload?.length && !getAllWeeksResponse) {
      updatedAdjustedDiscountPayload = filteredAdjustedDiscountPayload;
    }
    if (filteredAdjustedPricePointPayload?.length && !getAllWeeksResponse) {
      updatedAdjustedPricePointPayload = filteredAdjustedPricePointPayload;
    }
  }
  forecastMultiplierPayload.adjusted = updatedAdjustedDiscountPayload;
  forecastMultiplierPayload.adjusted_price_point = updatedAdjustedPricePointPayload;

  return [forecastMultiplierPayload, updatedAdjustedDiscountPayload];
};

export const getAdjustedDiscountPayload = (predictedFiscalWeeks) => {
  let adjustedDiscountPayload = [];
  predictedFiscalWeeks?.forEach((elem) => {
    adjustedDiscountPayload.push({
      fiscal_timeperiod_id: elem,
      promo_percentage: null,
      price_point: null,
      modified: [],
    });
  });
  return adjustedDiscountPayload;
};

export const getInitialPayload = (
  matrixSummaryReducer,
  selectedGraphFilters
) => {
  const historicalDataFiscalWeek =
    matrixSummaryReducer?.historicalDataFiscalWeek;

  const historicalDataFiscalWeekCompare =
    matrixSummaryReducer?.historicalDataFiscalWeekCompare;
  const updatedPayload = cloneDeep(matrixSummaryReducer);
  updatedPayload.future = updatedPayload.fiscalDates;

  updatedPayload.fiscalDates = historicalDataFiscalWeek;
  updatedPayload.historicActuals = historicalDataFiscalWeekCompare;
  if (selectedGraphFilters) {
    let selectedStoreFilters = selectedGraphFilters?.filter(
      (elem) => elem.dimension === "store"
    );
    let selectedProductFilters = selectedGraphFilters?.filter(
      (elem) => elem.dimension === "product"
    );

    let updatedStoreFilter = updatedPayload.store;
    let updatedProductFilter = updatedPayload.product;

    if (selectedStoreFilters?.length) {
      updatedStoreFilter = selectedStoreFilters;
    }

    if (selectedProductFilters?.length) {
      updatedProductFilter = selectedProductFilters;
    }

    updatedPayload.store = updatedStoreFilter;
    updatedPayload.product = updatedProductFilter;
  }

  return updatedPayload;
};

export const utilFetchHistoricActuals = async (
  clonedReducer,
  matrixSummaryReducer,
  dispatch,
  setMultiplierLoaderCount,
  setCompareScreenLoaderCount,
  setAllChartData,
  pastYearDataRef,
  actualDataRef,
  historicalActualDataRef,
  setActuals,
  setActualsDiscount,
  historicalPastYearDataRef
) => {
  try {
    let isMFPShownOnCharts =
      matrixSummaryReducer?.clientConfig?.attribute_value?.show_features
        ?.show_mfp_on_charts;

    const payload = chartDataPayload(
      clonedReducer,
      null,
      null,
      null,
      null,
      clonedReducer?.isEligible,
      null,
      true,
      null,
      null,
      isMFPShownOnCharts
    );

    payload.filters.timeline = {
      start_week_id: clonedReducer?.fiscalDates?.start_fw,
      end_week_id: clonedReducer?.fiscalDates?.end_fw,
    };

    let predictedFiscalWeeks =
      matrixSummaryReducer?.xAxisStaticDates?.fiscal_ids || [];

    payload.adjusted = getAdjustedDiscountPayload(predictedFiscalWeeks);
    payload.adjusted_price_point = [];

    dispatch(setMultiplierLoaderCount(1));
    dispatch(setCompareScreenLoaderCount(1));

    const response = await getChartData(payload);
    dispatch(setAllChartData(cloneDeep(response)));

    const {
      historical_actuals_data,
      actuals_data,
      ia_default_forecast_data,
    } = cloneDeep(response);

    let formattedData = {
      forecast_multiplier: "Original IA Forecast",
      row: "Original",
    };
    let aggLevelSelected = matrixSummaryReducer?.switchTimeLine?.[0]?.value;

    ia_default_forecast_data?.forEach((week) => {
      let currWeek = week?.[FISCAL_KEY_MAPPING[aggLevelSelected]];

      if (isNumber(currWeek)) {
        formattedData[currWeek] = {
          IA: week.predicted_qty,
          ratio: 1,
          adjusted: week.predicted_qty,
        };
      }
    });
    // console.log("ss123467", formattedData);

    // TO show Original IA forecast row in Multiplier table
    dispatch(
      setAllForecastMultiplierData({
        key: "IA",
        value: formattedData,
      })
    );

    pastYearDataRef.current = historical_actuals_data;

    let [formattedActuals, formattedActualsDiscount] = formatActualsData(
      actuals_data,
      matrixSummaryReducer
    );

    let updatedActuals = {
      formattedActuals,
      formattedActualsDiscount,
    };

    actualDataRef.current = updatedActuals;

    const { actualsMerged, actualsDiscountMerged } = mergeResponse(
      historicalActualDataRef,
      updatedActuals
    );

    dispatch(setActuals(actualsMerged));
    dispatch(setActualsDiscount(actualsDiscountMerged));

    let timeline = matrixSummaryReducer?.switchTimeLine?.[0]?.value;

    pastYearDataRef.current = historical_actuals_data;

    let mergedHistoricalData = mergeHistoricDataHandler(
      historicalPastYearDataRef?.current,
      historical_actuals_data,
      matrixSummaryReducer,
      true
    );

    dispatch(setHistoricalActualData(mergedHistoricalData));
  } catch (error) {
    console.log("error", error);
  } finally {
    dispatch(setCompareScreenLoaderCount(-1));

    dispatch(setMultiplierLoaderCount(-1));
  }
};
