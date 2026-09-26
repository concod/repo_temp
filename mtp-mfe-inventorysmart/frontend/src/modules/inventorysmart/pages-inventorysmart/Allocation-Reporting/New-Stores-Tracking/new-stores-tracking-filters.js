import React, { useEffect } from "react";
import CoreComponentScreen from "core/commonComponents/coreComponentScreen";
import { connect } from "react-redux";
import {
  clearNewStoresTrackingStates,
  getNewStoresTrackingKpiData,
  saveNewStoresTrackingFiltersState,
  setNewStoresTrackingFilterConfiguration,
  setNewStoresTrackingTableLoader,
  setNewStoresTrackingKpiData,
  setIsFiltersValid,
  setNewStoresTrackingFilterLoader,
  setNewStoresTrackingKpiLoader,
  setLoadGraphData,
  setNewStoresTrackingGraphLoader,
  getNewStoresTrackingGraphData,
  setNewStoresTrackingGraphData
} from "modules/inventorysmart/services-inventorysmart/Allocation-Reports/new-stores-tracking-services";
import { cloneDeep, isEmpty } from "lodash";
import {
  displaySnackMessages,
  fetchFilterConfig,
  fetchFilterOptions,
  getFilterDimensions,
  getActiveFilterCustomDependency,
} from "../../inventorysmart-utility";
import {
  formattedFilterConfiguration,
} from "core/commonComponents/coreComponentScreen/utils";
import {
  ERROR_MESSAGE,
  tableConfigurationMetaData
} from "modules/inventorysmart/constants-inventorysmart/stringConstants";
import { addSnack } from "core/actions/snackbarActions";
import { setFilterConfiguration } from "core/actions/filterAction";
import { IS_OVERRIDEN_CORE_BUTTON_WIDTH,IS_OVERRIDEN_CORE_BUTTON_PLACEMENT } from "config/constants";
import { NEW_STORES_TRACKING_SCREEN_NAME } from "../CustomHooks/moduleConstants";
import { useReportingStyles } from "../reportingStyles";

const NewStoresTrackingFilters = (props) => {
  const reportingClasses = useReportingStyles();

  const handleErrorMessage = (e) => {
    const errObj = e?.response?.data;
    if (errObj?.show_message) displaySnackMessages(errObj?.message, "error", props);
    else displaySnackMessages(ERROR_MESSAGE, "error", props);
  };


  useEffect(() => {
    const getInitialFilterConfiguration = async () => {
      try {
        props.setNewStoresTrackingFilterLoader(true);
        let response = await fetchFilterConfig(
          "New Store Performance Tracking Report"
        );
        props.setNewStoresTrackingFilterConfiguration(response);
        props.setNewStoresTrackingFilterLoader(false);
      } catch (e) {
        props.setNewStoresTrackingFilterLoader(false);
        handleErrorMessage(e);
      }
    };
    
    if (
      props.filterDashboardConfiguration &&
      props?.filterDashboardConfiguration?.filterConfig?.[0]
        ?.originalFilterDashboardData
    ) {
      props.setNewStoresTrackingFilterConfiguration(
        props?.filterDashboardConfiguration?.filterConfig?.[0]
          ?.originalFilterDashboardData
      );
      return;
    }
    
    getInitialFilterConfiguration();
    
    return () => props?.clearNewStoresTrackingStates();
  }, []);

  useEffect(() => {
    const onLoad = async () => {
      if (
        isEmpty(props.filterDashboardConfiguration) &&
        !isEmpty(props.newStoresTrackingFilterConfiguration)
      ) {
        props.setNewStoresTrackingFilterLoader(true);
        const getFilterValues = async (selected, current) => {
          try {
            let requiredFilterObjParams = {
              allFilters: cloneDeep(props.newStoresTrackingFilterConfiguration),
              appliedFilters: selected || [],
              current: current || [],
              rolesBasedAccess:
                props.inventorysmartScreenConfig?.roleBasedAccess,     
                screenName: NEW_STORES_TRACKING_SCREEN_NAME,
                tenantFilterUamConfig: props.tenantFilterUamConfig,
            };
            const response = await fetchFilterOptions(requiredFilterObjParams);
            
            const filterDataWithCustomFilter = response;
            
            const filterConfigData = [
              {
                filterDashboardData: filterDataWithCustomFilter,
                expectedFilterDimensions: getFilterDimensions(filterDataWithCustomFilter),
                isCrossDimensionFilter: true,
                screen_name: NEW_STORES_TRACKING_SCREEN_NAME,
              },
            ];
            
            const filterConfig = formattedFilterConfiguration(
              "newStoresTrackingFilterConfiguration",
              filterConfigData,
              "NEW_STORES_TRACKING_SCREEN_NAME"
            );
            
            props.setFilterConfiguration(filterConfig);
            
            props.setNewStoresTrackingFilterLoader(false);
          } catch (e) {
            props.setNewStoresTrackingFilterLoader(false);
            handleErrorMessage(e);
          }
        };
        
        getFilterValues(props.savedFilterSelection);
      }
    };
    
    onLoad();
  }, [
    props.newStoresTrackingFilterConfiguration,
    props.savedFilterSelection,
  ]);

  const applyFilters = async (_filterElements, dependency) => {
    try {
      props.setNewStoresTrackingKpiLoader(true);
      props.setNewStoresTrackingGraphLoader(true);
      props.setNewStoresTrackingTableLoader(true);      
      props.setLoadGraphData(false);     
      const filterDimensions = getFilterDimensions(_filterElements);
      const isValid = !isEmpty(filterDimensions);   
      if (!isValid) {
        props.setNewStoresTrackingKpiLoader(false);
        props.setNewStoresTrackingGraphLoader(false);
        props.setNewStoresTrackingTableLoader(false);
        return;
      }
      
      let selectedFilters = [];
      dependency.forEach((filterKeysValue) => {
          selectedFilters.push(filterKeysValue);
      });      
      const requestBody = {
        meta: {
          ...tableConfigurationMetaData.meta,
          limit: { limit: 10, page: 1 },
        },
        filters: selectedFilters,
        application_code: 1,
      };

      // Array of API calls to be executed in parallel
      const apiCalls = [
        // 1. Fetch KPI data
        props.getNewStoresTrackingKpiData(requestBody)
          .then(response => {
            const kpiData = response?.data?.data?.kpi_data?.data?.[0] || {};
            props.setNewStoresTrackingKpiData(kpiData);
            props.setNewStoresTrackingKpiLoader(false);
          })
          .catch(error => {
            props.setNewStoresTrackingKpiLoader(false);
            handleErrorMessage(error);
          }),
        
        // 2. Fetch graph data
        props.getNewStoresTrackingGraphData(requestBody)
          .then(response => {
            const graphData = response?.data?.data?.graph_data || {};
            props.setNewStoresTrackingGraphData(graphData);
            props.setLoadGraphData(true);
            props.setNewStoresTrackingGraphLoader(false);
          })
          .catch(error => {
            props.setNewStoresTrackingGraphLoader(false);
            props.setLoadGraphData(true);
            handleErrorMessage(error);
          }),
        
        Promise.resolve().then(() => {
          props.setIsFiltersValid(isValid);
        })
      ];
      
      await Promise.allSettled(apiCalls);      
    } catch (e) {
      props.setNewStoresTrackingKpiLoader(false);
      props.setNewStoresTrackingGraphLoader(false);
      props.setNewStoresTrackingTableLoader(false);
      handleErrorMessage(e);
    }
  };

  const onFilterDashboardClick = (dependencyData, filterData) => {
    props?.saveNewStoresTrackingFiltersState(dependencyData);
    applyFilters(filterData, dependencyData);
  };

  const getCustomDependencyFilter = async (dependency) => {
    return getActiveFilterCustomDependency(dependency, "active", "product");
  };

  return (
    <div style={{marginTop:IS_OVERRIDEN_CORE_BUTTON_PLACEMENT}}>
    <CoreComponentScreen
      IscoreButtonWidth = {IS_OVERRIDEN_CORE_BUTTON_WIDTH}
      showFilterDashboard={true}
      filterConfigKey={"newStoresTrackingFilterConfiguration"}
      onApplyFilter={onFilterDashboardClick}
      contained={false}
      customDependencyValue={getCustomDependencyFilter}
      screenName={NEW_STORES_TRACKING_SCREEN_NAME}
      autoHideFilterButton={true}
      customClassName={reportingClasses.filterSectionSpacing}
    >
      {props.children}
    </CoreComponentScreen>
    </div>
  );
};

