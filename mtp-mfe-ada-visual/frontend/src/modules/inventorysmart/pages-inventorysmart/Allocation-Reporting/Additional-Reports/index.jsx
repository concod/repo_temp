import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { isEmpty, cloneDeep } from "lodash";

import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";

import {
  setAdditionalReportsTableData,
  setAdditionalReportsLoader,
  setAdditionalReportsFilterConfiguration,
  getAdditionalReportsTableData,
  clearAdditionalReportStates,
  fetchFiscalWeekDropDownValues,
  setAdditionalReportsTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/additional-reports-service";
import {
  ERROR_MESSAGE,
  dropDownConstant,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import AdditionalReportsTableComponent from "./additional-reports-table";

const AdditionalReportsComponent = (props) => {
  const globalClasses = globalStyles();

  const [additionalReportDetails, setAdditionalReportDetails] = useState(false);
  const [fiscalWeekList, setFiscalWeekList] = useState([]);

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setAdditionalReportsLoader(true);
        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setAdditionalReportsFilterConfiguration(response);
        props.setAdditionalReportsLoader(false);
      } catch (e) {
        props.setAdditionalReportsLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => {
      props.clearAdditionalReportStates();
    };
  }, []);

  useEffect(() => {
    // make an api call to fetch rolling forecast week data for selected channel
    let channelValue = props.savedFilterSelection?.filter(
      (item) => item.attribute_name === "channel"
    )[0]?.values;
    if (channelValue?.length) fetchWeekDropDownData(channelValue);
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.additionalReportsFilterConfiguration)
    ) {
      props.setAdditionalReportsLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.additionalReportsFilterConfiguration),
            appliedFilters: selected,
            current: current,
            rolesBasedAccess: props.inventorysmartScreenConfig?.roleBasedAccess,
            screenName: props.screenName,
            customDependency: [
              getActiveEntityFilter("product"),
              getActiveEntityFilter("store"),
            ],
            tenantFilterUamConfig: props.tenantFilterUamConfig,
          };
          const response = await fetchFilterOptions(requiredFilterObjParams);

          const filterDataWithCustomFilter = [...response, ...dropDownConstant];

          const filterConfigData = [
            {
              // Need to pass an explicit warning message for weeks drop down along with drop down - To ask
              filterDashboardData: filterDataWithCustomFilter,
              expectedFilterDimensions: getFilterDimensions(
                filterDataWithCustomFilter
              ),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "additionalReportsFilterConfiguration",
            filterConfigData,
            "Additional Reports Screen"
          );
          props.setFilterConfiguration(filterConfig);
          props.setAdditionalReportsLoader(false);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setAdditionalReportsLoader(false);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.additionalReportsFilterConfiguration, props.savedFilterSelection]);

  const updateDependencyHandler = (dependency, dimension, filters) => {
    if (dimension === "store") {
      let selectedChannelFilter = dependency.filter(
        (item) => item.filter_id === "channel"
      )[0]?.values;
      if (selectedChannelFilter?.length && filters.filter_id === "channel") {
        fetchWeekDropDownData([selectedChannelFilter[0].value]);
      }
      let copyOfFilterConfig = cloneDeep(props.filterDashboardConfiguration);
      copyOfFilterConfig?.filterConfig[0].filterDashboardData.forEach(
        (item) => {
          if (!dependency.length) {
            if (item.column_name === "dropdown-values") {
              item["is_disabled"] = true;
              item["initialData"] = [];
            }
          } else {
            if (item.column_name === "dropdown-values") {
              item["initialData"] = fiscalWeekList.map((value) => {
                return {
                  label: value,
                  value: value,
                  id: value,
                };
              });
              item["is_disabled"] = false;
            }
          }
        }
      );
      let obj = {};
      obj["additionalReportsFilterConfiguration"] = copyOfFilterConfig;
      props.setFilterConfiguration(obj);
    }
  };

  useEffect(() => {
    // enable only when we have data
    if (!isEmpty(fiscalWeekList)) {
      dropDownConstant[0].initialData = fiscalWeekList.map((value) => {
        return {
          label: value,
          value: value,
          id: value,
        };
      });
      dropDownConstant[0].is_disabled = false;
    }
  }, [fiscalWeekList]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const fetchWeekDropDownData = async (value) => {
    if (value?.length === 1) {
      try {
        props.setAdditionalReportsLoader(true);
        let body = {
          channel: value[0],
        };
        let response = await props.fetchFiscalWeekDropDownValues(body);
        setFiscalWeekList(response.data?.data);
        props.setAdditionalReportsLoader(false);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
        props.setAdditionalReportsLoader(false);
      }
    }
  };

  const applyFilters = async (_filterElements, dependency) => {
    let filterFiscalWeekDropDown = dependency.filter(
      (item) => item.attribute_name === "dropdown-values"
    );
    let filterDependency = dependency.filter(
      (item) => item.attribute_name !== "dropdown-values"
    );
    props.setAdditionalReportsTableLoader(true);
    try {
      let reqBody = {
        filters: filterDependency,
        week: filterFiscalWeekDropDown[0].values[0],
      };
      let response = await props.getAdditionalReportsTableData(reqBody);
      props.setAdditionalReportsTableData(response.data?.data);
      props.setAdditionalReportsTableLoader(false);
      response.data?.status && setAdditionalReportDetails(true);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setAdditionalReportsTableLoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"additionalReportsFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        updateDependencyHandler={updateDependencyHandler}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      <Loader loader={props.additionalReportsLoader}></Loader>

      <Loader loader={props.additionalReportsTableLoader}>
        {additionalReportDetails && (
          <div className={globalClasses.marginHorizontal}>
            <AdditionalReportsTableComponent
              displaySnackMessages={displaySnackMessages}
              additionalReportsTableData={props.additionalReportsTableData}
              setAdditionalReportsTableLoader={
                props.setAdditionalReportsTableLoader
              }
            />
          </div>
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    additionalReportsLoader:
      inventorysmartReducer.inventoryAdditionalReportsService
        .additionalReportsLoader,
    additionalReportsFilterConfiguration:
      inventorysmartReducer.inventoryAdditionalReportsService
        .additionalReportsFilterConfiguration,
    additionalReportsTableData:
      inventorysmartReducer.inventoryAdditionalReportsService
        .additionalReportsTableData,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "additionalReportsFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    additionalReportsTableLoader:
      inventorysmartReducer.inventoryAdditionalReportsService
        .additionalReportsTableLoader,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setAdditionalReportsLoader: (body) =>
      dispatch(setAdditionalReportsLoader(body)),
    setAdditionalReportsTableData: (body) =>
      dispatch(setAdditionalReportsTableData(body)),
    setAdditionalReportsFilterConfiguration: (body) =>
      dispatch(setAdditionalReportsFilterConfiguration(body)),
    getAdditionalReportsTableData: (body) =>
      dispatch(getAdditionalReportsTableData(body)),
    clearAdditionalReportStates: () => dispatch(clearAdditionalReportStates()),
    fetchFiscalWeekDropDownValues: (body) =>
      dispatch(fetchFiscalWeekDropDownValues(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setAdditionalReportsTableLoader: (body) =>
      dispatch(setAdditionalReportsTableLoader(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AdditionalReportsComponent);
