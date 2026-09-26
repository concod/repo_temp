import React, { useState, useEffect } from "react";
import { connect } from "react-redux";
import { isEmpty, cloneDeep } from "lodash";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import { Tabs } from "impact-ui-v3";
import moment from "moment";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import {
  IS_OVERRIDEN_CORE_BUTTON_WIDTH,
  IS_OVERRIDEN_CORE_BUTTON_PLACEMENT,
} from "core/constants";
import { formattedFilterConfiguration } from "core/commonComponents/coreComponentScreen/utils";
import { setFilterConfiguration } from "core/actions/filterAction";
import { getTenantTimeZoneDetails } from "core/commonComponents/coreComponentScreen/utils";

import { REPORTS_VENDOR_STORE_FILTER_CONFIG } from "modules/oms/constants-oms/apiConstants";
import VendorProjectionsOrders from "../Vendor-Projections/Orders";
import VendorProjectionsForecast from "../Vendor-Projections/Forecasts";
import VendorProjectionsReceipts from "../Vendor-Projections/Receipts";
import {
  ERROR_MESSAGE,
  OMS_REPORTS_FISCAL_CALENDAR_FILTER_SINGLE_WEEK,
  RANGE_FILTER_ERROR_MESSAGE,
  TENANT_DATE_FORMAT,
  OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY,
} from "modules/oms/constants-oms/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  filtersPayload,
} from "modules/oms/utils-oms/oms-utility";
import {
  setSelectedFilters,
  setIsFiltersValid,
  setScreenLoader,
  setFilterDependency,
  setFilterLoader,
  setFilterElements,
  setFilterConfig,
  clearStates,
} from "modules/oms/services-oms/Reports/vendor-projections-service";