const mapStateToProps = (store) => {
  const { inventorysmartReducer, filterReducer } = store;
  return {
    newStoresTrackingTableLoader:
      inventorysmartReducer.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingTableLoader,
    newStoresTrackingFilterConfiguration:
      inventorysmartReducer.inventorySmartNewStoresTrackingService
        ?.newStoresTrackingFilterConfiguration,
    filterDashboardConfiguration:
      filterReducer.filterDashboardConfiguration[
        "newStoresTrackingFilterConfiguration"
      ],
    savedFilterSelection: filterReducer.savedFilterSelection,
    inventorysmartScreenConfig:
      inventorysmartReducer?.inventorySmartCommonService
        ?.inventorysmartScreenConfig,
    tenantFilterUamConfig:
      store.tenantUserRoleMgmtReducer.userRoleManagementReducer.tenantUamConfig
        .filter_uam,
    pageSize:
      inventorysmartReducer.inventorySmartCommonService
        ?.inventorysmartScreenConfig?.inventorysmart_page_count || 10,
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    addSnack: (snack) => dispatch(addSnack(snack)),
    setNewStoresTrackingFilterConfiguration: (body) =>
      dispatch(setNewStoresTrackingFilterConfiguration(body)),
    clearNewStoresTrackingStates: () => dispatch(clearNewStoresTrackingStates()),
    setNewStoresTrackingTableLoader: (body) =>
      dispatch(setNewStoresTrackingTableLoader(body)),
    setNewStoresTrackingFilterLoader: (body) =>
      dispatch(setNewStoresTrackingFilterLoader(body)),
    saveNewStoresTrackingFiltersState: (body) =>
      dispatch(saveNewStoresTrackingFiltersState(body)),
    getNewStoresTrackingKpiData: (body) =>
      dispatch(getNewStoresTrackingKpiData(body)),
    setNewStoresTrackingKpiData: (body) =>
      dispatch(setNewStoresTrackingKpiData(body)),
    setFilterConfiguration: (filterConfiguration) =>
      dispatch(setFilterConfiguration(filterConfiguration)),
    setIsFiltersValid: (body) => dispatch(setIsFiltersValid(body)),
    setNewStoresTrackingKpiLoader: (body) => dispatch(setNewStoresTrackingKpiLoader(body)),
    setLoadGraphData: (body) => dispatch(setLoadGraphData(body)),
    setNewStoresTrackingGraphLoader: (body) => dispatch(setNewStoresTrackingGraphLoader(body)),
    getNewStoresTrackingGraphData: (body) => dispatch(getNewStoresTrackingGraphData(body)),
    setNewStoresTrackingGraphData: (body) => dispatch(setNewStoresTrackingGraphData(body)),
  };
};

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(NewStoresTrackingFilters);
