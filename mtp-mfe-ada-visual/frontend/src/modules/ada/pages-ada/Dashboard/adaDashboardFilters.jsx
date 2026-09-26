import { useEffect, useMemo, useRef, useState, forwardRef } from "react";
import { batch, useDispatch, useSelector } from "react-redux";
import {
  configureYearOptions,
  createDynamicYears,
  DEFAULT_WEEK,
  chartDataPayload,
  fetchCrossFilterOptions,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getStyleObj,
  handleCompareBtnClick,
  getCustomProductSeasonFilters,
  getFormattedCalendarDates,
  getCustomFilterData,
  getFormattedCalendarDatesCurrentPlusEightWeeks,
  getCurrentPlusEightWeeksFiscalWeek,
  setInventoryPayloadInAdaReducer,
  addFilterNameToSelectedDependency,
  dateFilter,
  filterChipsDate,
  handleSelectedDependency,
  selectedDependencyHandler,
  getCustomFilterChipsData,
} from "modules/ada/utils-ada/utilityFunctions";
import {
  errorHandler,
  infoHandler,
} from "core/Utils/functions/helpers/errorhandler-helpers";
import {
  setAppliedFilters,
  setXaisStaticHistoricDates,
  setFiscalDates,
  getStaticForecastXaxis,
  setXaxisStaticDates,
  setFiscalIdPayload,
  //setCheckConfig,
  setCheckConfig,
  setGraphKPIWeeks,
  setHistoricalFiscalData,
  setFilterFullScreenLoaderCount,
  setFilters,
  setOnCompareSave,
  setIsFiltersValid,
  setAppliedDateFilters,
  getFilteredProductStoreCode,
  setProductStoreGroup,
  getLandingPageTableColumns,
  setTableColumns,
  getForecastAttributesData,
  setForecastAttributes,
  setPredictedFiscalWeeks,
  setHistoricTableColumns,
  getHistoricForecastAttributesData,
  setHistoricForecastAttributes,
  setHistoricActualsFiscalWeeks,
  getActualsForecastAttributesData,
  setComponentLoaderCount,
  setCompareWithSelectedDate,
  setHistoricActuals,
  setIsCompareWithDropdown,
  setProductSeasonFilters,
  resetProductSeasonFilters,
  setCalendarDates,
  setProductSeasonFiltersYearWeek,
} from "modules/ada/services-ada/ada-dashboard/ada-dashboard-services";
import LoadingOverlay from "core/Utils/Loader/loader";

