import React, { useEffect, useState } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { connect } from "react-redux";
import {
  clearExcessInventoryStates,
  getExcessInventoryFiscalWeekGraph,
  saveExcessReportsFiltersState,
  setExcessInventoryFilterConfiguration,
  setExcessInventoryGraphData,
  setExcessInventoryScreenLoader,
  setExcessInventoryTableLoader,
  setExcessReportRenderTable,
  setShowExcessInventoryDetails,
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/excess-inventory-report-services";
import { cloneDeep, isEmpty, isNull } from "lodash";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import { formatStringDate } from "core/Utils/functions/utils";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  ERROR_MESSAGE,
  EXCESS_INV_FISCAL_CALENDAR_FILTER_MULTI_WEEK,
  rangePickerConstant,
  tableConfigurationMetaData,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import moment from "moment";
import { getCustomDateFilterObject } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import Loader from "core/Utils/Loader/loader";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { EXCESS_INVENTORY_MODULE, EXCESS_INVENTORY_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { parseToYMD } from "modules/inventorysmart/utils-inventorysmart/utilityFunctions";
import { useReportingStyles } from "../reportingStyles";

const ExcessInventoryFilters = (props) => {
  const reportingClasses = useReportingStyles();
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState(null);
  const excessInventoryConfig = props.moduleConfig?.[EXCESS_INVENTORY_MODULE];
  const fiscal_date_range = excessInventoryConfig?.fiscal_date_range ?? true;
  const week_start_day = excessInventoryConfig?.week_start_day ?? 0;

  useEffect(() => {
    setFiscalCalendarDetails(props?.fiscalCalendarData);
    moment.updateLocale("en", {
      week: {
        dow: props?.fiscalCalendarData?.week_start_day
          ? props?.fiscalCalendarData?.week_start_day
          : week_start_day,
      },
    });
  }, [props?.fiscalCalendarData, week_start_day]);

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error", props);
    else displaySnackMessages(ERROR_MESSAGE, "error", props);
  };

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig(
          "Excess Inventory Report Filters"
        );
        props.setExcessInventoryFilterConfiguration(response);
      } catch (e) {
        handleErrorMessage(e);
      }
    };
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setExcessInventoryFilterConfiguration(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    getInitialFilterConfiguration();
    return () => props?.clearExcessInventoryStates();
  }, []);

  useEffect(() => {
    const onLoad = async () => {
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.excessInventoryFilterConfiguration) &&
        !isNull(fiscalCalendarDetails)
      ) {
        const getFilterValues = async (selected, current) => {
          try {
            let requiredFilterObjParams = {
              allFilters: cloneDeep(props.excessInventoryFilterConfiguration),
              appliedFilters: selected,
              current: current,
              rolesBasedAccess:
                props.inventorysmartScreenConfig?.roleBasedAccess,
              screenName: EXCESS_INVENTORY_SCREEN_NAME,
              customDependency: [
                getActiveEntityFilter("product"),
                getActiveEntityFilter("store"),
              ],
              tenantFilterUamConfig: props.tenantFilterUamConfig,
            };
            const response = await fetchFilterOptions(requiredFilterObjParams);
            const fiscalCalendarConfig = cloneDeep(
              EXCESS_INV_FISCAL_CALENDAR_FILTER_MULTI_WEEK
            );
            fiscalCalendarConfig.fc_code = response[0]?.fc_code;
            fiscalCalendarConfig.initialData =
              fiscalCalendarDetails?.data || [];
            fiscalCalendarConfig.disableFutureWeeks = true;

            let filterDataWithCustomFilter = [];
            if (fiscal_date_range) {
              filterDataWithCustomFilter = [fiscalCalendarConfig, ...response];
            } else {
              filterDataWithCustomFilter = [
                ...response,
                ...rangePickerConstant,
              ];
            }
            const filterConfigData = [
              {
                filterDashboardData: filterDataWithCustomFilter,
                expectedFilterDimensions: getFilterDimensions(
                  filterDataWithCustomFilter
                ),
                isCrossDimensionFilter: true,
                screen_name: EXCESS_INVENTORY_SCREEN_NAME,
              },
            ];
            const filterConfig = formattedFilterConfiguration(
              "excessInvFilterConfiguration",
              filterConfigData,
              "EXCESS_INVENTORY_SCREEN_NAME"
            );
            props.setFilterConfiguration(filterConfig);
          } catch (err) {
            handleErrorMessage(err);
          }
        };
        getFilterValues(props.savedFilterSelection);
      }
    };
    onLoad();
  }, [
    props.excessInventoryFilterConfiguration,
    props.savedFilterSelection,
    fiscalCalendarDetails,
  ]);

  const applyFilters = async (_filterElements, dependency, filterDates) => {
    const dates = filterDates?.values;
    props?.setShowExcessInventoryDetails(false);
    props.setExcessInventoryTableLoader(true);
    props?.setExcessInventoryScreenLoader(true)
    let filters = [];
    let date_range = undefined;
    dependency.forEach((filterKeysValue) => {
      if (
        filterKeysValue.attribute_name !== "range-picker" &&
        filterKeysValue.attribute_name !== "fiscal_date_range"
      ) {
        filters.push(filterKeysValue);
      } else {
        if (filterKeysValue.attribute_name === "range-picker") {
          date_range = {
            start_date: filterKeysValue.values[0],
            end_date: filterKeysValue.values[1],
          };
        } else {
          if (dates && fiscal_date_range) {
            let startDate = null,
              endDate = null;
            if (dates.fiscalInfoStartDate.actualSelectedDate) {
              startDate = parseToYMD(
                dates?.fiscalInfoStartDate?.actualSelectedDate
              );
              endDate = parseToYMD(
                dates?.fiscalInfoEndDate?.actualSelectedDate
              );
            } else {
              endDate = formatStringDate(
                dates?.fiscalInfoEndDate?.fiscal_week_end_date,
                false,
                true
              ).format("YYYY-MM-DD");
              startDate = formatStringDate(
                dates?.fiscalInfoStartDate?.calendar_week_start_date,
                false,
                true
              ).format("YYYY-MM-DD");
            }
            date_range = {
              start_date: startDate,
              end_date: endDate,
            };
          }
        }
      }
    });
    try {
      let graphReqBody = {
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: 10, page: 1 },
        },
        filters: [
          ...filters,
          getCustomDateFilterObject("start_date", "start_date", [
            date_range?.start_date || undefined,
          ]),
          getCustomDateFilterObject("end_date", "end_date", [
            date_range?.end_date || undefined,
          ]),
        ],
        application_code: 1,
        date_range: date_range,
      };
      let response = await props.getExcessInventoryFiscalWeekGraph(
        graphReqBody
      );
      props.setExcessInventoryGraphData(response.data?.data);
      response.data?.status && props?.setShowExcessInventoryDetails(true);
      props?.setExcessReportRenderTable(graphReqBody);
      response?.data?.status && props?.setExcessInventoryScreenLoader(false)
      props.setExcessInventoryTableLoader(false);
    } catch (err) {
      handleErrorMessage(err);
      props.setExcessInventoryTableLoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    const dates = dependencyData.find((dataItem) => {
      return dataItem.attribute_name === "fiscal_date_range";
    });
    props?.saveExcessReportsFiltersState(dependencyData);
    applyFilters(filterData, dependencyData, dates);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
      <CoreComponentScreen
        IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
        showFilterDashboard={true}
        filterConfigKey={"excessInvFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        customDependencyValue={getCustomDependencyFilter}
        isOutsideRange={"disableOnlyFuture"}
        screenName={EXCESS_INVENTORY_SCREEN_NAME}
        autoHideFilterButton={true}
        customClassName={reportingClasses.filterSectionSpacing}
      >
      <Loader loader={props?.excessInventoryScreenLoader}>
        {props.children}
      </Loader>
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
  moduleConfig: inventorysmartReducer?.allocationReportsCommonService?.moduleConfig,
    fiscalCalendarData:
      inventorysmartReducer?.inventorySmartCommonService?.fiscalCalendarData,
    excessInventoryScreenLoader:
      inventorysmartReducer.inventorySmartExcessInventoryService
        .excessInventoryScreenLoader,
    excessInventoryTableLoader:
      inventorysmartReducer.inventorySmartExcessInventoryService
        .excessInventoryTableLoader,
    excessInventoryFilterConfiguration:
      inventorysmartReducer.inventorySmartExcessInventoryService
        .excessInventoryFilterConfiguration,
    excessInventoryFiscalWeekGraph:
      inventorysmartReducer.inventorySmartExcessInventoryService
        .excessInventoryFiscalWeekGraph,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "excessInvFilterConfiguration"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: filterReducer.savedFilterSelection,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setExcessInventoryScreenLoader: (body) =>
      dispatch(setExcessInventoryScreenLoader(body)),
    setExcessInventoryTableLoader: (body) =>
      dispatch(setExcessInventoryTableLoader(body)),
    setExcessInventoryFilterConfiguration: (body) =>
      dispatch(setExcessInventoryFilterConfiguration(body)),
    setExcessInventoryGraphData: (body) =>
      dispatch(setExcessInventoryGraphData(body)),
    getExcessInventoryFiscalWeekGraph: (body) =>
      dispatch(getExcessInventoryFiscalWeekGraph(body)),
    clearExcessInventoryStates: (body) =>
      dispatch(clearExcessInventoryStates(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setShowExcessInventoryDetails: (body) =>
      dispatch(setShowExcessInventoryDetails(body)),
    setExcessReportRenderTable: (body) =>
      dispatch(setExcessReportRenderTable(body)),
    saveExcessReportsFiltersState: (body) =>
      dispatch(saveExcessReportsFiltersState(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExcessInventoryFilters);
