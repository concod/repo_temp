import HeaderBreadCrumbs from "core/Utils/HeaderBreadCrumbs";
import { useHistory } from "react-router";
import { VIEW_PAST_ALLOCATION } from "../../constants-inventorysmart/routesConstants";
import { useEffect, useRef, useState } from "react";
import { connect } from "react-redux";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
  getFilterDimensions,
} from "../inventorysmart-utility";
import classNames from "classnames";
import {
  ERROR_MESSAGE,
  RANGE_FILTER_ERROR_MESSAGE,
  INVENTORY_DASHBOARD_STATIC_FILTERS,
  INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  DEEP_DIVE_RANGE_PICKER,
  rangePickerConstant,
  RANGE_FILTER_START_DATE_ERROR_MESSAGE,
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import globalStyles from "core/Styles/globalStyles";
import { addSnack } from "core/actions/snackbarActions";
import { cloneDeep, isEmpty } from "lodash";
import ViewPastAllocationsTable from "./components/ViewPastAllocationTable";
import CustomAccordion from "core/commonComponents/Custom-Accordian";
import {
  setInventorysmartPastAllocationFilterLoader,
  setSelectedFilters,
  setIsFiltersValid,
  setInventorysmartPastAllocationFilterElements,
  setInventorysmartPastAllocationFilterDependency,
  resetPastAllocationState,
} from "modules/inventorysmart/services-inventorysmart/View-Past-Allocation/view-past-allocation";
import moment from "moment";

import CustomFilter from "../Allocation-Reporting/filters/CustomFilter";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formatSelectedFiltersData,
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { getCoreFiscalCalendar } from "core/actions/inventoryAction";

const ViewPastAllocation = (props) => {
  const history = useHistory();
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);
  const [selectedDates, setSelectedDates] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [filterDependency, setFilterDependency] = useState([]);
  const [startEndDate, setStartEndDate] = useState({
    start_date: null,
    end_date: null,
  });

  const applyFilters = (filterElements, filterDependency) => {
    let datesIndex = -1;
    // const dates = filterDependency.find((dataItem, index) => {
    //   if (dataItem.attribute_name === "fiscal_date_range") {
    //     datesIndex = index;
    //   }
    //   return dataItem.attribute_name === "fiscal_date_range";
    // });

    filterElements = filterElements.filter(
      (item) => item.column_name !== "range-picker"
    );

    if (datesIndex > -1) {
      filterDependency.splice(datesIndex, 1);
    }
    props.setInventorysmartPastAllocationFilterDependency(filterDependency);
    const payload = filtersPayload(
      filterElements || props.inventorysmartPastAllocationFilterElements,
      filterDependency || props.inventorysmartPastAllocationFilterDependency,
      true
    );

    // const l_dates = dates?.values;
    const l_dates = filterDependency?.filter(
      (val) => val.filter_id === "range-picker"
    )[0]?.values;
    let formattedDates = ["Invalid date"];

    // if (
    //   l_dates?.fiscalInfoStartDate?.calendar_week_start_date &&
    //   l_dates?.fiscalInfoEndDate?.calendar_week_start_date
    // ) {
    //   setStartEndDate(l_dates);
    //   formattedDates = [
    //     // moment(l_dates?.fiscalInfoStartDate?.calendar_week_start_date).format(
    //     //   "YYYY-MM-DD"
    //     // ),
    //     // moment(l_dates?.fiscalInfoEndDate?.calendar_week_start_date)
    //     //   .endOf("week")
    //     //   .format("YYYY-MM-DD"),
    //   ];
    // }

    if (l_dates?.[0]?.length && l_dates?.[1]?.length) {
      setSelectedDates({
        fiscalInfoStartDate: l_dates[0],
        fiscalInfoEndDate: l_dates[1],
      });
      setStartEndDate({
        start_date: l_dates[0],
        end_date: l_dates[1],
      });
      formattedDates = [
        moment(l_dates[0]).format("YYYY-MM-DD"),
        moment(l_dates[1]).format("YYYY-MM-DD"),
      ];
    }

    if (formattedDates?.includes("Invalid date")) {
      if (
        !(
          formattedDates[0] === "Invalid date" &&
          formattedDates[1] === "Invalid date"
        )
      ) {
        if (moment().isSame(l_dates[0], "day") && !l_dates[1])
          displaySnackMessages(RANGE_FILTER_START_DATE_ERROR_MESSAGE, "error");
        else displaySnackMessages(RANGE_FILTER_ERROR_MESSAGE, "error");

        return;
      } else {
        setStartEndDate({
          start_date: null,
          end_date: null,
        });
      }
    } else if (!isEmpty(formattedDates)) {
      setStartEndDate({
        start_date: formattedDates[0],
        end_date: formattedDates[1],
      });
    }
    props.setIsFiltersValid(payload.isValid);
    props.setSelectedFilters(payload.reqBody);
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const getDates = () => {
    let dates = {};
    if (startEndDate?.start_date && startEndDate.end_date) {
      dates = startEndDate;
    } else if (
      selectedDates?.fiscalInfoStartDate &&
      selectedDates?.fiscalInfoEndDate
    ) {
      dates = {
        start_date: moment(
          selectedDates?.fiscalInfoStartDate?.calendar_week_start_date
        ).format("YYYY-MM-DD"),
        end_date: moment(
          selectedDates?.fiscalInfoEndDate?.calendar_week_start_date
        )
          .endOf("week")
          .format("YYYY-MM-DD"),
      };
    }

    return dates;
  };

  const getFiltersOptions = async (selected, current) => {
    try {
      props.setInventorysmartPastAllocationFilterLoader(true);
      const selectedFilters = props.backButtonClicked
        ? cloneDeep(props.inventorysmartPastAllocationFilterDependency)
        : selected;
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);
      const fiscalCalendarConfig = cloneDeep(
        INVENTORY_DASHBOARD_FISCAL_CALENDAR_FILTER_SINGLE_WEEK
      );
      fiscalCalendarConfig.fc_code = response[0]?.fc_code;
      fiscalCalendarConfig.initialData = fiscalCalendarDetails;

      const filterDataWithCustomFilter = [...response, ...rangePickerConstant];

      if (isEmpty(props.filterDashboardConfiguration)) {
        const filterConfigData = [
          {
            // filterDashboardData: responseWithFiscalCalendarConfig,
            filterDashboardData: filterDataWithCustomFilter,
            expectedFilterDimensions: getFilterDimensions(
              filterDataWithCustomFilter
            ),
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];

        const filterConfig = formattedFilterConfiguration(
          "viewPastAllocationFilterConfiguration",
          filterConfigData,
          "View Past Allocation"
        );
        if (props.backButtonClicked) {
          const formattedSelectedFilters = formatSelectedFiltersData(
            filterConfigData,
            "View Past Allocation",
            selectedFilters
          );
          setFilterDependency(formattedSelectedFilters);
        }
        props.setFilterConfiguration(filterConfig);
      }
      if (props.backButtonClicked) {
        applyFilters(response, [
          ...selectedFilters,
          // props.formFilters.selectedDates,
        ]);
      }
      let filterElements = cloneDeep(response);
      setFilterData(response);
      props.setInventorysmartPastAllocationFilterElements(filterElements);
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setInventorysmartPastAllocationFilterLoader(false);
    }
  };

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    // isEmpty(props.filterDashboardConfiguration) &&
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        props.setInventorysmartPastAllocationFilterLoader(true);
        const response = await fetchFilterConfig(
          "Inventorysmart View Past Allocations"
        );
        const getFinancialCalendarData = await getCoreFiscalCalendar();
        moment.updateLocale("en", {
          week: {
            dow: getFinancialCalendarData?.data?.data?.week_start_day || 0,
          },
        });
        setFiscalCalendarDetails(getFinancialCalendarData?.data?.data?.data);

        setFilters(response);
      } catch (error) {
        props.setInventorysmartPastAllocationFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    return () => {
      props.resetPastAllocationState();
      // props.setFilterConfiguration({
      //   viewPastAllocationFilterConfiguration: {},
      // });
    };
  }, []);

  useEffect(() => {
    if (props.backButtonClicked) {
      // setFilters([]);
      // setFilterData([]);
      setSelectedDates(props.formFilters.selectedDates);
    }
  }, [props.backButtonClicked, props.formFilters]);

  const displaySnackMessages = (message, variance, onClose) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
        ...(onClose && { onClose: onClose }),
      },
    });
  };

  return (
    <>
      <HeaderBreadCrumbs
        options={[
          {
            label: "View Past Allocations",
            id: 1,
            action: () => {
              history.push(VIEW_PAST_ALLOCATION);
            },
          },
        ]}
      ></HeaderBreadCrumbs>
      {/* <div className={globalClasses.filterWrapper}>
        {props.inventorysmartPastAllocationFilterDependency?.length > 0 && (
          <FilterChips
            filterConfig={props.inventorysmartPastAllocationFilterDependency}
            dateFilter={getDates()}
          ></FilterChips>
        )}
      </div> */}
      <CoreComponentScreen
        showPageRoute={false}
        showPageHeader={true}
        showFilterDashboard={true}
        filterConfigKey={"viewPastAllocationFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        showChipsOnLoad={props.backButtonClicked}
        contained={true}
        // filterDependency={filterDependency}
        chipsDependency={
          props.backButtonClicked
            ? props.inventorysmartPastAllocationFilterDependency
            : null
        }
      >
        {props.isFiltersValid && (
          <div
            className={classNames(
              globalClasses.filterWrapper,
              globalClasses.marginVertical1rem
            )}
          >
            <CustomAccordion label="Past Allocations">
              <ViewPastAllocationsTable
                startEndDate={startEndDate}
                selectedDates={selectedDates}
              />
            </CustomAccordion>
          </div>
        )}
      </CoreComponentScreen>
    </>
  );
};

