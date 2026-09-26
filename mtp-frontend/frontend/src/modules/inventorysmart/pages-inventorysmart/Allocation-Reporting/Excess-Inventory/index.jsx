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

import ExcessInventoryGraphComponent from "./excess-inventory-graph";
import {
  setExcessInventoryScreenLoader,
  setExcessInventoryGraphData,
  setExcessInventoryFilterConfiguration,
  getExcessInventoryFiscalWeekGraph,
  clearExcessInventoryStates,
  setExcessInventoryTableLoader,
} from "../../../services-inventorysmart/Allocation-Reports/excess-inventory-service";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData,
} from "../../../constants-inventorysmart/stringConstants";
import {
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import ExcessInventoryTableView from "./excess-inventory-table-view";

const ExcessInventoryComponent = (props) => {
  const [showExcessInventoryDetails, setShowExcessInventoryDetails] =
    useState(false);
  const [renderTable, setRenderTable] = useState({});
  const [excessInventoryTableRender, setExcessInventoryTableRender] = useState(false);

  const globalClasses = globalStyles();

  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setExcessInventoryScreenLoader(true);
        let response = await fetchFilterConfig("Inventorysmart Reportings");
        props.setExcessInventoryFilterConfiguration(response);
        props.setExcessInventoryScreenLoader(false);
      } catch (e) {
        props.setExcessInventoryScreenLoader(false);
        displaySnackMessages(ERROR_MESSAGE, "error");
      }
    };
    getInitialFilterConfiguration();
    return props.clearExcessInventoryStates();
  }, []);

  useEffect(() => {
    if (
      isEmpty(props.filterDashboardConfiguration) &&
      !isEmpty(props.excessInventoryFilterConfiguration)
    ) {
      props.setExcessInventoryScreenLoader(true);
      const getFilterValues = async (selected, current) => {
        try {
          let requiredFilterObjParams = {
            allFilters: cloneDeep(props.excessInventoryFilterConfiguration),
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
            "excessInvFilterConfiguration",
            filterConfigData,
            "Excess Inv Reports Screen"
          );
          props.setFilterConfiguration(filterConfig);
          props.setExcessInventoryScreenLoader(false);
        } catch (err) {
          displaySnackMessages(ERROR_MESSAGE, "error");
          props.setExcessInventoryScreenLoader(false);
        }
      };
      getFilterValues(props.savedFilterSelection);
    }
  }, [props.excessInventoryFilterConfiguration, props.savedFilterSelection]);

  const displaySnackMessages = (message, variance) => {
    props.addSnack({
      message: message,
      options: {
        variant: variance,
      },
    });
  };

  const applyFilters = async (_filterElements, dependency) => {
    props.setExcessInventoryTableLoader(true);
    try {
      let graphReqBody = {
        meta: tableConfigurationMetaData.meta,
        filters: dependency,
      };
      let response = await props.getExcessInventoryFiscalWeekGraph(
        graphReqBody
      );
      props.setExcessInventoryGraphData(response.data?.data);
      setRenderTable(graphReqBody);
      props.setExcessInventoryTableLoader(false);
      response.data?.status && setShowExcessInventoryDetails(true);
      response.data?.data.length && setExcessInventoryTableRender(true);
    } catch (err) {
      displaySnackMessages(ERROR_MESSAGE, "error");
      props.setExcessInventoryTableLoader(false);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    setShowExcessInventoryDetails(false);
    setExcessInventoryTableRender(false);
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <>
      <CoreComponentScreen
        showFilterDashboard={true}
        filterConfigKey={"excessInvFilterConfiguration"}
        onApplyFilter={onFilterDashboardClick}
        contained={true}
        customDependencyValue={getCustomDependencyFilter}
      />


      <Loader loader={props.excessInventoryTableLoader}>
        {showExcessInventoryDetails && (
          <div className={globalClasses.marginHorizontal}>
            <ExcessInventoryGraphComponent
              excessInventoryGraphData={props.excessInventoryFiscalWeekGraph}
            />
            {excessInventoryTableRender && <ExcessInventoryTableView 
              inventorysmartScreenConfigForInfiniteScrolling={props.inventorysmartScreenConfigForInfiniteScrolling}
              displaySnack={displaySnackMessages}
              renderTable={renderTable}
              weeksAvailable={props.excessInventoryFiscalWeekGraph}
              inventorysmartScreenConfig={props.inventorysmartScreenConfig}
            />}
          </div>
        )}
      </Loader>
    </>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    inventorysmartScreenConfigForInfiniteScrolling:
      store.inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfigForInfiniteScrolling,
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
      inventorysmartReducer.inventorySmartCommonService
        .inventorysmartScreenConfig,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
      "excessInvFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
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
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(ExcessInventoryComponent);