const VendorStoreVendorProjections = (props) => {
  const globalClasses = globalStyles();

  const [filters, setFilters] = useState([]);
  const [filterData, setFilterData] = useState([]);
  const [showProjectionCosts, setShowProjectionCosts] = useState(false);
  const [hideProjectionTable, setHideProjectionTable] = useState(false);
  const [fiscalCalendarDetails, setFiscalCalendarDetails] = useState([]);

  const [selectedDates, setSelectedDates] = useState({
    fiscalInfoStartDate: null,
    fiscalInfoEndDate: null,
  });
  const [startEndDate, setStartEndDate] = useState({
    start_date: null,
    end_date: null,
  });

  const [vendorProjectionSubTabs, setVendorProjectionSubTabs] = useState([]);
  const [tabValue, setTabValue] = useState("orders");
  const VENDOR_PROJECTION_SUBTABS = [
    { label: "Orders", value: "orders" },
    { label: "Receipts", value: "receipts" },
    { label: "Forecast", value: "forecast" },
  ];

  const { tenantDateFormat } = getTenantTimeZoneDetails();
  const DATE_FORMAT = tenantDateFormat || TENANT_DATE_FORMAT;

  useEffect(() => {
    try {
      const tabs = cloneDeep(VENDOR_PROJECTION_SUBTABS);
      const subtabs =
        props?.moduleConfig?.module_screens_info?.reports_oms
          ?.vendor_projections?.subTabs || {};
      if (!isEmpty(subtabs)) {
        // Filter tabs to only include those configured in backend
        const filteredTabs = tabs.filter((tab) => subtabs[tab.value]);
        // Update labels for filtered tabs
        filteredTabs.forEach((tab) => {
          tab.label = subtabs[tab.value];
        });
        setVendorProjectionSubTabs(filteredTabs);
      } else {
        setVendorProjectionSubTabs(tabs);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      console.log("Error in fetching vendor projection subtabs", error);
    }
  }, [props?.moduleConfig]);

  const tabProps = (tabOption) => {
    return {
      id: `simple-tab-${tabOption?.label}`,
      label: tabOption?.label,
      value: tabOption?.value,
      "aria-controls": `simple-tabpanel-${tabOption?.label}`,
    };
  };

  const handleChangeTabValue = (_event, newValue) => {
    setTabValue(newValue);
  };

  useEffect(() => {
    if (props?.screenConfig?.hideVendorProjectionsTable) {
      setHideProjectionTable(true);
    }
  }, [props.screenConfig]);

  const renderTabComponents = () => {
    let OMSReportsMapper = {
      orders: (
        <VendorProjectionsOrders
          hideGraphComponent={props.hideGraphComponent}
          selectedDates={selectedDates}
          enableDownload={props.enableDownload}
          hideProjectionTable={hideProjectionTable}
        />
      ),
      forecast: (
        <VendorProjectionsForecast
          hideGraphComponent={props.hideGraphComponent}
          selectedDates={selectedDates}
          enableDownload={props.enableDownload}
          hideProjectionTable={hideProjectionTable}
        />
      ),
      receipts: (
        <VendorProjectionsReceipts
          hideGraphComponent={props.hideGraphComponent}
          selectedDates={selectedDates}
          enableDownload={props.enableDownload}
          hideProjectionTable={hideProjectionTable}
        />
      ),
    };

    let tablePanel = vendorProjectionSubTabs.map((thisTab) => {
      let tabValue = thisTab?.value;
      return <div>{OMSReportsMapper[tabValue]}</div>;
    });
    return tablePanel;
  };

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const isOutsideRange = (date) => {
    let weekStartDay = moment().startOf("week");
    const weekEndDay = moment().endOf("week");
    const lastWeekSelection = moment().endOf("week").day(27);
    return !moment(date).isBetween(
      weekStartDay,
      lastWeekSelection,
      undefined,
      "[]"
    );
  };

  useEffect(() => {
    const selectedFiltersDependency =
      props.filterDashboardConfiguration?.appliedFilterData?.dependencyData;
    props.setOrdersFilterDependency(selectedFiltersDependency);

    // reset store state on unmount
    const fetchFilters = async () => {
      try {
        props.setFilterLoader(true);
        const response = await fetchFilterConfig(
          REPORTS_VENDOR_STORE_FILTER_CONFIG
        );
        props.setFilterLoader(false);
        setFilters(response);
        //   props.setOrdersFilterConfig(response);
      } catch (error) {
        props.setFilterLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    fetchFilters();

    return () => {
      props.clearStates();
      props.setFilterConfiguration({
        vendorStoreVendorProjectionsFilterConfig: undefined,
      });
    };
  }, []);

  useEffect(() => {
    if (props.backButtonClicked) {
      setFilters([]);
      setFilterData([]);
    }
  }, [props.backButtonClicked, props.formFilters]);

  useEffect(() => {
    if (!filters || filters?.length === 0) {
      return;
    }
    getFiltersOptions(props.savedFilterSelection);
  }, [filters]);

  const getFiltersOptions = async (selected, current) => {
    try {
      const selectedFilters = [];
      let requiredFilterObjParams = {
        allFilters: filters || [],
        appliedFilters: selectedFilters,
        current: current,
        rolesBasedAccess: props?.roleBasedAccess,
        screenName: props.screenName,
        tenantFilterUamConfig: props.tenantFilterUamConfig,
      };
      const response = await fetchFilterOptions(requiredFilterObjParams);

      //For Date Filter
      const fiscalCalendarConfig = JSON.parse(
        JSON.stringify(OMS_REPORTS_FISCAL_CALENDAR_FILTER_SINGLE_WEEK)
      );
      fiscalCalendarConfig.fc_code = response[0]?.fc_code;
      fiscalCalendarConfig.initialData = fiscalCalendarDetails;
      fiscalCalendarConfig.isOutsideRange = isOutsideRange;
      fiscalCalendarConfig.disabledType = "customRange";
      fiscalCalendarConfig.showClearDates = false;
      //fiscalCalendarConfig.is_mandatory = true;
      fiscalCalendarConfig.hideLabel = true;

      const responseWithFiscalCalendarConfig = [
        fiscalCalendarConfig,
        ...response,
      ];

      if (isEmpty(props.filterDashboardConfiguration)) {
        const filterConfigData = [
          {
            filterDashboardData: [...response],
            isCrossDimensionFilter: true,
            screen_name: props.screenName,
          },
        ];
        const filterConfig = formattedFilterConfiguration(
          "vendorStoreVendorProjectionsFilterConfig",
          filterConfigData,
          "Vendor Projections Orders",
          selectedFilters
        );
        props.setFilterConfiguration(filterConfig);
      }
    } catch (error) {
      displaySnackMessages(ERROR_MESSAGE, "error");
    } finally {
      props.setFilterLoader(false);
    }
  };

  const applyFilters = (filterElements, filterDependency, filterDates) => {
    let isFilterDatesSelected = true; // To verify if user has provided a date range. For now, it is set to true
    const payload = filtersPayload(
      filterElements,
      filterDependency || props.ordersFilterDependency,
      true
    );
    const selectedFilters = {
      filters: payload.reqBody.filter((filter) => {
        return filter.values?.length > 0;
      }),
      fiscal_year_week: null,
      fiscal_year_week_type: null,
    };
    if (
      !localStorage.getItem("startDate") &&
      !localStorage.getItem("endDate")
    ) {
      var dates = filterDates?.values;
    }
    if (dates) {
      if (!dates?.fiscalInfoStartDate || !dates?.fiscalInfoEndDate) {
        //payload.isValid = false;
        isFilterDatesSelected = false;
      } else {
        const currentDate = moment().format(DATE_FORMAT);
        const endDate = moment(
          dates?.fiscalInfoEndDate?.calendar_week_start_date
        )
          .endOf("week")
          .format(DATE_FORMAT);
        const isFuturisticDate = moment(endDate).isSameOrAfter(
          currentDate,
          "day"
        );
        selectedFilters.fiscal_year_week =
          dates.fiscalInfoEndDate?.fiscal_year_week;
        selectedFilters.fiscal_year_week_type = isFuturisticDate
          ? "future"
          : "historical";

        const startDate = moment(
          dates?.fiscalInfoStartDate?.calendar_week_start_date
        )
          .startOf("week")
          .format(DATE_FORMAT);
        let dateParams = {
          start_date: startDate,
          end_date: endDate,
        };
        setStartEndDate(dateParams);
        isFilterDatesSelected = true;
      }
    }
    if (localStorage.getItem("startDate") && localStorage.getItem("endDate")) {
      let dateParams = {
        start_date: JSON.stringify(localStorage.getItem("startDate")),
        end_date: JSON.stringify(localStorage.getItem("endDate")),
      };
      setStartEndDate(dateParams);
      isFilterDatesSelected = true;
    }
    localStorage.removeItem("startDate");
    localStorage.removeItem("endDate");
    if (isFilterDatesSelected) {
      props.setIsFiltersValid(payload.isValid);
      props.setSelectedFilters(payload.reqBody);
    } else {
      displaySnackMessages(RANGE_FILTER_ERROR_MESSAGE, "error");

      props.setIsFiltersValid(false);
      return;
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    let datesIndex = -1;

    const dates = dependencyData.find((dataItem, index) => {
      if (dataItem.attribute_name === "fiscal_date_range") {
        datesIndex = index;
      }
      return dataItem.attribute_name === "fiscal_date_range";
    });

    filterData = filterData.filter(
      (item) => item.column_name !== "fiscal_date_range"
    );

    // if (datesIndex > -1) {
    //   dependencyData.splice(datesIndex, 1);
    // }
    applyFilters(filterData, dependencyData, dates);
  };

  return (
    <div style={{ marginTop: IS_OVERRIDEN_CORE_BUTTON_PLACEMENT }}>
      <CoreComponentScreen
        autoHideFilterButton={true}
        showPageHeader={true}
        showFilterLoader={false}
        showFilterDashboard={true}
        filterConfigKey={"vendorStoreVendorProjectionsFilterConfig"}
        onApplyFilter={onFilterDashboardClick}
        contained={false}
        IscoreButtonWidth={IS_OVERRIDEN_CORE_BUTTON_WIDTH}
      >
        {props.isFiltersValid && (
          <>
            <Tabs
              value={tabValue}
              onChange={(_event, newValue) =>
                handleChangeTabValue(_event, newValue)
              }
              tabNames={[...vendorProjectionSubTabs]}
              tabPanels={renderTabComponents()}
            />
          </>
        )}
      </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { omsReducer } = store;
  return {
    filterDashboardConfiguration:
      store.filterReducer.filterDashboardConfiguration[
        "vendorStoreVendorProjectionsFilterConfig"
      ],
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    savedFilterSelection: store.filterReducer.savedFilterSelection,
    selectedFilters: omsReducer.reportsVendorProjectionsService.selectedFilters,
    isFiltersValid: omsReducer.reportsVendorProjectionsService.isFiltersValid,
    filterDependency:
      omsReducer.reportsVendorProjectionsService.filterDependency,
    filterElements: omsReducer.reportsVendorProjectionsService.filterElements,
    filterLoader: omsReducer.reportsVendorProjectionsService.filterLoader,
    screenLoader: omsReducer.reportsVendorProjectionsService.screenLoader,
    dataLoader: omsReducer.reportsVendorProjectionsService.dataLoader,
    filterConfig: omsReducer.reportsVendorProjectionsService.filterConfig,
    screenConfig:
      store.omsReducer.orderingCommonService.orderingVendorToStoreConfig
        ?.reports?.[OMS_VENDOR_PROJECTIONS_SCREENNAME_KEY],
    moduleConfig: store.omsReducer.orderingCommonService.orderingModuleConfig,
    roleBasedAccess:
      store.omsReducer.orderingCommonService.genericTenantConfig
        ?.roleBasedAccess,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setSelectedFilters: (body) => dispatch(setSelectedFilters(body)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    setOrdersFilterDependency: (body) => dispatch(setFilterDependency(body)),
    setFilterLoader: (body) => dispatch(setFilterLoader(body)),
    setFilterElements: (body) => dispatch(setFilterElements(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setScreenLoader: (body) => dispatch(setScreenLoader(body)),
    setFilterConfig: (body) => dispatch(setFilterConfig(body)),
    clearStates: (body) => dispatch(clearStates(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(VendorStoreVendorProjections);
