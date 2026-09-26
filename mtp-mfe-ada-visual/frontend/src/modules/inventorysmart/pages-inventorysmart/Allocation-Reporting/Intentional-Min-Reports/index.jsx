import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import Loader from "core/Utils/Loader/loader";
import globalStyles from "core/Styles/globalStyles";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { addSnack } from "core/actions/snackbarActions";

import IntentionalMinReportsTableComponent from "./intentional-unintentional-min-table-view";
import {
  setIntentionalMinReportFilterConfiguration,
  clearIntentionalMinReportStates,
} from "../../../services-inventorysmart/Allocation-Reports/intentional-min-reports-service";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";

const IntentionalMinReports = (props) => {
  const [intentionalMinReportDetails, setIntentionalMinReportDetails] =
    useState(false);
  const [filterValuesOnRender, setFilterValuesOnRender] = useState([]);

  const globalClasses = globalStyles();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setIntentionalMinReportFilterConfiguration(response);
      } catch (e) {
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => clearIntentionalMinReportStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.intentionalMinReportFilterConfiguration)
    ) {
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(
              props.intentionalMinReportFilterConfiguration
            ),
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
          const filterConfigData = [
            {
              filterDashboardData: [...response],
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "intentionalMinReportFilterConfiguration",
            filterConfigData,
            "Intentional Min Report Screen"
          );
          props.setFilterConfiguration(filterConfig);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [
    props.intentionalMinReportFilterConfiguration,
    props.savedFilterSelection,
  ]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    try {
      setFilterValuesOnRender(dependency);
      setIntentionalMinReportDetails(true);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
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
        filterConfigKey={"intentionalMinReportFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      {intentionalMinReportDetails && (
        <Loader loader={props.intentionalMinScreenLoader}>
          <div className={globalClasses.marginHorizontal}>
            <IntentionalMinReportsTableComponent
              displaySnackMessages={displaySnackMessages}
              selectedFilters={filterValuesOnRender}
              enableDownload={props.enableDownload}
            />
          </div>
        </Loader>
      )}
    </>
  );
};
const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    intentionalMinScreenLoader:
      inventorysmartReducer.inventoryIntentionalMinReportsService
        .intentionalMinScreenLoader,
    intentionalMinReportFilterConfiguration:
      inventorysmartReducer.inventoryIntentionalMinReportsService
        .intentionalMinReportFilterConfiguration,
    intentionalMinReportTableData:
      inventorysmartReducer.inventoryIntentionalMinReportsService
        .intentionalMinReportTableData,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "intentionalMinReportFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    inventorysmartScreenConfig:
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setIntentionalMinReportFilterConfiguration: (body) =>
      dispatch(setIntentionalMinReportFilterConfiguration(body)),
    clearIntentionalMinReportStates: (body) =>
      dispatch(clearIntentionalMinReportStates(body)),
    setFilterConfiguration: (body) => dispatch(setFilterConfiguration(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(IntentionalMinReports);
