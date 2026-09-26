import { getAllFilters, getFiltersValues } from "core/actions/filterAction";
import SelectContainer from "core/commonComponents/filters/SelectContainer";
import { cloneDeep, isEmpty } from "lodash";
import moment from "moment";
import { ADA_DASHBOARD_FILTER_CONFIG } from "../constants-ada/apiConstants";
import {
  EXPECTED_ADA_FILTER_DIMENSIONS,
  FISCAL_KEY_MAPPING,
  LEVEL_0,
  LEVEL_1,
  LEVEL_2,
  UNIQUE_ROW_KEY,
} from "../constants-ada/stringContants";
import {
  fetchCompareFiscalWeeks,
  fetchFiscalWeeks,
  getProductData,
  getStaticForecastXaxis,
  setFullScreenLoaderCount,
  setHistoricalFiscalData,
  setInventorypreAppliedFilters,
  setXaisStaticHistoricDates,
  setXaxisStaticDates,
  setFiscalIdPayload,
  setGraphKPIWeeks,
  setHistoricActuals,
  setCompareWithSelectedDate,
  setIsCompareWithDropdown,
  setFilters,
  getChartData,
} from "../services-ada/ada-dashboard/ada-dashboard-services";
import {
  getCombinedFilterDashboardData,
  mapDataToLabel,
} from "core/commonComponents/coreComponentScreen/utils";
// util fn

import theme from "core/Styles/theme";
import {
  setAllForecastMultiplierData,
  setForecastMultiplierData,
} from "../services-ada/ada-dashboard/ada-forecastmultiplier-services";
import colours from "core/Styles/colours";
import { adaReducer } from "../services-ada/ada-combined-services";
import { formatStringDate, binaryClosestIdx } from "core/Utils/functions/utils";
import { decimalsFormatter } from "core/Utils/formatter";
import {
  formatActualsData,
  mergeResponse,
  mergeHistoricDataHandler,
} from "./customHooks/useHostoricActuals";

import { setHistoricalActualData } from "../services-ada/ada-dashboard/ada-forecastmultiplier-services";
import { KEYS_USED_OTHER_THAN_FISCAL_WEEK } from "modules/ada/constants-ada/stringContants";

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

export const createDynamicYears = (selectedDate, numberOfFiscalYear) => {
  const getYearsList = (year) => {
    let yearsLength = 4;

    if (numberOfFiscalYear && isNumber(numberOfFiscalYear)) {
      yearsLength = numberOfFiscalYear;
    }

    let list = [];
    while (yearsLength > 0) {
      list.push(year);
      year--;
      yearsLength--;
    }
    list = list.reverse();
    return configureYearOptions(list);
  };

  const currYear =
    parseInt(
      selectedDate?.fiscalInfoEndDate?.fiscal_year_week
        .toString()
        .substring(0, 4)
    ) - 1;

  const yearsList = getYearsList(currYear);

  return yearsList;
};

export const filterByDimension = (filters, dimension) => {
  return filters.filter((filter) => filter.dimension === dimension);
};

export const configureYearOptions = (options) => {
  return options.map((item, index) => {
    return {
      value: item,
      label: item,
      id: item,
      value: `${item}`,
      label: `${item}`,
      id: `${item}`,
      index: `${index + 1}`,
    };
  });
};

export const getStyleObj = (values = []) => ({
  filter_name: "Style Number",
  filter_id: "style",
  filter_type: "cascaded",
  dimension: "product",
  display_type: "dropdown",
  is_mandatory: false,
  values: values,
  attribute_name: "style",
  operator: "in",
});

export const fetchFilterOptions = async (
  filtersList,
  appliedFilters,
  uamScreenName
) => {
  const filters = appliedFilters?.map((item) => ({
    attribute_name: item.attribute_name,
    operator: "in",
    values: Array.isArray(item.values)
      ? item.values.map(
          (selectedValue) => selectedValue?.value || selectedValue
        )
      : item.values,
    filter_type: item.filter_type,
    filter_id: item.attribute_name,
    dimension: item.dimension,
  }));

  let initialDependency = filters?.filter(
    (filter) =>
      filter.dimension !== "custom" && filter.filter_type !== "non-cascaded"
  );
  let filterDashboardData = [];
  const quickFilterLoad = JSON.parse(localStorage.getItem("quickFilterLoad"));

  if (!quickFilterLoad) {
    filterDashboardData = await getCombinedFilterDashboardData(
      filtersList,
      initialDependency,
      uamScreenName
    );
  }
  const filterElements = filtersList?.map(async (key) => {
    key.filter_keyword = key.column_name;
    key.levelLabel = "Hierarchy";
    key.component = SelectContainer;
    const options = filterDashboardData[key.column_name];
    key.initialData = options?.map((item) => {
      return mapDataToLabel(item);
    });
    return key;
  });
  const response = await Promise.all(filterElements);
  return response;
};

export const fetchCrossFilterOptions = async (
  filtersList,
  appliedFilters,
  uamScreenName,
  customDependencyValue
) => {
  const filters = appliedFilters?.map((item) => ({
    attribute_name: item.filter_id,
    dimension: item.dimension,
    operator: "in",
    values: Array.isArray(item.values)
      ? item.values.map((selectedValue) => {
          if (selectedValue?.value !== undefined) {
            return selectedValue?.value;
          } else {
            return selectedValue;
          }
        })
      : item.values,
    filter_type: item.filter_type,
    filter_id: item.filter_id,
  }));

  const filterDashboardData = await getCombinedFilterDashboardData(
    filtersList,
    filters,
    uamScreenName,
    "",
    customDependencyValue
  );

  const filterElements = filtersList?.map(async (key) => {
    const options = filterDashboardData[key.column_name];
    key.filter_keyword = key.column_name;
    key.levelLabel = "Hierarchy";
    key.display_type = "dropdown";
    key.is_multiple_selection = true;
    key.label = key.display_name;
    key.type = "cascaded";
    key.component = SelectContainer;
    key.initialData = options?.map((item) => {
      return mapDataToLabel(item);
    });
    return key;
  });
  const response = await Promise.all(filterElements);
  return response;
};

