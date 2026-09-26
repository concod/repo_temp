import { useEffect, useMemo, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  configureYearOptions,
  createDynamicYears,
  DEFAULT_WEEK,
  fetchCrossFilterOptions,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getStyleObj,
  handleCompareBtnClick,
  isNumber,
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
  setCompareWithSelectedDate,
  setHistoricActuals,
  setIsCompareWithDropdown,
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
  setFilterConfiguration,
  setSelectedFilters,
} from "core/actions/filterAction";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import CompareWith from "./filters/compare-with";
import DateRangeCompareWith from "./filters/date-range-compare-with";
import { formatStringDate } from "core/Utils/functions/utils";
import {
  setResetForecastMultiplierData,
  setResetHistoricalActualData,
} from "modules/ada/services-ada/ada-dashboard/ada-forecastmultiplier-services";
import FilterChips from "core/commonComponents/filters/filterChips";
import { MANDATORY_FIELD_ERROR_MESSAGE } from "modules/ada/constants-ada/stringContants";
import AdaMfpBreadcrumb from "../MFP-Dashboard/mf-ada-breadcrumb";

export const redirectedFromInventoryDashboard = localStorage.getItem(
  "adaPayload"
);

export const allocationInventoryPayload = localStorage.getItem(
  "adaPayloadFromInventory"
);