import { makeStyles } from "@mui/styles";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import globalStyles from "core/Styles/globalStyles";
import { CREATE_ALLOCATION } from "modules/ada/constants-ada/routesContants";
import {
  setArticleAgGridParams,
  setCreateAllocationFilterDependency,
} from "modules/ada/services-ada/ada-dashboard/createAllocationService";
import moment from "moment";
import { setResetForecastData } from "modules/ada/services-ada/ada-dashboard/ada-edit-forecast-services";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { cloneDeep, isEmpty } from "lodash";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  saveFilterConfig,
  setFilterConfiguration,
  setSelectedFilters,
} from "core/actions/filterAction";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import CompareWith from "./filters/compare-with";
import DateRangeCompareWith from "./filters/date-range-compare-with";
import { formatStringDate } from "core/Utils/functions/utils";
import {
  setActuals,
  setAllForecastMultiplierData,
  setHistoricalActualData,
  setResetForecastMultiplierData,
  setResetHistoricalActualData,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import FilterChips from "core/commonComponents/filters/filterChips";
import { FISCAL_KEY_MAPPING } from "modules/ada/constants-ada/stringContants";
import { useTranslation } from "impact-ui-v3";
import {
  forecastMultiplierRowDataTransformer,
  getAllActuals,
  getForecastAttributes,
  visualizationHistoricDataTransformer,
  visualizationPredictedDataTransformer,
} from "modules/ada/utils-ada/formatData";
import { fetchOrUpdateProductSeasonFiltersData } from "./filters/product-season-filters/product-filter-utils";

const AdaDashboardFilters = forwardRef(
  (
    {
      children,
      setActiveKey,
      setPastYear,
      setGraphPayload,
      loader,
      isCalledFromMFPDashboard,
      ...props
    },
    ref
  ) => {
    const { t } = useTranslation();
    // this state is just for the chip, no logic is driven by this state

    const adaVisualFilterConfiguration = useSelector(
      (store) =>
        store?.filterReducer?.filterDashboardConfiguration[
          "adaVisualFilterConfiguration"
        ]
    );
    const [appliedDate, setAppliedDate] = useState(null);
    const [savedCompareWith, setSavedCompareWith] = useState(null);
    const [isSelectFilterBtnHidden, setIsSelectFilterBtnHidden] = useState(
      false
    );

    const [filterDependency, setFilterDependency] = useState({});

    const [compareRadioButtons, setCompareRadioButtons] = useState([]);

    const [historicYears, setHistoricYears] = useState([]);
    const [customTopFilterLoading, setCustomTopFilterLoading] = useState(false);
    const [calendarDate, setCalendarDate] = useState({
      fiscalInfoStartDate: null,
      fiscalInfoEndDate: null,
    });

    let searchParams = new URLSearchParams(window.location.search);
    let typeFromUrl = searchParams.get("type");
    const isInventoryRedirection = typeFromUrl === "adaPayloadFromInventory";
    const isInventoryRedirectionProp = props?.location?.isInventoryRedirection;

    const isHistoricDateWarningRendered = useRef(false);
    const [selectedDate, setSelectedDate] = useState({
      fiscalInfoStartDate: null,
      fiscalInfoEndDate: null,
    });

    const adaDashboardReducer = useSelector(
      (store) => store?.adaReducer?.adaDashboardReducer
    );

    const filterAttributeExclusionValues = useSelector(
      (store) =>
        store?.tenantUserRoleMgmtReducer?.userRoleManagementReducer
          .filter_attribute_exclusion_values
    );

    const adaModuleConfiguratorReducer = useSelector(
      (store) =>
        store?.adaReducer?.adaModuleConfiguratorReducer?.moduleConfiguratorData
    );

    const savedFilterUserConfig = useSelector(
      (store) => store?.filterReducer?.savedFilterDashboard
    );

    const savedFilterSelection = useSelector(
      (store) => store.filterReducer.savedFilterSelection
    );

    const getSavedFilterSelectionLoading = useSelector(
      (store) => store.filterReducer.getSavedFilterSelectionLoading
    );

    const savedSelectedFilter = useSelector(
      (store) => store?.filterReducer?.savedSelectedFilter
    );
    const filterConfigType = useSelector(
      (store) =>
        store?.tenantUserRoleMgmtReducer?.userRoleManagementReducer
          .filterConfigType
    );

    const isShowFilterOnDashboardForMFPClient = true;

    const addStyles =
      adaDashboardReducer?.clientConfig?.attribute_value?.show_features
        ?.change_product_style_ids;
    const showProductSeasonFilters =
      adaDashboardReducer?.clientConfig?.attribute_value?.show_features
        ?.showProductSeasonFilters;

    const dispatch = useDispatch();

    const allSavedUserFiltersMap = useRef({});

    const onFilterDashboardClick = async (dependencyData) => {
      try {
        props.setShowTabContainer && props.setShowTabContainer(false);
        dispatch(setIsFiltersValid(false));
        // setPayloadForFilterChips(null);
        if (!adaDashboardReducer?.historicActuals?.length) {
          return infoHandler(
            dispatch,
            t("ada.dashboardFilters.mandatoryFieldError")
          );
        }

        let startDate = moment(
          selectedDate?.fiscalInfoStartDate?.calendar_week_start_date
        );
        let endDate = moment(
          selectedDate?.fiscalInfoEndDate?.calendar_week_start_date
        );
        let days = endDate.diff(startDate, "days");
        let dateAfter6Months = moment(moment(), "MM-DD-YYYY").add(6, "months");
        let diffToday6Months = dateAfter6Months.diff(moment(), "days");
        if (
          !selectedDate?.fiscalInfoStartDate ||
          !selectedDate?.fiscalInfoEndDate
        ) {
          errorHandler(
            dispatch,
            null,
            t("ada.dashboardFilters.mandatoryFieldError")
          );
          return dispatch(setFiscalDates({}));
        }

        dispatch(
          setFiscalDates({
            start_fw: selectedDate?.fiscalInfoStartDate?.fiscal_year_week,
            end_fw: selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
            start_date: formatStringDate(
              selectedDate?.fiscalInfoStartDate?.calendar_week_start_date,
              true
            ),
            end_date: formatStringDate(
              selectedDate?.fiscalInfoEndDate?.calendar_week_start_date,
              true
            ),
            selectedDate: cloneDeep(selectedDate),
          })
        );
        dispatch(setCalendarDates(calendarDate));

        let diffTodaySelected = startDate.diff(
          moment(moment(), "MM-DD-YYYY"),
          "days"
        );

        if (diffTodaySelected < -6) {
          return infoHandler(
            dispatch,
            t("ada.common.selectCurrentOrFutureDate")
          );
        }

        if (days > diffToday6Months) {
          return infoHandler(dispatch, t("ada.common.maxDateRange6Months"));
        }

        const compareWithSelectedDate =
          adaDashboardReducer.compareWithSelectedDate;
        const past_years = compareWithSelectedDate.map(({ value }) =>
          Number(value)
        );
        let graphPayload = {
          start_week_id: selectedDate?.fiscalInfoStartDate?.fiscal_year_week,
          end_week_id: selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
          past_years,
          agg_level: adaDashboardReducer?.switchTimeLine?.[0]?.value,
        };

        dependencyData?.forEach((elem) => {
          elem.values = elem.values.map((value) => {
            return { label: value, value, id: value };
          });

          return elem;
        });

        let productFilters = dependencyData?.filter(
          ({ dimension }) => dimension === "product"
        );
        let storeFilters = dependencyData?.filter(
          ({ dimension }) => dimension === "store"
        );
        let productStoreFilters = dependencyData?.filter(
          ({ dimension }) => dimension === "product_store"
        );
        let config = dependencyData?.find(
          ({ filter_id }) => filter_id === "product_code"
        );
        if (config) {
          const { check_configuration } = config;
          dispatch(setCheckConfig(check_configuration));
        } else {
          dispatch(setCheckConfig([]));
        }

        if (
          adaDashboardReducer?.clientConfig?.attribute_value
            ?.custom_product_store_group
        ) {
          let productGroup = dependencyData?.find(
            (elem) => elem?.filter_id === "product_group"
          )?.values;
          let storeGroup = dependencyData?.find(
            (elem) => elem?.filter_id === "store_group"
          )?.values;

          dispatch(setProductStoreGroup({ productGroup, storeGroup }));

          const resp = await fetchProductStoreCodeFilters(dependencyData);

          if (resp) {
            let productCodeData = resp?.find(
              (elem) => elem?.column_name === "product_code"
            );

            let productCodes = productCodeData?.initialData?.map(
              (elem) => elem?.value
            );

            let storeCodeData = resp?.find(
              (elem) => elem?.column_name === "store_code"
            );

            let storeCodes = storeCodeData?.initialData?.map(
              (elem) => elem?.value
            );

            let productGroupData = dependencyData?.find(
              (elem) => elem?.filter_id === "product_group"
            );
            let storeGroupData = dependencyData?.find(
              (elem) => elem?.filter_id === "store_group"
            );

            let productGroups = productGroupData?.values?.map(
              (elem) => elem?.value
            );
            let storeGroups = storeGroupData?.values?.map(
              (elem) => elem?.value
            );
            let filters = {};

            if (productGroups) {
              filters.product_hierarchy = {};
              filters.product_hierarchy.product_code = productCodes;
              filters.product_hierarchy.product_group = productGroups;

              if (addStyles) {
                const isStylePresent = productFilters?.some(
                  (elem) => elem?.filter_id === "style"
                );

                if (!isStylePresent) {
                  const styles = resp?.find(
                    (elem) => elem?.column_name === "style"
                  );
                  const style = getStyleObj(styles.initialData);

                  productFilters.push(style);
                }
              } else {
                let product_code = {
                  filter_name: "product_code",
                  filter_id: "product_code",
                  filter_type: "non-cascaded",
                  dimension: "product",
                  display_type: "dropdown",

                  is_mandatory: false,
                  values: productCodeData?.initialData,
                  attribute_name: "product_code",
                  operator: "in",
                };

                productFilters.push(product_code);

                productFilters = productFilters?.filter(
                  (elem) => elem?.filter_id !== "product_group"
                );
              }
            }

            if (storeGroups) {
              filters.store_hierarchy = {};
              filters.store_hierarchy.store_code = storeCodes;
              filters.store_hierarchy.store_group = storeGroups;
              let store_code = {
                filter_name: "store_code",
                filter_id: "store_code",
                filter_type: "non-cascaded",
                dimension: "product",
                display_type: "dropdown",
                is_mandatory: false,
                values: storeCodeData?.initialData,
                attribute_name: "store_code",
                operator: "in",
              };

              storeFilters.push(store_code);

              storeFilters = storeFilters?.filter(
                (elem) => elem?.filter_id !== "store_group"
              );
            }
          }
        }

        let payload = {
          product: productFilters,
          store: storeFilters,
          product_store: productStoreFilters,
        };

        // Fiscal date mapping is always with the first day of week
        // So, we need to add 6 days to the end date to get the last day of week
        // reducer might not have the data as dispatch from calendar is removed to filterClick
        let cloneDates = cloneDeep(adaDashboardReducer?.fiscalDates);
        let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;
        let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

        if (!cloneDates.startDate) {
          cloneDates = {
            start_date: formatStringDate(
              selectedDate?.fiscalInfoStartDate?.calendar_week_start_date,
              true
            ),
            end_date: formatStringDate(
              selectedDate?.fiscalInfoEndDate?.calendar_week_start_date,
              true
            ),
            start_week_id: selectedDate?.fiscalInfoStartDate?.[fiscalKey],
            end_week_id: selectedDate?.fiscalInfoEndDate?.[fiscalKey],
          };
        }
        cloneDates.end_date = moment(cloneDates.end_date)
          .add(6, "days")
          .format("MM-DD-YYYY");

        console.log(
          "🚀 ~ onFilterDashboardClickonFilterDashboardClick ~ cloneDates:",
          cloneDeep(cloneDates)
        );
        setAppliedDate(cloneDates);

        const onClearPayload = {
          selectedHistoricValue: [],
          historicalDataFiscalWeek: {},
          historicalDataFiscalWeekCompare: {},
          predictedHistoricCompareWithMapping: {},
        };

        batch(() => {
          dispatch(setAppliedFilters(payload));
          dispatch(setAppliedDateFilters(cloneDates));
          dispatch(setOnCompareSave(false));
          dispatch(setResetForecastMultiplierData());
          dispatch(setXaisStaticHistoricDates({}));
          dispatch(setGraphKPIWeeks(DEFAULT_WEEK));
          dispatch(setHistoricalFiscalData(onClearPayload));
          dispatch(setResetHistoricalActualData());
        });

        props?.setMakeDemandSelectionCAll?.(false);
        dispatch(setIsFiltersValid(true));

        setActiveKey((prevState) => prevState + 1);
      } catch (err) {
      } finally {
        dispatch(setFilterFullScreenLoaderCount(-1));
      }
    };

    const fiscalCalendarData = useSelector(
      (store) => store?.adaReducer?.adaDashboardReducer?.fiscalCalendarDetails
    );

    const updateCompareWithValuesInRedux = (
      selectedOptions,
      isDropdown = false
    ) => {
      const payload = selectedOptions.map(({ id }) => ({
        year: Number(id),
        start_week_id: selectedDate?.fiscalInfoStartDate?.fiscal_year_week,
        end_week_id: selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
        complete_year: false,
      }));

      dispatch(setCompareWithSelectedDate(selectedOptions));
      dispatch(setHistoricActuals(payload));
      dispatch(setIsCompareWithDropdown(isDropdown));
    };

    const savedDate = useMemo(() => {
      let selectedFilter = savedFilterUserConfig.find(
        (filter) => filter?.name === savedSelectedFilter
      );

      if (!savedSelectedFilter) {
        selectedFilter = savedFilterUserConfig.find(
          (filter) => filter?.is_default === true
        );
      }

      let savedDates = selectedFilter?.saved_filter_preference?.find(
        (filter) => filter.attribute_name === "range-picker"
      );

      let savedAggLevel = selectedFilter?.saved_filter_preference?.find(
        (filter) => filter.attribute_name === "agg_level_select"
      );
      if (savedAggLevel?.values) {
        // Do not set filters again, when redirected from dashboard to MFP,
        if (isInventoryRedirection || isInventoryRedirectionProp) {
          dispatch(
            setFilters({ key: "switchTimeLine", value: savedAggLevel?.values })
          );
        }
      }

      let savedCompareWith = selectedFilter?.saved_filter_preference?.find(
        (filter) => filter.attribute_name === "compare_with_select"
      );
      if (savedCompareWith?.values) {
        setSavedCompareWith(savedCompareWith?.values);
        updateCompareWithValuesInRedux(savedCompareWith?.values[0]);
      }
      if (!savedSelectedFilter) {
        console.log("filter reset");
        setSavedCompareWith([]);
        savedDates = [];
      }

      return savedDates?.values || [];
    }, [savedFilterUserConfig, savedSelectedFilter]);

    useEffect(() => {
      if (!adaDashboardReducer?.productSeasonFiltersYearWeek?.length) return;
      const selectedFiscalCalendarData = adaDashboardReducer?.fiscalCalendarDetails?.filter(
        (elem) =>
          elem.fiscal_year_week ===
            adaDashboardReducer?.productSeasonFiltersYearWeek[0] ||
          elem.fiscal_year_week ===
            adaDashboardReducer?.productSeasonFiltersYearWeek[1]
      );

      setSelectedDate({
        fiscalInfoStartDate:
          selectedFiscalCalendarData?.length === 1
            ? selectedFiscalCalendarData[0]
            : selectedFiscalCalendarData[0],
        fiscalInfoEndDate:
          selectedFiscalCalendarData?.length === 1
            ? selectedFiscalCalendarData[0]
            : selectedFiscalCalendarData[1],
      });
    }, [adaDashboardReducer?.productSeasonFiltersYearWeek]);

    useEffect(() => {
      const navType = performance.getEntriesByType("navigation")[0]?.type;

      if (navType === "reload") {
        localStorage.removeItem("adaPayloadFromInventory");
      }
    }, []);

    const fetchProductStoreCodeFilters = async (selected) => {
      try {
        // setChartLoader((prevState) => prevState + 1);

        //  Contains all the tenant filter config
        let productFilterAttributes = {
          dimension: "product",
          level_desc: "product_description",
          column_name: addStyles ? "style" : "product_code",
          display_name: "Article Number",
          level_desc_display_name: "Article Description",
          is_clearable: true,
          filter_keyword: addStyles ? "style" : "product_code",
          levelLabel: "Hierarchy",
          display_type: "dropdown",
          is_multiple_selection: true,
          label: "Article Number",
          type: "cascaded",
          initialData: [],
        };

        let storeFilterAttributes = {
          dimension: "store",
          level_desc: "store_name",
          column_name: "store_code",
          display_name: "Store ID",
          level_desc_display_name: "Store Name",
          is_clearable: true,
          filter_keyword: "store_code",
          levelLabel: "Hierarchy",
          display_type: "dropdown",
          is_multiple_selection: true,
          label: "Store ID",
          type: "cascaded",
          initialData: [],
        };

        const formattedFilterAttributes = [];

        if (selected?.find((elem) => elem?.filter_id === "product_group")) {
          formattedFilterAttributes.push(productFilterAttributes);
        }

        if (selected?.find((elem) => elem?.filter_id === "store_group")) {
          formattedFilterAttributes.push(storeFilterAttributes);
        }

        if (!formattedFilterAttributes?.length) {
          return false;
        }

        let filterResponse = await fetchCrossFilterOptions(
          formattedFilterAttributes,
          selected,
          "ada-visual",
          { application_code: 11 }
        );
        return filterResponse;
      } catch (error) {
        console.log("Error in Fetching filters", error);
      } finally {
        // setChartLoader((prevState) => prevState - 1);
      }
    };

    useEffect(() => {
      // if (isInventoryRedirection) return;
      // if called from MFP dashboard, then filters are required.
      if (isCalledFromMFPDashboard) {
        if (getSavedFilterSelectionLoading) return;
      } else {
        // if redirected from inventory dashboard, then filters are not required to be fetched
        if (
          getSavedFilterSelectionLoading ||
          (props?.location?.isRedirectedFromMFPDashboard &&
            !isShowFilterOnDashboardForMFPClient)
        ) {
          return;
        }
      }

      if (isEmpty(adaDashboardReducer?.clientConfig?.attribute_value)) {
        return;
      }

      if (!isEmpty(adaVisualFilterConfiguration?.filterConfig)) {
        return;
      }
      const getInitialFilterConfiguration = async () => {
        try {
          let filterResponse = await fetchFilterConfig();

          const getFilterValues = async (selected, current) => {
            try {
              const response = await fetchFilterOptions(
                cloneDeep(filterResponse),
                selected,
                "ada-visual"
              );

              const filterConfigData = [
                {
                  filterDashboardData: [
                    ...response,
                    ...getCustomFilterData(showProductSeasonFilters),
                  ],
                  expectedFilterDimensions: getFilterDimensions(response),
                  isCrossDimensionFilter: true,
                },
              ];

              // UAM for filters
              // checking in client config if role based access is enabled
              if (
                adaDashboardReducer?.clientConfig?.attribute_value
                  ?.isRolebasedAccess
              ) {
                filterConfigData[0] = {
                  ...filterConfigData[0],
                  is_urm_filter: true,
                  screen_name: "ada-visual",
                  application_code: 11,
                };
              }

              const filterConfig = formattedFilterConfiguration(
                "adaVisualFilterConfiguration",
                filterConfigData,
                "Ada Visual"
              );

              dispatch(setFilterConfiguration(filterConfig));
            } catch (error) {
            } finally {
            }
          };

          getFilterValues(savedFilterSelection);
        } catch (e) {}
      };

      getInitialFilterConfiguration();
    }, [
      adaVisualFilterConfiguration,
      getSavedFilterSelectionLoading,
      adaDashboardReducer?.clientConfig?.attribute_value?.name,
    ]);

    useEffect(() => {
      if (isInventoryRedirection) return;
      allSavedUserFiltersMap.current = {};
      if (
        !savedFilterUserConfig?.length ||
        (props?.location?.isRedirectedFromMFPDashboard &&
          !isShowFilterOnDashboardForMFPClient)
      )
        return;
      let selectedFilter = savedFilterUserConfig?.find(
        (filter) => filter?.name === savedSelectedFilter
      );

      if (!savedSelectedFilter) {
        selectedFilter = savedFilterUserConfig?.find(
          (filter) => filter?.is_default === true
        );
      }
      const savedPreference = selectedFilter?.saved_filter_preference;

      savedPreference?.forEach((filter) => {
        allSavedUserFiltersMap.current[filter?.attribute_name] = filter?.values;
      });

      const productSeasonFilters =
        adaDashboardReducer?.productSeasonFilters || [];

      const newProductSeasonFilters = productSeasonFilters.map((filter) => {
        return {
          ...filter,
          options: allSavedUserFiltersMap.current[filter?.attribute_name] || [],
          selectedOptions:
            allSavedUserFiltersMap.current[filter?.attribute_name] || [],
        };
      });

      // Extract the selected fiscal_week filter options
      const fiscal_week = newProductSeasonFilters.filter(
        (filter) => filter?.attribute_name === "fiscal_week"
      )?.[0]?.selectedOptions;

      // Utility function to get first and last values from an array
      const getFirstAndLastVal = (arr) => {
        // Return empty array if input is null/undefined or empty
        if (!arr?.length) return [];

        // Get first element value
        const first = arr[0].value;

        // Get last element value
        const last = arr[arr.length - 1].value;

        // Return both values as [start, end]
        return [first, last];
      };

      // If fiscal_week has valid values, extract first & last and dispatch
      getFirstAndLastVal(fiscal_week).length &&
        dispatch(
          setProductSeasonFiltersYearWeek(
            getFirstAndLastVal(fiscal_week) // e.g., [202610, 202611]
          )
        );

      // Always update full filter state in store
      dispatch(setProductSeasonFilters(newProductSeasonFilters));
    }, [savedFilterUserConfig, savedSelectedFilter]);

    //added default weeks selection through client config

    const defaultWeekSelection =
      +(adaModuleConfiguratorReducer?.default_week_selection
        ? adaModuleConfiguratorReducer.default_week_selection
        : adaDashboardReducer?.clientConfig?.attribute_value?.show_features
            ?.default_week_selection) - 1 || 7;

    // For Screen Level Saved Filters Clients i.e. RL
    // set saved calendar from user-preference/screen/ada-visual api
    // else select next 8 weeks in fiscal calendar
    useEffect(() => {
      // if (isInventoryRedirection) return;

      // if (adaDashboardReducer.fiscalDates?.end_fw) return;

      if (
        !fiscalCalendarData?.length ||
        props?.location?.isRedirectedFromMFPDashboard ||
        props?.location?.isRedirectedFromDashboard
      )
        return;
      let [fiscalStartDate, fiscalEndDate] = getCurrentPlusEightWeeksFiscalWeek(
        fiscalCalendarData,
        defaultWeekSelection
      );

      if (isInventoryRedirection) {
        dispatch(
          setFiscalDates({
            start_fw: fiscalStartDate?.fiscal_year_week,
            end_fw: fiscalEndDate?.fiscal_year_week,
            start_date: formatStringDate(
              fiscalStartDate?.calendar_week_start_date,
              true
            ),
            end_date: formatStringDate(
              fiscalEndDate?.calendar_week_start_date,
              true
            ),
            selectedDate: cloneDeep(selectedDate),
          })
        );
        dispatch(
          setCalendarDates({
            fiscalInfoStartDate: fiscalStartDate,
            fiscalInfoEndDate: fiscalEndDate,
          })
        );
      }

      if (savedDate?.length) {
        const savedFiscalStartDate = fiscalCalendarData?.find((date) => {
          return +date?.fiscal_year_week === +savedDate?.[0];
        });

        const savedFiscalEndDate = fiscalCalendarData?.find((date) => {
          return +date?.fiscal_year_week === +savedDate?.[1];
        });

        const savedCalendarStartDate = fiscalCalendarData?.find((date) => {
          return (
            +date?.fiscal_year_week ===
            +allSavedUserFiltersMap.current["range-picker"]?.[0]
          );
        });

        const savedCalendarEndDate = fiscalCalendarData?.find((date) => {
          return (
            +date?.fiscal_year_week ===
            +allSavedUserFiltersMap.current["range-picker"]?.[1]
          );
        });

        if (+savedDate?.[0] < +fiscalStartDate?.fiscal_year_week) {
          if (!isHistoricDateWarningRendered.current) {
            infoHandler(dispatch, t("ada.common.historicDateResetWarning"));
          }
          isHistoricDateWarningRendered.current = true;
          setCalendarDate({
            fiscalInfoStartDate: fiscalStartDate,
            fiscalInfoEndDate: fiscalEndDate,
          });
          return setSelectedDate({
            fiscalInfoStartDate: fiscalStartDate,
            fiscalInfoEndDate: fiscalEndDate,
          });
        }
        const obj = {
          fiscalInfoStartDate:
            !savedFiscalStartDate ||
            +savedDate?.[0] < +fiscalStartDate?.fiscal_year_week
              ? fiscalStartDate
              : savedFiscalStartDate,
          fiscalInfoEndDate:
            fiscalStartDate?.fiscal_year_week > +savedDate?.[1] ||
            !savedFiscalEndDate
              ? fiscalEndDate
              : savedFiscalEndDate,
        };

        const calendarObj = {
          fiscalInfoStartDate:
            !savedCalendarStartDate ||
            +allSavedUserFiltersMap.current["range-picker"]?.[0] <
              +fiscalStartDate?.fiscal_year_week
              ? fiscalStartDate
              : savedCalendarStartDate,
          fiscalInfoEndDate:
            fiscalStartDate?.fiscal_year_week >
              +allSavedUserFiltersMap.current["range-picker"]?.[1] ||
            !savedCalendarEndDate
              ? fiscalEndDate
              : savedCalendarEndDate,
        };
        setCalendarDate(calendarObj);
        setSelectedDate(obj);
      } else {
        setSelectedDate({
          fiscalInfoStartDate: fiscalStartDate,
          fiscalInfoEndDate: fiscalEndDate,
        });
        setCalendarDate({
          fiscalInfoStartDate: fiscalStartDate,
          fiscalInfoEndDate: fiscalEndDate,
        });
      }
    }, [fiscalCalendarData, savedDate]);

    const classes = useStyles();

    // handle date change from calendar
    const handleDateChange = async (dates) => {
      setSelectedDate(dates);
      setCalendarDate(dates);

      if (showProductSeasonFilters) {
        if (
          dates.fiscalInfoEndDate == null ||
          dates.fiscalInfoStartDate == null
        ) {
          dispatch(resetProductSeasonFilters());
        } else {
          try {
            setCustomTopFilterLoading(true);
            const updatedFilters = await fetchOrUpdateProductSeasonFiltersData({
              selectedDate: dates,
              fetchAllFilters: true,
              allFiltersData: adaDashboardReducer?.productSeasonFilters,
              dispatch,
            });
            dispatch(setProductSeasonFilters(updatedFilters));
          } catch (error) {
            console.log("error", error);
          } finally {
            setCustomTopFilterLoading(false);
          }
        }
      }
    };

    useEffect(() => {
      if (!selectedDate?.fiscalInfoEndDate?.fiscal_year_week) return;
      const compareWithOptions =
        adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
          ?.dashboard?.compareWith?.labels;

      let compareRadioOptions = compareWithOptions.map((option, index) => ({
        label: option.label,
        value: option.value,
        id: handleCompareBtnClick(
          selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
          option.value
        )?.value,
        index: `${index + 1}`, // with v3, for selected Radio, we need to pass Radio button number
      }));

      setCompareRadioButtons(compareRadioOptions);

      if (
        isInventoryRedirection ||
        isInventoryRedirectionProp ||
        !props?.location?.isRedirectedFromMFPDashboard ||
        !props?.location?.isRedirectedFromDashboard
      ) {
        updateCompareWithValuesInRedux([compareRadioOptions[0]]);
      }
      if (
        !isEmpty(adaPayloadFromMfp) &&
        props?.location?.isRedirectedFromMFPDashboard
      ) {
        updateCompareWithValuesInRedux(
          adaPayloadFromMfp?.compareWithSelectedDate || []
        );
      }
    }, [selectedDate?.fiscalInfoEndDate?.fiscal_year_week]);

    useEffect(() => {
      if (!selectedDate?.fiscalInfoEndDate?.fiscal_year_week) return;

      if (
        !adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
          ?.dashboard?.compareWith?.showYearsDropdown
      ) {
        return;
      }

      let compareWithHistoricDropdownYears = createDynamicYears(
        selectedDate,
        adaDashboardReducer?.clientConfig?.attribute_value
          ?.compare_with_no_of_fiscal_year
      );

      setHistoricYears(compareWithHistoricDropdownYears);
    }, [selectedDate?.fiscalInfoEndDate?.fiscal_year_week]);

    //Showing Select Filters Button in MFP Dashboard when navigating from ADA Visual
    useEffect(() => {
      if (
        props?.location?.isRedirectedFromMFPDashboard ||
        props?.location?.isRedirectedFromDashboard
      ) {
        setSelectedDate(adaDashboardReducer?.calendarDates);
        dispatch(setIsFiltersValid(true));
        setActiveKey((prevState) => prevState + 1);
      }

      if (isInventoryRedirection) {
        setInventoryPayloadInAdaReducer(dispatch, filterAttributeExclusionValues);
      }
    }, []);

    useEffect(() => {
      if (
        (isInventoryRedirection || isInventoryRedirectionProp) &&
        !adaDashboardReducer?.isFiltersValid
      ) {
        dispatch(setIsFiltersValid(true));
        setActiveKey((prevState) => prevState + 1);
      }
    }, [
      adaDashboardReducer?.product?.length,
      adaDashboardReducer?.store?.length,
    ]);

    const getFiscalWeeks = (startWeekId, endWeekId, isPredicted) => {
      let predictedFiscalWeeks = [];

      let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;
      let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
      let fiscalCalendarDetails = adaDashboardReducer?.fiscalCalendarDetails;
      // let startWeekId = payload?.filters?.timeline?.start_week_id;
      // let endWeekId = payload?.filters?.timeline?.end_week_id;

      let indexOFStartWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
        (elem) => {
          return elem[fiscalKey] === startWeekId;
        }
      );

      let indexOFEndWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
        (elem) => {
          return elem[fiscalKey] === endWeekId;
        }
      );

      for (
        let i = indexOFStartWeekIdInfiscalCalendarDetails;
        i <= indexOFEndWeekIdInfiscalCalendarDetails;
        i++
      ) {
        let fiscalWeek = fiscalCalendarDetails?.[i]?.[fiscalKey];

        if (
          predictedFiscalWeeks[predictedFiscalWeeks?.length - 1] !== fiscalWeek
        ) {
          predictedFiscalWeeks.push(fiscalWeek);
        }
      }
      if (isPredicted) {
        dispatch(setPredictedFiscalWeeks(predictedFiscalWeeks));
      } else {
        dispatch(setHistoricActualsFiscalWeeks(predictedFiscalWeeks));
      }

      return predictedFiscalWeeks;
    };

    useEffect(() => {
      let isRedirectedFromMFPDashboard =
        props?.location?.isRedirectedFromMFPDashboard;

      let isRedirectedFromDashboard =
        props?.location?.isRedirectedFromDashboard;
      if (
        ((isRedirectedFromMFPDashboard &&
          !isShowFilterOnDashboardForMFPClient) ||
          isRedirectedFromDashboard ||
          isInventoryRedirection) &&
        !adaDashboardReducer?.fiscalDates?.end_fw
      )
        return;

      if (!fiscalCalendarData?.length || !adaDashboardReducer?.isFiltersValid)
        return;

      let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;

      // let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
      let fiscalKey = "fiscal_year_week";
      let startWeekId = selectedDate?.fiscalInfoStartDate?.[fiscalKey];
      let endWeekId = selectedDate?.fiscalInfoEndDate?.[fiscalKey];

      if (
        (isRedirectedFromMFPDashboard &&
          !isShowFilterOnDashboardForMFPClient) ||
        !endWeekId
      ) {
        startWeekId = adaDashboardReducer?.fiscalDates?.start_fw;
        endWeekId = adaDashboardReducer?.fiscalDates?.end_fw;
      }
      const getAllTableColumnsData = async () => {
        try {
          dispatch(setComponentLoaderCount(1));

          // let payload = cloneDeep(appliedDate);

          // payload.aggregation_level = aggLevelSelected;`

          const tableColumns = await getLandingPageTableColumns(
            startWeekId,
            endWeekId,
            aggLevelSelected,
            adaDashboardReducer
          );
          // dispatch(setTableColumns(data));
          dispatch(setTableColumns(tableColumns?.data?.data));
        } catch (error) {
          console.log("error", error);
        } finally {
          dispatch(setComponentLoaderCount(-1));
          props?.setMakeDemandSelectionCAll?.(true);
        }
      };

      getAllTableColumnsData();
      getForecastAttributes(
        dispatch,
        adaDashboardReducer,
        startWeekId,
        endWeekId
      );
    }, [
      adaDashboardReducer?.isFiltersValid,
      adaDashboardReducer?.isEligible,
      fiscalCalendarData?.length,
      adaDashboardReducer?.fiscalDates?.end_fw,
    ]);

    const getHistoricActualsFiscalWeeks = (startWeekId, weekCounts) => {
      let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;
      let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];
      let fiscalCalendarDetails = adaDashboardReducer?.fiscalCalendarDetails;

      let indexOFStartWeekIdInfiscalCalendarDetails = fiscalCalendarDetails?.findIndex(
        (elem) => {
          return elem[fiscalKey] === startWeekId;
        }
      );

      let historicStartWeekId =
        fiscalCalendarDetails?.[
          indexOFStartWeekIdInfiscalCalendarDetails - 1
        ]?.[fiscalKey];
      let historicEndWeekId =
        fiscalCalendarDetails?.[
          indexOFStartWeekIdInfiscalCalendarDetails - weekCounts
        ]?.[fiscalKey];

      return [historicStartWeekId, historicEndWeekId];
    };

    useEffect(() => {
      let isRedirectedFromMFPDashboard =
        props?.location?.isRedirectedFromMFPDashboard;
      let isRedirectedFromDashboard =
        props?.location?.isRedirectedFromDashboard;
      if (
        ((isRedirectedFromMFPDashboard &&
          !isShowFilterOnDashboardForMFPClient) ||
          isRedirectedFromDashboard ||
          isInventoryRedirection) &&
        !adaDashboardReducer?.fiscalDates?.end_fw
      )
        return;
      let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;
      let defaultHistoricWeek = adaModuleConfiguratorReducer?.default_historic_week
        ? +adaModuleConfiguratorReducer?.default_historic_week
        : adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
            ?.dashboard?.defaultHistoricWeek;
      if (
        !adaDashboardReducer?.isFiltersValid ||
        !defaultHistoricWeek ||
        aggLevelSelected !== "W"
      ) {
        return;
      }
      let currentDate = moment(moment.utc().startOf("day"));
      let weekStart = currentDate.clone().startOf("week");

      let epoch = moment(weekStart).valueOf();
      let predictedCurrentStartWeek = fiscalCalendarData?.find((elem) => {
        return elem["calendar_week_start_date"] === epoch;
      });
      let columnPayload = cloneDeep(appliedDate || {});

      let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

      let historicDates = getHistoricActualsFiscalWeeks(
        predictedCurrentStartWeek?.[fiscalKey],
        adaDashboardReducer?.selectedHistoricValue?.[0]?.value ||
          defaultHistoricWeek
      );

      columnPayload.start_week_id = historicDates?.[1];
      columnPayload.end_week_id = historicDates?.[0];
      if (!columnPayload?.future_start_week_id) {
        columnPayload.future_start_week_id =
          adaDashboardReducer?.fiscalDates?.start_fw;
      }

      if (!columnPayload?.future_end_week_id) {
        columnPayload.future_end_week_id =
          adaDashboardReducer?.fiscalDates?.end_fw;
      }

      const fetchHistoricDataWrapper = async () => {
        try {
          dispatch(setComponentLoaderCount(1));

          columnPayload.aggregation_level = aggLevelSelected;
          const payload = cloneDeep(
            chartDataPayload(
              adaDashboardReducer,
              null,
              null,
              null,
              null,
              adaDashboardReducer?.isEligible
            )
          );

          let predictedFiscalWeeks = getFiscalWeeks(
            columnPayload.start_week_id,
            columnPayload.end_week_id,
            false
          );

          payload.adjusted = predictedFiscalWeeks.map((elem) => ({
            fiscal_timeperiod_id: elem,
            promo_percentage: null,
            price_point: null,
            modified: [],
          }));

          payload.adjusted_price_point = [];
          payload.filters.snapshot = columnPayload.start_week_id;
          payload.filters.timeline = {
            start_week_id: columnPayload.start_week_id,
            end_week_id: columnPayload.end_week_id,
            future_start_week_id:
              appliedDate?.start_week_id ||
              columnPayload.future_start_week_id ||
              adaDashboardReducer?.fiscalDates?.start_fw,
            future_end_week_id:
              appliedDate?.end_week_id ||
              columnPayload.future_end_week_id ||
              adaDashboardReducer?.fiscalDates?.end_fw,
          };

          payload.filters.compare_timeline.forEach((elem) => {
            elem.start_week_id = columnPayload.start_week_id;
            elem.end_week_id = columnPayload.end_week_id;
            elem.complete_year = false;
            elem.year = String(columnPayload.end_week_id)?.slice(0, 4) - 1;
          });

          payload.forecast_attributes = {
            IA: ["IA_PROMO", "ORG_IA"],
            ADJ: ["ADJ_PROMO", "ADJ_IA", "USR_IA"],
          };

          const [tableColumns, historicalForecastAttributes] = await Promise.all([
            getLandingPageTableColumns(
              columnPayload.start_week_id,
              columnPayload.end_week_id,
              aggLevelSelected,
              adaDashboardReducer
            ),
            getHistoricForecastAttributesData(payload),
          ]);

          let originalIAData = forecastMultiplierRowDataTransformer(
            predictedFiscalWeeks,
            historicalForecastAttributes,
            true,
            adaDashboardReducer.clientConfig?.attribute_value?.mfp,
            null,
            null,
            null,
            adaDashboardReducer
          )?.[0];

          originalIAData = {
            ...originalIAData,
            row: "original IA Forecast",
            forecast_multiplier: "original IA Forecast",
          };

          batch(() => {
            dispatch(setHistoricTableColumns(tableColumns?.data?.data));
            visualizationHistoricDataTransformer(
              predictedFiscalWeeks,
              historicalForecastAttributes,
              adaDashboardReducer,
              dispatch
            );
            dispatch(
              setAllForecastMultiplierData({
                key: "IA",
                value: originalIAData,
              })
            );
            dispatch(setHistoricForecastAttributes(historicalForecastAttributes));
          });
        } catch (error) {
          console.log("fetchHistoricDataWrapper error:", error);
        } finally {
          dispatch(setComponentLoaderCount(-1));
        }
      };

      fetchHistoricDataWrapper();
    }, [
      adaDashboardReducer?.isFiltersValid,
      adaDashboardReducer?.isEligible,
      adaDashboardReducer?.fiscalDates?.end_fw,
    ]);

    useEffect(() => {
      let isRedirectedFromMFPDashboard =
        props?.location?.isRedirectedFromMFPDashboard;

      let isRedirectedFromDashboard =
        props?.location?.isRedirectedFromDashboard;
      if (
        ((isRedirectedFromMFPDashboard &&
          !isShowFilterOnDashboardForMFPClient) ||
          isRedirectedFromDashboard ||
          isInventoryRedirection) &&
        !adaDashboardReducer?.fiscalDates?.end_fw
      )
        return;

      if (!fiscalCalendarData?.length) return;
      if (!adaDashboardReducer?.isFiltersValid) return;
      let aggLevelSelected = adaDashboardReducer?.switchTimeLine?.[0]?.value;

      let defaultHistoricWeek = adaModuleConfiguratorReducer?.default_historic_week
        ? +adaModuleConfiguratorReducer?.default_historic_week
        : adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
            ?.dashboard?.defaultHistoricWeek;

      let currentDate = moment(moment.utc().startOf("day"));
      let weekStart = currentDate.clone().startOf("week");

      let epoch = moment(weekStart).valueOf();
      let predictedCurrentStartWeek = fiscalCalendarData?.find((elem) => {
        return elem["calendar_week_start_date"] === epoch;
      });

      let fiscalKey = FISCAL_KEY_MAPPING[aggLevelSelected];

      getAllActuals(
        adaDashboardReducer,
        adaDashboardReducer?.selectedHistoricValue?.[0]?.value ||
          defaultHistoricWeek,
        predictedCurrentStartWeek?.[fiscalKey],
        dispatch
      );
    }, [
      adaDashboardReducer?.isFiltersValid,
      adaDashboardReducer?.isEligible,
      fiscalCalendarData?.length,
      adaDashboardReducer?.fiscalDates?.end_fw,
      // renderAfterPrepareInventoryPayload?.current,
    ]);

    //Removing Select Filters Button from ADA Visual
    let isRedirectedFromMFPDashboard =
      props?.location?.isRedirectedFromMFPDashboard;

    let adaPayloadFromMfp = useMemo(() => {
      return JSON.parse(props?.location?.adaPayload || "{}");
    }, []);

    useEffect(() => {
      if (
        props?.location?.isRedirectedFromDashboard ||
        (isRedirectedFromMFPDashboard && isShowFilterOnDashboardForMFPClient)
      ) {
        let formattedFilterDependency = formatSelectedFiltersData(
          adaVisualFilterConfiguration?.filterConfig,
          "Ada Visual",
          adaPayloadFromMfp?.selectedDependency
        );

        // selection date on MFP page before, saving that date in reducer and then redirecting to ADA Visual
        // so, when coming back to MFP page, we need to set the selected date again

        // if (adaPayloadFromMfp?.selectedDate) {
        setSelectedDate(adaPayloadFromMfp?.selectedDate);

        let formattedAppliedDate = {
          start_date: moment(
            adaPayloadFromMfp?.selectedDate?.fiscalInfoStartDate
              ?.calendar_week_start_date
          ).format("MM-DD-YYYY"),
          end_date: moment(
            adaPayloadFromMfp?.selectedDate?.fiscalInfoEndDate
              ?.calendar_week_start_date
          )
            .add(6, "days")
            .format("MM-DD-YYYY"),
          start_week_id:
            adaPayloadFromMfp?.selectedDate?.fiscalInfoStartDate
              ?.fiscal_year_week,
          end_week_id:
            adaPayloadFromMfp?.selectedDate?.fiscalInfoEndDate
              ?.fiscal_year_week,
        };

        console.log(
          formattedAppliedDate,
          "onFilterDashboardClickonFilterDashboardClick 🚀 ~ adaPayloadFromMfp?.selectedDate:",
          cloneDeep(adaPayloadFromMfp?.selectedDate)
        );
        setAppliedDate(formattedAppliedDate);
        setCalendarDate(adaPayloadFromMfp?.selectedDate);
        // }

        setFilterDependency(formattedFilterDependency);
      }
    }, [props?.location?.isRedirectedFromDashboard]);

    if (
      (isRedirectedFromMFPDashboard && !isShowFilterOnDashboardForMFPClient) ||
      isInventoryRedirection ||
      isInventoryRedirectionProp
    ) {
      return (
        <div className={classes.noBtnContainer}>
          <FilterChips
            hideSelectedFilterBadge={true}
            filterConfig={selectedDependencyHandler(
              adaVisualFilterConfiguration,
              adaPayloadFromMfp,
              adaDashboardReducer
            )}
            dateFilter={filterChipsDate(
              adaPayloadFromMfp,
              defaultWeekSelection,
              adaDashboardReducer
            )}
            defaultDateFormat={
              adaDashboardReducer?.clientConfig?.attribute_value
                ?.week_end_date_label_config?.week_end_date_label_formatting
            }
            getCustomFilterChipsData={getCustomFilterChipsData}
          />
          {children}
        </div>
      );
    }

    return (
      <>
        <CoreComponentScreen
          showPageRoute={false}
          headerBreadCrumb={props.headerBreadCrumb}
          showFilterLoader={false}
          showFilterDashboard={true}
          filterConfigKey={"adaVisualFilterConfiguration"}
          onApplyFilter={(data) => {
            dispatch(setFilterFullScreenLoaderCount(1));
            if (customTopFilterLoading)
              setTimeout(() => onFilterDashboardClick(data), 100);
            else onFilterDashboardClick(data);
          }}
          contained={true}
          customTopComponent={
            <DateRangeCompareWith
              calendarDate={calendarDate}
              onDateChange={handleDateChange}
              selectedDate={selectedDate}
              loader={loader}
              savedFilterUserConfig={savedFilterUserConfig}
              customTopFilterLoading={customTopFilterLoading}
              setCustomTopFilterLoading={setCustomTopFilterLoading}
            />
          }
          topComponentLabel={t("ada.dashboard.dateRangeAndAggregationLevel")}
          topComponentRequired={true}
          topComponentNumberOfFilter={
            selectedDate.fiscalInfoEndDate && selectedDate.fiscalInfoEndDate
              ? 2
              : 1
          }
          dateFilter={dateFilter(
            showProductSeasonFilters,
            calendarDate,
            appliedDate,
            adaDashboardReducer,
            adaPayloadFromMfp,
            isShowFilterOnDashboardForMFPClient
          )}
          defaultDateFormat={
            adaDashboardReducer?.clientConfig?.attribute_value
              ?.week_end_date_label_config?.week_end_date_label_formatting
          }
          customBottomComponent={
            <LoadingOverlay minHeight={70} isCustomLoader={true}>
              <CompareWith
                historicYears={historicYears}
                updateCompareWithValuesInRedux={updateCompareWithValuesInRedux}
                compareRadioButtons={compareRadioButtons}
                fiscalDatesEnd={
                  calendarDate?.fiscalInfoEndDate?.fiscal_year_week
                }
                savedCompareWith={savedCompareWith}
              />
            </LoadingOverlay>
          }
          bottomComponentLabel={t("ada.dashboard.compareWith")}
          bottomComponentRequired={true}
          bottomComponentNumberOfFilter={1}
          filterDependency={
            (props?.location?.isRedirectedFromDashboard ||
              (isRedirectedFromMFPDashboard &&
                isShowFilterOnDashboardForMFPClient)) &&
            filterDependency
          }
          containsCustomFilterSection={
            filterConfigType && filterConfigType !== "global"
          }
          getCustomFilterChipsData={getCustomFilterChipsData}
          getCustomFilterDataAndDependency={() => {
            return {
              customFilterData: getCustomFilterData(showProductSeasonFilters),
              customFilterDependency: [
                {
                  filter_id: "range-picker",
                  attribute_name: "range-picker",
                  operator: "in",
                  dimension: "custom",
                  values: [
                    calendarDate?.fiscalInfoStartDate?.fiscal_year_week,
                    calendarDate?.fiscalInfoEndDate?.fiscal_year_week,
                  ],
                  filter_type: "non-cascaded",
                  display_type: "rangePicker",
                  disableType: "disableOnlyPast",
                  startYear: null,
                },
                {
                  filter_id: "agg_level_select",
                  attribute_name: "agg_level_select",
                  operator: "in",
                  dimension: "custom",
                  values: adaDashboardReducer?.switchTimeLine,
                  filter_type: "non-cascaded",
                  display_type: "select",
                },
                {
                  filter_id: "compare_with_select",
                  attribute_name: "compare_with_select",
                  operator: "in",
                  dimension: "custom",
                  values: [
                    adaDashboardReducer?.compareWithSelectedDate,
                    adaDashboardReducer?.isCompareWithDropdown,
                  ],
                  filter_type: "non-cascaded",
                  display_type: "select",
                },
                ...(showProductSeasonFilters
                  ? [
                      {
                        filter_id: "product_sub_season",
                        attribute_name: "product_sub_season",
                        display_type: "select",
                        dimension: "custom",
                        filter_type: "cascaded",
                        operator: "in",
                        values:
                          adaDashboardReducer?.productSeasonFilters?.find(
                            (filter) =>
                              filter.attribute_name === "product_sub_season"
                          )?.selectedOptions || [],
                      },
                      {
                        filter_id: "product_season_name",
                        attribute_name: "product_season_name",
                        type: "cascaded",
                        display_type: "select",
                        dimension: "custom",
                        operator: "in",
                        values:
                          adaDashboardReducer?.productSeasonFilters?.find(
                            (filter) =>
                              filter.attribute_name === "product_season_name"
                          )?.selectedOptions || [],
                      },
                      {
                        filter_id: "product_season_name",
                        attribute_name: "product_season_name",
                        type: "cascaded",
                        display_type: "select",
                        dimension: "custom",
                        operator: "in",
                        values:
                          adaDashboardReducer?.productSeasonFilters?.find(
                            (filter) =>
                              filter.attribute_name === "product_season_name"
                          )?.selectedOptions || [],
                      },
                      {
                        filter_id: "fiscal_year",
                        label: "PRODUCT YEAR",
                        attribute_name: "fiscal_year",
                        type: "cascaded",
                        display_type: "select",
                        dimension: "custom",
                        operator: "in",
                        filter_keyword: "fiscal_year",
                        values:
                          adaDashboardReducer?.productSeasonFilters?.find(
                            (filter) => filter.attribute_name === "fiscal_year"
                          )?.selectedOptions || [],
                      },
                      {
                        filter_id: "fiscal_week",
                        label: "PRODUCT WEEK",
                        attribute_name: "fiscal_week",
                        type: "cascaded",
                        display_type: "select",
                        dimension: "custom",
                        operator: "in",
                        filter_keyword: "fiscal_week",
                        values:
                          adaDashboardReducer?.productSeasonFilters?.find(
                            (filter) => filter.attribute_name === "fiscal_week"
                          )?.selectedOptions || [],
                      },
                    ]
                  : []),
              ],
            };
          }}
        >
          {children}
        </CoreComponentScreen>
      </>
    );
  }
);

AdaDashboardFilters.displayName = "AdaDashboardFilters";

export default AdaDashboardFilters;

const useStyles = makeStyles((theme) => ({
  backBtn: {
    marginBottom: "20px",
  },
  backBtnContainer: {
    display: "flex",
    justifyContent: "end",
  },
  noBtnContainer: {
    padding: "0 24px",
  },
  visibilityHidden: {
    visibility: "hidden",
    height: "0px",
    position: "absolute",
    zIndex: -1,
  },
}));