export const fetchFilterConfig = async () => {
  const response = await getAllFilters(ADA_DASHBOARD_FILTER_CONFIG)();
  return response.data.data;
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
  promoType = "promo_percentage",
  isEligible,
  isCalledFromMFPDashboard,
  iscalledFromCharts,
  selectedRowsFromMFP,
  tableName,
  isHistoricMFPRequired,
  isCompareWithDropdown
) => {
  let isEpFeedAvailable = false;
  if (isCalledFromMFPDashboard || isHistoricMFPRequired) {
    isEpFeedAvailable = true;
  } else {
    if (
      tableName === "forecast_multiplier" ||
      tableName === "visualization" ||
      tableName === "MFP"
    ) {
      if (data?.clientConfig?.attribute_value?.mfp) {
        isEpFeedAvailable = true;
      }
    } else {
      isEpFeedAvailable = false;
    }
  }
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
      mfp: isEpFeedAvailable,
      is_compare_with_dropdown: isCompareWithDropdown,
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
  maintainNullValues
) => {
  const totalRowData = {
    total_rows: rowData?.length,
    row: "total",
    // first column will contain the hierarcy info
    [columns?.[0].column_name]: `Total ${
      activeChildHierarchyKey ? `- ${activeChildHierarchyKey}` : ""
    }`,
  };

  let totalNode = editHierarchyTotalRowInstance?.current?.api?.getRowNode(
    "total"
  );

  let emptyIAForecast = [];
  let emptyAdjustedForecast = [];
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

        if (isL0SiblingsUnLockedForEmptyForecast && elem[key].IA === null) {
          continue;
        } else {
          totalRowData[key]["IA"] =
            (totalRowData[key]?.IA || 0) + (Number(elem[key].IA) || 0);
          totalRowData[key]["adjusted"] =
            (totalRowData[key]?.adjusted || 0) +
            (Number(elem[key].adjusted) || 0);
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

export const prepareInventoryPayload = (
  context,
  dispatch,
  setActiveKey,
  adaDashboardReducer,
  isRedirectedFromMFP,
  callback
) => {
  let inventoryPayload = {
    ...context,
    meta: {
      search: [],
      range: [],
      sort: [],
      limit: {
        limit: 100000000,
        page: 1,
      },
    },
  };
  dispatch(setFullScreenLoaderCount(1));

  const timeline = { ...inventoryPayload?.timeline };

  const payload = {};

  if (!isEmpty(inventoryPayload?.payload)) {
    for (let product_key in inventoryPayload?.payload) {
      if ([...UNIQUE_ROW_KEY]?.includes(product_key)) {
        if (inventoryPayload?.payload?.[product_key]?.length > 0) {
          payload.product = [
            {
              filter_id: product_key,
              filter_type: "cascaded",
              dimension: "product",
              values: inventoryPayload?.payload?.[product_key]?.map((code) => {
                return {
                  value: code,
                  label: code,
                  id: code,
                };
              }),
            },
          ];
        }
      } else continue;
    }
  }

  if (inventoryPayload?.payload?.store_code?.length) {
    payload.store = [
      {
        filter_id: "store_code",
        filter_type: "cascaded",
        dimension: "store",
        values: inventoryPayload?.payload?.store_code?.map((code) => {
          return {
            value: code,
            label: code,
            id: code,
          };
        }),
      },
    ];
  }

  if (context?.selectedDependency?.length) {
    for (let elem of context?.selectedDependency) {
      if ([...UNIQUE_ROW_KEY, "store_code"]?.includes(elem?.filter_id))
        continue;
      let selectedFilter = {
        ...elem,
        values: elem?.values?.map((code) => {
          return {
            value: code,
            label: code,
            id: code,
          };
        }),
      };

      if (!payload[elem?.dimension]) {
        payload[elem?.dimension] = [];
      }
      payload[elem?.dimension]?.push(selectedFilter);
    }
  }

  const getFiscalDate = async () => {
    try {
      const response = await fetchFiscalWeeks(
        timeline.startDate,
        timeline.endDate
      );

      const fiscalDatesInfo = response?.data?.data?.start_date;

      const currFiscalYear = String(fiscalDatesInfo.end_fw)?.slice(0, 4);

      const fiscalDates = {
        start_fw: fiscalDatesInfo.start_fw,
        end_fw: fiscalDatesInfo.end_fw,
        start_date: formatStringDate(fiscalDatesInfo?.start_date, true),
        end_date: formatStringDate(
          fiscalDatesInfo?.end_date,

          true
        ),
        selectedDate: context?.selectedDate,
      };

      setDefaultDateRedirect(
        fiscalDates,
        dispatch,
        context?.isCompareWithDropdown
      );
      payload.fiscalDates = fiscalDatesInfo;

      // const compareWeeks = await fetchCompareFiscalWeeks({
      //   year: Number(currFiscalYear) - 1,
      //   start_fw: fiscalDatesInfo.start_fw,
      //   end_fw: fiscalDatesInfo.end_fw,
      //   complete_year: false,
      // });

      let xAxispayload = {
        start_week_id: fiscalDatesInfo?.start_fw,
        end_week_id: fiscalDatesInfo?.end_fw,
        agg_level: "W",
      };

      if (isRedirectedFromMFP) {
        let compareWithYearPayload = [];
        let past_years = [];
        context?.compareWithSelectedDate?.map(({ value }) => {
          compareWithYearPayload.push({
            year: Number(value),
            start_week_id: fiscalDates?.start_fw,
            end_week_id: fiscalDates?.end_fw,
            complete_year: false,
          });
          past_years.push(Number(value));
        });
        payload.historicActuals = compareWithYearPayload;
        xAxispayload.past_years = past_years;
        xAxispayload.agg_level = context?.agg_level;
        dispatch(setIsCompareWithDropdown(context?.isCompareWithDropdown));
        dispatch(
          setFilters({ key: "switchTimeLine", value: context?.switchTimeLine })
        );
        dispatch(setCompareWithSelectedDate(context?.compareWithSelectedDate));
      } else {
        let compareWithYear = [
          {
            year: Number(currFiscalYear) - 1,
            start_week_id: fiscalDatesInfo.start_fw,
            end_week_id: fiscalDatesInfo.end_fw,
            complete_year: false,
          },
        ];
        payload.historicActuals = compareWithYear;
        let currFormattedYear = String(fiscalDatesInfo?.end_fw)?.slice(0, 4);
        let past_years = [+currFormattedYear - 1];
        xAxispayload.past_years = past_years;
      }
      payload.fiscalDates.selectedDate = context?.selectedDate;

      dispatch(setInventorypreAppliedFilters(payload));

      const data = await getStaticForecastXaxis(xAxispayload);

      dispatch(setXaxisStaticDates(data));

      setActiveKey((prevState) => prevState + 1);
    } catch (error) {
      console.log(error);
    } finally {
      dispatch(setFullScreenLoaderCount(-1));
      localStorage.removeItem("adaPayload");
      localStorage.removeItem("adaPayloadFromInventory");
      callback && callback();
    }
  };
  getFiscalDate();

  let defaultHistoricWeek =
    adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
      ?.dashboard?.defaultHistoricWeek;

  if (defaultHistoricWeek) {
    let formattedDefaultHistoricWeek = [
      {
        hist_week_values: defaultHistoricWeek,
        available_hist_weeks: `${defaultHistoricWeek} weeks`,
        label: `${defaultHistoricWeek} weeks`,
        value: defaultHistoricWeek,
      },
    ];
    updateDependency(
      null,
      formattedDefaultHistoricWeek,
      dispatch,
      adaDashboardReducer
    );
  }
};

const updateDependency = async (_, value, dispatch, adaReducer) => {
  const onClearPayload = {
    selectedHistoricValue: [],
    historicalDataFiscalWeek: {},
    historicalDataFiscalWeekCompare: {},
  };

  if (!value?.length) {
    dispatch(setXaisStaticHistoricDates({}));
    dispatch(setGraphKPIWeeks(DEFAULT_WEEK));

    return dispatch(setHistoricalFiscalData(onClearPayload));
  }

  try {
    dispatch(setFullScreenLoaderCount(1));
    dispatch(setGraphKPIWeeks(value[0]));

    const { currDate, historicDate } = currentHistoricDates(value[0]);

    const response = await fetchFiscalWeeks(historicDate, currDate);

    const fiscalDatesInfo = response?.data?.data?.start_date;

    // Predicted compare with mapping with historic compare with mapping
    let predictedHistoricCompareWithMapping = {};

    let past_years = [];
    let historicViewEndYear = +String(fiscalDatesInfo.end_fw)?.slice(0, 4);

    // If compare with is selected via dropdown and predicted year and historic data of "See Historic View"
    // dropdown year does not fall in same year then in order to form correct payload to see the correct data
    // we need substract 1 from each year selected from "Compare with" dropdown
    if (adaReducer?.isCompareWithDropdown) {
      let selectedCompareWith = adaReducer?.compareWithSelectedDate?.map(
        (elem) => +elem.value
      );
      if (selectedCompareWith?.includes(+historicViewEndYear)) {
        let formattedCompareWithHistoricViewYears = selectedCompareWith.map(
          (elem) => {
            predictedHistoricCompareWithMapping[elem] = elem - 1;

            return elem - 1;
          }
        );

        past_years = formattedCompareWithHistoricViewYears;
      } else {
        selectedCompareWith.forEach((elem) => {
          predictedHistoricCompareWithMapping[elem] = elem;
        });
        past_years = selectedCompareWith;
      }
    } else {
      let lastYear = handleCompareBtnClick(adaReducer?.fiscalDates?.end_fw, 1);
      let lastToLastYear = handleCompareBtnClick(
        adaReducer?.fiscalDates?.end_fw,
        2
      );
      let comparisonYear = adaReducer?.compareWithSelectedDate?.[0]?.value;
      let historicCompareWith = null;
      if (
        !adaReducer?.isCompareWithDropdown &&
        comparisonYear === lastYear?.value
      ) {
        historicCompareWith = historicViewEndYear - 1;
      }
      if (
        !adaReducer?.isCompareWithDropdown &&
        comparisonYear === lastToLastYear?.value
      ) {
        historicCompareWith = historicViewEndYear - 2;
      }
      past_years.push(historicCompareWith);

      let currFormattedYear = adaReducer?.compareWithSelectedDate?.[0]?.value;

      predictedHistoricCompareWithMapping[
        currFormattedYear
      ] = historicCompareWith;
    }

    let xAxispayload = {
      start_week_id: fiscalDatesInfo?.start_fw,
      end_week_id: fiscalDatesInfo?.end_fw,
      past_years,
      agg_level: adaReducer?.switchTimeLine?.[0]?.value,
    };
    const data = await getStaticForecastXaxis(xAxispayload);

    const compareWithYear = past_years?.map((elem) => {
      return {
        year: elem,
        start_week_id: fiscalDatesInfo.start_fw,
        end_week_id: fiscalDatesInfo.end_fw,
      };
    });
    const payload = {
      selectedHistoricValue: value,
      historicalDataFiscalWeek: fiscalDatesInfo,
      historicalDataFiscalWeekCompare: compareWithYear,
      predictedHistoricCompareWithMapping,
    };

    dispatch(setHistoricalFiscalData(payload));
    dispatch(setXaisStaticHistoricDates(data));
  } catch (error) {
  } finally {
    dispatch(setFullScreenLoaderCount(-1));
  }
};

export const isNumber = (value) => {
  if (value === null || value === undefined) return false;

  return typeof Number(value) === "number" && !isNaN(Number(value));
};

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
  adaReducer
) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    editHierarchyActionMap,
    allowEdit,
    showIAData,
    adaReducer: adaReducer?.switchTimeLine?.[0]?.value,
    extra: {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    },
    timeline: adaReducer?.switchTimeLine?.[0]?.value,
  };
};
export const getHistoricEditHierarchyPayload = (
  payload,
  showIAData,
  adaReducer
) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];

  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    showIAData,
    timeline: adaReducer?.switchTimeLine?.[0]?.value,
    extra: {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    },
  };
};
export const getEditHierarchyChildPayload = (
  payload,
  allowEdit,
  showIAData,
  adaReducer
) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    allowEdit,
    showIAData,
    timeline: adaReducer?.switchTimeLine?.[0]?.value,
    aggLevelCount:
      adaReducer?.clientConfig?.attribute_value?.aggLevelCount || 3,
    extra: {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    },
  };
};
export const getUpdatedResponse = (response, allowEdit, adaReducer) => {
  const isWeekEndDateLabelEnabled =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.is_week_end_date_label_enabled;

  let showWeekEndDateLabelEnabled =
    isWeekEndDateLabelEnabled && adaReducer?.switchTimeLine?.[0]?.value === "W";

  return response?.data?.data.map((el, i) => {
    if (i !== 0) {
      return {
        ...el,
        is_lockable: false,
        disabled: !allowEdit,
        is_sortable: false,
        is_searchable: false,
        // label:
        //   i === 1
        //     ? el.label
        //     : showWeekEndDateLabelEnabled
        //     ? weekEndDateLabel(el.label, adaReducer)
        //     : `F${adaReducer?.switchTimeLine?.[0]?.value}-${el.label}`,

        label:
          i === 1
            ? el.label
            : columnLabelHandler(
                el.label,
                adaReducer,
                showWeekEndDateLabelEnabled
              ),
      };
    }
    return { ...el, is_sortable: false, is_searchable: false };
  });
};
export const getHistoricEditHierarchyChild = (
  payload,
  showIAData,
  adaReducer
) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    showIAData,
    timeline: adaReducer?.switchTimeLine?.[0]?.value,
    extra: {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    },
  };
};