const AdaDashboardFilters = ({
  children,
  setActiveKey,
  setPastYear,
  setGraphPayload,
  loader,
  isCalledFromMFPDashboard,
  isRedirectedFromADAVisual,
  ...props
}) => {
  // this state is just for the chip, no logic is driven by this state
  const [appliedDate, setAppliedDate] = useState(null);
  const [savedCompareWith, setSavedCompareWith] = useState(null);
  const [isSelectFilterBtnHidden, setIsSelectFilterBtnHidden] = useState(false);
  const [payloadCreatedFromMFP, setPayloadCreatedFromMFP] = useState(
    props?.location?.adaPayload
  );
  const [payloadForFilterChips, setPayloadForFilterChips] = useState(
    props?.location?.adaPayload && JSON.parse(props?.location?.adaPayload)
  );

  const [filterDependency, setFilterDependency] = useState({});

  const [compareRadioButtons, setCompareRadioButtons] = useState([]);

  const [historicYears, setHistoricYears] = useState([]);

  const isHistoricDateWarningRendered = useRef(false);
  const [selectedDate, setSelectedDate] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const adaDashboardReducer = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer
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

  const adaVisualFilterConfiguration = useSelector(
    (store) =>
      store?.filterReducer?.filterDashboardConfiguration[
        "adaVisualFilterConfiguration"
      ]
  );

  const savedSelectedFilter = useSelector(
    (store) => store?.filterReducer?.savedSelectedFilter
  );
  const filterConfigType = useSelector(
    (store) =>
      store?.tenantUserRoleMgmtReducer?.userRoleManagementReducer
        .filterConfigType
  );

  const addStyles =
    adaDashboardReducer?.clientConfig?.attribute_value?.show_features
      ?.change_product_style_ids;

  const dispatch = useDispatch();

  const onFilterDashboardClick = async (dependencyData) => {
    try {
      dispatch(setFilterFullScreenLoaderCount(1));
      dispatch(setIsFiltersValid(false));
      setPayloadForFilterChips(null);

      if (!adaDashboardReducer?.historicActuals?.length) {
        return infoHandler(dispatch, MANDATORY_FIELD_ERROR_MESSAGE);
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
        errorHandler(dispatch, null, MANDATORY_FIELD_ERROR_MESSAGE);
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

      let diffTodaySelected = startDate.diff(
        moment(moment(), "MM-DD-YYYY"),
        "days"
      );

      if (diffTodaySelected < -6) {
        return infoHandler(
          dispatch,
          "Please select start date as current week or a future date"
        );
      }

      if (days > diffToday6Months) {
        return infoHandler(
          dispatch,
          "Please make sure you select a maximum date range of 6 months"
        );
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
          let storeGroups = storeGroupData?.values?.map((elem) => elem?.value);
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
              values:
                storeCodes?.map((elem) => ({
                  label: elem,
                  value: elem,
                  id: elem,
                })) || [],
              attribute_name: "store_code",
              operator: "in",
            };

            storeFilters.push(store_code);
          }

          if (!addStyles && (productGroups || storeGroups)) {
            let ProductStoreCodeData = await getFilteredProductStoreCode(
              filters
            );

            if (productGroups && ProductStoreCodeData?.product_code) {
              let product_code = {
                filter_name: "product_code",
                filter_id: "product_code",
                filter_type: "non-cascaded",
                dimension: "product",
                display_type: "dropdown",

                is_mandatory: false,
                values:
                  ProductStoreCodeData?.product_code?.map((elem) => ({
                    label: elem,
                    value: elem,
                    id: elem,
                  })) || [],
                attribute_name: "product_code",
                operator: "in",
              };

              productFilters.push(product_code);

              productFilters = productFilters?.filter(
                (elem) => elem?.filter_id !== "product_group"
              );
            }

            if (storeGroups && ProductStoreCodeData?.store_code) {
              let store_code = {
                filter_name: "store_code",
                filter_id: "store_code",
                filter_type: "non-cascaded",
                dimension: "product",
                display_type: "dropdown",

                is_mandatory: false,
                values:
                  ProductStoreCodeData?.store_code?.map((elem) => ({
                    label: elem,
                    value: elem,
                    id: elem,
                  })) || [],
                attribute_name: "store_code",
                operator: "in",
              };
              storeFilters.push(store_code);
            }
            storeFilters = storeFilters?.filter(
              (elem) => elem?.filter_id !== "store_group"
            );
            console.log(
              productFilters,
              "🚀 ~ file: adaDashboardFilters.jsx ~ line 329 ~ onFilterDashboardClick ~ storeFilters",
              storeFilters
            );
          }
        }
      }

      const data = await getStaticForecastXaxis(graphPayload);

      dispatch(setXaxisStaticDates(data));

      let payload = {
        product: productFilters,
        store: storeFilters,
        product_store: productStoreFilters,
      };

      // Fiscal date mapping is always with the first day of week
      // So, we need to add 6 days to the end date to get the last day of week
      // reducer might not have the data as dispatch from calendar is removed to filterClick
      let cloneDates = cloneDeep(adaDashboardReducer?.fiscalDates);

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
        };
      }
      cloneDates.end_date = moment(cloneDates.end_date)
        .add(6, "days")
        .format("MM-DD-YYYY");

      setAppliedDate(cloneDates);

      // dispatch(setXaisStaticHistoricDates({}));

      dispatch(setAppliedFilters(payload));
      dispatch(setAppliedDateFilters(cloneDates));
      dispatch(setOnCompareSave(false));
      dispatch(setResetForecastData());
      dispatch(setResetForecastMultiplierData());
      dispatch(setXaisStaticHistoricDates({}));
      dispatch(setGraphKPIWeeks(DEFAULT_WEEK));
      const onClearPayload = {
        selectedHistoricValue: [],
        historicalDataFiscalWeek: {},
        historicalDataFiscalWeekCompare: {},
        predictedHistoricCompareWithMapping: {},
      };
      dispatch(setHistoricalFiscalData(onClearPayload));
      dispatch(setResetHistoricalActualData());
      dispatch(setIsFiltersValid(true));

      setActiveKey((prevState) => prevState + 1);
    } catch (err) {
    } finally {
      dispatch(setFilterFullScreenLoaderCount(-1));
    }
  };

  const onBackButtonClickHandler = () => {
    const { inventoryAdaPayload } = adaDashboardReducer;
    dispatch(setSelectedFilters(inventoryAdaPayload.filters));
    dispatch(
      setCreateAllocationFilterDependency(
        inventoryAdaPayload.selectedDependency
      )
    );
    dispatch(
      setArticleAgGridParams({
        selection: inventoryAdaPayload.selection,
        prevAction: inventoryAdaPayload.prev_action,
      })
    );
    props.history.push(`${CREATE_ALLOCATION}?step=0&type=backButton&from=ada`);
  };

  const globalClasses = globalStyles();
  const fiscalCalendarData = useSelector(
    (store) => store?.adaReducer?.adaDashboardReducer?.fiscalCalendarDetails
  );

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
      if (!isRedirectedFromADAVisual) {
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
    }
    if (!savedSelectedFilter) {
      console.log("filter reset");
      setSavedCompareWith([]);
      // savedDates = [];
    }

    return savedDates?.values || [];
  }, [savedFilterUserConfig, savedSelectedFilter]);

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
    // if called from MFP dashboard, then filters are required.
    if (isCalledFromMFPDashboard) {
      if (getSavedFilterSelectionLoading) return;
    } else {
      // if redirected from inventory dashboard, then filters are not required to be fetched
      if (
        allocationInventoryPayload ||
        redirectedFromInventoryDashboard ||
        getSavedFilterSelectionLoading ||
        payloadCreatedFromMFP
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
                filterDashboardData: [...response, ...customFilterData],
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

  //added default weeks selection through client config
  const defaultWeekSelection =
    adaDashboardReducer?.clientConfig?.attribute_value?.show_features
      ?.default_week_selection - 1 || 7;
  // For Screen Level Saved Filters Clients i.e. RL
  // set saved calendar from user-preference/screen/ada-visual api
  // else select next 8 weeks in fiscal calendar
  useEffect(() => {
    if (!fiscalCalendarData?.length || payloadCreatedFromMFP) return;
    const startDate = moment().startOf("week").format("MM-DD-YYYY");
    const endDate = moment()
      .add(defaultWeekSelection, "weeks")
      .startOf("week")
      .format("MM-DD-YYYY");

    const fiscalStartDate = fiscalCalendarData?.find((date) => {
      const formattedDate = formatStringDate(
        date?.calendar_week_start_date,
        true,
        false,
        "MM-DD-YYYY"
      );

      /** Moment isSame does not work with Mozilla Thus Using Or Operator */
      return (
        moment(formattedDate).isSame(startDate) || formattedDate === startDate
      );
    });

    const fiscalEndDate = fiscalCalendarData?.find((date) => {
      const formattedDate = formatStringDate(
        date?.calendar_week_start_date,
        true,
        false,
        "MM-DD-YYYY"
      );
      /** Moment isSame does not work with Mozilla Thus Using Or Operator */
      return moment(formattedDate).isSame(endDate) || formattedDate === endDate;
    });

    if (savedDate?.length) {
      const savedFiscalStartDate = fiscalCalendarData?.find((date) => {
        return +date?.fiscal_year_week === +savedDate?.[0];
      });

      const savedFiscalEndDate = fiscalCalendarData?.find((date) => {
        return +date?.fiscal_year_week === +savedDate?.[1];
      });

      if (+savedDate?.[0] < +fiscalStartDate?.fiscal_year_week) {
        if (!isHistoricDateWarningRendered.current) {
          infoHandler(
            dispatch,
            "Saved Filter contained historic start date, that has been reset to current date"
          );
        }
        isHistoricDateWarningRendered.current = true;
        return setSelectedDate({
          fiscalInfoStartDate: fiscalStartDate,
          fiscalInfoEndDate: fiscalEndDate,
        });
      }

      setSelectedDate({
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
      });
    } else {
      setSelectedDate({
        fiscalInfoStartDate: fiscalStartDate,
        fiscalInfoEndDate: fiscalEndDate,
      });
    }
  }, [fiscalCalendarData, savedDate]);

  const classes = useStyles();

  const handleDateChange = (dates) => {
    setSelectedDate(dates);
  };

  //Loading Compnonets in MFP Dashboard when navigating from Inventory screens
  useEffect(() => {
    if (redirectedFromInventoryDashboard || allocationInventoryPayload) {
      dispatch(setIsFiltersValid(true));
    }
  }, [redirectedFromInventoryDashboard, allocationInventoryPayload]);

  //Showing Select Filters Button in MFP Dashboard when navigating from ADA Visual
  useEffect(() => {
    if (isCalledFromMFPDashboard && payloadCreatedFromMFP) {
      dispatch(setIsFiltersValid(true));
      setIsSelectFilterBtnHidden(false);
    }
  }, [payloadCreatedFromMFP]);

  // TO DO, use below data when date range api is removed as part of optimisation and fiscal-ids-graph-xaxis is not blocking api
  useEffect(() => {
    var fiscal_ids = [];
    if (adaDashboardReducer?.switchTimeLine[0]?.value === "W") {
      let result = fiscalCalendarData.filter(
        (data) =>
          data.fiscal_year_week >=
            selectedDate?.fiscalInfoStartDate?.fiscal_year_week &&
          data.fiscal_year_week <=
            selectedDate?.fiscalInfoEndDate?.fiscal_year_week
      );
      result.map((data) => {
        fiscal_ids.push(data?.fiscal_year_week);
      });
    }
    if (adaDashboardReducer?.switchTimeLine[0]?.value === "M") {
      let result = fiscalCalendarData.filter(
        (data) =>
          data.fiscal_year_month >=
            selectedDate?.fiscalInfoStartDate?.fiscal_year_month &&
          data.fiscal_year_month <=
            selectedDate?.fiscalInfoEndDate?.fiscal_year_month
      );
      result.map((data) => {
        fiscal_ids.push(data?.fiscal_year_month);
      });
      fiscal_ids = [...new Set(fiscal_ids)];
    }
    if (adaDashboardReducer?.switchTimeLine[0]?.value === "Q") {
      let result = fiscalCalendarData.filter(
        (data) =>
          data.fiscal_year_quarter >=
            selectedDate?.fiscalInfoStartDate?.fiscal_year_quarter &&
          data.fiscal_year_quarter <=
            selectedDate?.fiscalInfoEndDate?.fiscal_year_quarter
      );
      result.map((data) => {
        fiscal_ids.push(data?.fiscal_year_quarter);
      });
      fiscal_ids = [...new Set(fiscal_ids)];
    }
    let payloadData = {
      fiscal_ids,
    };
    if (fiscal_ids?.length !== 0) {
      dispatch(setFiscalIdPayload(payloadData));
    }
  }, [adaDashboardReducer?.switchTimeLine, selectedDate]);

  useEffect(() => {
    if (!selectedDate?.fiscalInfoEndDate?.fiscal_year_week) return;
    const compareWithOptions =
      adaDashboardReducer?.clientConfig?.attribute_value?.attribute_value
        ?.dashboard?.compareWith?.labels;

    let compareRadioOptions = compareWithOptions?.map((option, index) => ({
      label: option.label,
      value: handleCompareBtnClick(
        selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
        option.value
      )?.value,
      id: handleCompareBtnClick(
        selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
        option.value
      )?.value,
      index: index + 1, // with v3, for selected Radio, we need to pass Radio button number
    }));
    console.log(compareWithOptions, "zsaSXZDCxvb", compareRadioOptions);

    setCompareRadioButtons(compareRadioOptions);
    updateCompareWithValuesInRedux([compareRadioOptions[0]]);
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

  const updateCompareWithValuesInRedux = (
    selectedOptions,
    isDropdown = false
  ) => {
    const payload = selectedOptions.map(({ value }) => ({
      year: Number(value),
      start_week_id: selectedDate?.fiscalInfoStartDate?.fiscal_year_week,
      end_week_id: selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
      complete_year: false,
    }));

    dispatch(setCompareWithSelectedDate(selectedOptions));
    dispatch(setHistoricActuals(payload));
    dispatch(setIsCompareWithDropdown(isDropdown));
  };

  //Removing Select Filters Button in MFP Dashboard when navigating from Inventory screens
  if (redirectedFromInventoryDashboard || allocationInventoryPayload) {
    return <div className={classes.noBtnContainer}>{children}</div>;
  }

  //Removing Select Filters Button from ADA Visual
  if (!isCalledFromMFPDashboard && payloadCreatedFromMFP) {
    return (
      <div className={classes.noBtnContainer}>
        <FilterChips
          hideSelectedFilterBadge={true}
          filterConfig={payloadForFilterChips?.selectedDependency}
          dateFilter={payloadForFilterChips?.appliedDate}
          defaultDateFormat={
            adaDashboardReducer?.clientConfig?.attribute_value
              ?.week_end_date_label_config?.week_end_date_label_formatting
          }
        ></FilterChips>
        {children}
      </div>
    );
  }

  if (redirectedFromInventoryDashboard || allocationInventoryPayload) {
    return <div className={classes.noBtnContainer}>{children}</div>;
  }

  useEffect(() => {
    if (!isRedirectedFromADAVisual) return;
    let formattedFilterDependency = formatSelectedFiltersData(
      adaVisualFilterConfiguration?.filterConfig,
      "Ada Visual",
      payloadForFilterChips?.selectedDependency
    );

    // selection date on MFP page before, saving that date in reducer and then redirecting to ADA Visual
    // so, when coming back to MFP page, we need to set the selected date again

    if (payloadForFilterChips?.selectedDate) {
      setSelectedDate(payloadForFilterChips?.selectedDate);
    }

    setFilterDependency(formattedFilterDependency);
  }, [isRedirectedFromADAVisual]);

  return (
    <>
      {/* Hide the "Select Filters" button when navigating from other inventory screens, 
      and show it when coming from ADA Visual screen to MFP */}
      {!isSelectFilterBtnHidden && (
        <CoreComponentScreen
          showPageRoute={false}
          headerBreadCrumb={props.headerBreadCrumb}
          showFilterLoader={false}
          showFilterDashboard={true}
          filterConfigKey={"adaVisualFilterConfiguration"}
          onApplyFilter={onFilterDashboardClick}
          contained={true}
          customTopComponent={
            <DateRangeCompareWith
              onDateChange={handleDateChange}
              selectedDate={selectedDate}
              loader={loader}
              savedFilterUserConfig={savedFilterUserConfig}
            />
          }
          topComponentLabel={"Date range and Aggregation level"}
          topComponentRequired={true}
          topComponentNumberOfFilter={
            selectedDate.fiscalInfoEndDate && selectedDate.fiscalInfoEndDate
              ? 2
              : 1
          }
          dateFilter={appliedDate}
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
                fiscalDateStart={
                  selectedDate?.fiscalInfoStartDate?.fiscal_year_week
                }
                fiscalDatesEnd={
                  selectedDate?.fiscalInfoEndDate?.fiscal_year_week
                }
                selectedDate={selectedDate}
                savedCompareWith={savedCompareWith}
                isRedirectedFromADAtoMFP={
                  isCalledFromMFPDashboard && payloadCreatedFromMFP
                }
              />
            </LoadingOverlay>
          }
          bottomComponentLabel={"Compare with"}
          bottomComponentRequired={true}
          bottomComponentNumberOfFilter={1}
          containsCustomFilterSection={
            filterConfigType && filterConfigType !== "global"
          }
          getCustomFilterDataAndDependency={() => {
            return {
              customFilterData,
              customFilterDependency: [
                {
                  filter_id: "range-picker",
                  attribute_name: "range-picker",
                  operator: "in",
                  dimension: "custom",
                  values: [
                    selectedDate?.fiscalInfoStartDate?.fiscal_year_week,
                    selectedDate?.fiscalInfoEndDate?.fiscal_year_week,
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
              ],
            };
          }}
          filterDependency={isRedirectedFromADAVisual && filterDependency}
        >
          {children}
        </CoreComponentScreen>
      )}
    </>
  );
};

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

let customFilterData = [
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
];
