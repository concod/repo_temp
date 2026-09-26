import React, { useState, useEffect } from "react";
import { connect } from "react-redux";

import { cloneDeep, isEmpty } from "lodash";

import { addSnack } from "core/actions/snackbarActions";
import globalStyles from "core/Styles/globalStyles";
import Loader from "core/Utils/Loader/loader";
import { setFilterConfiguration } from "core/actions/filterAction";
import {
  formattedFilterConfiguration,
  getActiveEntityFilter,
} from "core/commonComponents/coreComponentScreen/utils";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";

import {
  setFutureReceiptsLoader,
  setFutureReceiptsFilterConfiguration,
  getFutureReceiptsTableData,
  clearFutureReceiptStates,
  setFutureReceiptsTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/future-receipts-service";
import { ERROR_MESSAGE } from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import FutureReceiptsViewTableComponent from "./future-receipts-view-table";

const FutureReceiptsComponent = (props) => {
  const [showFutureReceiptsDetails, setShowFutureReceiptsDetails] =
    useState(false);
  const [renderTable, setRenderTable] = useState({});

  const globalClasses = globalStyles();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setFutureReceiptsLoader(true);
        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setFutureReceiptsFilterConfiguration(response);
        props.setFutureReceiptsLoader(false);
      } catch (e) {
        props.setFutureReceiptsLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return () => props.clearFutureReceiptStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.futureReceiptsFilterConfiguration)
    ) {
      props.setFutureReceiptsLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.futureReceiptsFilterConfiguration),
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
              filterDashboardData: response,
              expectedFilterDimensions: getFilterDimensions(response),
              isCrossDimensionFilter: true,
              screen_name: props.screenName,
            },
          ];
          const filterConfig = formattedFilterConfiguration(
            "futureReceiptsFilterConfiguration",
            filterConfigData,
            "Future Receipts Screen"
          );
          props.setFilterConfiguration(filterConfig);
          props.setFutureReceiptsLoader(false);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setFutureReceiptsLoader(false);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.futureReceiptsFilterConfiguration, props.savedFilterSelection]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = (_filterElements, dependency) => {
    let body = {
      filters: dependency,
    };
    setRenderTable(body);
    setShowFutureReceiptsDetails(true);
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
        filterConfigKey={"futureReceiptsFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />

      <Loader loader={props.futureReceiptsLoader}>
        <></>
      </Loader>

      {showFutureReceiptsDetails && (
        <Loader loader={props.futureReceiptsTableLoader}>
          <div className={globalClasses.marginHorizontal}>
            <FutureReceiptsViewTableComponent
              displaySnackMessages={displaySnackMessages}
              renderTable={renderTable}
              getFutureReceiptsTableData={props.getFutureReceiptsTableData}
              setFutureReceiptsTableLoader={props.setFutureReceiptsTableLoader}
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
    futureReceiptsLoader:
      inventorysmartReducer.inventoryFutureReceiptsReportsService
        .futureReceiptsLoader,
    futureReceiptsTableLoader:
      inventorysmartReducer.inventoryFutureReceiptsReportsService
        .futureReceiptsTableLoader,
    futureReceiptsFilterConfiguration:
      inventorysmartReducer.inventoryFutureReceiptsReportsService
        .futureReceiptsFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "futureReceiptsFilterConfiguration"
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
    setFutureReceiptsLoader: (body) => dispatch(setFutureReceiptsLoader(body)),
    setFutureReceiptsTableLoader: (body) =>
      dispatch(setFutureReceiptsTableLoader(body)),
    setFutureReceiptsFilterConfiguration: (body) =>
      dispatch(setFutureReceiptsFilterConfiguration(body)),
    getFutureReceiptsTableData: (body) =>
      dispatch(getFutureReceiptsTableData(body)),
    clearFutureReceiptStates: () => dispatch(clearFutureReceiptStates()),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(FutureReceiptsComponent);