export const gethistoricalEditHierarchyGrandChildPayload = (
  payload,
  showIAData,
  adaReducer
) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    showIAData,
    timeline: adaReducer?.switchTimeLine?.[0]?.value,
    extra: {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    },
  };
};
export const getfetchEditHierarchyGrandChild = (
  payload,
  allowEdit,
  showIAData,
  adaReducer
) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.EditHierarchyForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];
  return {
    payload: {
      ...payload.filters.timeline,
      aggregation_level: payload.filters.aggregation_level,
      formatter,
    },
    allowEdit,
    showIAData,
    timeline: adaReducer?.switchTimeLine?.[0]?.value,
    extra: {
      fullWidth: true,
      roundOffTo: decimalsToShow,
      ignoreValueGetter: true,
    },
  };
};
export const getPromoPayload = (
  payload,
  showIAData,
  adaReducer,
  allPromoFactors
) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.driverForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];
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

export const AllDriverForecastPayload = (payload, showIAData, adaReducer) => {
  let decimalsToShow =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.driverForecast;
  let formatter =
    adaReducer?.clientConfig?.attribute_value?.decimal_rounding_off_mapping?.[
      decimalsToShow
    ];
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

export const graphKPIUtil = (
  adaReducer,
  fiscalDatesInfo,
  selectedGraphFilters,
  isEligible
) => {
  const historicalDataFiscalWeekCompare =
    adaReducer?.historicalDataFiscalWeekCompare;
  const updatedPayload = cloneDeep(adaReducer);
  updatedPayload.future = updatedPayload.fiscalDates;
  updatedPayload.fiscalDates = fiscalDatesInfo;
  updatedPayload.historicActuals = historicalDataFiscalWeekCompare;
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

  const graphKPIPayload = chartDataPayload(
    updatedPayload,
    null,
    null,
    null,
    null,
    isEligible
  );
  graphKPIPayload.filters.snapshot = updatedPayload.fiscalDates.start_fw;
  return graphKPIPayload;
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

export const updatedChartData = (
  chartConfig,
  chartData,
  historicChartData,
  adaReducer,
  id,
  hidePastHistoricData
) => {
  let isHistoricDataFetched =
    historicChartData?.actuals_data?.length &&
    historicChartData?.ia_forecast_data?.length;
  return buildTrendsGraphData(
    chartConfig,
    mergeChartResponse(chartData, historicChartData, adaReducer),
    adaReducer,
    id,
    hidePastHistoricData,
    isHistoricDataFetched
  );
};

export const buildTrendsGraphData = (
  chartConfig,
  data = {},
  adaReducer,
  activeTab,
  hidePastHistoricData,
  isHistoricDataFetched
) => {
  try {
    let timeline = adaReducer?.switchTimeLine?.[0]?.value;

    let predictedFiscalWeeks =
      cloneDeep(adaReducer?.predictedFiscalWeeks) || [];
    let historicFiscalWeeks = isHistoricDataFetched
      ? cloneDeep(adaReducer?.historicActualsFiscalWeeks) || []
      : [];
    historicFiscalWeeks?.forEach((fiscalWeek, i) => {
      if (predictedFiscalWeeks?.includes(fiscalWeek)) {
        historicFiscalWeeks[i] = `${fiscalWeek}H`;
      }
    });
    let fiscalWeeksMerged = [...historicFiscalWeeks, ...predictedFiscalWeeks];

    let fiscalWeeks = [];
    if (hidePastHistoricData) {
      fiscalWeeks = [...new Set(predictedFiscalWeeks)];
    } else {
      fiscalWeeks = [...new Set(fiscalWeeksMerged)];
    }

    let ia_forecast_data = [];
    let defaultIAVal = [];
    let adj_forecast_data = [];
    const actuals_data = [];
    let actuals_discount_data = [];
    let ep_feed_data = [];
    let final_forecast = [];
    let effective_discount_percentage = [];

    const fixedDecimals =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.decimalConfig?.chart;

    fiscalWeeks?.forEach((fiscalWeek) => {
      let iaForecastedValue = data?.ia_forecast_data?.find(
        (ia_forecasted_value) =>
          ia_forecasted_value?.[FISCAL_KEY_MAPPING[timeline]] === fiscalWeek
      );

      let iaDefaultForecastedValue = data?.ia_default_forecast_data?.find(
        (ia_forecasted_value) =>
          ia_forecasted_value?.[FISCAL_KEY_MAPPING[timeline]] === fiscalWeek
      );

      let adjForecastedValue = data?.ia_forecast_data?.find(
        (ia_forecasted_value) =>
          ia_forecasted_value?.[FISCAL_KEY_MAPPING[timeline]] === fiscalWeek
      );

      let actualsValue = data?.actuals_data?.find(
        (actuals_value) =>
          actuals_value?.[FISCAL_KEY_MAPPING[timeline]] === fiscalWeek
      );

      ia_forecast_data.push(
        isNumber(iaForecastedValue?.predicted_qty)
          ? +(+iaForecastedValue?.predicted_qty?.toFixed(fixedDecimals))
          : null
      );

      defaultIAVal.push(
        isNumber(iaDefaultForecastedValue?.predicted_qty)
          ? +(+iaDefaultForecastedValue?.predicted_qty?.toFixed(fixedDecimals))
          : null
      );
      adj_forecast_data.push(
        isNumber(adjForecastedValue?.adjusted_forecast_qty)
          ? +(+adjForecastedValue?.adjusted_forecast_qty?.toFixed(
              fixedDecimals
            ))
          : null
      );
      ep_feed_data.push(
        isNumber(iaDefaultForecastedValue?.ep_feed)
          ? +(+iaDefaultForecastedValue?.ep_feed?.toFixed(fixedDecimals))
          : null
      );
      final_forecast.push(
        isNumber(iaDefaultForecastedValue?.final_forecast)
          ? +(+iaDefaultForecastedValue?.final_forecast?.toFixed(fixedDecimals))
          : null
      );
      actuals_data.push(
        isNumber(actualsValue?.actual)
          ? +(+actualsValue?.actual?.toFixed(fixedDecimals))
          : null
      );
      actuals_discount_data.push(
        isNumber(actualsValue?.average_discount_percentage_weighted)
          ? +(
              +actualsValue?.average_discount_percentage_weighted *
              100?.toFixed(fixedDecimals)
            )
          : null
      );
      effective_discount_percentage.push(
        isNumber(iaForecastedValue?.promo_percentage)
          ? iaForecastedValue?.promo_percentage
          : null
      );
    });

    let historical_actuals_data = cloneDeep(data.historical_actuals_data);
    let historical_actuals_data_discount = cloneDeep(
      data.historical_actuals_data
    );

    const predictedHistoricCompareWithMapping =
      adaReducer?.predictedHistoricCompareWithMapping;

    historical_actuals_data?.forEach((elem) => {
      for (let [key, value] of Object.entries(elem)) {
        let currYearHistoric = [];
        let pastPredictedFiscalWeeks =
          cloneDeep(adaReducer?.xAxisStaticDates?.[`fy_${key}`]) || [];

        let pastHistoricFiscalWeeks =
          cloneDeep(adaReducer?.xAxisStaticHistoricDates?.[`fy_${[key]}`]) ||
          [];

        pastHistoricFiscalWeeks?.forEach((fiscalWeek, i) => {
          if (pastPredictedFiscalWeeks?.includes(fiscalWeek)) {
            pastHistoricFiscalWeeks[i] = `${fiscalWeek}H`;
          }
        });

        let pastFiscalWeeksMerged = [
          ...pastHistoricFiscalWeeks,
          ...pastPredictedFiscalWeeks,
        ];

        let pastFiscalWeeks = [];
        if (hidePastHistoricData) {
          pastFiscalWeeks = [...new Set(pastPredictedFiscalWeeks)];
        } else {
          pastFiscalWeeks = [...new Set(pastFiscalWeeksMerged)];
        }

        pastFiscalWeeks?.forEach((fiscalWeek) => {
          let fiscalWeekHistoricData = value.find((elem) => {
            return elem?.[FISCAL_KEY_MAPPING[timeline]] == fiscalWeek;
          });

          currYearHistoric.push(
            isNumber(fiscalWeekHistoricData?.actual) ||
              isNumber(String(fiscalWeekHistoricData?.actual)?.slice(0, -1))
              ? +(+fiscalWeekHistoricData?.actual?.toFixed(fixedDecimals))
              : null
          );
        });

        elem[key] = currYearHistoric;
      }
    });
    historical_actuals_data_discount?.forEach((elem) => {
      for (let [key, value] of Object.entries(elem)) {
        let currYearHistoric_discount = [];
        let pastPredictedFiscalWeeks =
          cloneDeep(adaReducer?.xAxisStaticDates?.[`fy_${key}`]) || [];
        let pastHistoricFiscalWeeks =
          cloneDeep(adaReducer?.xAxisStaticHistoricDates?.[`fy_${[key]}`]) ||
          [];

        pastHistoricFiscalWeeks?.forEach((fiscalWeek, i) => {
          if (pastPredictedFiscalWeeks?.includes(fiscalWeek)) {
            pastHistoricFiscalWeeks[i] = `${fiscalWeek}H`;
          }
        });

        let pastFiscalWeeksMerged = [
          ...pastHistoricFiscalWeeks,
          ...pastPredictedFiscalWeeks,
        ];

        let pastFiscalWeeks = [];
        if (hidePastHistoricData) {
          pastFiscalWeeks = [...new Set(pastPredictedFiscalWeeks)];
        } else {
          pastFiscalWeeks = [...new Set(pastFiscalWeeksMerged)];
        }

        pastFiscalWeeks?.forEach((fiscalWeek) => {
          let fiscalWeekHistoricData = value.find((elem) => {
            return +elem?.[FISCAL_KEY_MAPPING[timeline]] === +fiscalWeek;
          });

          currYearHistoric_discount.push(
            isNumber(
              fiscalWeekHistoricData?.average_discount_percentage_weighted
            )
              ? +(
                  +fiscalWeekHistoricData?.average_discount_percentage_weighted *
                  100
                )?.toFixed(fixedDecimals)
              : null
          );
        });

        elem[key] = currYearHistoric_discount;
      }
    });

    let comparisonYear = adaReducer?.compareWithSelectedDate?.[0]?.value;

    let lastYear = handleCompareBtnClick(adaReducer?.fiscalDates?.end_fw, 1);
    let lastToLastYear = handleCompareBtnClick(
      adaReducer?.fiscalDates?.end_fw,
      2
    );

    let label = ``;
    let discount_Percentage_label = "";

    if (
      !adaReducer?.isCompareWithDropdown &&
      comparisonYear === lastYear?.value
    ) {
      label = "Last year Actuals";
      discount_Percentage_label = "Last Year Discount %";
    }
    if (
      !adaReducer?.isCompareWithDropdown &&
      comparisonYear === lastToLastYear?.value
    ) {
      label = "Last to Last year  Actuals";
      discount_Percentage_label = "Last to Last year Discount %";
    }

    let seriesDataMapping = {
      ia_forecast_data,
      adj_forecast_data,
      actuals_data,
      defaultIAVal,
    };

    let isEpFeedAvailable = adaReducer?.clientConfig?.attribute_value?.mfp;
    if (isEpFeedAvailable) {
      seriesDataMapping["ep_feed"] = ep_feed_data;
      seriesDataMapping["final_forecast"] = final_forecast;
    }

    if (!chartConfig) return;

    let seriesData = chartConfig.seriesData.map((elem, i) => {
      return seriesDataMapping[elem.data]
        ? {
            name: elem.name,
            data: seriesDataMapping[elem.data],
            color: elem?.color,
            yAxis: 0,
            dataLabels: {
              enabled: true,
              allowOverlap: true,
            },
          }
        : null;
    });

    let historicalYearsColorConfig =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.historicalYearsColorConfig || [];

    historical_actuals_data?.forEach((elem, i) => {
      for (let [key1, value] of Object.entries(elem)) {
        let seriesHistoricData = {
          name: label || `FY ${key1} Actuals`,
          data: value,
          color: historicalYearsColorConfig?.[i],
          yAxis: 0,
        };
        seriesData.push(seriesHistoricData);
      }
    });

    let historicalYearsDiscountColorConfig =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.historicalYearsDiscountColorConfig;

    const actualsDiscountColor =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.actualsDiscountColor;
    let actualsData = [];
    const actualsDiscountData = {
      name: "Actuals Discount %",
      data: actuals_discount_data,
      color: actualsDiscountColor,
      yAxis: 1,
    };
    actualsData.push(actualsDiscountData);

    const showEffectiveDiscountPercentageData =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.show_effective_discount_percentage_in_graph;
    const effectiveDiscount = [];
    const effectiveDiscountPerc = {
      name: "Effective Discount %",
      data: effective_discount_percentage,
      color: "#97A8BA",
      yAxis: 1,
    };
    if (showEffectiveDiscountPercentageData) {
      effectiveDiscount.push(effectiveDiscountPerc);
    }

    historical_actuals_data_discount?.forEach((elem, i) => {
      for (let [key1, value] of Object.entries(elem)) {
        let seriesHistoricDataDiscount = {
          name: discount_Percentage_label || `FY ${key1} Actuals Discount %`,
          data: value.map((elem) =>
            elem !== null ? +(+elem?.toFixed(fixedDecimals)) : null
          ),
          color: historicalYearsDiscountColorConfig?.[i],
          yAxis: 1,
        };

        actualsData.push(seriesHistoricDataDiscount);
      }
    });

    const isWeekEndDateLabelEnabled =
      adaReducer?.clientConfig?.attribute_value?.show_features
        ?.is_week_end_date_label_enabled;

    let showWeekEndDateLabelEnabled =
      isWeekEndDateLabelEnabled &&
      adaReducer?.switchTimeLine?.[0]?.value === "W";
    let seasonBeginDate = [];
    if (showWeekEndDateLabelEnabled) {
      fiscalWeeks.forEach((elem) => {
        seasonBeginDate.push(weekEndDateLabel(elem, adaReducer));
      });
    }

    const chartOptions = {
      type: "line",
      chartType: "barLineChart",
      chartTitle: "",
      axisLegends: {
        xaxis: {
          title: `Fiscal ${PERIOD_MAPPING[timeline]}`,
          categories: showWeekEndDateLabelEnabled
            ? seasonBeginDate
            : fiscalWeeks,
          crosshair: true,
        },
        yaxis: {
          primaryAxisTitle: "Sales Unit",
          secondaryAxisTitle: "Discount %",
          color: colours?.black,
          max: 100,
          min: 0,
        },
      },
      legend: {
        floating: true,
      },
      showToolTip: true,
      show_secondary_axis:
        adaReducer?.clientConfig?.attribute_value?.show_features
          ?.show_secondary_axis,
      series: adaReducer?.clientConfig?.attribute_value?.show_features
        ?.show_secondary_axis
        ? [...seriesData, ...actualsData, ...effectiveDiscount]
        : seriesData,
      isBudgetLabel: true,
      tooltip: {
        valueDecimals:
          adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
            ?.decimalConfig?.chart,
      },
    };

    const decimalConfigForChart =
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.decimalConfig?.chart;
    if (
      adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
        ?.numberFormatting?.enableCommaFormatting !== true
    ) {
      chartOptions.labelFormatter = `{point.y:.${decimalConfigForChart}f}`;
    }
    return chartOptions;
  } catch (error) {
    console.log("Error in creating Visualization Charts", error);
  }
};

export const mergeChartResponse = (
  chartData = {},
  historicChartData = {},
  adaReducer
) => {
  const formattedResponse = (obj, key) => {
    if (Array.isArray(obj?.[key])) {
      return obj[key];
    }
    return [];
  };

  const updatedData = {};
  updatedData.ia_forecast_data = [
    ...formattedResponse(historicChartData, "ia_forecast_data"),
    ...formattedResponse(chartData, "ia_forecast_data"),
  ];

  updatedData.ia_default_forecast_data = [
    ...formattedResponse(historicChartData, "ia_default_forecast_data"),
    ...formattedResponse(chartData, "ia_default_forecast_data"),
  ];

  updatedData.actuals_data = [
    ...formattedResponse(historicChartData, "actuals_data"),
    ...formattedResponse(chartData, "actuals_data"),
  ];

  let historical_actuals_data = [];

  if (chartData?.historical_actuals_data?.length) {
    for (let i in chartData?.historical_actuals_data) {
      for (let [key, value] of Object.entries(
        chartData?.historical_actuals_data?.[i] || {}
      )) {
        let historicData = { [key]: value };
        const predictedHistoricCompareWithMapping =
          adaReducer?.predictedHistoricCompareWithMapping;

        let historicalHistoricData =
          cloneDeep(
            historicChartData?.historical_actuals_data?.[i]?.[
              predictedHistoricCompareWithMapping?.[key]
            ]
          ) || [];

        let pastPredictedFiscalWeeks =
          cloneDeep(adaReducer?.xAxisStaticDates?.[`fy_${key}`]) || [];
        let pastHistoricFiscalWeeks =
          cloneDeep(
            adaReducer?.xAxisStaticHistoricDates?.[
              `fy_${predictedHistoricCompareWithMapping?.[key]}`
            ]
          ) || [];

        pastHistoricFiscalWeeks?.forEach((fiscalWeek, i) => {
          if (pastPredictedFiscalWeeks?.includes(fiscalWeek)) {
            pastHistoricFiscalWeeks[i] = `${fiscalWeek}H`;

            historicalHistoricData = replaceValueByValue(
              historicalHistoricData,
              fiscalWeek,
              `${fiscalWeek}H`
            );
          }
        });

        if (historicChartData?.historical_actuals_data?.length) {
          historicData[key] = [...historicalHistoricData, ...(value || [])];
        }
        historical_actuals_data.push(historicData);
      }
    }
  }
  updatedData.historical_actuals_data = historical_actuals_data;

  return updatedData;
};

export const getSelectedProductStoreFilters = (adaReducer) => {
  const clonedReducer = cloneDeep(adaReducer);
  let selectedPayload = [
    ...(clonedReducer.product || []),
    ...(clonedReducer.store || []),
    ...(clonedReducer.product_store || []),
  ];
  return selectedPayload;
};

export const getFormattedChartFilters = (adaReducer, selected) => {
  const clonedReducer = cloneDeep(adaReducer);

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

const getDimensionPayload = (type, crossFilterData, adaReducer) => {
  let clonedUpdatedFilter = cloneDeep(adaReducer?.[type]) || [];

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
  adaReducer,
  crossFilterData,
  id,
  config
) => {
  const clonedReducer = cloneDeep(adaReducer);

  let updatedStoreFilter = getDimensionPayload(
    "store",
    crossFilterData,
    adaReducer
  );

  let updatedProductFilter = getDimensionPayload(
    "product",
    crossFilterData,
    adaReducer
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

export const handleChartAppendResponse = (
  chartData,
  appendResponse,
  fiscalWeek,
  promoPercentage,
  adaReducer
) => {
  const updatedData = cloneDeep(chartData);
  let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;
  let keyForAggLevelSelected = FISCAL_KEY_MAPPING[aggLevelSelected];

  const indexIAForecast = updatedData.ia_forecast_data.findIndex(
    (elem) => elem?.[keyForAggLevelSelected] === fiscalWeek
  );

  if (appendResponse?.ia_forecast_data?.length) {
    updatedData.ia_forecast_data[indexIAForecast] =
      appendResponse?.ia_forecast_data[0];
  } else {
    updatedData.ia_forecast_data[indexIAForecast] = {
      [keyForAggLevelSelected]: fiscalWeek,
      promo_percentage: promoPercentage,
      predicted_qty: null,
      adjusted_forecast_qty: null,
    };
  }

  const indexIADefaultForecast = updatedData.ia_default_forecast_data.findIndex(
    (elem) => elem?.[keyForAggLevelSelected] === fiscalWeek
  );

  if (appendResponse?.ia_default_forecast_data?.length) {
    updatedData.ia_default_forecast_data[indexIADefaultForecast] =
      appendResponse?.ia_default_forecast_data[0];
  } else {
    updatedData.ia_default_forecast_data[indexIAForecast] = {
      [keyForAggLevelSelected]: fiscalWeek,
      promo_percentage: promoPercentage,
      predicted_qty: null,
      adjusted_forecast_qty: null,
    };
  }

  const indexActualsData = updatedData.actuals_data.findIndex(
    (elem) => elem?.[keyForAggLevelSelected] === fiscalWeek
  );

  if (appendResponse?.actuals_data?.length) {
    updatedData.actuals_data[indexActualsData] =
      appendResponse?.actuals_data[0];
  } else {
    updatedData.actuals_data[indexActualsData] = {
      [keyForAggLevelSelected]: fiscalWeek,
      actual: null,
    };
  }

  if (chartData?.historical_actuals_data?.length) {
    for (let i in chartData?.historical_actuals_data) {
      for (let [key, value] of Object.entries(
        chartData?.historical_actuals_data?.[i] || {}
      )) {
        const indexHistoricalActualData = value.findIndex((elem) => {
          return elem?.[keyForAggLevelSelected] === fiscalWeek;
        });
        let predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks || [];
        let indexFiscalWeek = predictedFiscalWeeks?.findIndex(
          (elem) => elem === fiscalWeek
        );

        let pastPredictedFiscalWeeks =
          adaReducer?.xAxisStaticDates?.[`fy_${key}`] || [];
        let appendPastWeek = pastPredictedFiscalWeeks[indexFiscalWeek];

        let appendResponseData = appendResponse?.historical_actuals_data?.[i]?.[
          key
        ]?.find((elem) => elem?.[keyForAggLevelSelected] === appendPastWeek);

        if (appendResponseData) {
          value[indexHistoricalActualData] = appendResponseData;
        } else {
          value[indexHistoricalActualData] = {
            [keyForAggLevelSelected]: appendPastWeek,
            actual: null,
          };
        }
      }
    }
  }

  return cloneDeep(updatedData);
};

export const appendPrevYearsData = (
  adaReducer,
  adaForecastMultiplierReducer
) => {
  const fixedDecimals =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.dashboard
      ?.decimalConfig?.chart;
  let lastYearData = adaForecastMultiplierReducer?.historicalActual;
  if (isEmpty(lastYearData)) {
    return [];
  }
  let label = ``;
  let lastYear = handleCompareBtnClick(adaReducer?.fiscalDates?.end_fw, 1);
  let lastToLastYear = handleCompareBtnClick(
    adaReducer?.fiscalDates?.end_fw,
    2
  );
  let comparisonYear = adaReducer?.compareWithSelectedDate?.[0]?.value;

  const predictedHistoricCompareWithMapping =
    adaReducer?.predictedHistoricCompareWithMapping;
  if (
    !adaReducer?.isCompareWithDropdown &&
    comparisonYear === lastYear?.value
  ) {
    label = "Last year Actuals";
  }
  if (
    !adaReducer?.isCompareWithDropdown &&
    comparisonYear === lastToLastYear?.value
  ) {
    label = "Last to Last year Actuals";
  }

  let lastYearRow = [];
  let timeline = adaReducer?.switchTimeLine?.[0]?.value;

  let predictedFiscalWeeks = cloneDeep(adaReducer?.predictedFiscalWeeks) || [];
  let historicFiscalWeeks =
    cloneDeep(adaReducer?.historicActualsFiscalWeeks) || [];

  historicFiscalWeeks?.forEach((fiscalWeek, i) => {
    if (predictedFiscalWeeks?.includes(fiscalWeek)) {
      historicFiscalWeeks[i] = `${fiscalWeek}H`;
    }
  });
  let fiscalWeeksMerged = [...historicFiscalWeeks, ...predictedFiscalWeeks];

  lastYearData?.forEach((elem) => {
    for (let [key, value] of Object.entries(elem)) {
      let currYearHistoric = {
        forecast_multiplier: label || `FY ${key} Actuals`,
        row: label || `FY ${key} Actuals`,
      };
      const predictedHistoricCompareWithMapping =
        adaReducer?.predictedHistoricCompareWithMapping;
      let pastPredictedFiscalWeeks =
        cloneDeep(adaReducer?.xAxisStaticDates?.[`fy_${key}`]) || [];
      let pastHistoricFiscalWeeks =
        cloneDeep(
          adaReducer?.xAxisStaticHistoricDates?.[
            `fy_${predictedHistoricCompareWithMapping?.[key]}`
          ]
        ) || [];

      pastHistoricFiscalWeeks?.forEach((fiscalWeek, i) => {
        if (pastPredictedFiscalWeeks?.includes(fiscalWeek)) {
          pastHistoricFiscalWeeks[i] = `${fiscalWeek}H`;
        }
      });

      let pastFiscalWeeksMerged = [
        ...pastHistoricFiscalWeeks,
        ...pastPredictedFiscalWeeks,
      ];

      let pastFiscalWeeks = [...new Set(pastFiscalWeeksMerged)];

      pastFiscalWeeks?.forEach((fiscalWeek, i) => {
        let fiscalWeekHistoricData = value.find((elem) => {
          return elem?.[FISCAL_KEY_MAPPING[timeline]] == fiscalWeek;
        });

        let predictedFiscalWeek = fiscalWeeksMerged[i];

        currYearHistoric[predictedFiscalWeek] = isNumber(
          fiscalWeekHistoricData?.actual
        )
          ? +(+fiscalWeekHistoricData?.actual?.toFixed(fixedDecimals))
          : null;
      });

      lastYearRow.push(currYearHistoric);
    }
  });

  return lastYearRow;
};

export const updateKeyInPlace = (data, oldKeyName, newKeyName) => {
  data?.forEach((elem) => {
    elem[newKeyName] = elem[oldKeyName];
    delete elem[oldKeyName];
  });

  return data;
};

export const appendPrevYearsDiscountData = (
  adaReducer,
  adaForecastMultiplierReducer,
  isDriverForecast = false
) => {
  let lastYearData = adaForecastMultiplierReducer?.historicalActual;

  if (isEmpty(lastYearData)) {
    return [];
  }

  let discount_label = ``;
  let lastYear = handleCompareBtnClick(adaReducer?.fiscalDates?.end_fw, 1);
  let lastToLastYear = handleCompareBtnClick(
    adaReducer?.fiscalDates?.end_fw,
    2
  );
  let comparisonYear = adaReducer?.compareWithSelectedDate?.[0]?.value;

  if (
    !adaReducer?.isCompareWithDropdown &&
    comparisonYear === lastYear?.value
  ) {
    discount_label = "Last year Discount % ";
  }
  if (
    !adaReducer?.isCompareWithDropdown &&
    comparisonYear === lastToLastYear?.value
  ) {
    discount_label = "Last to Last year Discount %";
  }

  let lastYearRowDiscount = [];
  let timeline = adaReducer?.switchTimeLine?.[0]?.value;

  let historicFiscalWeeks = adaReducer?.historicActualsFiscalWeeks || [];
  let predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks || [];

  let fiscalWeeksMerged = [...historicFiscalWeeks, ...predictedFiscalWeeks];

  lastYearData?.forEach((elem) => {
    for (let [key, value] of Object.entries(elem)) {
      let currYearHistoric = {
        forecast_multiplier: discount_label || `FY ${key} Discount %`,
        row: discount_label || `FY ${key} Discount %`,
      };
      if (isDriverForecast) {
        currYearHistoric.drivers = discount_label || `FY ${key} Discount %`;
        currYearHistoric.overall_value = getOverAllValue(
          key,
          value,
          adaReducer,
          timeline
        );
      }

      let pastPredictedFiscalWeeks =
        adaReducer?.xAxisStaticDates?.[`fy_${key}`] || [];

      const predictedHistoricCompareWithMapping =
        adaReducer?.predictedHistoricCompareWithMapping;

      let pastHistoricFiscalWeeks =
        adaReducer?.xAxisStaticHistoricDates?.[
          `fy_${predictedHistoricCompareWithMapping?.[key]}`
        ] || [];

      let pastFiscalWeeksMerged = [
        ...pastHistoricFiscalWeeks,
        ...pastPredictedFiscalWeeks,
      ];

      let pastFiscalWeeks = [...new Set(pastFiscalWeeksMerged)];
      pastFiscalWeeks?.forEach((fiscalWeek, i) => {
        let fiscalWeekHistoricData = value.find((elem) => {
          return +elem?.[FISCAL_KEY_MAPPING[timeline]] === +fiscalWeek;
        });

        let predictedFiscalWeek = fiscalWeeksMerged[i];

        currYearHistoric[predictedFiscalWeek] =
          fiscalWeekHistoricData?.average_discount_percentage_weighted * 100 ||
          null;
      });

      lastYearRowDiscount.push(currYearHistoric);
    }
  });

  return lastYearRowDiscount;
};

export const appendActualsDiscountPercentage = (
  adaForecastMultiplierReducer
) => {
  let label = "Actuals Discount %";
  let currYearActuals = {
    drivers: label,
    row: label,
  };

  let actualsData = cloneDeep(adaForecastMultiplierReducer?.actualsDiscount);
  currYearActuals.overall_value = actualsData.avg;

  let actualsDiscount = { ...currYearActuals, ...actualsData };
  return actualsDiscount;
};

export const appendActualsDiscount = (
  adaForecastMultiplierReducer,
  adaReducer
) => {
  const customActualsLabel =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.custom_actuals_label || "Actuals";
  let label = customActualsLabel;
  let currYearActuals = {
    forecast_multiplier: label,
    row: label,
  };
  let actualsData = cloneDeep(adaForecastMultiplierReducer?.actuals);

  let actualsDiscount = [];
  actualsDiscount.push({ ...actualsData, ...currYearActuals });
  return actualsDiscount;
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

const getOverAllValue = (
  lastYearDataKey,
  lastYearDataRow,
  adaReducer,
  timeline
) => {
  let pastPredictedFiscalWeeks =
    adaReducer?.xAxisStaticDates?.[`fy_${lastYearDataKey}`] || [];
  let pastHistoricFiscalWeeks =
    adaReducer?.xAxisStaticHistoricDates?.[`fy_${lastYearDataKey}`] || [];

  let pastFiscalWeeksMerged = [
    ...pastHistoricFiscalWeeks,
    ...pastPredictedFiscalWeeks,
  ];

  let pastFiscalWeeks = [...new Set(pastFiscalWeeksMerged)];
  let totalPromoPercentageIA = 0;
  let allProductSumIA = 0;
  pastFiscalWeeks?.forEach((fiscalWeek) => {
    let fiscalWeekHistoricData = lastYearDataRow.find((elem) => {
      return +elem?.[FISCAL_KEY_MAPPING[timeline]] === +fiscalWeek;
    });
    if (fiscalWeekHistoricData) {
      totalPromoPercentageIA +=
        (fiscalWeekHistoricData?.product_count || 1) *
        fiscalWeekHistoricData?.average_discount_percentage_weighted;

      allProductSumIA += fiscalWeekHistoricData?.product_count || 1;
    }
  });

  return (totalPromoPercentageIA / allProductSumIA) * 100;
};

const getActualsDiscountOverall = (adaForecastMultiplierReducer) => {
  let futuristicFiscalWeeks =
    adaForecastMultiplierReducer?.forecastColumns?.map(
      ({ column_name }) => column_name
    ) || [];

  let mergedFiscalWeeks = [...futuristicFiscalWeeks];
  let fiscalWeeks = [];

  if (
    !isEmpty(adaReducer?.selectedHistoricValue) &&
    !isEmpty(adaForecastMultiplierReducer?.historicalColumns)
  ) {
    mergedFiscalWeeks.unshift(
      ...adaForecastMultiplierReducer?.historicalColumns?.map(
        ({ column_name }) => column_name
      )
    );
  }

  let actualsData_discount =
    adaForecastMultiplierReducer?.actualsDiscount || {};

  const keys = mergedFiscalWeeks;
  let total = 0;
  let length = 0;
  keys.forEach((key) => {
    if (isNumber(key)) {
      fiscalWeeks.push(key);
      if (actualsData_discount.hasOwnProperty(key)) {
        total += actualsData_discount[key] * 100;
        length++;
      }
    }
  });
  return total / length;
};

// TO DO - Use recursion

export const transformSavePayload = (payload) => {
  let clonedPayload = cloneDeep(payload);
  let finalPayload = [];

  clonedPayload.forEach((el, index) => {
    el.ratio = el.ratio + "";
    let modified = [];
    let clonedElem = cloneDeep(el);
    clonedElem.modified = [];
    finalPayload.push(clonedElem);
    let newObj = el["modified"][LEVEL_0] || {};

    for (let [key, value] of Object.entries(newObj)) {
      let newStructureL0 = {
        name: key,
        value: "",
        locked: false,
        ...value,
        ratio: adjustedRatio(value?.ratio, el?.ratio),
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
  activeChildHierarchyKey,
  _,
  considerUserProfile
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
            if (
              fiscalData.hasOwnProperty("user_profile") &&
              considerUserProfile
            ) {
              nonModifiedIASum += fiscalData.user_profile || 0;
            } else {
              nonModifiedIASum += fiscalData.IA || 0;
            }
            nonModifiedAdjustedSum += fiscalData.adjusted || 0;
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
                        if (
                          fiscalData.hasOwnProperty("user_profile") &&
                          considerUserProfile
                        ) {
                          nonModifiedIASum -= grandChildfiscalData.user_profile;
                        } else {
                          nonModifiedIASum -= grandChildfiscalData.IA;
                        }

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
    let ratio = value / levelCount;
    return ratio === 0 ? "0" : ratio;
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

  return ratio === 0 ? "0" : ratio;
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
  isChart = false, // if isChart is true then for 0 forecast, level count is considered as a hack
  // as computation on BE is getting complex
  considerUserProfile
) => {
  const savepayload = [];
  let L0TotalData = editHierarchyTotalRowInstance?.current?.api?.getRowNode(
    "total"
  )?.data;
  if (!L0TotalData) {
    return;
  }

  // Handles L0 total row & payload structure
  for (let [fiscalDataKey, fiscalData] of Object.entries(L0TotalData)) {
    if (!isCalledFromMFPDashboard) {
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
                  editHierarchyGrandChildInstance,
                  considerUserProfile
                )
              : "",
        };
        savepayload.push(fiscalWeekpayload);
      }
    } else {
      let fiscalWeekpayload = {
        fiscal_timeperiod_id: fiscalDataKey,
        promo_percentage: "",
        modified: {},
        locked: !!fiscalData.isLocked,
        ratio: "",
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
    if (!isCalledFromMFPDashboard) {
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
              activeChildHierarchyKey,
              null,
              considerUserProfile
            );
            ratio.value = "";
          } else {
            // if (Number(value)) {
            ratio.value = updatedValue(
              fiscalDataKey,
              fiscalData.adjusted,
              isChart ? 1 : fiscalData.level_count,
              editHierarchyChildInstance
            );
            // ratio.value = value / fiscalData.level_count;
            ratio.ratio = "";
            // }
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
    // if (node.data.isEdited) {

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
          ratio.ratio = updatedRatio(
            fiscalDataKey,
            value,
            "user_profile_data" in node.data && considerUserProfile
              ? fiscalData.user_profile
              : fiscalData.IA,
            node.data.row === expandedNode?.data?.row &&
              editHierarchyGrandChildInstance,
            null,
            null,
            null,
            considerUserProfile
          );
          ratio.value = "";
        } else {
          // if (Number(value)) {
          ratio.value = updatedValue(
            fiscalDataKey,
            fiscalData.adjusted,
            isChart ? 1 : fiscalData.level_count,
            editHierarchyGrandChildInstance,
            expandedNode?.data?.row
          );
          ratio.ratio = "";
          // }
        }
        if ("user_profile_data" in node.data && considerUserProfile) {
          ratio.user_profile =
            node.data.user_profile_data[fiscalDataKey]?.user_profile;

          // if (
          //   node.data[fiscalDataKey].user_profile === 0 ||
          //   node.data.user_profile_data[fiscalDataKey]?.[node.data.row]
          //     ?.skipRatioCalculate
          // ) {
          //   ratio.ratio = node.data.user_profile_data[fiscalDataKey].ratio;
          // } else {
          //   ratio.ratio =
          //     node.data.user_profile_data[fiscalDataKey].ratio /
          //     node.data[fiscalDataKey].user_profile;
          // }
        }

        let currFiscalData = savepayload.find(
          ({ fiscal_timeperiod_id }) => fiscal_timeperiod_id === fiscalDataKey
        );
        createAssignNestedValL1(
          currFiscalData,
          ratio,
          node.data.row,
          activeChildHierarchyKey
        );
      }
    }
    // }
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
            ratio.ratio =
              fiscalData.adjusted /
              ("user_profile_data" in node.data && considerUserProfile
                ? fiscalData.user_profile
                : fiscalData.IA);
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
              isChart ? 1 : fiscalData.level_count,
              editHierarchyChildInstance
            );
            ratio.ratio = "";
            // }
          }
          let currFiscalData = savepayload.find(
            ({ fiscal_timeperiod_id }) => fiscal_timeperiod_id === fiscalDataKey
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
              ratio.value =
                fiscalData.adjusted === 0
                  ? "0"
                  : fiscalData.adjusted /
                    (isChart ? 1 : fiscalData.level_count);

              // ratio.value = updatedValue(
              //   fiscalDataKey,
              //   fiscalData.adjusted,
              //   fiscalData.level_count,
              //   editHierarchyChildInstance
              // );
              ratio.ratio = "";
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
    // if (node.data.isEdited) {
    for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
      if (
        isNumber(fiscalDataKey) &&
        (fiscalData.isEdited || fiscalData.isLocked)
      ) {
        const ratio = {};
        ratio.locked = !!fiscalData.isLocked;

        if (Number(fiscalData.IA)) {
          ratio.ratio =
            fiscalData.adjusted /
            ("user_profile_data" in node.data && considerUserProfile
              ? fiscalData.user_profile
              : fiscalData.IA);
          ratio.value = "";
        } else {
          ratio.value =
            fiscalData.adjusted === 0
              ? "0"
              : fiscalData.adjusted / fiscalData.level_count;

          ratio.ratio = "";
        }
        if ("user_profile_data" in node.data && considerUserProfile) {
          ratio.user_profile =
            node.data.user_profile_data[fiscalDataKey]?.user_profile;
          // if (node.data[fiscalDataKey].user_profile == 0) {
          //   ratio.ratio = node.data.user_profile_data[fiscalDataKey].ratio;
          // } else {
          //   ratio.ratio =
          //     node.data.user_profile_data[fiscalDataKey].ratio /
          //     node.data[fiscalDataKey].user_profile;
          // }
        }

        let currFiscalData = savepayload.find(
          ({ fiscal_timeperiod_id }) => fiscal_timeperiod_id === fiscalDataKey
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
  });

  const adjusted = transformSavePayload(savepayload);

  return adjusted;
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
  adaReducer
) => {
  let predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks || [];
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
    if (currAdjustedPayload) {
      if (isNumber(elem.price_point) && elem.price_point !== null) {
        currAdjustedPayload.price_point = isNumber(elem.price_point)
          ? String(elem.price_point)
          : null;
      } else {
        currAdjustedPayload.promo_percentage = isNumber(elem.promo_percentage)
          ? String(elem.promo_percentage)
          : null;
      }
    }
  });

  adjustedPayload?.forEach((elem) => {
    let currAdjustedPayload = formattedAdjustedPayload?.find(
      ({ fiscal_timeperiod_id }) =>
        +fiscal_timeperiod_id === +elem.fiscal_timeperiod_id
    );
    if (currAdjustedPayload) {
      currAdjustedPayload.modified = elem.modified;
      currAdjustedPayload.ratio = elem.ratio;
    }
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
  adaReducer
) => {
  let oldChartData = cloneDeep(chartData);
  let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;

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

export const createPayloadForADAVisual = (
  adaReducer,
  dependencyData,
  isRedirectedFromInventorySmart
) => {
  let startDate = adaReducer?.fiscalDates?.start_date;
  let endDate = adaReducer?.fiscalDates?.end_date;

  let productCodes = [];
  let appliedFilters = [];
  dependencyData?.forEach((filterData) => {
    if (
      filterData?.column_name === "product_code" &&
      filterData?.values?.length > 0
    ) {
      productCodes.push(filterData);
    } else {
      appliedFilters.push(filterData);
    }
  });

  let cloneDates = {};
  if (Object.keys(adaReducer?.appliedDateFilters).length === 0) {
    cloneDates = {
      start_date: startDate,
      end_date: endDate,
    };
  }

  let isRedirectedFromInventory = false;
  if (adaReducer?.isRedirectedFromInventory || isRedirectedFromInventorySmart)
    isRedirectedFromInventory = true;
  const adaPayload = {
    isRedirectedFromInventory,
    payload: {
      product_code: productCodes,
      store_code: storeCodes,
    },
    appliedDate:
      Object.keys(adaReducer?.appliedDateFilters).length === 0
        ? cloneDates
        : adaReducer?.appliedDateFilters,
    selectedDependency: cloneDeep(appliedFilters),
    selectedHistoricValue: 1,
    timeline: {
      startDate: moment.utc(startDate).format("YYYY/MM/DD"),
      endDate: moment.utc(endDate).format("YYYY/MM/DD"),
    },
    agg_level: adaReducer?.switchTimeLine?.[0]?.value,
    compareWithSelectedDate: adaReducer?.compareWithSelectedDate,
    isCompareWithDropdown: adaReducer?.isCompareWithDropdown,
    switchTimeLine: adaReducer?.switchTimeLine,
    selectedDate: cloneDeep(adaReducer?.fiscalDates?.selectedDate),
    calendarDates: adaReducer?.calendarDates,
  };
  return adaPayload;
};

const showCalendarStartEndLabelHandler = (week, adaReducer) => {
  const fiscalCalendarData = adaReducer?.fiscalCalendarDetails;
  let dateFormat =
    adaReducer?.clientConfig?.attribute_value
      ?.calendar_start_end_both_label_config?.date_formatting;
  let fiscalSeasonBeginDate =
    adaReducer?.clientConfig?.attribute_value
      ?.calendar_start_end_both_label_config?.calendar_start_label_config;
  let fiscalSeasonEndDate =
    adaReducer?.clientConfig?.attribute_value
      ?.calendar_start_end_both_label_config?.calendar_end_label_config;

  let calendarWeekDate = fiscalCalendarData?.find(
    (elem) => elem?.fiscal_year_week == week
  );

  let startWeekDay = moment.utc(calendarWeekDate?.[fiscalSeasonBeginDate]); //milliseconds
  let endWeekDay = moment.utc(calendarWeekDate?.[fiscalSeasonEndDate]); //milliseconds
  let startWeekDayFormatted = startWeekDay.format(dateFormat);
  let endWeekDayFormatted = endWeekDay.format(dateFormat);
  return `${startWeekDayFormatted}-${endWeekDayFormatted}`;
  // show_calendar_start_end_both_label
};

export const weekEndDateLabel = (week, adaReducer) => {
  let dateFormat =
    adaReducer?.clientConfig?.attribute_value?.week_end_date_label_config
      ?.week_end_date_label_formatting;

  let isShowCalendarStartEndLabel =
    adaReducer?.clientConfig?.attribute_value?.show_features
      ?.show_calendar_start_end_both_label;

  if (isShowCalendarStartEndLabel) {
    return showCalendarStartEndLabelHandler(week, adaReducer);
  }

  let fiscalSeasonDate =
    adaReducer?.clientConfig?.attribute_value?.week_end_date_label_config
      ?.week_end_date_label_key;

  const fiscalCalendarData = adaReducer?.fiscalCalendarDetails;

  let calendarWeekStartDate = fiscalCalendarData?.find(
    (elem) => elem?.fiscal_year_week == week
  );

  let day = moment.utc(calendarWeekStartDate?.[fiscalSeasonDate]); //milliseconds

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
  if (id === "l2-table") {
    scrollNode.style.overflowX = "hidden"; // Hide horizontal scrollbar for l2 table
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

export function checkIfCellIsDisabledForViewEdit(cellProps, adaReducer, id) {
  if (id === "IA") return false;
  if (cellProps?.colDef?.id === "forecast_multiplier") return false;
  if (id === "Comparison") return true;

  if (cellProps?.colDef?.disabled) return true;

  const column_name = cellProps?.colDef?.id.split(".")[0];
  const predictedColumnNames = adaReducer?.predictedFiscalWeeks || [];
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
  adaReducer,
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
  ] = formattedAdjustedPayload([], updatedLastEditedDrivers, adaReducer);

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
  adaReducer,
  getAllWeeksResponse,
  lastEditedDrivers,
  isPredictedDataFetched,
  isCalledFromMFPDashboard = false,
  selectedRowsFromMFP
) => {
  let forecastMultiplierPayload = cloneDeep(payload);
  var Mfp_Key =
    adaReducer?.clientConfig?.attribute_value?.attribute_value?.mfp?.mfp_level;

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
  ] = formattedAdjustedPayload([], lastEditedDrivers, adaReducer);

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

export const getInitialPayload = (adaReducer, selectedGraphFilters) => {
  const historicalDataFiscalWeek = adaReducer?.historicalDataFiscalWeek;

  const historicalDataFiscalWeekCompare =
    adaReducer?.historicalDataFiscalWeekCompare;
  const updatedPayload = cloneDeep(adaReducer);
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
  adaReducer,
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
      adaReducer?.clientConfig?.attribute_value?.show_features
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

    let predictedFiscalWeeks = adaReducer?.predictedFiscalWeeks || [];

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
    let aggLevelSelected = adaReducer?.switchTimeLine?.[0]?.value;

    ia_default_forecast_data?.forEach((week) => {
      let currWeek = week?.[FISCAL_KEY_MAPPING[aggLevelSelected]];

      if (isNumber(currWeek)) {
        formattedData[currWeek] = week?.predicted_qty;
      }
    });

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
      adaReducer
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

    let timeline = adaReducer?.switchTimeLine?.[0]?.value;

    pastYearDataRef.current = historical_actuals_data;

    let mergedHistoricalData = mergeHistoricDataHandler(
      historicalPastYearDataRef?.current,
      historical_actuals_data,
      adaReducer,
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

export const removeToolPanelById = (api, panelIdToRemove) => {
  if (!api?.getSideBar) return;

  const sideBar = api.getSideBar();

  if (!sideBar?.toolPanels) return;

  const updatedPanels = sideBar.toolPanels.filter(
    (panel) => panel.id !== panelIdToRemove
  );

  api.setSideBar({
    ...sideBar,
    toolPanels: updatedPanels,
  });
};

export const adaVisualForecastUploadValidations = (
  DATE_FORMAT = "mm-dd-yyyy"
) => [
  "The Material Number, country_code , channel, must be valid and cannot be blank.",
  "Start Date,Input Type,Discount Type must be valid and cannot be blank",
  `Start Date and End Date should be in the format "${DATE_FORMAT}"`,
  'Input Type should be in ("P", "FS","C", "M","PM")',
  'Discount type should be in  ("%Off", "PP")',
  'Include/Exclude should be present in the expected list ("E", "I") or blank',
  "Store cannot be blank if Include/Exclude is I,E",
  'End Date should be null if input_type="FS"',
  "Discount Value should be either blank or between 1 and 100",
  "Delete column can be either 0,1 or blank",
];

export const checkIfForecastIsEmpty = (key, data) => {
  return (
    !KEYS_USED_OTHER_THAN_FISCAL_WEEK.includes(key) &&
    (data[key].IA === null || data[key].IA === undefined)
  );
};

export const updateColumnValue = (
  columns,
  key,
  rowData,
  predictedFiscalWeeks = []
) => {
  if (isNumber(key) || predictedFiscalWeeks?.includes(key)) {
    if (columns.hasOwnProperty(key)) {
      // If the column already exists, check if the current rowData[key].IA is null
      // or if the existing columns[key] is already null
      if (rowData[key].IA === null || columns[key] === null) {
        columns[key] = null;
      } else if (rowData[key].IA === 0 && columns[key] === 0) {
        // If all values are 0, set columns[key] = 0
        columns[key] = 0;
      } else {
        columns[key] += rowData[key].IA;
      }
    } else {
      // If the column doesn't exist, set it to null if rowData[key].IA is null
      columns[key] = rowData[key].IA === null ? null : rowData[key].IA;
    }
  }
};

export const checkIfForecastIsZeroForViewEdit = (cellProps, column_name) => {
  return cellProps?.data?.[column_name]?.IA === 0;
};
export const checkIfForecastIsEmptyForSome = (
  initialEditRowData,
  column_name
) => {
  const hasNullData =
    Array.isArray(initialEditRowData?.current) &&
    initialEditRowData.current.some((node) => {
      const value = node?.[column_name]?.IA;
      return value === null || value === undefined || value === "";
    });
  return hasNullData;
};

export function areAllIaValuesNull(cellProps, column_name) {
  return cellProps?.every((row) => {
    const cell = row[column_name];
    return (
      cell && (cell.IA === null || cell.IA === undefined || cell.IA === "")
    );
  });
}

export const disableEditableColsWithZeroTotal = (
  cols,
  columns,
  tooltipMessage
) => {
  let anyZeroTotalFound = false;

  cols.forEach((elem) => {
    const col = elem?.column_name?.split(".")[0];
    const isZeroTotal = columns[col] === 0;

    if (isZeroTotal) {
      anyZeroTotalFound = true;
      elem.is_editable = false;
      elem.is_disabled = true;
      elem.extra = {
        ...elem.extra,
        staticToolTip: tooltipMessage,
      };
    }
  });

  return anyZeroTotalFound;
};
export const disabledDisplayEditHierarchyTotalValues = (
  title,
  value,
  editHierarchyForecastTableRoundOff
) => {
  return (
    <div
      style={{
        alignItems: "center",
        display: "flex",
        fontWeight: "normal",
      }}
    >
      {numberFormattingWithCommas(value, editHierarchyForecastTableRoundOff)}
    </div>
  );
};

/**
 * Removes specified keys from fiscal data objects in each AG Grid row, with optional
 * adjustments for specific instance types and predicted fiscal weeks.
 *
 * Iterates through all rows in the given AG Grid instance, and for each fiscal data
 * entry (identified by numeric keys or predicted fiscal week values), performs:
 *   - Conditional unlock flagging for "editHierarchyChildInstance" if the fiscal data is locked.
 *   - Preservation of `adjusted_initial` from `adjusted` if present.
 *   - Deletion of specified keys from the fiscal data object.
 *
 * @param {object} params - Function parameters.
 * @param {object} params.instance - React ref to the AG Grid component (`ref.current.api` must exist).
 * @param {string} params.instanceName - Name of the grid instance (used for conditional unlock logic).
 * @param {string[]} [params.keysToDelete=["isEdited","adjusted_manual","isChildEdited"]] - Keys to remove from each fiscal data object.
 * @param {string[]} [params.predictedFiscalWeeks=[]] - Array of fiscal week identifiers to also treat as fiscal data keys.
 *
 * @example
 * removeUnwantedFiscalDataKeys({
 *   instance: gridRef,
 *   instanceName: "editHierarchyChildInstance",
 *   keysToDelete: ["isEdited", "adjusted_manual"],
 *   predictedFiscalWeeks: ["2025-W01", "2025-W02"]
 * });
 *
 * // Removes 'isEdited' and 'adjusted_manual' from fiscal week data,
 * // flags unlock for locked rows in "editHierarchyChildInstance",
 * // and preserves adjusted_initial from adjusted if present.
 */
export const removeUnwantedFiscalDataKeys = ({
  instance,
  instanceName,
  keysToDelete = ["isEdited", "adjusted_manual", "isChildEdited"],
  predictedFiscalWeeks = [],
}) => {
  instance?.current?.api?.forEachNode((node) => {
    // Iterate over all key-value pairs in the row's data
    for (let [fiscalDataKey, fiscalData] of Object.entries(node.data)) {
      // Only process numeric keys (assumed to be fiscal periods)
      if (
        isNumber(fiscalDataKey) ||
        predictedFiscalWeeks?.includes(fiscalDataKey)
      ) {
        if (
          instanceName === "editHierarchyChildInstance" &&
          fiscalData.isLocked
        ) {
          fiscalData.unlockAfterSave = true;
        }

        if (fiscalData?.adjusted_initial) {
          fiscalData.adjusted_initial = fiscalData?.adjusted;
        }
        // Delete each specified key from the fiscal data object
        keysToDelete.forEach((key) => {
          delete fiscalData[key];
        });
      }
    }
  });
};

export const FORECAST_SAVE_STATUS = {
  IDLE: "idle",
  SAVING: "saving",
  SAVED: "saved",
  ERROR: "error",
};

export const addAdjustedInitialKey = (dataArray) => {
  // Use map to create a new array without modifying the original dataArray directly
  const modifiedData = dataArray.map((record) => {
    const newRecord = { ...record };

    for (const key in newRecord) {
      // Add "adjusted_initial" with the value of "adjusted"

      if (typeof newRecord[key] === "object") {
        newRecord[key].adjusted_initial = newRecord[key].adjusted;
      }
    }
    return newRecord; // Return the modified record
  });

  return modifiedData; // Return the new array with modified records
};

export const columnLabelHandler = (
  label,
  adaReducer,
  showWeekEndDateLabelEnabled,
  predictedFutureFiscalWeeks = [],
  isDriverSignificanceAggregationWeek
) => {
  if (showWeekEndDateLabelEnabled) {
    return weekEndDateLabel(label, adaReducer);
  }

  if (isDriverSignificanceAggregationWeek) {
    return `FW-${label}`;
  }

  let agglevelSelected = adaReducer?.switchTimeLine?.[0]?.value;

  let labelPrepend = "F";

  let configLabelPrepend =
    adaReducer?.clientConfig?.attribute_value?.show_features?.label_prepend;

  if (agglevelSelected === "W" && configLabelPrepend) {
    labelPrepend = configLabelPrepend;
  }

  if (["W", "M", "Q"].includes(agglevelSelected)) {
    return `${labelPrepend}${agglevelSelected}-${label} ${
      predictedFutureFiscalWeeks?.includes(+label) ? " (H)" : ""
    }`;
  }

  return label;
};

export const getCustomProductSeasonFilters = (filtersData) => {
  const filters = filtersData.map((filter) => {
    return {
      filter_name: filter.label,
      filter_id: filter.attribute_name,
      filter_type: "cascaded",
      dimension: "custom",
      display_type: "dropdown",
      is_mandatory: false,
      values: filter.selectedOptions,
      attribute_name: filter.attribute_name,
      operator: "in",
    };
  });

  return filters;
};

export const getFormattedCalendarDates = (
  selectedDate,
  fiscalKey,
  formatStringDate
) => {
  let startDate = formatStringDate(
    selectedDate?.fiscalInfoStartDate?.calendar_week_start_date,
    true
  );

  let endDate = formatStringDate(
    selectedDate?.fiscalInfoEndDate?.calendar_week_start_date,
    true
  );

  // Add 6 days to end date
  endDate = moment(endDate).add(6, "days").format("MM-DD-YYYY");

  return {
    start_date: startDate,
    end_date: endDate,
    start_week_id: selectedDate?.fiscalInfoStartDate?.[fiscalKey],
    end_week_id: selectedDate?.fiscalInfoEndDate?.[fiscalKey],
  };
};

export const getCustomFilterData = (showProductSeasonFilters) => [
  {
    fc_code: 176,
    label: "Date Range",
    column_name: "range-picker",
    type: "non-cascaded",
    display_type: "rangePicker",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    required: false,
    is_multiple_selection: false,
    range_min: "",
    range_max: "",
    default_value: "",
    is_disabled: false,
    is_clearable: false,
    display_order: 1,
    is_required: false,
    extra: {},
    filter_keyword: "range-picker",
    accessor: "range-picker",
    field_type: "rangePicker",
    disableType: "disableOnlyPast",
    startYear: null,
  },
  {
    fc_code: 176,
    label: "AGGREGATION LEVEL",
    column_name: "agg_level_select",
    type: "non-cascaded",
    display_type: "select",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    required: false,
    is_multiple_selection: false,
    range_min: "",
    range_max: "",
    default_value: "",
    is_disabled: false,
    is_clearable: false,
    display_order: 1,
    is_required: false,
    extra: {},
    filter_keyword: "agg_level_select",
    accessor: "agg_level_select",
    field_type: "select",
    disableType: "disableOnlyFuture",
  },

  {
    fc_code: 176,
    label: "SELECT FISCAL YEAR",
    column_name: "compare_with_select",
    type: "non-cascaded",
    display_type: "select",
    level: 1,
    dimension: "custom",
    is_mandatory: false,
    required: false,
    is_multiple_selection: false,
    range_min: "",
    range_max: "",
    default_value: "",
    is_disabled: false,
    is_clearable: false,
    display_order: 1,
    is_required: false,
    extra: {},
    filter_keyword: "compare_with_select",
    accessor: "compare_with_select",
    field_type: "select",
    disableType: "disableOnlyFuture",
  },

  ...(showProductSeasonFilters
    ? [
        {
          fc_code: 176,
          label: "PRODUCT SUB SEASON",
          column_name: "product_sub_season",
          type: "cascaded",
          display_type: "select",
          level: 1,
          dimension: "custom",
          is_mandatory: false,
          required: false,
          is_multiple_selection: true,
          range_min: "",
          range_max: "",
          default_value: "",
          is_disabled: false,
          is_clearable: false,
          display_order: 1,
          is_required: false,
          extra: {},
          filter_keyword: "product_sub_season",
          accessor: "product_sub_season",
          field_type: "select",
          disableType: "disableOnlyFuture",
        },
      ]
    : []),

  ...(showProductSeasonFilters
    ? [
        {
          fc_code: 176,
          label: "PRODUCT SEASON",
          column_name: "product_season_name",
          type: "cascaded",
          display_type: "select",
          level: 1,
          dimension: "custom",
          is_mandatory: false,
          required: false,
          is_multiple_selection: true,
          range_min: "",
          range_max: "",
          default_value: "",
          is_disabled: false,
          is_clearable: false,
          display_order: 1,
          is_required: false,
          extra: {},
          filter_keyword: "product_season_name",
          accessor: "product_season_name",
          field_type: "select",
          disableType: "disableOnlyFuture",
        },
      ]
    : []),
];

export const addProductFilterToDependency = (
  adaReducer,
  adaVisualFilterConfiguration
) => {
  let dependencyData =
    adaVisualFilterConfiguration?.appliedFilterData?.dependencyData;
  if (adaReducer?.clientConfig?.attribute_value?.custom_product_store_group) {
    adaReducer?.product?.forEach((productData) => {
      if (
        productData?.filter_id === "product_code" &&
        productData?.values?.length > 0
      ) {
        let values = productData?.values?.map(({ value }) => value);
        dependencyData.push({ ...productData, values });
        dependencyData = dependencyData?.filter(
          (elem) => elem?.filter_id !== "product_group"
        );
      }
    });
    adaReducer?.store?.forEach((storeData) => {
      if (
        storeData?.filter_id === "store_code" &&
        storeData?.values?.length > 0
      ) {
        let values = storeData?.values?.map(({ value }) => value);
        dependencyData.push({ ...storeData, values });
        dependencyData = dependencyData?.filter(
          (elem) => elem?.filter_id !== "store_group"
        );
      }
    });
  }
  return dependencyData;
};