const mapStateToProps = (store) => {
  return {
    inventorysmartPastAllocationFilterLoader:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationFilterLoader,
    isFiltersValid:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .isFiltersValid,
    inventorysmartPastAllocationFilterDependency:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationFilterDependency,
    inventorysmartPastAllocationFilterElements:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .inventorysmartPastAllocationFilterElements,
    inventorysmartScreenConfig:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    backButtonClicked:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .backButtonClicked,
    formFilters:
      store.inventorysmartReducer.inventorySmartPastAllocationService
        .formFilters,
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "viewPastAllocationFilterConfiguration"
      ],
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => ({
  setInventorysmartPastAllocationFilterLoader: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterLoader(payload)),
  setSelectedFilters: (payload) => dispatch(setSelectedFilters(payload)),
  setIsFiltersValid: (payload) => dispatch(setIsFiltersValid(payload)),
  setInventorysmartPastAllocationFilterElements: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterElements(payload)),
  setInventorysmartPastAllocationFilterDependency: (payload) =>
    dispatch(setInventorysmartPastAllocationFilterDependency(payload)),
  addSnack: (payload) => dispatch(addSnack(payload)),
  resetPastAllocationState: () => dispatch(resetPastAllocationState()),
  setFilterConfiguration: (filterConfiguration) =>
    dispatch(setFilterConfiguration(filterConfiguration)),
});

export default connect(mapStateToProps, mapDispatchToProps)(ViewPastAllocation);
